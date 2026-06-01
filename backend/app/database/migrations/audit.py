"""Lightweight audit helper for schema migration events.

Writes one row to ``schema_migrations`` per migration execution.
Never raises — a logging failure must not abort a migration run.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

STATUS_SUCCESS = "SUCCESS"
STATUS_FAILED = "FAILED"
STATUS_SKIPPED = "SKIPPED"


def record(
    db_engine,
    *,
    migration_version: str,
    migration_name: str,
    database_name: Optional[str],
    status: str,
    started_at: datetime,
    completed_at: Optional[datetime] = None,
    execution_time_ms: Optional[float] = None,
    error_message: Optional[str] = None,
    application_version: Optional[str] = None,
) -> None:
    """Insert one audit row into ``schema_migrations``.

    All parameters are keyword-only to prevent positional-argument mistakes.
    Safe to call from any context; swallows and logs all exceptions.
    """
    try:
        from sqlalchemy.orm import Session
        from backend.app.database.migrations.model import SchemaMigration

        with Session(db_engine) as session:
            row = SchemaMigration(
                migration_version=migration_version,
                migration_name=migration_name,
                database_name=database_name,
                status=status,
                started_at=started_at,
                completed_at=completed_at or datetime.now(tz=timezone.utc),
                execution_time_ms=execution_time_ms,
                error_message=error_message,
                application_version=application_version,
            )
            session.add(row)
            session.commit()
    except Exception as exc:
        logger.warning(
            "schema_migrations audit write failed (non-fatal): %s", exc
        )
