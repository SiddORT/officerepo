"""superadmin_preferences

Revision ID: a2b3c4d5e6f7
Revises: f7a8b9c0d1e2
Create Date: 2026-06-02 00:00:00.000000

Per-superadmin general preferences table.
One row per admin (unique constraint on admin_id).
Created lazily on first GET; all fields have server-side defaults.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a2b3c4d5e6f7"
down_revision = "f7a8b9c0d1e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    insp = sa.inspect(op.get_bind())
    existing_tables = insp.get_table_names()

    if "superadmin_preferences" in existing_tables:
        return

    op.create_table(
        "superadmin_preferences",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "admin_id",
            sa.Integer,
            sa.ForeignKey("superadmins.id", ondelete="CASCADE"),
            unique=True,
            nullable=False,
        ),
        sa.Column("theme", sa.String(20), nullable=False, server_default="system"),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("timezone", sa.String(100), nullable=False, server_default="UTC"),
        sa.Column("date_format", sa.String(20), nullable=False, server_default="DD/MM/YYYY"),
        sa.Column("time_format", sa.String(5), nullable=False, server_default="12h"),
        sa.Column("week_start_day", sa.String(10), nullable=False, server_default="monday"),
        sa.Column(
            "default_landing_page", sa.String(100), nullable=False, server_default="/dashboard"
        ),
        sa.Column("table_page_size", sa.Integer, nullable=False, server_default="25"),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_superadmin_preferences_admin_id",
        "superadmin_preferences",
        ["admin_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_superadmin_preferences_admin_id", table_name="superadmin_preferences")
    op.drop_table("superadmin_preferences")
