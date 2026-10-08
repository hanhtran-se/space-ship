from fastapi import APIRouter, status

from app.db.session import DbSession
from app.repositories import customer_repo, point_repo, session_repo
from app.schemas.customer import CustomerCreate, CustomerDetail, CustomerOut, CustomerUpdate
from app.schemas.session import SessionOut
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["Admin · Customers"])


@router.post(
    "",
    response_model=CustomerOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a customer and generate their magic link",
)
def create_customer(payload: CustomerCreate, db: DbSession):
    return customer_service.create_customer(db, payload.name)


@router.get("", response_model=list[CustomerOut], summary="List / search customers")
def list_customers(db: DbSession, q: str | None = None, include_inactive: bool = False):
    return customer_repo.list_customers(db, q, include_inactive)


@router.get(
    "/{customer_id}",
    response_model=CustomerDetail,
    summary="Customer detail with points and session history",
)
def get_customer(customer_id: int, db: DbSession):
    customer = customer_service.get_customer(db, customer_id)
    sessions = session_repo.list_for_customer(db, customer_id)
    return CustomerDetail(
        id=customer.id,
        name=customer.name,
        token=customer.token,
        is_active=customer.is_active,
        created_at=customer.created_at,
        points_balance=point_repo.balance(db, customer_id),
        sessions=[SessionOut.model_validate(s) for s in sessions],
    )


@router.patch(
    "/{customer_id}", response_model=CustomerOut, summary="Rename or deactivate a customer"
)
def update_customer(customer_id: int, payload: CustomerUpdate, db: DbSession):
    return customer_service.update_customer(db, customer_id, payload.name, payload.is_active)
