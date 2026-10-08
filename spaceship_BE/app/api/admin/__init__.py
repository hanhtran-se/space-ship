from fastapi import APIRouter, Depends

from app.api.admin import catalog, customers, sessions, settings
from app.core.security import require_admin

# Every /admin route requires the owner's Basic Auth credentials (BR-7).
router = APIRouter(prefix="/admin", dependencies=[Depends(require_admin)])


@router.get("/me", tags=["Admin · Auth"], summary="Check admin credentials")
def me(username: str = Depends(require_admin)) -> dict[str, str]:
    return {"username": username}


router.include_router(customers.router)
router.include_router(catalog.router)
router.include_router(sessions.router)
router.include_router(settings.router)
