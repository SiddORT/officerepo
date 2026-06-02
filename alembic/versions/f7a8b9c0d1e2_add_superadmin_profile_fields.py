"""add_superadmin_profile_fields

Revision ID: f7a8b9c0d1e2
Revises: 6303e6e4f0f6
Create Date: 2026-06-01 13:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, None] = '6303e6e4f0f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = {c["name"] for c in inspector.get_columns("superadmins")}

    with op.batch_alter_table("superadmins") as batch_op:
        if "first_name" not in existing:
            batch_op.add_column(sa.Column("first_name", sa.String(150), nullable=True))
        if "last_name" not in existing:
            batch_op.add_column(sa.Column("last_name", sa.String(150), nullable=True))
        if "display_name" not in existing:
            batch_op.add_column(sa.Column("display_name", sa.String(255), nullable=True))
        if "avatar_key" not in existing:
            batch_op.add_column(sa.Column("avatar_key", sa.String(500), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("superadmins") as batch_op:
        batch_op.drop_column("avatar_key")
        batch_op.drop_column("display_name")
        batch_op.drop_column("last_name")
        batch_op.drop_column("first_name")
