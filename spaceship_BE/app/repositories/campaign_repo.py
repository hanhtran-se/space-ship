from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Campaign


def get(db: Session, campaign_id: int) -> Campaign | None:
    return db.get(Campaign, campaign_id)


def list_active(db: Session) -> list[Campaign]:
    stmt = select(Campaign).where(Campaign.is_active.is_(True)).order_by(Campaign.name)
    return list(db.scalars(stmt))
