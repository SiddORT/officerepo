"""merge_heads

Revision ID: 5940938b0c7f
Revises: 09bec156d38a, a511bdef9189
Create Date: 2026-06-20 10:31:06.576003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '5940938b0c7f'
down_revision: Union[str, None] = ('09bec156d38a', 'a511bdef9189')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
