"""security_settings_tables

Revision ID: b2c3d4e5f6a7
Revises: 53f3744feaa6
Create Date: 2026-06-02

"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '53f3744feaa6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = op.get_bind().dialect.get_table_names(op.get_bind())

    if 'security_password_policy' not in inspector:
        op.create_table(
            'security_password_policy',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('min_length', sa.Integer(), nullable=False, server_default='8'),
            sa.Column('max_length', sa.Integer(), nullable=False, server_default='128'),
            sa.Column('require_uppercase', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('require_lowercase', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('require_number', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('require_special_char', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('expiry_days', sa.Integer(), nullable=False, server_default='90'),
            sa.Column('prevent_reuse', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('history_count', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('force_change_on_first_login', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('updated_by', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    if 'security_login_policy' not in inspector:
        op.create_table(
            'security_login_policy',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('max_failed_attempts', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('lock_duration_minutes', sa.Integer(), nullable=False, server_default='30'),
            sa.Column('captcha_after_attempts', sa.Integer(), nullable=False, server_default='3'),
            sa.Column('allow_concurrent_logins', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('allow_multiple_devices', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('remember_me_days', sa.Integer(), nullable=False, server_default='30'),
            sa.Column('force_logout_on_password_change', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('updated_by', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    if 'security_session_policy' not in inspector:
        op.create_table(
            'security_session_policy',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('access_token_expiry_minutes', sa.Integer(), nullable=False, server_default='60'),
            sa.Column('refresh_token_expiry_days', sa.Integer(), nullable=False, server_default='7'),
            sa.Column('session_timeout_minutes', sa.Integer(), nullable=False, server_default='60'),
            sa.Column('idle_timeout_minutes', sa.Integer(), nullable=False, server_default='30'),
            sa.Column('max_sessions_per_user', sa.Integer(), nullable=False, server_default='5'),
            sa.Column('updated_by', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    if 'security_2fa_policy' not in inspector:
        op.create_table(
            'security_2fa_policy',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('is_enabled', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('enforcement_mode', sa.String(50), nullable=False, server_default='optional'),
            sa.Column('allowed_methods', sa.Text(), nullable=False, server_default='["email_otp"]'),
            sa.Column('grace_period_days', sa.Integer(), nullable=False, server_default='7'),
            sa.Column('allow_recovery_codes', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('allow_admin_reset', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('allow_backup_email', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('updated_by', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )

    if 'security_notification_policy' not in inspector:
        op.create_table(
            'security_notification_policy',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('notify_login_success', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('notify_login_failure', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_account_locked', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_password_changed', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_password_reset', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_2fa_enabled', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_2fa_disabled', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_new_device', sa.Boolean(), nullable=False, server_default='true'),
            sa.Column('notify_new_location', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('notification_channel', sa.String(20), nullable=False, server_default='email'),
            sa.Column('updated_by', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
        )


def downgrade() -> None:
    op.drop_table('security_notification_policy')
    op.drop_table('security_2fa_policy')
    op.drop_table('security_session_policy')
    op.drop_table('security_login_policy')
    op.drop_table('security_password_policy')
