"""Business logic for recording and surfacing CORS rejections — service layer."""
import logging

from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.core.cors import mask_origin
from backend.app.database.platform import SessionLocal
from backend.app.modules.cors_report import repository
from backend.app.modules.cors_report.schemas import (
    CorsRejectionItem,
    CorsRejectionsResponse,
)

logger = logging.getLogger(__name__)


def record_rejection_event(origin: str, method: str, path: str) -> None:
    """Persist a single CORS rejection, fully guarded so it can never break
    request handling. Opens (and closes) its own DB session.

    The *origin* is masked/truncated before storage — it is attacker-controlled
    and must never be persisted verbatim beyond the truncation guard.
    """
    masked = mask_origin(origin)
    db = SessionLocal()
    try:
        repository.upsert_rejection(db, masked, method, path)
        # Bound the table after every write so an attacker-controlled Origin
        # header can never grow it without limit.
        repository.prune_rejections(
            db,
            retention_days=settings.CORS_REJECTION_RETENTION_DAYS,
            max_origins=settings.CORS_REJECTION_MAX_ORIGINS,
        )
    except Exception as exc:  # pragma: no cover - defensive, never raise
        logger.warning("cors_report: could not persist rejection: %s", exc)
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()


def _iso(dt) -> str | None:
    return dt.isoformat() if dt is not None else None


def get_rejections(db: Session, limit: int = 100) -> CorsRejectionsResponse:
    """Return recorded rejections (most-recent first) plus aggregate totals."""
    rows = repository.list_rejections(db, limit=limit)
    distinct_origins, total_hits = repository.totals(db)
    items = [
        CorsRejectionItem(
            origin=r.origin,
            hit_count=r.hit_count,
            last_method=r.last_method,
            last_path=r.last_path,
            first_seen_at=_iso(r.first_seen_at),
            last_seen_at=_iso(r.last_seen_at),
        )
        for r in rows
    ]
    return CorsRejectionsResponse(
        distinct_origins=distinct_origins,
        total_hits=total_hits,
        items=items,
    )
