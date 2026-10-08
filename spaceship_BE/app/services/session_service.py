from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.time import ensure_utc, utcnow
from app.models import PointEntry, SpaceSession
from app.models.space_type import PER_ROOM
from app.repositories import campaign_repo, customer_repo, session_repo, space_type_repo
from app.services import pricing_engine, settings_service


@dataclass
class Quote:
    duration_minutes: int
    billable_hours: int
    base_price: int


@dataclass
class Bill:
    session: SpaceSession
    quote: Quote
    points_earned: int


def duration_minutes(started_at: datetime, ended_at: datetime) -> int:
    return int((ensure_utc(ended_at) - ensure_utc(started_at)).total_seconds() // 60)


def quote(db: Session, session: SpaceSession, at: datetime) -> Quote:
    """Price of the session as if it ended at `at`, before any campaign."""
    minutes = duration_minutes(session.started_at, at)
    hours = pricing_engine.billable_hours(
        minutes, settings_service.get_int(db, settings_service.ROUNDING_THRESHOLD_MINUTES)
    )
    price = pricing_engine.base_price(
        session.space_type.price_tiers,
        hours,
        settings_service.get_int(db, settings_service.FULL_DAY_THRESHOLD_HOURS),
    )
    return Quote(duration_minutes=minutes, billable_hours=hours, base_price=price)


def start_session(db: Session, customer_id: int, space_type_id: int) -> SpaceSession:
    customer = customer_repo.get(db, customer_id)
    if customer is None or not customer.is_active:
        raise NotFoundError("Customer not found")
    space_type = space_type_repo.get(db, space_type_id)
    if space_type is None or not space_type.is_active:
        raise NotFoundError("Space type not found")

    if session_repo.get_open_for_customer(db, customer_id) is not None:
        raise ConflictError("This customer already has an open session")
    if (
        space_type.pricing_mode == PER_ROOM
        and space_type.id in session_repo.occupied_space_type_ids(db)
    ):
        raise ConflictError("This room is already occupied")

    session = SpaceSession(customer_id=customer_id, space_type_id=space_type_id)
    db.add(session)
    db.commit()
    return session


def close_session(db: Session, session_id: int, campaign_id: int | None) -> Bill:
    session = session_repo.get(db, session_id)
    if session is None:
        raise NotFoundError("Session not found")
    if session.ended_at is not None:
        raise ConflictError("This session is already closed")

    campaign = None
    if campaign_id is not None:
        campaign = campaign_repo.get(db, campaign_id)
        if campaign is None or not campaign.is_active:
            raise NotFoundError("Campaign not found")

    ended_at = utcnow()
    session_quote = quote(db, session, ended_at)
    discount = 0
    if campaign is not None:
        discount = pricing_engine.discount_amount(
            session_quote.base_price, campaign.discount_type, campaign.discount_value
        )

    session.ended_at = ended_at
    session.campaign = campaign
    session.base_price = session_quote.base_price
    session.discount_amount = discount
    session.final_price = session_quote.base_price - discount

    # Points use the real time seated, not the rounded billable hours.
    threshold_hours = settings_service.get_int(db, settings_service.POINT_THRESHOLD_HOURS)
    points_earned = 0
    if session_quote.duration_minutes >= threshold_hours * pricing_engine.MINUTES_PER_HOUR:
        points_earned = 1
        db.add(
            PointEntry(
                customer_id=session.customer_id,
                session_id=session.id,
                change=points_earned,
                reason=f"sat {threshold_hours}+ hours",
            )
        )

    db.commit()
    return Bill(session=session, quote=session_quote, points_earned=points_earned)
