"""asset_masters

Revision ID: cc01dd02ee03
Revises: bb01cc02dd03
Create Date: 2026-06-10 00:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'cc01dd02ee03'
down_revision: Union[str, None] = 'bb01cc02dd03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'asset_masters',
        sa.Column('id',              sa.String(36),   nullable=False),
        sa.Column('asset_code',      sa.String(30),   nullable=False),
        sa.Column('asset_name',      sa.String(150),  nullable=False),
        sa.Column('category_id',     sa.String(36),   nullable=False),
        sa.Column('sub_category_id', sa.String(36),   nullable=True),
        sa.Column('brand',           sa.String(100),  nullable=True),
        sa.Column('model_number',    sa.String(100),  nullable=True),
        sa.Column('manufacturer',    sa.String(150),  nullable=True),
        sa.Column('specifications',  sa.Text(),       nullable=True),
        sa.Column('warranty_period_months',       sa.Integer(),      nullable=True),
        sa.Column('asset_image_url',              sa.String(500),    nullable=True),
        sa.Column('purchase_cost',                sa.Numeric(14, 2), nullable=True),
        sa.Column('expected_life_years',          sa.Integer(),      nullable=True),
        sa.Column('depreciation_applicable',      sa.Boolean(),      nullable=False,
                  server_default='false'),
        sa.Column('serial_number_required',       sa.Boolean(),      nullable=False,
                  server_default='false'),
        sa.Column('warranty_tracking_enabled',    sa.Boolean(),      nullable=False,
                  server_default='false'),
        sa.Column('maintenance_tracking_enabled', sa.Boolean(),      nullable=False,
                  server_default='false'),
        sa.Column('is_active',   sa.Boolean(),  nullable=False, server_default='true'),
        sa.Column('created_by',  sa.Integer(),  nullable=True),
        sa.Column('created_at',  sa.DateTime(), nullable=False),
        sa.Column('updated_at',  sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['asset_categories.id'],
                                ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['sub_category_id'], ['asset_sub_categories.id'],
                                ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('asset_code'),
    )
    op.create_index('ix_asset_masters_asset_code',  'asset_masters', ['asset_code'])
    op.create_index('ix_asset_masters_category_id', 'asset_masters', ['category_id'])
    op.create_index('ix_asset_masters_is_active',   'asset_masters', ['is_active'])
    op.create_index('ix_asset_masters_cat_subcat',  'asset_masters',
                    ['category_id', 'sub_category_id'])


def downgrade() -> None:
    op.drop_index('ix_asset_masters_cat_subcat',  table_name='asset_masters')
    op.drop_index('ix_asset_masters_is_active',   table_name='asset_masters')
    op.drop_index('ix_asset_masters_category_id', table_name='asset_masters')
    op.drop_index('ix_asset_masters_asset_code',  table_name='asset_masters')
    op.drop_table('asset_masters')
