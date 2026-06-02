import json
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.security_settings import repository as repo
from backend.app.modules.security_settings.schemas import (
    LoginPolicyUpdate,
    NotificationPolicyUpdate,
    PasswordPolicyUpdate,
    SessionPolicyUpdate,
    TwoFAPolicyUpdate,
)
from backend.shared.audit.audit_logger import record_audit as _audit


def _row_to_dict(row) -> Dict[str, Any]:
    return {c.name: getattr(row, c.name) for c in row.__table__.columns}


def _2fa_row_to_dict(row) -> Dict[str, Any]:
    d = _row_to_dict(row)
    raw = d.get("allowed_methods", "[]")
    try:
        d["allowed_methods"] = json.loads(raw) if isinstance(raw, str) else raw
    except Exception:
        d["allowed_methods"] = []
    return d


# ── Password Policy ────────────────────────────────────────────────────────────

def get_password_policy(db: Session) -> Dict[str, Any]:
    return _row_to_dict(repo.get_password_policy(db))


def update_password_policy(db: Session, payload: PasswordPolicyUpdate, actor: str) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    old = _row_to_dict(repo.get_password_policy(db))
    row = repo.upsert_password_policy(db, updates, actor)
    db.commit()
    _audit(db, action="security.password_policy.updated", entity_type="security_password_policy",
           entity_id="default", actor=actor,
           metadata={"old": {k: old[k] for k in updates}, "new": updates})
    return _row_to_dict(row)


# ── Login Policy ───────────────────────────────────────────────────────────────

def get_login_policy(db: Session) -> Dict[str, Any]:
    return _row_to_dict(repo.get_login_policy(db))


def update_login_policy(db: Session, payload: LoginPolicyUpdate, actor: str) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    old = _row_to_dict(repo.get_login_policy(db))
    row = repo.upsert_login_policy(db, updates, actor)
    db.commit()
    _audit(db, action="security.login_policy.updated", entity_type="security_login_policy",
           entity_id="default", actor=actor,
           metadata={"old": {k: old[k] for k in updates}, "new": updates})
    return _row_to_dict(row)


# ── Session Policy ─────────────────────────────────────────────────────────────

def get_session_policy(db: Session) -> Dict[str, Any]:
    return _row_to_dict(repo.get_session_policy(db))


def update_session_policy(db: Session, payload: SessionPolicyUpdate, actor: str) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    old = _row_to_dict(repo.get_session_policy(db))
    row = repo.upsert_session_policy(db, updates, actor)
    db.commit()
    _audit(db, action="security.session_policy.updated", entity_type="security_session_policy",
           entity_id="default", actor=actor,
           metadata={"old": {k: old[k] for k in updates}, "new": updates})
    return _row_to_dict(row)


# ── 2FA Policy ─────────────────────────────────────────────────────────────────

def get_2fa_policy(db: Session) -> Dict[str, Any]:
    return _2fa_row_to_dict(repo.get_2fa_policy(db))


def update_2fa_policy(db: Session, payload: TwoFAPolicyUpdate, actor: str) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    old = _2fa_row_to_dict(repo.get_2fa_policy(db))
    row = repo.upsert_2fa_policy(db, updates, actor)
    db.commit()
    _audit(db, action="security.2fa_policy.updated", entity_type="security_2fa_policy",
           entity_id="default", actor=actor,
           metadata={"old": {k: old.get(k) for k in updates}, "new": updates})
    return _2fa_row_to_dict(row)


# ── Notification Policy ────────────────────────────────────────────────────────

def get_notification_policy(db: Session) -> Dict[str, Any]:
    return _row_to_dict(repo.get_notification_policy(db))


def update_notification_policy(db: Session, payload: NotificationPolicyUpdate, actor: str) -> Dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    old = _row_to_dict(repo.get_notification_policy(db))
    row = repo.upsert_notification_policy(db, updates, actor)
    db.commit()
    _audit(db, action="security.notification_policy.updated", entity_type="security_notification_policy",
           entity_id="default", actor=actor,
           metadata={"old": {k: old[k] for k in updates}, "new": updates})
    return _row_to_dict(row)
