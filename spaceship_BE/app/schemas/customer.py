import re
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, computed_field

from app.core.config import get_settings
from app.schemas.session import SessionOut


def _normalize_phone(value: str) -> str:
    phone = re.sub(r"[\s.\-()]", "", value)
    if not re.fullmatch(r"\+?\d{8,15}", phone):
        raise ValueError("Enter a valid phone number (8 to 15 digits)")
    return phone


Phone = Annotated[str, AfterValidator(_normalize_phone)]


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    phone: Phone


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    phone: Phone | None = None
    is_active: bool | None = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str | None
    token: str
    is_active: bool
    created_at: datetime

    @computed_field
    @property
    def magic_link(self) -> str:
        return f"{get_settings().public_base_url.rstrip('/')}/s/{self.token}"


class CustomerDetail(CustomerOut):
    points_balance: int
    sessions: list[SessionOut]
