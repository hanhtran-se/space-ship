from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utcnow
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.campaign import Campaign
    from app.models.customer import Customer
    from app.models.space_type import SpaceType


class SpaceSession(Base):
    """One stay. Named SpaceSession to avoid clashing with SQLAlchemy's Session."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    space_type_id: Mapped[int] = mapped_column(ForeignKey("space_types.id"), index=True)
    campaign_id: Mapped[int | None] = mapped_column(ForeignKey("campaigns.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Frozen at checkout (BR-6); empty while the session is open.
    base_price: Mapped[int | None]
    discount_amount: Mapped[int | None]
    final_price: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    customer: Mapped["Customer"] = relationship()
    space_type: Mapped["SpaceType"] = relationship()
    campaign: Mapped["Campaign | None"] = relationship()
