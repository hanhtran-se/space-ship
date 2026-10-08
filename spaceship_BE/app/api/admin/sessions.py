from typing import Literal

from fastapi import APIRouter, status

from app.core.time import utcnow
from app.db.session import DbSession
from app.repositories import session_repo
from app.schemas.session import BillOut, OpenSessionOut, SessionClose, SessionOut, SessionStart
from app.services import pricing_engine, session_service, settings_service

router = APIRouter(prefix="/sessions", tags=["Admin · Sessions"])


@router.post(
    "",
    response_model=SessionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Check in: start a session",
)
def start_session(payload: SessionStart, db: DbSession):
    return session_service.start_session(db, payload.customer_id, payload.space_type_id)


@router.get(
    "/open",
    response_model=list[OpenSessionOut],
    summary="Who is seated now, with a running price estimate",
)
def list_open_sessions(db: DbSession):
    now = utcnow()
    rounding = settings_service.get_int(db, settings_service.ROUNDING_THRESHOLD_MINUTES)
    result = []
    for session in session_repo.list_sessions(db, "open"):
        elapsed = session_service.duration_minutes(session.started_at, now)
        try:
            estimated_price = session_service.quote(db, session, now).base_price
        except pricing_engine.PricingConfigError:
            estimated_price = None
        result.append(
            OpenSessionOut(
                **SessionOut.model_validate(session).model_dump(),
                elapsed_minutes=elapsed,
                billable_hours=pricing_engine.billable_hours(elapsed, rounding),
                estimated_price=estimated_price,
            )
        )
    return result


@router.get("", response_model=list[SessionOut], summary="List sessions")
def list_sessions(db: DbSession, status: Literal["open", "closed"] | None = None):
    return session_repo.list_sessions(db, status)


@router.post(
    "/{session_id}/close",
    response_model=BillOut,
    summary="Check out: close a session and produce the bill",
    description=(
        "Ends the session at the server's current time, freezes the price, "
        "applies the chosen campaign (if any) and awards a loyalty point when earned."
    ),
)
def close_session(session_id: int, db: DbSession, payload: SessionClose | None = None):
    campaign_id = payload.campaign_id if payload else None
    bill = session_service.close_session(db, session_id, campaign_id)
    return BillOut(
        **SessionOut.model_validate(bill.session).model_dump(),
        duration_minutes=bill.quote.duration_minutes,
        billable_hours=bill.quote.billable_hours,
        points_earned=bill.points_earned,
    )
