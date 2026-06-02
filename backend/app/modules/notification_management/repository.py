"""Repository layer for Notification Management."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.notification_management.models import (
    NotificationChannelConfig,
    NotificationEventRule,
    NotificationLog,
    NotificationTemplate,
)
from backend.app.modules.notification_management.constants import (
    ALL_CHANNELS, ALL_EVENTS,
)


# ── Channel configs ────────────────────────────────────────────────────────────

def get_channel_config(db: Session, channel: str) -> Optional[NotificationChannelConfig]:
    return db.query(NotificationChannelConfig).filter_by(channel=channel).first()


def get_all_channel_configs(db: Session) -> list[NotificationChannelConfig]:
    rows = {r.channel: r for r in db.query(NotificationChannelConfig).all()}
    result = []
    for ch in ALL_CHANNELS:
        if ch not in rows:
            row = NotificationChannelConfig(channel=ch, is_enabled=False)
            db.add(row)
            db.flush()
            rows[ch] = row
        result.append(rows[ch])
    return result


def upsert_channel_config(
    db: Session,
    channel: str,
    is_enabled: bool,
    config_enc: Optional[str],
    actor: str,
) -> NotificationChannelConfig:
    row = get_channel_config(db, channel)
    if row is None:
        row = NotificationChannelConfig(channel=channel)
        db.add(row)
    row.is_enabled  = is_enabled
    row.config_enc  = config_enc
    row.updated_by  = actor
    row.updated_at  = datetime.utcnow()
    db.flush()
    return row


# ── Templates ──────────────────────────────────────────────────────────────────

def list_templates(
    db: Session,
    channel: Optional[str] = None,
    active_only: bool = False,
) -> list[NotificationTemplate]:
    q = db.query(NotificationTemplate)
    if channel:
        q = q.filter_by(channel=channel)
    if active_only:
        q = q.filter_by(is_active=True)
    return q.order_by(NotificationTemplate.channel, NotificationTemplate.name).all()


def get_template(db: Session, template_id: str) -> Optional[NotificationTemplate]:
    return db.query(NotificationTemplate).filter_by(id=template_id).first()


def get_template_by_slug(
    db: Session, channel: str, slug: str
) -> Optional[NotificationTemplate]:
    return (
        db.query(NotificationTemplate)
        .filter_by(channel=channel, slug=slug)
        .first()
    )


def create_template(
    db: Session,
    channel: str,
    name: str,
    slug: str,
    subject: Optional[str],
    body: str,
    variables_json: str,
    actor: str,
    is_system: bool = False,
) -> NotificationTemplate:
    row = NotificationTemplate(
        channel=channel,
        name=name,
        slug=slug,
        subject=subject,
        body=body,
        variables=variables_json,
        is_system=is_system,
        created_by=actor,
    )
    db.add(row)
    db.flush()
    return row


def update_template(
    db: Session,
    row: NotificationTemplate,
    **kwargs,
) -> NotificationTemplate:
    for k, v in kwargs.items():
        if v is not None:
            setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def delete_template(db: Session, row: NotificationTemplate) -> None:
    db.delete(row)
    db.flush()


# ── Event rules ────────────────────────────────────────────────────────────────

def get_all_event_rules(db: Session) -> dict[tuple[str, str], NotificationEventRule]:
    rows = db.query(NotificationEventRule).all()
    return {(r.event_name, r.channel): r for r in rows}


def upsert_event_rule(
    db: Session,
    event_name: str,
    channel: str,
    is_enabled: bool,
    template_id: Optional[str],
    recipient_type: str,
    priority: str,
    actor: str,
) -> NotificationEventRule:
    row = (
        db.query(NotificationEventRule)
        .filter_by(event_name=event_name, channel=channel)
        .first()
    )
    if row is None:
        row = NotificationEventRule(event_name=event_name, channel=channel)
        db.add(row)
    row.is_enabled     = is_enabled
    row.template_id    = template_id
    row.recipient_type = recipient_type
    row.priority       = priority
    row.updated_by     = actor
    row.updated_at     = datetime.utcnow()
    db.flush()
    return row


# ── Logs ───────────────────────────────────────────────────────────────────────

def create_log(
    db: Session,
    channel: str,
    recipient: str,
    event_name: Optional[str] = None,
    template_id: Optional[str] = None,
    subject: Optional[str] = None,
    meta_json: Optional[str] = None,
) -> NotificationLog:
    row = NotificationLog(
        channel=channel,
        recipient=recipient,
        event_name=event_name,
        template_id=template_id,
        subject=subject,
        meta_json=meta_json,
    )
    db.add(row)
    db.flush()
    return row


def list_logs(
    db: Session,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    event_name: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> tuple[list[NotificationLog], int]:
    q = db.query(NotificationLog)
    if channel:
        q = q.filter(NotificationLog.channel == channel)
    if status:
        q = q.filter(NotificationLog.status == status)
    if event_name:
        q = q.filter(NotificationLog.event_name == event_name)
    total = q.count()
    items = (
        q.order_by(NotificationLog.queued_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total


def get_log(db: Session, log_id: str) -> Optional[NotificationLog]:
    return db.query(NotificationLog).filter_by(id=log_id).first()


def update_log_status(
    db: Session,
    row: NotificationLog,
    status: str,
    error_message: Optional[str] = None,
) -> NotificationLog:
    from backend.app.modules.notification_management.constants import (
        STATUS_SENT, STATUS_DELIVERED, STATUS_FAILED,
    )
    row.status = status
    if error_message:
        row.error_message = error_message
    now = datetime.utcnow()
    if status == STATUS_SENT:
        row.sent_at = now
    elif status == STATUS_DELIVERED:
        row.delivered_at = now
    elif status == STATUS_FAILED:
        row.failed_at = now
    db.flush()
    return row


# ── Usage counts ───────────────────────────────────────────────────────────────

def channel_log_counts(db: Session, channel: str) -> dict:
    from sqlalchemy import func
    from backend.app.modules.notification_management.constants import (
        STATUS_SENT, STATUS_DELIVERED, STATUS_FAILED,
    )
    from datetime import date, timedelta

    today_start = datetime.combine(date.today(), datetime.min.time())
    month_start = datetime.combine(date.today().replace(day=1), datetime.min.time())

    def _count(status=None, since=None):
        q = db.query(func.count(NotificationLog.id)).filter(
            NotificationLog.channel == channel
        )
        if status:
            q = q.filter(NotificationLog.status == status)
        if since:
            q = q.filter(NotificationLog.queued_at >= since)
        return q.scalar() or 0

    return {
        "total":       _count(),
        "sent_today":  _count(STATUS_SENT, today_start),
        "sent_month":  _count(STATUS_SENT, month_start),
        "failed":      _count(STATUS_FAILED),
        "delivered":   _count(STATUS_DELIVERED),
    }
