from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.price_tier import PriceTier

PER_PERSON = "per_person"
PER_ROOM = "per_room"


class SpaceType(Base):
    __tablename__ = "space_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(String(1000), default="")
    capacity: Mapped[int] = mapped_column(default=1)
    pricing_mode: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(default=True)

    price_tiers: Mapped[list["PriceTier"]] = relationship(
        back_populates="space_type", order_by="PriceTier.duration_minutes"
    )
