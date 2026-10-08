import os

# Must be set before the app is imported; tests never touch the real database.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "secret"
os.environ["PUBLIC_BASE_URL"] = "http://frontend.test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Campaign, PriceTier, SpaceType
from app.models.campaign import PERCENT
from app.models.price_tier import COMBO, FULL_DAY, HOURLY
from app.models.space_type import PER_PERSON, PER_ROOM

ADMIN = ("admin", "secret")


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    session.add_all(
        [
            SpaceType(
                name="Single Desk",
                capacity=1,
                pricing_mode=PER_PERSON,
                price_tiers=[
                    PriceTier(kind=HOURLY, label="1 hour", duration_minutes=60, price=15_000),
                    PriceTier(kind=COMBO, label="4 hours", duration_minutes=240, price=50_000),
                    PriceTier(kind=FULL_DAY, label="Full day", duration_minutes=480, price=80_000),
                ],
            ),
            SpaceType(
                name="Amazon Room",
                capacity=10,
                pricing_mode=PER_ROOM,
                price_tiers=[
                    PriceTier(kind=HOURLY, label="1 hour", duration_minutes=60, price=80_000),
                    PriceTier(kind=COMBO, label="3 hours", duration_minutes=180, price=200_000),
                ],
            ),
            Campaign(name="Sunday", condition="Sundays", discount_type=PERCENT, discount_value=10),
        ]
    )
    session.commit()
    yield session
    session.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    yield TestClient(app)
    app.dependency_overrides.clear()
