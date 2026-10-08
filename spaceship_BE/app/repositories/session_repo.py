from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SpaceSession


def get(db: Session, session_id: int) -> SpaceSession | None:
    return db.get(SpaceSession, session_id)


def list_sessions(db: Session, status: str | None) -> list[SpaceSession]:
    stmt = select(SpaceSession).order_by(SpaceSession.started_at.desc())
    if status == "open":
        stmt = stmt.where(SpaceSession.ended_at.is_(None))
    elif status == "closed":
        stmt = stmt.where(SpaceSession.ended_at.is_not(None))
    return list(db.scalars(stmt))


def list_for_customer(db: Session, customer_id: int) -> list[SpaceSession]:
    stmt = (
        select(SpaceSession)
        .where(SpaceSession.customer_id == customer_id)
        .order_by(SpaceSession.started_at.desc())
    )
    return list(db.scalars(stmt))


def get_open_for_customer(db: Session, customer_id: int) -> SpaceSession | None:
    stmt = select(SpaceSession).where(
        SpaceSession.customer_id == customer_id, SpaceSession.ended_at.is_(None)
    )
    return db.scalars(stmt).first()


def occupied_space_type_ids(db: Session) -> set[int]:
    stmt = select(SpaceSession.space_type_id).where(SpaceSession.ended_at.is_(None))
    return set(db.scalars(stmt))
