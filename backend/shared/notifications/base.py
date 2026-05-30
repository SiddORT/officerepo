"""
Core types for the notification helpers.

A small, provider-agnostic abstraction so the rest of the codebase can send
email / SMS / WhatsApp / push without knowing which vendor is behind it. New
providers only need to implement :class:`BaseProvider`.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from typing import Any, Optional


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class NotificationStatus(str, enum.Enum):
    SENT = "sent"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"


class NotificationError(Exception):
    """Raised for unexpected, non-recoverable provider errors."""


@dataclass
class NotificationResult:
    """Structured, explicit outcome of a single send attempt.

    Callers should inspect ``status`` / ``success`` rather than assuming the
    message was delivered. A missing configuration yields
    ``NotificationStatus.NOT_CONFIGURED`` instead of raising, so the app keeps
    running before credentials are supplied.
    """

    channel: NotificationChannel
    status: NotificationStatus
    provider: str
    recipient: Optional[str] = None  # already masked for logging
    message_id: Optional[str] = None
    error: Optional[str] = None
    detail: dict[str, Any] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.status == NotificationStatus.SENT

    def to_dict(self) -> dict[str, Any]:
        return {
            "channel": self.channel.value,
            "status": self.status.value,
            "provider": self.provider,
            "recipient": self.recipient,
            "message_id": self.message_id,
            "error": self.error,
            "detail": self.detail,
        }


class BaseProvider:
    """Interface every notification provider implements."""

    name: str = "base"
    channel: NotificationChannel

    def is_configured(self) -> bool:  # pragma: no cover - interface
        raise NotImplementedError

    def _not_configured(self, recipient: Optional[str] = None) -> NotificationResult:
        return NotificationResult(
            channel=self.channel,
            status=NotificationStatus.NOT_CONFIGURED,
            provider=self.name,
            recipient=recipient,
            error=(
                f"{self.channel.value} provider '{self.name}' is not configured. "
                "Set the required environment variables to enable it."
            ),
        )
