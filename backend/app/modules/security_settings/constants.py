from enum import Enum

SINGLETON_ID = "default"


class EnforcementMode(str, Enum):
    OPTIONAL = "optional"
    MANDATORY_ALL = "mandatory_all"
    MANDATORY_ADMIN = "mandatory_admin"
    MANDATORY_SELECTED = "mandatory_selected"


class TwoFAMethod(str, Enum):
    EMAIL_OTP = "email_otp"
    TOTP = "totp"
    SMS_OTP = "sms_otp"
    BACKUP_CODES = "backup_codes"


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


PASSWORD_POLICY_DEFAULTS = {
    "min_length": 8,
    "max_length": 128,
    "require_uppercase": True,
    "require_lowercase": True,
    "require_number": True,
    "require_special_char": True,
    "expiry_days": 90,
    "prevent_reuse": True,
    "history_count": 5,
    "force_change_on_first_login": True,
}

LOGIN_POLICY_DEFAULTS = {
    "max_failed_attempts": 5,
    "lock_duration_minutes": 30,
    "captcha_after_attempts": 3,
    "allow_concurrent_logins": True,
    "allow_multiple_devices": True,
    "remember_me_days": 30,
    "force_logout_on_password_change": True,
}

SESSION_POLICY_DEFAULTS = {
    "access_token_expiry_minutes": 60,
    "refresh_token_expiry_days": 7,
    "session_timeout_minutes": 60,
    "idle_timeout_minutes": 30,
    "max_sessions_per_user": 5,
}

TWO_FA_POLICY_DEFAULTS = {
    "is_enabled": False,
    "enforcement_mode": EnforcementMode.OPTIONAL,
    "allowed_methods": ["email_otp"],
    "grace_period_days": 7,
    "allow_recovery_codes": True,
    "allow_admin_reset": True,
    "allow_backup_email": False,
}

NOTIFICATION_POLICY_DEFAULTS = {
    "notify_login_success": False,
    "notify_login_failure": True,
    "notify_account_locked": True,
    "notify_password_changed": True,
    "notify_password_reset": True,
    "notify_2fa_enabled": True,
    "notify_2fa_disabled": True,
    "notify_new_device": True,
    "notify_new_location": False,
    "notification_channel": NotificationChannel.EMAIL,
}
