"""SMTP email provider.

Works with any SMTP server (Gmail, SendGrid SMTP relay, Mailgun, Amazon SES,
etc.) — supply the credentials via environment variables.
"""
from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from backend.shared.audit.audit_logger import mask_email
from backend.shared.notifications.base import (
    BaseProvider,
    NotificationChannel,
    NotificationResult,
    NotificationStatus,
)
from backend.shared.notifications.config import EmailConfig

logger = logging.getLogger(__name__)


class EmailProvider(BaseProvider):
    name = "smtp"
    channel = NotificationChannel.EMAIL

    def __init__(self, config: Optional[EmailConfig] = None) -> None:
        self.config = config or EmailConfig.from_env()

    def is_configured(self) -> bool:
        return self.config.is_configured

    def send(
        self,
        to: str,
        subject: str,
        body: str,
        *,
        html: Optional[str] = None,
    ) -> NotificationResult:
        masked = mask_email(to)
        if not self.is_configured():
            logger.warning("Email send skipped — SMTP not configured (to=%s)", masked)
            return self._not_configured(masked)

        cfg = self.config
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = cfg.sender
        message["To"] = to
        message.attach(MIMEText(body, "plain", "utf-8"))
        if html:
            message.attach(MIMEText(html, "html", "utf-8"))

        try:
            with smtplib.SMTP(cfg.host, cfg.port, timeout=cfg.timeout) as server:
                if cfg.use_tls:
                    server.starttls()
                if cfg.username and cfg.password:
                    server.login(cfg.username, cfg.password)
                server.send_message(message)
        except Exception as exc:  # noqa: BLE001 - report explicitly, do not crash caller
            logger.error("Email send failed (to=%s): %s", masked, exc)
            return NotificationResult(
                channel=self.channel,
                status=NotificationStatus.FAILED,
                provider=self.name,
                recipient=masked,
                error=str(exc),
            )

        logger.info("Email sent (to=%s, subject=%s)", masked, subject)
        return NotificationResult(
            channel=self.channel,
            status=NotificationStatus.SENT,
            provider=self.name,
            recipient=masked,
        )
