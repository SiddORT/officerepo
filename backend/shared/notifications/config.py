"""
Environment-driven configuration for notification providers.

Secrets are NEVER hardcoded — every value is read from environment variables so
credentials can be supplied later via the secrets manager without code changes.
Each config exposes ``is_configured`` so callers can fail explicitly.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


def _env(name: str) -> Optional[str]:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    raw = _env(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class EmailConfig:
    host: Optional[str]
    port: int
    username: Optional[str]
    password: Optional[str]
    sender: Optional[str]
    use_tls: bool
    timeout: int

    @property
    def is_configured(self) -> bool:
        return bool(self.host and self.sender)

    @classmethod
    def from_env(cls) -> "EmailConfig":
        return cls(
            host=_env("SMTP_HOST"),
            port=_env_int("SMTP_PORT", 587),
            username=_env("SMTP_USERNAME"),
            password=_env("SMTP_PASSWORD"),
            sender=_env("SMTP_FROM") or _env("SMTP_USERNAME"),
            use_tls=_env_bool("SMTP_USE_TLS", True),
            timeout=_env_int("SMTP_TIMEOUT", 15),
        )


@dataclass(frozen=True)
class TwilioConfig:
    """Shared Twilio credentials used for both SMS and WhatsApp."""

    account_sid: Optional[str]
    auth_token: Optional[str]
    sms_from: Optional[str]
    whatsapp_from: Optional[str]
    timeout: int

    @property
    def sms_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.sms_from)

    @property
    def whatsapp_configured(self) -> bool:
        return bool(self.account_sid and self.auth_token and self.whatsapp_from)

    @classmethod
    def from_env(cls) -> "TwilioConfig":
        wa_from = _env("TWILIO_WHATSAPP_FROM")
        if wa_from and not wa_from.startswith("whatsapp:"):
            wa_from = f"whatsapp:{wa_from}"
        return cls(
            account_sid=_env("TWILIO_ACCOUNT_SID"),
            auth_token=_env("TWILIO_AUTH_TOKEN"),
            sms_from=_env("TWILIO_SMS_FROM"),
            whatsapp_from=wa_from,
            timeout=_env_int("TWILIO_TIMEOUT", 15),
        )


@dataclass(frozen=True)
class PushConfig:
    """Firebase Cloud Messaging (legacy HTTP server-key) configuration."""

    server_key: Optional[str]
    timeout: int

    @property
    def is_configured(self) -> bool:
        return bool(self.server_key)

    @classmethod
    def from_env(cls) -> "PushConfig":
        return cls(
            server_key=_env("FCM_SERVER_KEY"),
            timeout=_env_int("FCM_TIMEOUT", 15),
        )
