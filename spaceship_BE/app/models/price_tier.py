from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.space_type import SpaceType

# A space type has one hourly rate, up to MAX_COMBOS_PER_SPACE_TYPE combos, and one full-day price.
HOURLY = "hourly"
COMBO = "combo"
FULL_DAY = "full_day"
MAX_COMBOS_PER_SPACE_TYPE = 3


class PriceTier(Base):
    __tablename__ = "price_tiers"

    id: Mapped[int] = mapped_column(primary_key=True)
    space_type_id: Mapped[int] = mapped_column(ForeignKey("space_types.id"), index=True)
    kind: Mapped[str] = mapped_column(String(20))
    label: Mapped[str] = mapped_column(String(100))
    duration_minutes: Mapped[int]
    price: Mapped[int]

    space_type: Mapped["SpaceType"] = relationship(back_populates="price_tiers")
