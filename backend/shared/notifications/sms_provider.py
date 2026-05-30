"""Twilio SMS provider (REST API via httpx — no vendor SDK required)."""
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

logger = logging.getLogger(__name__)

_TWILIO_API = "https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"


class SmsProvider(BaseProvider):
    name = "twilio"
    channel = NotificationChannel.SMS

    def __init__(self, config: Optional[TwilioConfig] = None) -> None:
        self.config = config or TwilioConfig.from_env()

    def is_configured(self) -> bool:
        return self.config.sms_configured

    def send(self, to: str, body: str) -> NotificationResult:
        masked = mask_value(to, visible=4)
        if not self.is_configured():
            logger.warning("SMS send skipped — Twilio not configured (to=%s)", masked)
            return self._not_configured(masked)

        cfg = self.config
        url = _TWILIO_API.format(sid=cfg.account_sid)
        try:
            resp = httpx.post(
                url,
                data={"From": cfg.sms_from, "To": to, "Body": body},
                auth=(cfg.account_sid, cfg.auth_token),
                timeout=cfg.timeout,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("SMS send failed (to=%s): %s", masked, exc)
            return NotificationResult(
                channel=self.channel,
                status=NotificationStatus.FAILED,
                provider=self.name,
                recipient=masked,
                error=str(exc),
            )

        return _twilio_result(self.channel, self.name, masked, resp)


def _twilio_result(channel, provider, masked, resp: httpx.Response) -> NotificationResult:
    if resp.status_code in (200, 201):
        payload = {}
        try:
            payload = resp.json()
        except Exception:  # noqa: BLE001
            pass
        logger.info("%s sent (to=%s, sid=%s)", channel.value, masked, payload.get("sid"))
        return NotificationResult(
            channel=channel,
            status=NotificationStatus.SENT,
            provider=provider,
            recipient=masked,
            message_id=payload.get("sid"),
        )

    error = f"HTTP {resp.status_code}"
    try:
        error = resp.json().get("message", error)
    except Exception:  # noqa: BLE001
        pass
    logger.error("%s send failed (to=%s): %s", channel.value, masked, error)
    return NotificationResult(
        channel=channel,
        status=NotificationStatus.FAILED,
        provider=provider,
        recipient=masked,
        error=error,
        detail={"status_code": resp.status_code},
    )
