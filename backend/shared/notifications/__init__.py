"""
Reusable notification helpers — email, SMS, WhatsApp, push.

Quick start::

    from backend.shared.notifications import notifier

    result = notifier.send_email(
        to="user@example.com",
        subject="Welcome",
        body="Hello there",
    )
    if not result.success:
        ...  # result.status tells you why (e.g. NOT_CONFIGURED, FAILED)

All credentials are read from environment variables (see config.py). Providers
return a structured NotificationResult and never raise on missing config, so the
helpers can be wired up now and "go live" the moment credentials are added.
"""
from backend.shared.notifications.base import (
    BaseProvider,
    NotificationChannel,
    NotificationError,
    NotificationResult,
    NotificationStatus,
)
from backend.shared.notifications.dispatcher import Notifier, notifier
from backend.shared.notifications.email_provider import EmailProvider
from backend.shared.notifications.push_provider import PushProvider
from backend.shared.notifications.sms_provider import SmsProvider
from backend.shared.notifications.whatsapp_provider import WhatsAppProvider

__all__ = [
    "BaseProvider",
    "NotificationChannel",
    "NotificationError",
    "NotificationResult",
    "NotificationStatus",
    "Notifier",
    "notifier",
    "EmailProvider",
    "PushProvider",
    "SmsProvider",
    "WhatsAppProvider",
]
