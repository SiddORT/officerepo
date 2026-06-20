"""add_parent_module_code_to_module_master

Revision ID: 09bec156d38a
Revises: ffbfbee23af8
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '09bec156d38a'
down_revision: Union[str, None] = 'ffbfbee23af8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'module_master',
        sa.Column('parent_module_code', sa.String(80), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('module_master', 'parent_module_code')
