from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


# ── Password Policy ────────────────────────────────────────────────────────────

class PasswordPolicyUpdate(BaseModel):
    min_length: Optional[int] = Field(None, ge=8, le=128)
    max_length: Optional[int] = Field(None, ge=8, le=128)
    require_uppercase: Optional[bool] = None
    require_lowercase: Optional[bool] = None
    require_number: Optional[bool] = None
    require_special_char: Optional[bool] = None
    expiry_days: Optional[int] = Field(None, ge=0, le=3650)
    prevent_reuse: Optional[bool] = None
    history_count: Optional[int] = Field(None, ge=0, le=24)
    force_change_on_first_login: Optional[bool] = None

    @model_validator(mode="after")
    def min_le_max(self):
        mn = self.min_length
        mx = self.max_length
        if mn is not None and mx is not None and mn > mx:
            raise ValueError("min_length must be ≤ max_length")
        return self


class PasswordPolicyResponse(BaseModel):
    id: str
    min_length: int
    max_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_number: bool
    require_special_char: bool
    expiry_days: int
    prevent_reuse: bool
    history_count: int
    force_change_on_first_login: bool
    updated_by: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Login Policy ───────────────────────────────────────────────────────────────

class LoginPolicyUpdate(BaseModel):
    max_failed_attempts: Optional[int] = Field(None, ge=1, le=20)
    lock_duration_minutes: Optional[int] = Field(None, ge=1, le=1440)
    captcha_after_attempts: Optional[int] = Field(None, ge=1, le=20)
    allow_concurrent_logins: Optional[bool] = None
    allow_multiple_devices: Optional[bool] = None
    remember_me_days: Optional[int] = Field(None, ge=0, le=365)
    force_logout_on_password_change: Optional[bool] = None


class LoginPolicyResponse(BaseModel):
    id: str
    max_failed_attempts: int
    lock_duration_minutes: int
    captcha_after_attempts: int
    allow_concurrent_logins: bool
    allow_multiple_devices: bool
    remember_me_days: int
    force_logout_on_password_change: bool
    updated_by: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Session Policy ─────────────────────────────────────────────────────────────

class SessionPolicyUpdate(BaseModel):
    access_token_expiry_minutes: Optional[int] = Field(None, ge=5, le=1440)
    refresh_token_expiry_days: Optional[int] = Field(None, ge=1, le=365)
    session_timeout_minutes: Optional[int] = Field(None, ge=5, le=1440)
    idle_timeout_minutes: Optional[int] = Field(None, ge=1, le=480)
    max_sessions_per_user: Optional[int] = Field(None, ge=1, le=50)


class SessionPolicyResponse(BaseModel):
    id: str
    access_token_expiry_minutes: int
    refresh_token_expiry_days: int
    session_timeout_minutes: int
    idle_timeout_minutes: int
    max_sessions_per_user: int
    updated_by: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# ── 2FA Policy ─────────────────────────────────────────────────────────────────

VALID_ENFORCEMENT_MODES = {"optional", "mandatory_all", "mandatory_admin", "mandatory_selected"}
VALID_2FA_METHODS = {"email_otp", "totp", "sms_otp", "backup_codes"}
VALID_GRACE_DAYS = {0, 3, 7, 15, 30}


class TwoFAPolicyUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    enforcement_mode: Optional[str] = None
    allowed_methods: Optional[List[str]] = None
    grace_period_days: Optional[int] = None
    allow_recovery_codes: Optional[bool] = None
    allow_admin_reset: Optional[bool] = None
    allow_backup_email: Optional[bool] = None

    @model_validator(mode="after")
    def validate_fields(self):
        if self.enforcement_mode and self.enforcement_mode not in VALID_ENFORCEMENT_MODES:
            raise ValueError(f"enforcement_mode must be one of {VALID_ENFORCEMENT_MODES}")
        if self.allowed_methods is not None:
            bad = [m for m in self.allowed_methods if m not in VALID_2FA_METHODS]
            if bad:
                raise ValueError(f"Unknown 2FA methods: {bad}")
        if self.grace_period_days is not None and self.grace_period_days not in VALID_GRACE_DAYS:
            raise ValueError(f"grace_period_days must be one of {VALID_GRACE_DAYS}")
        return self


class TwoFAPolicyResponse(BaseModel):
    id: str
    is_enabled: bool
    enforcement_mode: str
    allowed_methods: List[str]
    grace_period_days: int
    allow_recovery_codes: bool
    allow_admin_reset: bool
    allow_backup_email: bool
    updated_by: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Notification Policy ────────────────────────────────────────────────────────

VALID_NOTIF_CHANNELS = {"email", "sms", "whatsapp", "push"}


class NotificationPolicyUpdate(BaseModel):
    notify_login_success: Optional[bool] = None
    notify_login_failure: Optional[bool] = None
    notify_account_locked: Optional[bool] = None
    notify_password_changed: Optional[bool] = None
    notify_password_reset: Optional[bool] = None
    notify_2fa_enabled: Optional[bool] = None
    notify_2fa_disabled: Optional[bool] = None
    notify_new_device: Optional[bool] = None
    notify_new_location: Optional[bool] = None
    notification_channel: Optional[str] = None

    @model_validator(mode="after")
    def validate_channel(self):
        if self.notification_channel and self.notification_channel not in VALID_NOTIF_CHANNELS:
            raise ValueError(f"notification_channel must be one of {VALID_NOTIF_CHANNELS}")
        return self


class NotificationPolicyResponse(BaseModel):
    id: str
    notify_login_success: bool
    notify_login_failure: bool
    notify_account_locked: bool
    notify_password_changed: bool
    notify_password_reset: bool
    notify_2fa_enabled: bool
    notify_2fa_disabled: bool
    notify_new_device: bool
    notify_new_location: bool
    notification_channel: str
    updated_by: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True
