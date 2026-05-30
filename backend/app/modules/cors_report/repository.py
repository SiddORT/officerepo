"""DB queries for CORS rejections — repository layer (queries only)."""
from datetime import datetime, timezone

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.modules.cors_report.models import CorsRejection


def upsert_rejection(db: Session, origin: str, method: str, path: str) -> None:
    """Record a rejection for *origin*, incrementing its counter (one row per
    origin). The most recent method/path become the stored sample."""
    now = datetime.now(tz=timezone.utc).replace(tzinfo=None)
    row = (
        db.query(CorsRejection)
        .filter(CorsRejection.origin == origin)
        .first()
    )
    if row is None:
        row = CorsRejection(
            origin=origin,
            hit_count=1,
            last_method=method,
            last_path=path,
            first_seen_at=now,
            last_seen_at=now,
        )
        db.add(row)
    else:
        row.hit_count = (row.hit_count or 0) + 1
        row.last_method = method
        row.last_path = path
        row.last_seen_at = now
    db.commit()


def list_rejections(db: Session, limit: int = 100) -> list[CorsRejection]:
    """Return rejection rows, most-recently-seen first."""
    return (
        db.query(CorsRejection)
        .order_by(desc(CorsRejection.last_seen_at))
        .limit(limit)
        .all()
    )


def totals(db: Session) -> tuple[int, int]:
    """Return ``(distinct_origins, total_hits)`` across all recorded rejections."""
    distinct_origins = db.query(func.count(CorsRejection.id)).scalar() or 0
    total_hits = db.query(func.coalesce(func.sum(CorsRejection.hit_count), 0)).scalar() or 0
    return int(distinct_origins), int(total_hits)
