from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import Campaign, PriceTier, SpaceType
from app.models.price_tier import COMBO, FULL_DAY, HOURLY
from app.repositories import campaign_repo, session_repo, space_type_repo
from app.schemas.catalog import CampaignIn, SpaceTypeIn

MINUTES_PER_DAY = 24 * 60


def _price_tiers(payload: SpaceTypeIn) -> list[PriceTier]:
    tiers = [PriceTier(kind=HOURLY, label="1 hour", duration_minutes=60, price=payload.hourly_price)]
    for combo in sorted(payload.combos, key=lambda c: c.hours):
        tiers.append(
            PriceTier(
                kind=COMBO,
                label=f"Combo {combo.hours} hours",
                duration_minutes=combo.hours * 60,
                price=combo.price,
            )
        )
    if payload.full_day_price is not None:
        tiers.append(
            PriceTier(
                kind=FULL_DAY,
                label="Full day",
                duration_minutes=MINUTES_PER_DAY,
                price=payload.full_day_price,
            )
        )
    return tiers


def _get_active_space_type(db: Session, space_type_id: int) -> SpaceType:
    space_type = space_type_repo.get(db, space_type_id)
    if space_type is None or not space_type.is_active:
        raise NotFoundError("Space type not found")
    return space_type


def create_space_type(db: Session, payload: SpaceTypeIn) -> SpaceType:
    space_type = SpaceType(
        name=payload.name,
        description=payload.description,
        capacity=payload.capacity,
        pricing_mode=payload.pricing_mode,
        price_tiers=_price_tiers(payload),
    )
    db.add(space_type)
    db.commit()
    return space_type


def update_space_type(db: Session, space_type_id: int, payload: SpaceTypeIn) -> SpaceType:
    """Replaces the details and the whole price list.

    Past sessions keep their frozen prices (BR-6), so this is always safe.
    """
    space_type = _get_active_space_type(db, space_type_id)
    space_type.name = payload.name
    space_type.description = payload.description
    space_type.capacity = payload.capacity
    space_type.pricing_mode = payload.pricing_mode
    space_type.price_tiers = _price_tiers(payload)
    db.commit()
    return space_type


def remove_space_type(db: Session, space_type_id: int) -> None:
    space_type = _get_active_space_type(db, space_type_id)
    if space_type.id in session_repo.occupied_space_type_ids(db):
        raise ConflictError("Someone is seated here. Check them out before removing this space.")
    # Soft delete: past sessions still point at this row.
    space_type.is_active = False
    db.commit()


def create_campaign(db: Session, payload: CampaignIn) -> Campaign:
    campaign = Campaign(**payload.model_dump())
    db.add(campaign)
    db.commit()
    return campaign


def update_campaign(db: Session, campaign_id: int, payload: CampaignIn) -> Campaign:
    campaign = campaign_repo.get(db, campaign_id)
    if campaign is None:
        raise NotFoundError("Campaign not found")
    for field, value in payload.model_dump().items():
        setattr(campaign, field, value)
    db.commit()
    return campaign
