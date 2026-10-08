from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    # All timestamps are stored in UTC; some drivers hand them back without tzinfo.
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
