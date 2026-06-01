"""MigrationService — tracked, audited schema migration runner.

Replaces the old bare ``run_schema_migrations()`` function in ``main.py``.

Status semantics
----------------
success  — statement executed and committed cleanly.
failed   — statement raised an exception; full error stored in error_message.
           Failed rows are retried on the next startup.
skipped  — migration_key already has a ``success`` row; printed to console,
           no new DB row written (the success row is the permanent record).

Alembic integration path
------------------------
``_execute_sql`` is the only place raw SQL is executed. When Alembic is
adopted:
  1. Install alembic, create alembic.ini + env.py targeting Base.metadata.
  2. Convert each Migration in the registry to an Alembic revision file.
  3. Replace ``_execute_sql`` calls with Alembic op-runner invocations.
  4. Keep ``_record`` unchanged — audit logging remains in schema_migrations.

SQLAlchemy 2.0 notes
---------------------
This module uses the SQLAlchemy 2.0 execute-within-connection style:
``with engine.connect() as conn: conn.execute(text(sql)); conn.commit()``
Each statement is committed individually so a failure on statement N
doesn't roll back the successful work of statements 1..N-1.
"""

import logging
import time
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from backend.app.database.migrations.model import SchemaMigration
from backend.app.database.platform import SessionLocal

logger = logging.getLogger(__name__)

STATUS_SUCCESS = "success"
STATUS_FAILED = "failed"
STATUS_SKIPPED = "skipped"


@dataclass(frozen=True)
class Migration:
    """A single idempotent schema change unit.

    Attributes
    ----------
    key:   Stable unique identifier (snake_case). Never change a key once
           committed — the key is the primary record that "this migration ran".
    name:  Human-readable description surfaced in logs and the audit table.
    sql:   Raw SQL to execute. Must be idempotent (IF NOT EXISTS / IF EXISTS).
    """

    key: str
    name: str
    sql: str


class MigrationService:
    """Run a sequence of named, tracked migrations against the platform DB.

    Usage::

        from backend.app.database.migrations.service import MigrationService
        from backend.app.database.migrations.registry import MIGRATIONS
        from backend.app.database.platform import engine

        MigrationService(engine, MIGRATIONS, app_version="1.0.0").run_migrations()

    The service is stateless between runs — all state lives in the DB.
    """

    def __init__(
        self,
        engine: Engine,
        migrations: Sequence[Migration],
        app_version: Optional[str] = None,
    ) -> None:
        self._engine = engine
        self._migrations = list(migrations)
        self._app_version = app_version

    def run_migrations(self) -> None:
        """Execute all registered migrations, logging every outcome to the DB.

        Idempotent: already-successful migrations are skipped. Failed
        migrations are retried and their row updated with the new outcome.
        Execution continues past individual failures so a bad statement does
        not block subsequent migrations.
        """
        db: Session = SessionLocal()
        try:
            done = self._successful_keys(db)

            total = len(self._migrations)
            n_ok = n_skip = n_fail = 0

            for migration in self._migrations:
                if migration.key in done:
                    n_skip += 1
                    logger.debug("[migration] skipped (already applied): %s", migration.key)
                    continue

                ok, elapsed_ms, error = self._execute_sql(migration.sql)

                if ok:
                    n_ok += 1
                    self._record(db, migration, STATUS_SUCCESS, elapsed_ms, None)
                    logger.info(
                        "[migration] success (%.1f ms): %s", elapsed_ms, migration.name
                    )
                else:
                    n_fail += 1
                    self._record(db, migration, STATUS_FAILED, elapsed_ms, error)
                    logger.error(
                        "[migration] FAILED: %s\n"
                        "  key:   %s\n"
                        "  sql:   %s\n"
                        "  error: %s",
                        migration.name,
                        migration.key,
                        migration.sql,
                        error,
                    )

            print(
                f"Schema migrations complete — "
                f"{n_ok} applied, {n_skip} skipped, {n_fail} failed "
                f"(of {total} registered)."
            )
            if n_fail:
                print(
                    f"  WARNING: {n_fail} migration(s) failed. "
                    "Check the schema_migrations table or logs for details."
                )

        finally:
            db.close()

    def _execute_sql(self, sql: str):
        """Execute one SQL statement in its own connection + commit.

        Returns (success: bool, elapsed_ms: float, error: str|None).
        Each statement commits independently so prior successes are preserved
        even if this one fails.
        """
        start = time.monotonic()
        try:
            with self._engine.connect() as conn:
                conn.execute(text(sql))
                conn.commit()
            elapsed_ms = (time.monotonic() - start) * 1000
            return True, round(elapsed_ms, 2), None
        except Exception as exc:
            elapsed_ms = (time.monotonic() - start) * 1000
            error_detail = f"{type(exc).__name__}: {exc}"
            return False, round(elapsed_ms, 2), error_detail

    def _record(
        self,
        db: Session,
        migration: Migration,
        status: str,
        elapsed_ms: float,
        error: Optional[str],
    ) -> None:
        """Upsert one row in schema_migrations for this migration_key."""
        existing = (
            db.query(SchemaMigration)
            .filter(SchemaMigration.migration_key == migration.key)
            .first()
        )
        now = datetime.utcnow()
        if existing:
            existing.migration_name = migration.name
            existing.migration_sql = migration.sql
            existing.status = status
            existing.applied_at = now
            existing.execution_time_ms = elapsed_ms
            existing.error_message = error
            existing.app_version = self._app_version
        else:
            db.add(
                SchemaMigration(
                    migration_key=migration.key,
                    migration_name=migration.name,
                    migration_sql=migration.sql,
                    status=status,
                    applied_at=now,
                    execution_time_ms=elapsed_ms,
                    error_message=error,
                    app_version=self._app_version,
                )
            )
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning(
                "[migration] could not persist audit row for %s: %s",
                migration.key,
                exc,
            )

    @staticmethod
    def _successful_keys(db: Session) -> set:
        rows = (
            db.query(SchemaMigration.migration_key)
            .filter(SchemaMigration.status == STATUS_SUCCESS)
            .all()
        )
        return {row.migration_key for row in rows}
