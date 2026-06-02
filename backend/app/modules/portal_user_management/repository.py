"""Repository for Client Portal User Management.

All queries are scoped to (client_id) for multi-tenant isolation.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.modules.client_management.models import ClientAdminUser
from backend.app.modules.portal_user_management.models import (
    ClientLoginLog,
    ClientPortalActivityLog,
    ClientRole,
    ClientUserRole,
    ClientUserSession,
)
from backend.app.modules.portal_user_management import constants as c


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_name(u: ClientAdminUser) -> str:
    return " ".join(filter(None, [u.first_name, u.last_name])) or u.first_name or "Unknown"


# ── Users (ClientAdminUser) ───────────────────────────────────────────────────

def list_users(
    db: Session,
    client_id: str,
    *,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[ClientAdminUser], int]:
    q = db.query(ClientAdminUser).filter(
        ClientAdminUser.client_id == client_id,
        ClientAdminUser.is_deleted.is_(False),
    )
    if status:
        q = q.filter(ClientAdminUser.status == status)
    total = q.count()
    rows = q.order_by(ClientAdminUser.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_user(db: Session, client_id: str, user_id: str) -> Optional[ClientAdminUser]:
    return db.query(ClientAdminUser).filter(
        ClientAdminUser.id == user_id,
        ClientAdminUser.client_id == client_id,
        ClientAdminUser.is_deleted.is_(False),
    ).first()


def get_user_roles(db: Session, user_id: str) -> List[ClientRole]:
    return (
        db.query(ClientRole)
        .join(ClientUserRole, ClientUserRole.role_id == ClientRole.id)
        .filter(ClientUserRole.user_id == user_id)
        .all()
    )


def set_user_roles(db: Session, user_id: str, role_ids: List[str]) -> None:
    db.query(ClientUserRole).filter(ClientUserRole.user_id == user_id).delete()
    for rid in role_ids:
        db.add(ClientUserRole(user_id=user_id, role_id=rid))


def create_user(db: Session, client_id: str, data: Dict[str, Any], enc_fn) -> ClientAdminUser:
    """Create a new ClientAdminUser.  enc_fn(plaintext) → ciphertext."""
    import uuid
    user = ClientAdminUser(
        id=str(uuid.uuid4()),
        client_id=client_id,
        first_name=data["first_name"],
        last_name=data.get("last_name"),
        display_name=data.get("display_name"),
        email_encrypted=enc_fn(data["email"]) if data.get("email") else None,
        phone_encrypted=enc_fn(data["phone"]) if data.get("phone") else None,
        country_code=data.get("country_code"),
        status=c.STATUS_ACTIVE,
    )
    db.add(user)
    db.flush()
    return user


def update_user(db: Session, user: ClientAdminUser, data: Dict[str, Any], enc_fn) -> ClientAdminUser:
    if "first_name" in data and data["first_name"] is not None:
        user.first_name = data["first_name"]
    if "last_name" in data:
        user.last_name = data["last_name"]
    if "display_name" in data:
        user.display_name = data["display_name"]
    if "phone" in data and data["phone"] is not None:
        user.phone_encrypted = enc_fn(data["phone"]) if data["phone"] else None
    if "country_code" in data:
        user.country_code = data["country_code"]
    if "profile_picture_url" in data:
        user.profile_picture_url = data["profile_picture_url"]
    user.updated_at = datetime.utcnow()
    db.flush()
    return user


def activate_user(db: Session, user: ClientAdminUser) -> None:
    user.status = c.STATUS_ACTIVE
    user.updated_at = datetime.utcnow()


def deactivate_user(db: Session, user: ClientAdminUser) -> None:
    user.status = c.STATUS_INACTIVE
    user.updated_at = datetime.utcnow()


def set_password(db: Session, user: ClientAdminUser, hashed: str) -> None:
    user.password_hash = hashed
    user.updated_at = datetime.utcnow()


def stamp_last_login(db: Session, user: ClientAdminUser) -> None:
    user.last_login = datetime.utcnow()
    user.updated_at = datetime.utcnow()


# ── Roles ─────────────────────────────────────────────────────────────────────

def list_roles(db: Session, client_id: str) -> List[ClientRole]:
    return (
        db.query(ClientRole)
        .filter(ClientRole.client_id == client_id)
        .order_by(ClientRole.created_at)
        .all()
    )


def count_roles(db: Session, client_id: str) -> int:
    return db.query(ClientRole).filter(ClientRole.client_id == client_id).count()


def get_role(db: Session, client_id: str, role_id: str) -> Optional[ClientRole]:
    return db.query(ClientRole).filter(
        ClientRole.id == role_id,
        ClientRole.client_id == client_id,
    ).first()


def get_role_by_name(db: Session, client_id: str, name: str) -> Optional[ClientRole]:
    return db.query(ClientRole).filter(
        ClientRole.client_id == client_id,
        ClientRole.name == name,
    ).first()


def create_role(db: Session, client_id: str, data: Dict[str, Any]) -> ClientRole:
    role = ClientRole(
        client_id=client_id,
        name=data["name"],
        description=data.get("description"),
        is_system_role=data.get("is_system_role", False),
        is_active=True,
    )
    db.add(role)
    db.flush()
    return role


def update_role(db: Session, role: ClientRole, data: Dict[str, Any]) -> ClientRole:
    if "name" in data and data["name"] is not None:
        role.name = data["name"]
    if "description" in data:
        role.description = data["description"]
    role.updated_at = datetime.utcnow()
    db.flush()
    return role


def count_users_with_role(db: Session, role_id: str) -> int:
    return db.query(ClientUserRole).filter(ClientUserRole.role_id == role_id).count()


def seed_default_roles(db: Session, client_id: str) -> None:
    """Create the 4 built-in roles if this client has none yet."""
    if count_roles(db, client_id) > 0:
        return
    for r in c.DEFAULT_ROLES:
        db.add(ClientRole(
            client_id=client_id,
            name=r["name"],
            description=r["description"],
            is_system_role=r["is_system_role"],
            is_active=True,
        ))
    db.flush()


# ── Login Logs ────────────────────────────────────────────────────────────────

def create_login_log(
    db: Session,
    client_id: str,
    event_type: str,
    *,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> ClientLoginLog:
    device_info, browser_info = _parse_ua(user_agent)
    log = ClientLoginLog(
        client_id=client_id,
        user_id=user_id,
        event_type=event_type,
        email=email,
        ip_address=ip_address,
        device_info=device_info,
        browser_info=browser_info,
        user_agent=user_agent,
    )
    db.add(log)
    db.flush()
    return log


def list_login_logs(
    db: Session,
    client_id: str,
    *,
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[str] = None,
    event_type: Optional[str] = None,
) -> Tuple[List[ClientLoginLog], int]:
    q = db.query(ClientLoginLog).filter(ClientLoginLog.client_id == client_id)
    if user_id:
        q = q.filter(ClientLoginLog.user_id == user_id)
    if event_type:
        q = q.filter(ClientLoginLog.event_type == event_type)
    total = q.count()
    rows = q.order_by(ClientLoginLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Sessions ──────────────────────────────────────────────────────────────────

def create_session(
    db: Session,
    client_id: str,
    user_id: str,
    jti: str,
    *,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    expires_at: Optional[datetime] = None,
) -> ClientUserSession:
    device_info, browser_info = _parse_ua(user_agent)
    session = ClientUserSession(
        client_id=client_id,
        user_id=user_id,
        jti=jti,
        ip_address=ip_address,
        device_info=device_info,
        browser_info=browser_info,
        user_agent=user_agent,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(session)
    db.flush()
    return session


def get_session_by_id(db: Session, client_id: str, session_id: str) -> Optional[ClientUserSession]:
    return db.query(ClientUserSession).filter(
        ClientUserSession.id == session_id,
        ClientUserSession.client_id == client_id,
    ).first()


def get_session_by_jti(db: Session, jti: str) -> Optional[ClientUserSession]:
    return db.query(ClientUserSession).filter(ClientUserSession.jti == jti).first()


def logout_session(db: Session, session: ClientUserSession) -> None:
    session.is_active = False
    session.logged_out_at = datetime.utcnow()
    db.flush()


def logout_all_sessions(db: Session, client_id: str, user_id: str) -> int:
    rows = (
        db.query(ClientUserSession)
        .filter(
            ClientUserSession.client_id == client_id,
            ClientUserSession.user_id == user_id,
            ClientUserSession.is_active.is_(True),
        )
        .all()
    )
    now = datetime.utcnow()
    for s in rows:
        s.is_active = False
        s.logged_out_at = now
    db.flush()
    return len(rows)


def list_sessions(
    db: Session,
    client_id: str,
    *,
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[str] = None,
    active_only: bool = False,
) -> Tuple[List[ClientUserSession], int]:
    q = db.query(ClientUserSession).filter(ClientUserSession.client_id == client_id)
    if user_id:
        q = q.filter(ClientUserSession.user_id == user_id)
    if active_only:
        q = q.filter(ClientUserSession.is_active.is_(True))
    total = q.count()
    rows = q.order_by(ClientUserSession.login_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Activity Logs ─────────────────────────────────────────────────────────────

def log_activity(
    db: Session,
    client_id: str,
    action: str,
    *,
    actor_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    extra: Optional[Dict] = None,
) -> ClientPortalActivityLog:
    entry = ClientPortalActivityLog(
        client_id=client_id,
        actor_id=actor_id,
        target_user_id=target_user_id,
        action=action,
        ip_address=ip_address,
        extra=json.dumps(extra) if extra else None,
    )
    db.add(entry)
    db.flush()
    return entry


def list_activity_logs(
    db: Session,
    client_id: str,
    *,
    page: int = 1,
    page_size: int = 50,
    user_id: Optional[str] = None,
) -> Tuple[List[ClientPortalActivityLog], int]:
    q = db.query(ClientPortalActivityLog).filter(ClientPortalActivityLog.client_id == client_id)
    if user_id:
        q = q.filter(
            (ClientPortalActivityLog.actor_id == user_id) |
            (ClientPortalActivityLog.target_user_id == user_id)
        )
    total = q.count()
    rows = q.order_by(ClientPortalActivityLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Internals ─────────────────────────────────────────────────────────────────

def _parse_ua(user_agent: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Cheap UA parsing — returns (device_info, browser_info)."""
    if not user_agent:
        return None, None
    ua = user_agent.lower()
    device = "Mobile" if any(k in ua for k in ("mobile", "android", "iphone", "ipad")) else "Desktop"
    if "chrome" in ua and "edg" not in ua and "opr" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "edg" in ua:
        browser = "Edge"
    elif "opr" in ua or "opera" in ua:
        browser = "Opera"
    else:
        browser = "Unknown"
    return device, browser
