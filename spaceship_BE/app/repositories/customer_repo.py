from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer


def get(db: Session, customer_id: int) -> Customer | None:
    return db.get(Customer, customer_id)


def get_by_token(db: Session, token: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.token == token))


def list_customers(db: Session, q: str | None, include_inactive: bool) -> list[Customer]:
    stmt = select(Customer).order_by(Customer.name)
    if q:
        stmt = stmt.where(Customer.name.ilike(f"%{q}%"))
    if not include_inactive:
        stmt = stmt.where(Customer.is_active.is_(True))
    return list(db.scalars(stmt))
