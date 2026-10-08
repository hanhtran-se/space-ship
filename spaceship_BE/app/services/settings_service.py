from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.models import Setting
from app.repositories import settings_repo

POINT_THRESHOLD_HOURS = "point_threshold_hours"
ROUNDING_THRESHOLD_MINUTES = "rounding_threshold_minutes"
FULL_DAY_THRESHOLD_HOURS = "full_day_threshold_hours"

# Used until the owner sets a value.
DEFAULTS: dict[str, int] = {
    POINT_THRESHOLD_HOURS: 3,
    ROUNDING_THRESHOLD_MINUTES: 30,
    FULL_DAY_THRESHOLD_HOURS: 8,
}


def get_int(db: Session, key: str) -> int:
    row = settings_repo.get(db, key)
    return int(row.value) if row else DEFAULTS[key]


def get_all(db: Session) -> dict[str, int]:
    values = dict(DEFAULTS)
    for row in settings_repo.list_all(db):
        if row.key in values:
            values[row.key] = int(row.value)
    return values


def set_value(db: Session, key: str, value: int) -> int:
    if key not in DEFAULTS:
        raise NotFoundError(f"Unknown setting '{key}'")
    if key == ROUNDING_THRESHOLD_MINUTES and value > 59:
        raise ValidationError("rounding_threshold_minutes must be between 0 and 59")

    row = settings_repo.get(db, key)
    if row is None:
        db.add(Setting(key=key, value=str(value)))
    else:
        row.value = str(value)
    db.commit()
    return value
