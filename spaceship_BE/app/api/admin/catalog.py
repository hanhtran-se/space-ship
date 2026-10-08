from fastapi import APIRouter

from app.db.session import DbSession
from app.models.space_type import PER_ROOM
from app.repositories import campaign_repo, session_repo, space_type_repo
from app.schemas.catalog import CampaignOut, PriceTierOut, SpaceTypeOut

router = APIRouter(tags=["Admin · Catalog"])


@router.get(
    "/space-types",
    response_model=list[SpaceTypeOut],
    summary="Space types with price tiers",
    description="Pass `available=true` at check-in to hide rooms that are currently occupied.",
)
def list_space_types(db: DbSession, available: bool = False):
    occupied = session_repo.occupied_space_type_ids(db)
    result = []
    for space_type in space_type_repo.list_active(db):
        # Desks are shared, so only a room can be "taken".
        is_available = not (space_type.pricing_mode == PER_ROOM and space_type.id in occupied)
        if available and not is_available:
            continue
        result.append(
            SpaceTypeOut(
                id=space_type.id,
                name=space_type.name,
                description=space_type.description,
                capacity=space_type.capacity,
                pricing_mode=space_type.pricing_mode,
                price_tiers=[PriceTierOut.model_validate(t) for t in space_type.price_tiers],
                is_available=is_available,
            )
        )
    return result


@router.get(
    "/campaigns",
    response_model=list[CampaignOut],
    summary="Active campaigns the owner can pick at checkout",
)
def list_campaigns(db: DbSession):
    return campaign_repo.list_active(db)
