from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.core.config import get_settings
from app.schemas.session import SessionOut


class CustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class CustomerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
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
