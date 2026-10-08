from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Customer


def get(db: Session, customer_id: int) -> Customer | None:
    return db.get(Customer, customer_id)


def get_by_token(db: Session, token: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.token == token))


def get_by_phone(db: Session, phone: str) -> Customer | None:
    return db.scalar(select(Customer).where(Customer.phone == phone))


def list_customers(db: Session, q: str | None, include_inactive: bool) -> list[Customer]:
    stmt = select(Customer).order_by(Customer.name)
    # Every word must match the name or the phone, so "lan 0901" narrows by both.
    for word in (q or "").split():
        stmt = stmt.where(
            or_(Customer.name.ilike(f"%{word}%"), Customer.phone.like(f"%{word}%"))
        )
    if not include_inactive:
        stmt = stmt.where(Customer.is_active.is_(True))
    return list(db.scalars(stmt))
