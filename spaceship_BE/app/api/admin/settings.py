from fastapi import APIRouter

from app.db.session import DbSession
from app.schemas.catalog import SettingOut, SettingUpdate
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["Admin · Settings"])


@router.get("", response_model=list[SettingOut], summary="Thresholds the owner can tune")
def list_settings(db: DbSession):
    return [SettingOut(key=k, value=v) for k, v in settings_service.get_all(db).items()]


@router.put("/{key}", response_model=SettingOut, summary="Change a threshold")
def update_setting(key: str, payload: SettingUpdate, db: DbSession):
    return SettingOut(key=key, value=settings_service.set_value(db, key, payload.value))
