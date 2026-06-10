"""asset_sub_categories

Revision ID: bb01cc02dd03
Revises: aa01bb02cc03
Create Date: 2026-06-10 00:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'bb01cc02dd03'
down_revision: Union[str, None] = 'aa01bb02cc03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'asset_sub_categories',
        sa.Column('id',                 sa.String(36),  nullable=False),
        sa.Column('sub_category_code',  sa.String(20),  nullable=False),
        sa.Column('sub_category_name',  sa.String(100), nullable=False),
        sa.Column('category_id',        sa.String(36),  nullable=False),
        sa.Column('description',        sa.Text(),      nullable=True),
        sa.Column('is_active',          sa.Boolean(),   nullable=False, server_default='true'),
        sa.Column('created_by',         sa.Integer(),   nullable=True),
        sa.Column('created_at',         sa.DateTime(),  nullable=False),
        sa.Column('updated_at',         sa.DateTime(),  nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['asset_categories.id'],
                                ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('sub_category_code', 'category_id',
                            name='uq_asset_subcat_code_cat'),
        sa.UniqueConstraint('sub_category_name', 'category_id',
                            name='uq_asset_subcat_name_cat'),
    )
    op.create_index('ix_asset_sub_categories_category_id',
                    'asset_sub_categories', ['category_id'])
    op.create_index('ix_asset_sub_categories_is_active',
                    'asset_sub_categories', ['is_active'])
    op.create_index('ix_asset_sub_categories_cat_active',
                    'asset_sub_categories', ['category_id', 'is_active'])


def downgrade() -> None:
    op.drop_index('ix_asset_sub_categories_cat_active',  table_name='asset_sub_categories')
    op.drop_index('ix_asset_sub_categories_is_active',   table_name='asset_sub_categories')
    op.drop_index('ix_asset_sub_categories_category_id', table_name='asset_sub_categories')
    op.drop_table('asset_sub_categories')
