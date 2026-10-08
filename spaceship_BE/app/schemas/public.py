from datetime import datetime

from pydantic import BaseModel


class ActiveSessionView(BaseModel):
    space_type: str
    started_at: datetime


class PastSessionView(BaseModel):
    space_type: str
    started_at: datetime
    ended_at: datetime
    hours: float


class CustomerView(BaseModel):
    name: str
    points_balance: int
    active_session: ActiveSessionView | None
    history: list[PastSessionView]
    total_hours: float
    total_sessions: int
