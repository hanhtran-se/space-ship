from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import SpaceType


def get(db: Session, space_type_id: int) -> SpaceType | None:
    return db.get(SpaceType, space_type_id)


def list_active(db: Session) -> list[SpaceType]:
    stmt = (
        select(SpaceType)
        .where(SpaceType.is_active.is_(True))
        .options(selectinload(SpaceType.price_tiers))
        .order_by(SpaceType.id)
    )
    return list(db.scalars(stmt))
