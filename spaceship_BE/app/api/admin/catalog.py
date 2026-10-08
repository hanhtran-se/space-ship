from fastapi import APIRouter, status

from app.db.session import DbSession
from app.models import SpaceType
from app.models.space_type import PER_ROOM
from app.repositories import campaign_repo, session_repo, space_type_repo
from app.schemas.catalog import CampaignIn, CampaignOut, PriceTierOut, SpaceTypeIn, SpaceTypeOut
from app.services import catalog_service

router = APIRouter(tags=["Admin · Catalog"])


def _space_type_out(space_type: SpaceType, occupied: set[int]) -> SpaceTypeOut:
    # Desks are shared, so only a room can be "taken".
    is_available = not (space_type.pricing_mode == PER_ROOM and space_type.id in occupied)
    return SpaceTypeOut(
        id=space_type.id,
        name=space_type.name,
        description=space_type.description,
        capacity=space_type.capacity,
        pricing_mode=space_type.pricing_mode,
        price_tiers=[PriceTierOut.model_validate(t) for t in space_type.price_tiers],
        is_available=is_available,
    )


@router.get(
    "/space-types",
    response_model=list[SpaceTypeOut],
    summary="Space types with price tiers",
    description="Pass `available=true` at check-in to hide rooms that are currently occupied.",
)
def list_space_types(db: DbSession, available: bool = False):
    occupied = session_repo.occupied_space_type_ids(db)
    result = [_space_type_out(s, occupied) for s in space_type_repo.list_active(db)]
    return [s for s in result if s.is_available] if available else result


@router.post(
    "/space-types",
    response_model=SpaceTypeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a space type with its price list",
)
def create_space_type(payload: SpaceTypeIn, db: DbSession):
    return _space_type_out(catalog_service.create_space_type(db, payload), set())


@router.put(
    "/space-types/{space_type_id}",
    response_model=SpaceTypeOut,
    summary="Update a space type and replace its price list",
    description="Sessions that are already closed keep the price they were billed.",
)
def update_space_type(space_type_id: int, payload: SpaceTypeIn, db: DbSession):
    space_type = catalog_service.update_space_type(db, space_type_id, payload)
    return _space_type_out(space_type, session_repo.occupied_space_type_ids(db))


@router.delete(
    "/space-types/{space_type_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a space type",
    description="Refused while someone is seated there. Past sessions are kept.",
)
def remove_space_type(space_type_id: int, db: DbSession) -> None:
    catalog_service.remove_space_type(db, space_type_id)


@router.get(
    "/campaigns",
    response_model=list[CampaignOut],
    summary="Campaigns",
    description=(
        "Active campaigns by default (what the owner can pick at checkout). "
        "Pass `include_inactive=true` to manage all of them."
    ),
)
def list_campaigns(db: DbSession, include_inactive: bool = False):
    return campaign_repo.list_campaigns(db, include_inactive)


@router.post(
    "/campaigns",
    response_model=CampaignOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a campaign",
)
def create_campaign(payload: CampaignIn, db: DbSession):
    return catalog_service.create_campaign(db, payload)


@router.put(
    "/campaigns/{campaign_id}",
    response_model=CampaignOut,
    summary="Update a campaign or switch it on/off",
)
def update_campaign(campaign_id: int, payload: CampaignIn, db: DbSession):
    return catalog_service.update_campaign(db, campaign_id, payload)
