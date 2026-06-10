"""asset_categories

Revision ID: aa01bb02cc03
Revises: a2ef1b40fab0
Create Date: 2026-06-10 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'aa01bb02cc03'
down_revision: Union[str, None] = 'a2ef1b40fab0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'asset_categories',
        sa.Column('id',            sa.String(36),  nullable=False),
        sa.Column('category_code', sa.String(20),  nullable=False),
        sa.Column('category_name', sa.String(100), nullable=False),
        sa.Column('description',   sa.Text(),      nullable=True),
        sa.Column('icon',          sa.String(10),  nullable=True),
        sa.Column('display_order', sa.Integer(),   nullable=False, server_default='0'),
        sa.Column('is_active',     sa.Boolean(),   nullable=False, server_default='true'),
        sa.Column('created_by',    sa.Integer(),   nullable=True),
        sa.Column('created_at',    sa.DateTime(),  nullable=False),
        sa.Column('updated_at',    sa.DateTime(),  nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('category_code'),
        sa.UniqueConstraint('category_name'),
    )
    op.create_index('ix_asset_categories_category_code',
                    'asset_categories', ['category_code'])
    op.create_index('ix_asset_categories_category_name',
                    'asset_categories', ['category_name'])
    op.create_index('ix_asset_categories_is_active',
                    'asset_categories', ['is_active'])


def downgrade() -> None:
    op.drop_index('ix_asset_categories_is_active',     table_name='asset_categories')
    op.drop_index('ix_asset_categories_category_name', table_name='asset_categories')
    op.drop_index('ix_asset_categories_category_code', table_name='asset_categories')
    op.drop_table('asset_categories')
