import json
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.app.modules.security_settings.constants import SINGLETON_ID
from backend.app.modules.security_settings.models import (
    Security2FAPolicy,
    SecurityLoginPolicy,
    SecurityNotificationPolicy,
    SecurityPasswordPolicy,
    SecuritySessionPolicy,
)


def _upsert(db: Session, model_cls, defaults: Dict[str, Any], updates: Dict[str, Any], actor: Optional[str]) -> Any:
    row = db.get(model_cls, SINGLETON_ID)
    if row is None:
        row = model_cls(id=SINGLETON_ID, **defaults)
        db.add(row)
        db.flush()
    for k, v in updates.items():
        setattr(row, k, v)
    if actor:
        row.updated_by = actor
    db.flush()
    return row


# ── Password Policy ────────────────────────────────────────────────────────────

def get_password_policy(db: Session) -> SecurityPasswordPolicy:
    from backend.app.modules.security_settings.constants import PASSWORD_POLICY_DEFAULTS
    row = db.get(SecurityPasswordPolicy, SINGLETON_ID)
    if row is None:
        row = SecurityPasswordPolicy(id=SINGLETON_ID, **PASSWORD_POLICY_DEFAULTS)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_password_policy(db: Session, updates: Dict[str, Any], actor: Optional[str]) -> SecurityPasswordPolicy:
    from backend.app.modules.security_settings.constants import PASSWORD_POLICY_DEFAULTS
    return _upsert(db, SecurityPasswordPolicy, PASSWORD_POLICY_DEFAULTS, updates, actor)


# ── Login Policy ───────────────────────────────────────────────────────────────

def get_login_policy(db: Session) -> SecurityLoginPolicy:
    from backend.app.modules.security_settings.constants import LOGIN_POLICY_DEFAULTS
    row = db.get(SecurityLoginPolicy, SINGLETON_ID)
    if row is None:
        row = SecurityLoginPolicy(id=SINGLETON_ID, **LOGIN_POLICY_DEFAULTS)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_login_policy(db: Session, updates: Dict[str, Any], actor: Optional[str]) -> SecurityLoginPolicy:
    from backend.app.modules.security_settings.constants import LOGIN_POLICY_DEFAULTS
    return _upsert(db, SecurityLoginPolicy, LOGIN_POLICY_DEFAULTS, updates, actor)


# ── Session Policy ─────────────────────────────────────────────────────────────

def get_session_policy(db: Session) -> SecuritySessionPolicy:
    from backend.app.modules.security_settings.constants import SESSION_POLICY_DEFAULTS
    row = db.get(SecuritySessionPolicy, SINGLETON_ID)
    if row is None:
        row = SecuritySessionPolicy(id=SINGLETON_ID, **SESSION_POLICY_DEFAULTS)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_session_policy(db: Session, updates: Dict[str, Any], actor: Optional[str]) -> SecuritySessionPolicy:
    from backend.app.modules.security_settings.constants import SESSION_POLICY_DEFAULTS
    return _upsert(db, SecuritySessionPolicy, SESSION_POLICY_DEFAULTS, updates, actor)


# ── 2FA Policy ─────────────────────────────────────────────────────────────────

def get_2fa_policy(db: Session) -> Security2FAPolicy:
    from backend.app.modules.security_settings.constants import TWO_FA_POLICY_DEFAULTS
    row = db.get(Security2FAPolicy, SINGLETON_ID)
    if row is None:
        defaults = dict(TWO_FA_POLICY_DEFAULTS)
        defaults["enforcement_mode"] = defaults["enforcement_mode"].value
        defaults["allowed_methods"] = json.dumps(defaults["allowed_methods"])
        row = Security2FAPolicy(id=SINGLETON_ID, **defaults)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_2fa_policy(db: Session, updates: Dict[str, Any], actor: Optional[str]) -> Security2FAPolicy:
    from backend.app.modules.security_settings.constants import TWO_FA_POLICY_DEFAULTS
    defaults = dict(TWO_FA_POLICY_DEFAULTS)
    defaults["enforcement_mode"] = defaults["enforcement_mode"].value
    defaults["allowed_methods"] = json.dumps(defaults["allowed_methods"])
    if "allowed_methods" in updates and isinstance(updates["allowed_methods"], list):
        updates["allowed_methods"] = json.dumps(updates["allowed_methods"])
    return _upsert(db, Security2FAPolicy, defaults, updates, actor)


# ── Notification Policy ────────────────────────────────────────────────────────

def get_notification_policy(db: Session) -> SecurityNotificationPolicy:
    from backend.app.modules.security_settings.constants import NOTIFICATION_POLICY_DEFAULTS
    row = db.get(SecurityNotificationPolicy, SINGLETON_ID)
    if row is None:
        defaults = dict(NOTIFICATION_POLICY_DEFAULTS)
        defaults["notification_channel"] = defaults["notification_channel"].value
        row = SecurityNotificationPolicy(id=SINGLETON_ID, **defaults)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def upsert_notification_policy(db: Session, updates: Dict[str, Any], actor: Optional[str]) -> SecurityNotificationPolicy:
    from backend.app.modules.security_settings.constants import NOTIFICATION_POLICY_DEFAULTS
    defaults = dict(NOTIFICATION_POLICY_DEFAULTS)
    defaults["notification_channel"] = defaults["notification_channel"].value
    return _upsert(db, SecurityNotificationPolicy, defaults, updates, actor)
