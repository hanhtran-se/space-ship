from datetime import timedelta

from app.core.time import utcnow
from app.models import SpaceSession
from tests.conftest import ADMIN

DESK_ID = 1
ROOM_ID = 2
CAMPAIGN_ID = 1


_phones = iter(range(10_000))


def _create_customer(client, name="Lan", phone=None):
    phone = phone or f"0900{next(_phones):06d}"
    response = client.post("/admin/customers", json={"name": name, "phone": phone}, auth=ADMIN)
    assert response.status_code == 201, response.text
    return response.json()


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


DESK_PAYLOAD = {
    "name": "Window Desk",
    "description": "By the window",
    "capacity": 1,
    "pricing_mode": "per_person",
    "hourly_price": 20_000,
    "combos": [{"hours": 5, "price": 80_000}, {"hours": 3, "price": 50_000}],
    "full_day_price": 120_000,
}


def test_owner_can_create_edit_and_remove_a_space_type(client, db):
    created = client.post("/admin/space-types", json=DESK_PAYLOAD, auth=ADMIN)
    assert created.status_code == 201
    space_type = created.json()
    assert [(t["kind"], t["label"], t["price"]) for t in space_type["price_tiers"]] == [
        ("hourly", "1 hour", 20_000),
        ("combo", "Combo 3 hours", 50_000),
        ("combo", "Combo 5 hours", 80_000),
        ("full_day", "Full day", 120_000),
    ]

    # New prices are used straight away: 4 billable hours = 3-hour combo + 1 hour.
    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"], space_type["id"]).json()["id"]
    _backdate(db, session_id, hours=4)
    seated = client.get("/admin/sessions/open", auth=ADMIN).json()
    assert seated[0]["estimated_price"] == 70_000

    # A space in use cannot be removed.
    assert client.delete(f"/admin/space-types/{space_type['id']}", auth=ADMIN).status_code == 409

    # Editing replaces the whole price list.
    edited = client.put(
        f"/admin/space-types/{space_type['id']}",
        json={**DESK_PAYLOAD, "name": "Quiet Desk", "combos": [], "full_day_price": None},
        auth=ADMIN,
    ).json()
    assert edited["name"] == "Quiet Desk"
    assert [t["kind"] for t in edited["price_tiers"]] == ["hourly"]
    bill = client.post(f"/admin/sessions/{session_id}/close", auth=ADMIN).json()
    assert bill["final_price"] == 80_000

    assert client.delete(f"/admin/space-types/{space_type['id']}", auth=ADMIN).status_code == 204
    names = [s["name"] for s in client.get("/admin/space-types", auth=ADMIN).json()]
    assert "Quiet Desk" not in names
    # The closed session still shows where the customer sat.
    detail = client.get(f"/admin/customers/{customer['id']}", auth=ADMIN).json()
    assert detail["sessions"][0]["space_type"]["name"] == "Quiet Desk"


def test_space_type_price_list_is_validated(client):
    four_combos = [{"hours": h, "price": 1000} for h in (2, 3, 4, 5)]
    too_many = client.post(
        "/admin/space-types", json={**DESK_PAYLOAD, "combos": four_combos}, auth=ADMIN
    )
    assert too_many.status_code == 422
    duplicate = client.post(
        "/admin/space-types",
        json={**DESK_PAYLOAD, "combos": [{"hours": 3, "price": 1}, {"hours": 3, "price": 2}]},
        auth=ADMIN,
    )
    assert duplicate.status_code == 422


def test_owner_can_manage_campaigns(client):
    payload = {
        "name": "Student",
        "condition": "Show a student card",
        "discount_type": "amount",
        "discount_value": 5_000,
    }
    campaign = client.post("/admin/campaigns", json=payload, auth=ADMIN).json()
    assert campaign["is_active"] is True

    customer = _create_customer(client)
    session_id = _check_in(client, customer["id"]).json()["id"]
    bill = client.post(
        f"/admin/sessions/{session_id}/close", json={"campaign_id": campaign["id"]}, auth=ADMIN
    ).json()
    assert (bill["base_price"], bill["discount_amount"], bill["final_price"]) == (15_000, 5_000, 10_000)

    # Switched off: hidden from checkout, still listed for the owner to manage.
    off = client.put(
        f"/admin/campaigns/{campaign['id']}", json={**payload, "is_active": False}, auth=ADMIN
    )
    assert off.json()["is_active"] is False
    pickable = [c["name"] for c in client.get("/admin/campaigns", auth=ADMIN).json()]
    assert "Student" not in pickable
    everything = client.get("/admin/campaigns?include_inactive=true", auth=ADMIN).json()
    assert "Student" in [c["name"] for c in everything]

    too_much = client.post(
        "/admin/campaigns",
        json={**payload, "discount_type": "percent", "discount_value": 150},
        auth=ADMIN,
    )
    assert too_much.status_code == 422


def test_phone_is_required_normalized_and_unique(client):
    assert client.post("/admin/customers", json={"name": "Lan"}, auth=ADMIN).status_code == 422
    bad = client.post("/admin/customers", json={"name": "Lan", "phone": "12ab"}, auth=ADMIN)
    assert bad.status_code == 422

    lan = _create_customer(client, "Lan", "090 123-4567")
    assert lan["phone"] == "0901234567"

    duplicate = client.post(
        "/admin/customers", json={"name": "Someone else", "phone": "0901.234.567"}, auth=ADMIN
    )
    assert duplicate.status_code == 409
    assert "Lan" in duplicate.json()["detail"]


def test_phone_can_be_changed_but_not_to_a_taken_number(client):
    lan = _create_customer(client, "Lan", "0901234567")
    minh = _create_customer(client, "Minh", "0907654321")

    taken = client.patch(
        f"/admin/customers/{minh['id']}", json={"phone": "0901234567"}, auth=ADMIN
    )
    assert taken.status_code == 409

    # Saving a customer's own number again is not a clash.
    same = client.patch(f"/admin/customers/{lan['id']}", json={"phone": "0901234567"}, auth=ADMIN)
    assert same.status_code == 200
    changed = client.patch(
        f"/admin/customers/{minh['id']}", json={"phone": "0911111111"}, auth=ADMIN
    )
    assert changed.json()["phone"] == "0911111111"


def test_search_by_name_phone_or_both(client):
    _create_customer(client, "Lan Nguyen", "0901234567")
    _create_customer(client, "Lan Tran", "0907654321")
    _create_customer(client, "Minh Tran", "0911111111")

    def search(q):
        found = client.get("/admin/customers", params={"q": q}, auth=ADMIN).json()
        return sorted(c["name"] for c in found)

    assert search("lan") == ["Lan Nguyen", "Lan Tran"]
    assert search("0911") == ["Minh Tran"]
    assert search("lan 7654") == ["Lan Tran"]
    assert search("tran 0901") == []
