from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PointEntry


def balance(db: Session, customer_id: int) -> int:
    stmt = select(func.coalesce(func.sum(PointEntry.change), 0)).where(
        PointEntry.customer_id == customer_id
    )
    return int(db.scalar(stmt))
