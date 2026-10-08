from pydantic import BaseModel, ConfigDict, Field


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


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    condition: str
    discount_type: str
    discount_value: int


class SettingOut(BaseModel):
    key: str
    value: int


class SettingUpdate(BaseModel):
    value: int = Field(ge=0)
