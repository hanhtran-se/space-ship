"""Pricing engine: pure functions, no database access.

Rules (integer VND throughout):
1. Round the stay to whole billable hours. Leftover minutes above the owner's
   rounding threshold round up, otherwise down; the minimum is 1 hour.
2. More billable hours than the full-day threshold -> the full-day price.
3. Otherwise take the largest combo that fits, and charge every hour beyond
   it at the hourly rate. No combo fits -> hourly rate for every hour.
4. The owner may pick one campaign at checkout; its discount is one bill line.

per_person and per_room space types use the same rules with their own tiers;
a room is charged once regardless of headcount.
"""

from collections.abc import Sequence
from typing import Protocol

from app.core.exceptions import ConflictError
from app.models.campaign import PERCENT
from app.models.price_tier import COMBO, FULL_DAY, HOURLY

MINUTES_PER_HOUR = 60


class PricingConfigError(ConflictError):
    """The space type's price list cannot price this stay."""


class Tier(Protocol):
    kind: str
    duration_minutes: int
    price: int


def billable_hours(duration_minutes: int, rounding_threshold_minutes: int) -> int:
    hours, leftover = divmod(max(duration_minutes, 0), MINUTES_PER_HOUR)
    if leftover > rounding_threshold_minutes:
        hours += 1
    return max(hours, 1)


def base_price(tiers: Sequence[Tier], hours: int, full_day_threshold_hours: int) -> int:
    full_day = next((t for t in tiers if t.kind == FULL_DAY), None)
    if full_day is not None and hours > full_day_threshold_hours:
        return full_day.price

    minutes = hours * MINUTES_PER_HOUR
    fitting = [t for t in tiers if t.kind == COMBO and t.duration_minutes <= minutes]
    combo = max(fitting, key=lambda t: t.duration_minutes, default=None)

    price = combo.price if combo else 0
    remaining_minutes = minutes - (combo.duration_minutes if combo else 0)
    extra_hours = -(-remaining_minutes // MINUTES_PER_HOUR)  # ceil
    if extra_hours:
        hourly = next((t for t in tiers if t.kind == HOURLY), None)
        if hourly is None:
            raise PricingConfigError("This space type has no hourly price configured")
        price += extra_hours * hourly.price
    return price


def discount_amount(price: int, discount_type: str, discount_value: int) -> int:
    if discount_type == PERCENT:
        discount = price * discount_value // 100
    else:
        discount = discount_value
    return max(0, min(discount, price))
