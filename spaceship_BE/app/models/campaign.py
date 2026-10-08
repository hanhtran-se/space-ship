from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

PERCENT = "percent"
AMOUNT = "amount"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    # Free-text note for the owner (e.g. "Sundays only"). The owner picks the
    # campaign at checkout, so the system does not evaluate this.
    condition: Mapped[str] = mapped_column(String(200), default="")
    discount_type: Mapped[str] = mapped_column(String(20))
    discount_value: Mapped[int]
    is_active: Mapped[bool] = mapped_column(default=True)
