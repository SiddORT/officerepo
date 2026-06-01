from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text

from backend.app.database.platform import Base


class SchemaMigration(Base):
    """Operational audit log for Alembic migration executions.

    Alembic's ``alembic_version`` table remains the authoritative schema-version
    pointer.  This table records *when* and *how* each migration ran so operators
    can answer questions like "which migrations were applied on this deployment?",
    "did anything fail?", and "how long did the schema upgrade take?".

    One row is written per migration execution:
      * SUCCESS  — migration applied cleanly
      * FAILED   — migration raised an exception (error_message is populated)
      * SKIPPED  — migration was already present on the target database
                   (used in the future multi-client DB scenario)

    The ``database_name`` column is populated with the target DB name, making
    the table ready for a future architecture where migrations run against
    multiple per-client databases — each DB gets its own rows here on the
    platform DB, keyed by database_name + migration_version.

    ``alembic_version``  — single-row pointer to current HEAD (Alembic-managed)
    ``schema_migrations`` — append-only audit log of every migration run
    """

    __tablename__ = "schema_migrations"

    id = Column(Integer, primary_key=True, autoincrement=True)

    migration_version = Column(String(40), nullable=False, index=True)
    migration_name = Column(String(255), nullable=False)
    database_name = Column(String(255), nullable=True)

    status = Column(String(20), nullable=False, index=True)

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    application_version = Column(String(40), nullable=True)
