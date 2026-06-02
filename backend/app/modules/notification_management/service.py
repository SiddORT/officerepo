"""Service layer for Notification Management."""
from __future__ import annotations

import json
import smtplib
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.notification_management import constants as c
from backend.app.modules.notification_management import repository as repo
from backend.app.modules.notification_management.schemas import (
    ChannelConfigResponse, EventRuleResponse, TemplateResponse,
)
from backend.shared.audit.audit_logger import record_audit as _audit


# ── Encryption helpers ─────────────────────────────────────────────────────────

def _get_fernet():
    """Return a Fernet instance derived from SESSION_SECRET / JWT_SECRET."""
    import os, hashlib, base64
    from cryptography.fernet import Fernet
    secret = (
        os.environ.get("SESSION_SECRET")
        or os.environ.get("JWT_SECRET")
        or "insecure-dev-secret"
    )
    key = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def _encrypt(data: dict) -> str:
    return _get_fernet().encrypt(json.dumps(data).encode()).decode()


def _decrypt(enc: str) -> dict:
    try:
        return json.loads(_get_fernet().decrypt(enc.encode()).decode())
    except Exception:
        return {}


def _mask(config: dict, channel: str) -> dict:
    sensitive = c.SENSITIVE_FIELDS.get(channel, set())
    return {
        k: (c.MASKED_PLACEHOLDER if k in sensitive and v else v)
        for k, v in config.items()
    }


def _merge_config(existing_enc: Optional[str], new_config: dict, channel: str) -> dict:
    """
    When the frontend submits a PATCH, masked sentinel values mean "keep existing".
    Merge: decrypt existing → overlay with new values that aren't the sentinel.
    """
    base = _decrypt(existing_enc) if existing_enc else {}
    sensitive = c.SENSITIVE_FIELDS.get(channel, set())
    for k, v in new_config.items():
        if k in sensitive and v == c.MASKED_PLACEHOLDER:
            pass  # keep existing value
        else:
            base[k] = v
    return base


# ── Channel config ─────────────────────────────────────────────────────────────

def _channel_to_response(row, config_plain: dict) -> dict:
    return {
        "channel":    row.channel,
        "label":      c.CHANNEL_LABELS.get(row.channel, row.channel),
        "is_enabled": row.is_enabled,
        "config":     _mask(config_plain, row.channel),
    }


def list_channels(db: Session) -> list[dict]:
    rows = repo.get_all_channel_configs(db)
    db.commit()
    result = []
    for row in rows:
        plain = _decrypt(row.config_enc) if row.config_enc else {}
        result.append(_channel_to_response(row, plain))
    return result


def get_channel(db: Session, channel: str) -> dict:
    _require_valid_channel(channel)
    rows = repo.get_all_channel_configs(db)
    db.commit()
    for row in rows:
        if row.channel == channel:
            plain = _decrypt(row.config_enc) if row.config_enc else {}
            return _channel_to_response(row, plain)
    raise HTTPException(status_code=404, detail="Channel not found")


def update_channel(
    db: Session, channel: str, is_enabled: bool, config: dict, actor: str
) -> dict:
    _require_valid_channel(channel)
    existing = repo.get_channel_config(db, channel)
    existing_enc = existing.config_enc if existing else None
    merged = _merge_config(existing_enc, config, channel)
    enc = _encrypt(merged) if merged else None
    row = repo.upsert_channel_config(db, channel, is_enabled, enc, actor)
    db.commit()
    _audit(db, action=f"notification.channel.{channel}.updated",
           entity_type="notification_channel", entity_id=channel,
           actor=actor, metadata={"is_enabled": is_enabled})
    return _channel_to_response(row, merged)


def test_channel(db: Session, channel: str) -> dict:
    """Test connectivity for the given channel. Returns {ok, message}."""
    _require_valid_channel(channel)
    row = repo.get_channel_config(db, channel)
    if not row or not row.config_enc:
        return {"ok": False, "message": "Channel is not configured"}
    cfg = _decrypt(row.config_enc)

    if channel == c.CHANNEL_EMAIL:
        return _test_smtp(cfg)
    elif channel == c.CHANNEL_SMS:
        return {"ok": False, "message": "SMS test not implemented — check credentials manually"}
    elif channel == c.CHANNEL_WHATSAPP:
        return {"ok": False, "message": "WhatsApp test not implemented — check credentials manually"}
    elif channel == c.CHANNEL_PUSH:
        return {"ok": False, "message": "Push test not implemented — check credentials manually"}
    return {"ok": False, "message": "Unknown channel"}


def _test_smtp(cfg: dict) -> dict:
    host = cfg.get("smtp_host", "")
    port = int(cfg.get("smtp_port", 587))
    username = cfg.get("username", "")
    password = cfg.get("password", "")
    encryption = cfg.get("encryption", "tls")

    if not host:
        return {"ok": False, "message": "SMTP host is not configured"}
    try:
        if encryption == c.EMAIL_ENC_SSL:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            if encryption == c.EMAIL_ENC_TLS:
                server.ehlo()
                server.starttls()
                server.ehlo()
        if username and password:
            server.login(username, password)
        server.quit()
        return {"ok": True, "message": "SMTP connection successful"}
    except smtplib.SMTPAuthenticationError:
        return {"ok": False, "message": "Authentication failed — check username/password"}
    except smtplib.SMTPConnectError as e:
        return {"ok": False, "message": f"Cannot connect to {host}:{port} — {e}"}
    except Exception as e:
        return {"ok": False, "message": str(e)}


def _require_valid_channel(channel: str) -> None:
    if channel not in c.ALL_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel '{channel}'")


# ── Templates ──────────────────────────────────────────────────────────────────

def _tmpl_to_dict(row) -> dict:
    import json as _json
    variables: list = []
    if row.variables:
        try:
            variables = _json.loads(row.variables)
        except Exception:
            pass
    return {
        "id":         row.id,
        "channel":    row.channel,
        "name":       row.name,
        "slug":       row.slug,
        "subject":    row.subject,
        "body":       row.body,
        "variables":  variables,
        "is_active":  row.is_active,
        "is_system":  row.is_system,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def list_templates(
    db: Session, channel: Optional[str] = None, active_only: bool = False
) -> list[dict]:
    rows = repo.list_templates(db, channel=channel, active_only=active_only)
    return [_tmpl_to_dict(r) for r in rows]


def get_template(db: Session, template_id: str) -> dict:
    row = repo.get_template(db, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return _tmpl_to_dict(row)


def create_template(db: Session, payload, actor: str) -> dict:
    import json as _json
    existing = repo.get_template_by_slug(db, payload.channel, payload.slug)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A template with slug '{payload.slug}' already exists for {payload.channel}",
        )
    vars_json = _json.dumps(payload.variables or [])
    row = repo.create_template(
        db,
        channel=payload.channel,
        name=payload.name,
        slug=payload.slug,
        subject=payload.subject,
        body=payload.body,
        variables_json=vars_json,
        actor=actor,
    )
    db.commit()
    _audit(db, action="notification.template.created",
           entity_type="notification_template", entity_id=row.id,
           actor=actor, metadata={"channel": row.channel, "name": row.name, "slug": row.slug})
    return _tmpl_to_dict(row)


def update_template(db: Session, template_id: str, payload, actor: str) -> dict:
    import json as _json
    row = repo.get_template(db, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    kwargs: dict[str, Any] = {}
    if payload.name is not None:
        kwargs["name"] = payload.name
    if payload.subject is not None:
        kwargs["subject"] = payload.subject
    if payload.body is not None:
        kwargs["body"] = payload.body
    if payload.variables is not None:
        kwargs["variables"] = _json.dumps(payload.variables)
    if payload.is_active is not None:
        kwargs["is_active"] = payload.is_active
    row = repo.update_template(db, row, **kwargs)
    db.commit()
    _audit(db, action="notification.template.updated",
           entity_type="notification_template", entity_id=row.id,
           actor=actor, metadata={"name": row.name})
    return _tmpl_to_dict(row)


def delete_template(db: Session, template_id: str, actor: str) -> None:
    row = repo.get_template(db, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    if row.is_system:
        raise HTTPException(
            status_code=400, detail="System templates cannot be deleted"
        )
    repo.delete_template(db, row)
    db.commit()
    _audit(db, action="notification.template.deleted",
           entity_type="notification_template", entity_id=template_id,
           actor=actor)


# ── Event rules ────────────────────────────────────────────────────────────────

def list_event_rules(db: Session) -> list[dict]:
    """Return all event × channel rules in grouped structure."""
    rules = repo.get_all_event_rules(db)
    templates = {r.id: r for r in repo.list_templates(db, active_only=True)}
    result = []
    for event in c.ALL_EVENTS:
        for channel in c.ALL_CHANNELS:
            rule = rules.get((event, channel))
            tmpl = templates.get(rule.template_id) if rule and rule.template_id else None
            result.append({
                "event_name":    event,
                "event_label":   c.EVENT_LABELS.get(event, event),
                "channel":       channel,
                "template_id":   rule.template_id if rule else None,
                "template_name": tmpl.name if tmpl else None,
                "is_enabled":    rule.is_enabled if rule else False,
                "recipient_type": rule.recipient_type if rule else "admin",
                "priority":      rule.priority if rule else c.PRIORITY_NORMAL,
            })
    return result


def update_event_rule(
    db: Session, event_name: str, channel: str, payload, actor: str
) -> dict:
    if event_name not in c.ALL_EVENTS:
        raise HTTPException(status_code=400, detail=f"Unknown event '{event_name}'")
    if channel not in c.ALL_CHANNELS:
        raise HTTPException(status_code=400, detail=f"Invalid channel '{channel}'")
    if payload.template_id:
        t = repo.get_template(db, payload.template_id)
        if not t or t.channel != channel:
            raise HTTPException(
                status_code=400,
                detail="Template not found or belongs to a different channel",
            )
    row = repo.upsert_event_rule(
        db,
        event_name=event_name,
        channel=channel,
        is_enabled=payload.is_enabled,
        template_id=payload.template_id,
        recipient_type=payload.recipient_type,
        priority=payload.priority,
        actor=actor,
    )
    db.commit()
    templates = {r.id: r for r in repo.list_templates(db, active_only=True)}
    tmpl = templates.get(row.template_id) if row.template_id else None
    return {
        "event_name":    row.event_name,
        "event_label":   c.EVENT_LABELS.get(row.event_name, row.event_name),
        "channel":       row.channel,
        "template_id":   row.template_id,
        "template_name": tmpl.name if tmpl else None,
        "is_enabled":    row.is_enabled,
        "recipient_type": row.recipient_type,
        "priority":      row.priority,
    }


# ── Logs ───────────────────────────────────────────────────────────────────────

def _log_to_dict(row) -> dict:
    return {
        "id":           row.id,
        "channel":      row.channel,
        "event_name":   row.event_name,
        "recipient":    row.recipient,
        "subject":      row.subject,
        "status":       row.status,
        "error_message": row.error_message,
        "retry_count":  row.retry_count,
        "queued_at":    row.queued_at.isoformat() if row.queued_at else None,
        "sent_at":      row.sent_at.isoformat() if row.sent_at else None,
        "failed_at":    row.failed_at.isoformat() if row.failed_at else None,
    }


def list_logs(
    db: Session,
    channel: Optional[str] = None,
    status: Optional[str] = None,
    event_name: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    items, total = repo.list_logs(
        db, channel=channel, status=status,
        event_name=event_name, page=page, page_size=page_size,
    )
    return {
        "items":     [_log_to_dict(r) for r in items],
        "total":     total,
        "page":      page,
        "page_size": page_size,
    }


# ── Usage stats ────────────────────────────────────────────────────────────────

def get_usage(db: Session) -> dict:
    return {
        ch: repo.channel_log_counts(db, ch)
        for ch in c.ALL_CHANNELS
    }
