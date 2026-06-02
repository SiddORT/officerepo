from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.platform import Base


class SecurityPasswordPolicy(Base):
    __tablename__ = "security_password_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    min_length: Mapped[int] = mapped_column(Integer, default=8)
    max_length: Mapped[int] = mapped_column(Integer, default=128)
    require_uppercase: Mapped[bool] = mapped_column(Boolean, default=True)
    require_lowercase: Mapped[bool] = mapped_column(Boolean, default=True)
    require_number: Mapped[bool] = mapped_column(Boolean, default=True)
    require_special_char: Mapped[bool] = mapped_column(Boolean, default=True)
    expiry_days: Mapped[int] = mapped_column(Integer, default=90)
    prevent_reuse: Mapped[bool] = mapped_column(Boolean, default=True)
    history_count: Mapped[int] = mapped_column(Integer, default=5)
    force_change_on_first_login: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class SecurityLoginPolicy(Base):
    __tablename__ = "security_login_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    max_failed_attempts: Mapped[int] = mapped_column(Integer, default=5)
    lock_duration_minutes: Mapped[int] = mapped_column(Integer, default=30)
    captcha_after_attempts: Mapped[int] = mapped_column(Integer, default=3)
    allow_concurrent_logins: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_multiple_devices: Mapped[bool] = mapped_column(Boolean, default=True)
    remember_me_days: Mapped[int] = mapped_column(Integer, default=30)
    force_logout_on_password_change: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class SecuritySessionPolicy(Base):
    __tablename__ = "security_session_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    access_token_expiry_minutes: Mapped[int] = mapped_column(Integer, default=60)
    refresh_token_expiry_days: Mapped[int] = mapped_column(Integer, default=7)
    session_timeout_minutes: Mapped[int] = mapped_column(Integer, default=60)
    idle_timeout_minutes: Mapped[int] = mapped_column(Integer, default=30)
    max_sessions_per_user: Mapped[int] = mapped_column(Integer, default=5)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class Security2FAPolicy(Base):
    __tablename__ = "security_2fa_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    enforcement_mode: Mapped[str] = mapped_column(String(50), default="optional")
    allowed_methods: Mapped[str] = mapped_column(Text, default='["email_otp"]')
    grace_period_days: Mapped[int] = mapped_column(Integer, default=7)
    allow_recovery_codes: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_admin_reset: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_backup_email: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class SecurityNotificationPolicy(Base):
    __tablename__ = "security_notification_policy"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default="default")
    notify_login_success: Mapped[bool] = mapped_column(Boolean, default=False)
    notify_login_failure: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_account_locked: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_password_changed: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_password_reset: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_2fa_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_2fa_disabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_new_device: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_new_location: Mapped[bool] = mapped_column(Boolean, default=False)
    notification_channel: Mapped[str] = mapped_column(String(20), default="email")
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
