"""add_organization_settings

Revision ID: 6303e6e4f0f6
Revises: d1e2f3a4b5c6
Create Date: 2026-06-01 11:57:28.064565

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = '6303e6e4f0f6'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "organization_settings" not in inspector.get_table_names():
        op.create_table(
            "organization_settings",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("org_name", sa.String(255), nullable=False, server_default=""),
            sa.Column("legal_entity_name", sa.String(255), nullable=False, server_default=""),
            sa.Column("org_code", sa.String(100), nullable=False, server_default=""),
            sa.Column("website", sa.String(500), nullable=True),
            sa.Column("gst_number", sa.String(50), nullable=True),
            sa.Column("company_registration_number", sa.String(100), nullable=True),
            sa.Column("support_email", sa.String(255), nullable=False, server_default=""),
            sa.Column("sales_email", sa.String(255), nullable=True),
            sa.Column("billing_email", sa.String(255), nullable=True),
            sa.Column("support_phone", sa.String(30), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.Column("updated_by", sa.String(255), nullable=True),
        )


def downgrade() -> None:
    op.drop_table("organization_settings")
