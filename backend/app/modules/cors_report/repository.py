"""DB queries for CORS rejections — repository layer (queries only)."""
from datetime import datetime, timedelta, timezone

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


def prune_rejections(
    db: Session,
    retention_days: int | None = None,
    max_origins: int | None = None,
) -> int:
    """Bound the cors_rejections table so an attacker-controlled Origin header
    cannot grow it forever.

    Two complementary, independently-toggleable strategies (each disabled when
    its argument is falsy / non-positive):

    - *retention_days*: delete rows whose ``last_seen_at`` is older than the
      window (time-based expiry).
    - *max_origins*: keep only the ``max_origins`` most-recently-seen rows,
      evicting the least-recently-seen beyond the cap.

    Returns the number of rows deleted. Commits when anything was removed.
    """
    removed = 0

    if retention_days and retention_days > 0:
        cutoff = (
            datetime.now(tz=timezone.utc).replace(tzinfo=None)
            - timedelta(days=retention_days)
        )
        removed += (
            db.query(CorsRejection)
            .filter(CorsRejection.last_seen_at < cutoff)
            .delete(synchronize_session=False)
        )

    if max_origins and max_origins > 0:
        keep_ids = [
            row_id
            for (row_id,) in (
                db.query(CorsRejection.id)
                .order_by(desc(CorsRejection.last_seen_at))
                .limit(max_origins)
                .all()
            )
        ]
        if keep_ids:
            removed += (
                db.query(CorsRejection)
                .filter(CorsRejection.id.notin_(keep_ids))
                .delete(synchronize_session=False)
            )

    if removed:
        db.commit()
    return removed


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
