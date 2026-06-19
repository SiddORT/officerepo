"""asset_master: add part_number, depreciation_method; rename expected_life_years->months

Revision ID: a511bdef9189
Revises: ffbfbee23af8
Create Date: 2026-06-19 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "a511bdef9189"
down_revision = "cc01dd02ee03"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("asset_masters", sa.Column("part_number", sa.String(100), nullable=True))
    op.add_column("asset_masters", sa.Column("depreciation_method", sa.String(50), nullable=True))
    op.alter_column("asset_masters", "expected_life_years", new_column_name="expected_life_months")
    op.execute(
        "UPDATE asset_masters SET expected_life_months = expected_life_months * 12 "
        "WHERE expected_life_months IS NOT NULL"
    )


def downgrade():
    op.execute(
        "UPDATE asset_masters SET expected_life_months = ROUND(expected_life_months / 12) "
        "WHERE expected_life_months IS NOT NULL"
    )
    op.alter_column("asset_masters", "expected_life_months", new_column_name="expected_life_years")
    op.drop_column("asset_masters", "depreciation_method")
    op.drop_column("asset_masters", "part_number")
