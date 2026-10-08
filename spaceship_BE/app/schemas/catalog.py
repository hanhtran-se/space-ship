from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.campaign import PERCENT
from app.models.price_tier import MAX_COMBOS_PER_SPACE_TYPE


class PriceTierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    label: str
    duration_minutes: int
    price: int


class SpaceTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    capacity: int
    pricing_mode: str
    price_tiers: list[PriceTierOut]
    is_available: bool


class ComboIn(BaseModel):
    hours: int = Field(ge=2, le=24)
    price: int = Field(ge=0)


class SpaceTypeIn(BaseModel):
    """A space type together with its whole price list."""

    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)
    capacity: int = Field(default=1, ge=1)
    pricing_mode: Literal["per_person", "per_room"]
    hourly_price: int = Field(ge=0)
    combos: list[ComboIn] = Field(default_factory=list, max_length=MAX_COMBOS_PER_SPACE_TYPE)
    full_day_price: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def combo_hours_are_unique(self) -> "SpaceTypeIn":
        hours = [combo.hours for combo in self.combos]
        if len(hours) != len(set(hours)):
            raise ValueError("Each combo must have a different number of hours")
        return self


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    condition: str
    discount_type: str
    discount_value: int
    is_active: bool


class CampaignIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    condition: str = Field(default="", max_length=200)
    discount_type: Literal["percent", "amount"]
    discount_value: int = Field(gt=0)
    is_active: bool = True

    @model_validator(mode="after")
    def percent_is_at_most_100(self) -> "CampaignIn":
        if self.discount_type == PERCENT and self.discount_value > 100:
            raise ValueError("A percent discount cannot be more than 100")
        return self


class SettingOut(BaseModel):
    key: str
    value: int


class SettingUpdate(BaseModel):
    value: int = Field(ge=0)
