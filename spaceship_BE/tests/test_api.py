from datetime import timedelta

from app.core.time import utcnow
from app.models import SpaceSession
from tests.conftest import ADMIN

DESK_ID = 1
ROOM_ID = 2
CAMPAIGN_ID = 1


def _create_customer(client, name="Lan"):
    return client.post("/admin/customers", json={"name": name}, auth=ADMIN).json()


def _check_in(client, customer_id, space_type_id=DESK_ID):
    return client.post(
        "/admin/sessions",
        json={"customer_id": customer_id, "space_type_id": space_type_id},
        auth=ADMIN,
    )


def _backdate(db, session_id, **delta):
    session = db.get(SpaceSession, session_id)
    session.started_at = utcnow() - timedelta(**delta)
    db.commit()


def test_admin_routes_require_credentials(client):
    assert client.get("/admin/customers").status_code == 401
    assert client.get("/admin/customers", auth=("admin", "wrong")).status_code == 401
    assert client.get("/admin/me", auth=ADMIN).json() == {"username": "admin"}


def test_create_customer_returns_magic_link(client):
    customer = _create_customer(client)
    assert len(customer["token"]) >= 40
    assert customer["magic_link"] == f"http://frontend.test/s/{customer['token']}"


def test_full_flow_checkin_estimate_checkout_points(client, db):
    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"]).json()["id"]
    _backdate(db, session_id, hours=4, minutes=40)  # rounds up to 5 billable hours

    seated = client.get("/admin/sessions/open", auth=ADMIN).json()
    assert len(seated) == 1
    assert seated[0]["billable_hours"] == 5
    assert seated[0]["estimated_price"] == 65_000

    bill = client.post(
        f"/admin/sessions/{session_id}/close", json={"campaign_id": CAMPAIGN_ID}, auth=ADMIN
    ).json()
    assert bill["base_price"] == 65_000
    assert bill["discount_amount"] == 6_500
    assert bill["final_price"] == 58_500
    assert bill["campaign"]["name"] == "Sunday"
    assert bill["points_earned"] == 1

    view = client.get(f"/s/{customer['token']}").json()
    assert view["points_balance"] == 1
    assert view["active_session"] is None
    assert view["total_sessions"] == 1
    assert view["total_hours"] == 4.67

    detail = client.get(f"/admin/customers/{customer['id']}", auth=ADMIN).json()
    assert detail["points_balance"] == 1
    assert detail["sessions"][0]["final_price"] == 58_500


def test_short_session_without_campaign_earns_no_point(client):
    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"]).json()["id"]

    bill = client.post(f"/admin/sessions/{session_id}/close", auth=ADMIN).json()
    assert bill["billable_hours"] == 1
    assert bill["discount_amount"] == 0
    assert bill["final_price"] == 15_000
    assert bill["points_earned"] == 0


def test_frozen_price_survives_and_double_close_is_rejected(client):
    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"]).json()["id"]
    assert client.post(f"/admin/sessions/{session_id}/close", auth=ADMIN).status_code == 200
    assert client.post(f"/admin/sessions/{session_id}/close", auth=ADMIN).status_code == 409


def test_customer_cannot_have_two_open_sessions(client):
    customer = _create_customer(client)
    assert _check_in(client, customer["id"]).status_code == 201
    assert _check_in(client, customer["id"]).status_code == 409


def test_occupied_room_is_hidden_and_cannot_be_booked(client):
    first = _create_customer(client, "An")
    second = _create_customer(client, "Binh")
    assert _check_in(client, first["id"], ROOM_ID).status_code == 201

    available = client.get("/admin/space-types?available=true", auth=ADMIN).json()
    assert [s["name"] for s in available] == ["Single Desk"]
    everything = client.get("/admin/space-types", auth=ADMIN).json()
    assert {s["name"]: s["is_available"] for s in everything} == {
        "Single Desk": True,
        "Amazon Room": False,
    }
    assert _check_in(client, second["id"], ROOM_ID).status_code == 409


def test_owner_can_change_thresholds(client, db):
    assert client.put(
        "/admin/settings/rounding_threshold_minutes", json={"value": 10}, auth=ADMIN
    ).json() == {"key": "rounding_threshold_minutes", "value": 10}
    assert (
        client.put("/admin/settings/unknown", json={"value": 1}, auth=ADMIN).status_code == 404
    )

    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"]).json()["id"]
    _backdate(db, session_id, hours=1, minutes=15)  # 15 > 10 -> 2 billable hours
    bill = client.post(f"/admin/sessions/{session_id}/close", auth=ADMIN).json()
    assert bill["billable_hours"] == 2
    assert bill["final_price"] == 30_000


def test_magic_link_is_private_and_revocable(client):
    customer = _create_customer(client)
    assert client.get("/s/not-a-real-token").status_code == 404
    assert client.get(f"/s/{customer['token']}").status_code == 200

    client.patch(f"/admin/customers/{customer['id']}", json={"is_active": False}, auth=ADMIN)
    assert client.get(f"/s/{customer['token']}").status_code == 404
