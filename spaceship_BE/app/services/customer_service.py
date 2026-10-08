import secrets

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Customer
from app.repositories import customer_repo


def _ensure_phone_is_free(db: Session, phone: str, customer_id: int | None = None) -> None:
    owner = customer_repo.get_by_phone(db, phone)
    if owner is not None and owner.id != customer_id:
        raise ConflictError(f"This phone number already belongs to {owner.name}")


def create_customer(db: Session, name: str, phone: str) -> Customer:
    _ensure_phone_is_free(db, phone)
    customer = Customer(name=name, phone=phone, token=secrets.token_urlsafe(32))
    db.add(customer)
    db.commit()
    return customer


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = customer_repo.get(db, customer_id)
    if customer is None:
        raise NotFoundError("Customer not found")
    return customer


def get_active_by_token(db: Session, token: str) -> Customer:
    customer = customer_repo.get_by_token(db, token)
    if customer is None or not customer.is_active:
        raise NotFoundError("Link not found")
    return customer


def update_customer(
    db: Session,
    customer_id: int,
    name: str | None,
    phone: str | None,
    is_active: bool | None,
) -> Customer:
    customer = get_customer(db, customer_id)
    if name is not None:
        customer.name = name
    if phone is not None:
        _ensure_phone_is_free(db, phone, customer_id)
        customer.phone = phone
    if is_active is not None:
        customer.is_active = is_active
    db.commit()
    return customer
