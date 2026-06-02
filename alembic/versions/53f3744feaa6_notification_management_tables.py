"""notification_management_tables

Revision ID: 53f3744feaa6
Revises: a2b3c4d5e6f7
Create Date: 2026-06-02 06:59:03.505959

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '53f3744feaa6'
down_revision: Union[str, None] = 'a2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notification_channel_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('config_enc', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_by', sa.String(255), nullable=True),
        sa.UniqueConstraint('channel', name='uq_notif_channel'),
    )

    op.create_table(
        'notification_templates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('variables', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('is_system', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.UniqueConstraint('channel', 'slug', name='uq_notif_tmpl_channel_slug'),
    )

    op.create_table(
        'notification_event_rules',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('event_name', sa.String(100), nullable=False),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('template_id', sa.String(36),
                  sa.ForeignKey('notification_templates.id', ondelete='SET NULL'),
                  nullable=True),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('recipient_type', sa.String(50), nullable=False, server_default=sa.text("'admin'")),
        sa.Column('priority', sa.String(20), nullable=False, server_default=sa.text("'normal'")),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_by', sa.String(255), nullable=True),
        sa.UniqueConstraint('event_name', 'channel', name='uq_notif_event_channel'),
    )

    op.create_table(
        'notification_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('event_name', sa.String(100), nullable=True),
        sa.Column('template_id', sa.String(36), nullable=True),
        sa.Column('recipient', sa.String(500), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'queued'")),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('queued_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('failed_at', sa.DateTime(), nullable=True),
        sa.Column('meta_json', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('notification_logs')
    op.drop_table('notification_event_rules')
    op.drop_table('notification_templates')
    op.drop_table('notification_channel_configs')
