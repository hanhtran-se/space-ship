from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Campaign


def get(db: Session, campaign_id: int) -> Campaign | None:
    return db.get(Campaign, campaign_id)


def list_campaigns(db: Session, include_inactive: bool) -> list[Campaign]:
    stmt = select(Campaign).order_by(Campaign.name)
    if not include_inactive:
        stmt = stmt.where(Campaign.is_active.is_(True))
    return list(db.scalars(stmt))
