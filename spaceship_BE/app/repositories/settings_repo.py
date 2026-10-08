from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Setting


def get(db: Session, key: str) -> Setting | None:
    return db.scalar(select(Setting).where(Setting.key == key))


def list_all(db: Session) -> list[Setting]:
    return list(db.scalars(select(Setting)))
