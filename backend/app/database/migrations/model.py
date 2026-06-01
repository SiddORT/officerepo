from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from backend.app.database.platform import Base


class SchemaMigration(Base):
    """Audit log for every schema migration statement executed at startup.

    One row per ``migration_key``. Status starts as ``failed`` and is updated
    to ``success`` once the statement commits cleanly. Already-successful
    migrations are skipped on subsequent startups (console only, no new row).

    Alembic integration path
    ------------------------
    When Alembic is adopted, point ``alembic/env.py`` at the same
    ``Base.metadata`` so this table is included in autogenerate targets.
    Alembic's own ``alembic_version`` table (single-row version pointer) will
    coexist alongside this audit table; they serve different purposes:

    * ``alembic_version``    — which migration HEAD the schema is at
    * ``schema_migrations``  — when/how each statement ran, with timing + errors

    The MigrationService abstraction (``service.py``) is the seam:
    replace ``_execute_sql`` with Alembic's op-runner and keep the audit
    logging unchanged.
    """

    __tablename__ = "schema_migrations"

    id = Column(Integer, primary_key=True, autoincrement=True)

    migration_key = Column(String(120), unique=True, nullable=False, index=True)
    migration_name = Column(String(255), nullable=False)
    migration_sql = Column(Text, nullable=False)

    status = Column(String(20), nullable=False, index=True)
    applied_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    execution_time_ms = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    app_version = Column(String(40), nullable=True)
