from datetime import datetime

from pydantic import BaseModel, ConfigDict


class _Brief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class _CustomerBrief(_Brief):
    phone: str | None


class SessionStart(BaseModel):
    customer_id: int
    space_type_id: int


class SessionClose(BaseModel):
    # Campaign the owner picked for this bill, if any.
    campaign_id: int | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer: _CustomerBrief
    space_type: _Brief
    campaign: _Brief | None
    started_at: datetime
    ended_at: datetime | None
    base_price: int | None
    discount_amount: int | None
    final_price: int | None


class OpenSessionOut(SessionOut):
    elapsed_minutes: int
    billable_hours: int
    # Running estimate before any campaign; null if the price list is incomplete.
    estimated_price: int | None


class BillOut(SessionOut):
    duration_minutes: int
    billable_hours: int
    points_earned: int
