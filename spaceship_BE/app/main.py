from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, public
from app.core.config import get_settings
from app.core.exceptions import AppError

settings = get_settings()

app = FastAPI(
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url="/redoc" if settings.enable_docs else None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
    title="SpaceShip API",
    version="0.1.0",
    description=(
        "Check-in / check-out, pricing and loyalty points for a study space.\n\n"
        "- **/admin/*** — owner only, HTTP Basic Auth (use the **Authorize** button).\n"
        "- **/s/{token}** — a customer's read-only view via their magic link."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(admin.router)
app.include_router(public.router)
