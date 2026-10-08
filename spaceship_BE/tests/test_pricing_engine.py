from dataclasses import dataclass

import pytest

from app.models.campaign import AMOUNT, PERCENT
from app.models.price_tier import COMBO, FULL_DAY, HOURLY
from app.services.pricing_engine import (
    PricingConfigError,
    base_price,
    billable_hours,
    discount_amount,
)


@dataclass
class Tier:
    kind: str
    duration_minutes: int
    price: int


DESK = [Tier(HOURLY, 60, 15_000), Tier(COMBO, 240, 50_000), Tier(FULL_DAY, 480, 80_000)]


@pytest.mark.parametrize(
    "minutes, expected",
    [
        (0, 1),
        (20, 1),  # under an hour is still one hour
        (59, 1),
        (90, 1),  # 1h30 is not above the threshold -> rounds down
        (91, 2),  # 1h31 -> rounds up
        (120, 2),
        (511, 9),
    ],
)
def test_billable_hours_with_30_minute_threshold(minutes, expected):
    assert billable_hours(minutes, 30) == expected


def test_billable_hours_respects_owner_threshold():
    assert billable_hours(75, 10) == 2
    assert billable_hours(75, 15) == 1


@pytest.mark.parametrize(
    "hours, expected",
    [
        (1, 15_000),
        (3, 45_000),  # no combo fits yet
        (4, 50_000),  # exactly the combo
        (5, 65_000),  # combo + 1 extra hour
        (8, 110_000),  # combo + 4 extra hours; 8 is not above the threshold
        (9, 80_000),  # above 8 hours -> full day
    ],
)
def test_base_price(hours, expected):
    assert base_price(DESK, hours, 8) == expected


def test_largest_fitting_combo_is_used():
    tiers = [Tier(HOURLY, 60, 10_000), Tier(COMBO, 120, 18_000), Tier(COMBO, 240, 30_000)]
    assert base_price(tiers, 3, 8) == 28_000
    assert base_price(tiers, 5, 8) == 40_000


def test_missing_hourly_price_is_reported():
    with pytest.raises(PricingConfigError):
        base_price([Tier(COMBO, 180, 200_000)], 4, 8)


def test_discount_amount():
    assert discount_amount(65_000, PERCENT, 10) == 6_500
    assert discount_amount(65_000, AMOUNT, 10_000) == 10_000
    assert discount_amount(5_000, AMOUNT, 10_000) == 5_000  # never below zero
