"""SQLAlchemy models for Notification Management."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


class NotificationChannelConfig(Base):
    """One row per channel (email/sms/whatsapp/push). Config stored as Fernet-encrypted JSON."""
    __tablename__ = "notification_channel_configs"

    id          = Column(String(36), primary_key=True, default=_uuid)
    channel     = Column(String(20), nullable=False, unique=True)
    is_enabled  = Column(Boolean, nullable=False, default=False)
    config_enc  = Column(Text, nullable=True)   # Fernet-encrypted JSON blob

    created_at  = Column(DateTime, nullable=False, default=_now)
    updated_at  = Column(DateTime, nullable=False, default=_now, onupdate=_now)
    updated_by  = Column(String(255), nullable=True)


class NotificationTemplate(Base):
    """Notification templates per channel."""
    __tablename__ = "notification_templates"

    __table_args__ = (
        UniqueConstraint("channel", "slug", name="uq_notif_tmpl_channel_slug"),
    )

    id          = Column(String(36), primary_key=True, default=_uuid)
    channel     = Column(String(20), nullable=False)       # email | sms | whatsapp | push
    name        = Column(String(255), nullable=False)
    slug        = Column(String(100), nullable=False)      # machine key, e.g. "welcome_email"
    subject     = Column(String(500), nullable=True)       # email only
    body        = Column(Text, nullable=False)
    variables   = Column(Text, nullable=True)              # JSON array: ["first_name","company"]
    is_active   = Column(Boolean, nullable=False, default=True)
    is_system   = Column(Boolean, nullable=False, default=False)  # protected — cannot delete

    created_at  = Column(DateTime, nullable=False, default=_now)
    updated_at  = Column(DateTime, nullable=False, default=_now, onupdate=_now)
    created_by  = Column(String(255), nullable=True)


class NotificationEventRule(Base):
    """Configures which channel + template fires for each event."""
    __tablename__ = "notification_event_rules"

    __table_args__ = (
        UniqueConstraint("event_name", "channel", name="uq_notif_event_channel"),
    )

    id            = Column(String(36), primary_key=True, default=_uuid)
    event_name    = Column(String(100), nullable=False)
    channel       = Column(String(20), nullable=False)
    template_id   = Column(
        String(36),
        ForeignKey("notification_templates.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_enabled    = Column(Boolean, nullable=False, default=False)
    recipient_type = Column(String(50), nullable=False, default="admin")
    priority      = Column(String(20), nullable=False, default="normal")

    updated_at    = Column(DateTime, nullable=False, default=_now, onupdate=_now)
    updated_by    = Column(String(255), nullable=True)


class NotificationLog(Base):
    """Delivery log — one row per notification send attempt."""
    __tablename__ = "notification_logs"

    id            = Column(String(36), primary_key=True, default=_uuid)
    channel       = Column(String(20), nullable=False)
    event_name    = Column(String(100), nullable=True)
    template_id   = Column(String(36), nullable=True)
    recipient     = Column(String(500), nullable=False)   # already masked on write
    subject       = Column(String(500), nullable=True)    # email subject snapshot
    status        = Column(String(20), nullable=False, default="queued")
    error_message = Column(Text, nullable=True)
    retry_count   = Column(Integer, nullable=False, default=0)

    queued_at     = Column(DateTime, nullable=False, default=_now)
    sent_at       = Column(DateTime, nullable=True)
    delivered_at  = Column(DateTime, nullable=True)
    failed_at     = Column(DateTime, nullable=True)

    meta_json     = Column(Text, nullable=True)  # arbitrary context JSON
