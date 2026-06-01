"""Reshape schema_migrations into an Alembic-native audit log.

Replaces the legacy manual-migration columns (migration_key, migration_sql,
applied_at, app_version) with the Alembic-aware set: migration_version,
database_name, started_at, completed_at, application_version.

The table has never had production data written to it (the old MigrationService
was never wired up), so all column changes are non-destructive in practice.

Revision ID: d1e2f3a4b5c6
Revises:     a1b2c3d4e5f6
"""

from alembic import op
import sqlalchemy as sa

revision = "d1e2f3a4b5c6"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Drop legacy columns ──────────────────────────────────────────────────
    with op.batch_alter_table("schema_migrations") as batch_op:
        batch_op.drop_index("ix_schema_migrations_migration_key")
        batch_op.drop_column("migration_key")
        batch_op.drop_column("migration_sql")
        batch_op.drop_column("applied_at")
        batch_op.drop_column("app_version")

    # ── Add new audit columns ─────────────────────────────────────────────────
    with op.batch_alter_table("schema_migrations") as batch_op:
        batch_op.add_column(
            sa.Column("migration_version", sa.String(40), nullable=False,
                      server_default="unknown")
        )
        batch_op.add_column(
            sa.Column("database_name", sa.String(255), nullable=True)
        )
        batch_op.add_column(
            sa.Column("started_at", sa.DateTime(), nullable=False,
                      server_default=sa.func.now())
        )
        batch_op.add_column(
            sa.Column("completed_at", sa.DateTime(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("application_version", sa.String(40), nullable=True)
        )
        batch_op.create_index(
            "ix_schema_migrations_migration_version", ["migration_version"]
        )

    # Remove the server_defaults now that the column exists (keeps schema clean)
    with op.batch_alter_table("schema_migrations") as batch_op:
        batch_op.alter_column("migration_version", server_default=None)
        batch_op.alter_column("started_at", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("schema_migrations") as batch_op:
        batch_op.drop_index("ix_schema_migrations_migration_version")
        batch_op.drop_column("application_version")
        batch_op.drop_column("completed_at")
        batch_op.drop_column("started_at")
        batch_op.drop_column("database_name")
        batch_op.drop_column("migration_version")

    with op.batch_alter_table("schema_migrations") as batch_op:
        batch_op.add_column(
            sa.Column("migration_key", sa.String(120), nullable=False,
                      server_default="legacy")
        )
        batch_op.add_column(
            sa.Column("migration_sql", sa.Text(), nullable=False,
                      server_default="")
        )
        batch_op.add_column(
            sa.Column("applied_at", sa.DateTime(), nullable=False,
                      server_default=sa.func.now())
        )
        batch_op.add_column(
            sa.Column("app_version", sa.String(40), nullable=True)
        )
        batch_op.create_index(
            "ix_schema_migrations_migration_key", ["migration_key"], unique=True
        )
