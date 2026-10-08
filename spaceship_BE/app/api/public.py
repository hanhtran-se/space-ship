from fastapi import APIRouter

from app.db.session import DbSession
from app.repositories import point_repo, session_repo
from app.schemas.public import ActiveSessionView, CustomerView, PastSessionView
from app.services import customer_service, session_service

router = APIRouter(tags=["Customer"])


@router.get(
    "/s/{token}",
    response_model=CustomerView,
    summary="Customer's read-only view (magic link)",
)
def customer_view(token: str, db: DbSession):
    customer = customer_service.get_active_by_token(db, token)

    active = None
    history = []
    total_minutes = 0
    for session in session_repo.list_for_customer(db, customer.id):
        if session.ended_at is None:
            active = ActiveSessionView(
                space_type=session.space_type.name, started_at=session.started_at
            )
            continue
        minutes = session_service.duration_minutes(session.started_at, session.ended_at)
        total_minutes += minutes
        history.append(
            PastSessionView(
                space_type=session.space_type.name,
                started_at=session.started_at,
                ended_at=session.ended_at,
                hours=round(minutes / 60, 2),
            )
        )

    return CustomerView(
        name=customer.name,
        points_balance=point_repo.balance(db, customer.id),
        active_session=active,
        history=history,
        total_hours=round(total_minutes / 60, 2),
        total_sessions=len(history),
    )
