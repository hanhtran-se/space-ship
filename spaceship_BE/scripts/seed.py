"""Load starter data: space types, price tiers, campaigns, settings.

Run from spaceship_BE/:  python -m scripts.seed
Safe to re-run: it does nothing if space types already exist.
All prices below are SAMPLE values. The owner can change everything here
afterwards from the admin area (Prices, Campaigns, Settings).
"""

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import Campaign, PriceTier, Setting, SpaceType
from app.models.campaign import AMOUNT, PERCENT
from app.models.price_tier import COMBO, FULL_DAY, HOURLY, MAX_COMBOS_PER_SPACE_TYPE
from app.models.space_type import PER_PERSON, PER_ROOM
from app.services.settings_service import DEFAULTS

SPACE_TYPES = [
    {
        "name": "Single Desk",
        "description": "Desk in the shared area",
        "capacity": 1,
        "pricing_mode": PER_PERSON,
        "tiers": [
            (HOURLY, "1 hour", 60, 15_000),
            (COMBO, "Combo 4 hours", 240, 50_000),
            (FULL_DAY, "Full day", 480, 80_000),
        ],
    },
    {
        "name": "Amazon Room",
        "description": "Private room",
        "capacity": 10,
        "pricing_mode": PER_ROOM,
        "tiers": [
            (HOURLY, "1 hour", 60, 80_000),
            (COMBO, "Combo 3 hours", 180, 200_000),
            (FULL_DAY, "Full day", 480, 500_000),
        ],
    },
]

CAMPAIGNS = [
    ("Sunday discount", "Sundays", PERCENT, 5),
    ("Welcome 10k", "First visit", AMOUNT, 10_000),
]


def seed() -> None:
    with SessionLocal() as db:
        if db.scalar(select(SpaceType.id).limit(1)) is not None:
            print("Space types already exist - nothing to do.")
            return

        for spec in SPACE_TYPES:
            tiers = spec["tiers"]
            combos = [t for t in tiers if t[0] == COMBO]
            if len(combos) > MAX_COMBOS_PER_SPACE_TYPE:
                raise ValueError(
                    f"{spec['name']}: at most {MAX_COMBOS_PER_SPACE_TYPE} combos allowed"
                )
            db.add(
                SpaceType(
                    name=spec["name"],
                    description=spec["description"],
                    capacity=spec["capacity"],
                    pricing_mode=spec["pricing_mode"],
                    price_tiers=[
                        PriceTier(kind=kind, label=label, duration_minutes=minutes, price=price)
                        for kind, label, minutes, price in tiers
                    ],
                )
            )

        for name, condition, discount_type, discount_value in CAMPAIGNS:
            db.add(
                Campaign(
                    name=name,
                    condition=condition,
                    discount_type=discount_type,
                    discount_value=discount_value,
                )
            )

        for key, value in DEFAULTS.items():
            if db.scalar(select(Setting.id).where(Setting.key == key)) is None:
                db.add(Setting(key=key, value=str(value)))

        db.commit()
        print("Seeded space types, price tiers, campaigns and settings.")


if __name__ == "__main__":
    seed()
