"""
Unified notification facade.

Callers use a single ``Notifier`` (or the module-level singleton ``notifier``)
to send across any channel without touching provider internals. Every method
returns a :class:`NotificationResult`; nothing raises on a missing
configuration, so the platform keeps running until credentials are supplied.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from backend.shared.notifications.base import NotificationChannel, NotificationResult
from backend.shared.notifications.email_provider import EmailProvider
from backend.shared.notifications.push_provider import PushProvider
from backend.shared.notifications.sms_provider import SmsProvider
from backend.shared.notifications.whatsapp_provider import WhatsAppProvider

logger = logging.getLogger(__name__)


class Notifier:
    def __init__(
        self,
        *,
        email: Optional[EmailProvider] = None,
        sms: Optional[SmsProvider] = None,
        whatsapp: Optional[WhatsAppProvider] = None,
        push: Optional[PushProvider] = None,
    ) -> None:
        self.email_provider = email or EmailProvider()
        self.sms_provider = sms or SmsProvider()
        self.whatsapp_provider = whatsapp or WhatsAppProvider()
        self.push_provider = push or PushProvider()

    def send_email(
        self, to: str, subject: str, body: str, *, html: Optional[str] = None
    ) -> NotificationResult:
        return self.email_provider.send(to, subject, body, html=html)

    def send_sms(self, to: str, body: str) -> NotificationResult:
        return self.sms_provider.send(to, body)

    def send_whatsapp(self, to: str, body: str) -> NotificationResult:
        return self.whatsapp_provider.send(to, body)

    def send_push(
        self,
        device_token: str,
        title: str,
        body: str,
        *,
        data: Optional[dict[str, Any]] = None,
    ) -> NotificationResult:
        return self.push_provider.send(device_token, title, body, data=data)

    def configured_channels(self) -> dict[str, bool]:
        """Report which channels are ready — useful for health checks/diagnostics."""
        return {
            NotificationChannel.EMAIL.value: self.email_provider.is_configured(),
            NotificationChannel.SMS.value: self.sms_provider.is_configured(),
            NotificationChannel.WHATSAPP.value: self.whatsapp_provider.is_configured(),
            NotificationChannel.PUSH.value: self.push_provider.is_configured(),
        }


notifier = Notifier()
