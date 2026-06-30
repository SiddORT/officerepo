"""merge_district_branch_into_main

Revision ID: a4446dc13c91
Revises: 115eedde2174, 55d3c3163e77
Create Date: 2026-06-30 12:15:30.681286

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a4446dc13c91'
down_revision: Union[str, None] = ('115eedde2174', '55d3c3163e77')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
