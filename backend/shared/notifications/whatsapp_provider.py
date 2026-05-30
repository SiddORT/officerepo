"""Twilio WhatsApp provider (REST API via httpx — no vendor SDK required)."""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from backend.shared.audit.audit_logger import mask_value
from backend.shared.notifications.base import (
    BaseProvider,
    NotificationChannel,
    NotificationResult,
    NotificationStatus,
)
from backend.shared.notifications.config import TwilioConfig
from backend.shared.notifications.sms_provider import _TWILIO_API, _twilio_result

logger = logging.getLogger(__name__)


class WhatsAppProvider(BaseProvider):
    name = "twilio"
    channel = NotificationChannel.WHATSAPP

    def __init__(self, config: Optional[TwilioConfig] = None) -> None:
        self.config = config or TwilioConfig.from_env()

    def is_configured(self) -> bool:
        return self.config.whatsapp_configured

    def send(self, to: str, body: str) -> NotificationResult:
        masked = mask_value(to, visible=4)
        if not self.is_configured():
            logger.warning("WhatsApp send skipped — Twilio not configured (to=%s)", masked)
            return self._not_configured(masked)

        cfg = self.config
        recipient = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
        url = _TWILIO_API.format(sid=cfg.account_sid)
        try:
            resp = httpx.post(
                url,
                data={"From": cfg.whatsapp_from, "To": recipient, "Body": body},
                auth=(cfg.account_sid, cfg.auth_token),
                timeout=cfg.timeout,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("WhatsApp send failed (to=%s): %s", masked, exc)
            return NotificationResult(
                channel=self.channel,
                status=NotificationStatus.FAILED,
                provider=self.name,
                recipient=masked,
                error=str(exc),
            )

        return _twilio_result(self.channel, self.name, masked, resp)
