"""Firebase Cloud Messaging push provider (legacy HTTP server key via httpx).

To migrate to the FCM HTTP v1 API later, only this provider needs to change —
callers go through the dispatcher and are unaffected.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from backend.shared.audit.audit_logger import mask_value
from backend.shared.notifications.base import (
    BaseProvider,
    NotificationChannel,
    NotificationResult,
    NotificationStatus,
)
from backend.shared.notifications.config import PushConfig

logger = logging.getLogger(__name__)

_FCM_API = "https://fcm.googleapis.com/fcm/send"


class PushProvider(BaseProvider):
    name = "fcm"
    channel = NotificationChannel.PUSH

    def __init__(self, config: Optional[PushConfig] = None) -> None:
        self.config = config or PushConfig.from_env()

    def is_configured(self) -> bool:
        return self.config.is_configured

    def send(
        self,
        device_token: str,
        title: str,
        body: str,
        *,
        data: Optional[dict[str, Any]] = None,
    ) -> NotificationResult:
        masked = mask_value(device_token, visible=4)
        if not self.is_configured():
            logger.warning("Push send skipped — FCM not configured (token=%s)", masked)
            return self._not_configured(masked)

        cfg = self.config
        payload: dict[str, Any] = {
            "to": device_token,
            "notification": {"title": title, "body": body},
        }
        if data:
            payload["data"] = data

        try:
            resp = httpx.post(
                _FCM_API,
                json=payload,
                headers={
                    "Authorization": f"key={cfg.server_key}",
                    "Content-Type": "application/json",
                },
                timeout=cfg.timeout,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error("Push send failed (token=%s): %s", masked, exc)
            return NotificationResult(
                channel=self.channel,
                status=NotificationStatus.FAILED,
                provider=self.name,
                recipient=masked,
                error=str(exc),
            )

        if resp.status_code == 200:
            payload_out = {}
            try:
                payload_out = resp.json()
            except Exception:  # noqa: BLE001
                pass
            if payload_out.get("success", 0) >= 1:
                logger.info("Push sent (token=%s)", masked)
                return NotificationResult(
                    channel=self.channel,
                    status=NotificationStatus.SENT,
                    provider=self.name,
                    recipient=masked,
                    detail=payload_out,
                )
            error = "FCM reported failure"
            results = payload_out.get("results") or []
            if results and isinstance(results, list):
                error = results[0].get("error", error)
            return NotificationResult(
                channel=self.channel,
                status=NotificationStatus.FAILED,
                provider=self.name,
                recipient=masked,
                error=error,
                detail=payload_out,
            )

        logger.error("Push send failed (token=%s): HTTP %s", masked, resp.status_code)
        return NotificationResult(
            channel=self.channel,
            status=NotificationStatus.FAILED,
            provider=self.name,
            recipient=masked,
            error=f"HTTP {resp.status_code}",
            detail={"status_code": resp.status_code},
        )
