"""Service layer for Client Portal User Management.

Orchestrates repository calls, business rules, and encryption.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.portal_user_management import constants as c
from backend.app.modules.portal_user_management import repository as repo
from backend.app.modules.portal_user_management.models import ClientUserSession
from backend.app.modules.client_management.models import ClientAdminUser


# ── Encryption helpers (re-use from client_management) ───────────────────────

def _enc(text: str) -> str:
    from backend.app.modules.client_management.service import _enc as _cm_enc
    return _cm_enc(text)


def _dec(cipher: str) -> str:
    from backend.app.modules.client_management.service import _dec as _cm_dec
    return _cm_dec(cipher)


def _hash_pw(password: str) -> str:
    from backend.app.core.security import hash_password
    return hash_password(password)


def _verify_pw(plain: str, hashed: str) -> bool:
    from backend.app.core.security import verify_password
    return verify_password(plain, hashed)


# ── User serialization ────────────────────────────────────────────────────────

def _user_to_dict(u: ClientAdminUser, roles=None) -> Dict[str, Any]:
    email = _dec(u.email_encrypted) if u.email_encrypted else None
    phone = _dec(u.phone_encrypted) if u.phone_encrypted else None
    return {
        "id": u.id,
        "client_id": u.client_id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "display_name": getattr(u, "display_name", None),
        "email": email,
        "phone": phone,
        "country_code": u.country_code,
        "status": u.status,
        "profile_picture_url": getattr(u, "profile_picture_url", None),
        "last_login": getattr(u, "last_login", None),
        "invite_accepted_at": u.invite_accepted_at,
        "is_deleted": u.is_deleted,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
        "roles": [{"id": r.id, "name": r.name, "is_system_role": r.is_system_role} for r in (roles or [])],
    }


# ── Users ─────────────────────────────────────────────────────────────────────

def list_users(db: Session, client_id: str, *, page=1, page_size=20, search=None, status=None):
    rows, total = repo.list_users(db, client_id, page=page, page_size=page_size, search=search, status=status)
    data = []
    for u in rows:
        roles = repo.get_user_roles(db, u.id)
        data.append(_user_to_dict(u, roles))
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def get_user(db: Session, client_id: str, user_id: str):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    roles = repo.get_user_roles(db, u.id)
    return _user_to_dict(u, roles)


def create_user(db: Session, client_id: str, payload, actor_id: str, ip: Optional[str] = None):
    data = payload.model_dump()
    u = repo.create_user(db, client_id, data, _enc)
    if data.get("role_ids"):
        _validate_roles(db, client_id, data["role_ids"])
        repo.set_user_roles(db, u.id, data["role_ids"])
    repo.log_activity(db, client_id, c.ACTION_USER_CREATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip,
                      extra={"email": data.get("email"), "name": u.first_name})
    db.commit()
    roles = repo.get_user_roles(db, u.id)
    return _user_to_dict(u, roles)


def update_user(db: Session, client_id: str, user_id: str, payload, actor_id: str, ip: Optional[str] = None):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    data = {k: v for k, v in payload.model_dump().items() if v is not None or k in ("last_name", "display_name", "profile_picture_url")}
    role_ids = data.pop("role_ids", None)
    repo.update_user(db, u, data, _enc)
    if role_ids is not None:
        _validate_roles(db, client_id, role_ids)
        repo.set_user_roles(db, u.id, role_ids)
    repo.log_activity(db, client_id, c.ACTION_USER_UPDATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    db.commit()
    roles = repo.get_user_roles(db, u.id)
    return _user_to_dict(u, roles)


def activate_user(db: Session, client_id: str, user_id: str, actor_id: str, ip: Optional[str] = None):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    repo.activate_user(db, u)
    repo.log_activity(db, client_id, c.ACTION_USER_ACTIVATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    db.commit()


def deactivate_user(db: Session, client_id: str, user_id: str, actor_id: str, ip: Optional[str] = None):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    if u.id == actor_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    repo.deactivate_user(db, u)
    repo.log_activity(db, client_id, c.ACTION_USER_DEACTIVATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    db.commit()


def reset_password(db: Session, client_id: str, user_id: str, new_password: str,
                   actor_id: str, ip: Optional[str] = None):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    repo.set_password(db, u, _hash_pw(new_password))
    repo.log_activity(db, client_id, c.ACTION_PASSWORD_RESET,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    db.commit()


def force_logout(db: Session, client_id: str, user_id: str, actor_id: str, ip: Optional[str] = None):
    u = repo.get_user(db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    count = repo.logout_all_sessions(db, client_id, user_id)
    repo.create_login_log(db, client_id, c.LOGIN_EVENT_FORCED_LOGOUT,
                          user_id=user_id, ip_address=ip)
    repo.log_activity(db, client_id, c.ACTION_FORCE_LOGOUT,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip,
                      extra={"sessions_terminated": count})
    db.commit()
    return {"sessions_terminated": count}


# ── Roles ─────────────────────────────────────────────────────────────────────

def _role_to_dict(db: Session, role) -> Dict:
    count = repo.count_users_with_role(db, role.id)
    return {
        "id": role.id,
        "client_id": role.client_id,
        "name": role.name,
        "description": role.description,
        "is_system_role": role.is_system_role,
        "is_active": role.is_active,
        "user_count": count,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


def _validate_roles(db: Session, client_id: str, role_ids: List[str]):
    for rid in role_ids:
        r = repo.get_role(db, client_id, rid)
        if not r:
            raise HTTPException(status_code=400, detail=f"Role {rid} not found.")


def list_roles(db: Session, client_id: str):
    repo.seed_default_roles(db, client_id)
    db.commit()
    roles = repo.list_roles(db, client_id)
    return [_role_to_dict(db, r) for r in roles]


def get_role(db: Session, client_id: str, role_id: str):
    r = repo.get_role(db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    return _role_to_dict(db, r)


def create_role(db: Session, client_id: str, payload, actor_id: str, ip: Optional[str] = None):
    data = payload.model_dump()
    existing = repo.get_role_by_name(db, client_id, data["name"])
    if existing:
        raise HTTPException(status_code=409, detail=f"A role named '{data['name']}' already exists.")
    role = repo.create_role(db, client_id, data)
    repo.log_activity(db, client_id, c.ACTION_ROLE_CREATED,
                      actor_id=actor_id, ip_address=ip, extra={"role_name": role.name})
    db.commit()
    return _role_to_dict(db, role)


def update_role(db: Session, client_id: str, role_id: str, payload, actor_id: str, ip: Optional[str] = None):
    r = repo.get_role(db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    if r.is_system_role:
        raise HTTPException(status_code=400, detail="System roles cannot be renamed.")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in data:
        existing = repo.get_role_by_name(db, client_id, data["name"])
        if existing and existing.id != role_id:
            raise HTTPException(status_code=409, detail=f"A role named '{data['name']}' already exists.")
    repo.update_role(db, r, data)
    repo.log_activity(db, client_id, c.ACTION_ROLE_UPDATED,
                      actor_id=actor_id, ip_address=ip, extra={"role_name": r.name})
    db.commit()
    return _role_to_dict(db, r)


def clone_role(db: Session, client_id: str, role_id: str, actor_id: str, ip: Optional[str] = None):
    r = repo.get_role(db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    base_name = f"{r.name} (Copy)"
    name = base_name
    i = 2
    while repo.get_role_by_name(db, client_id, name):
        name = f"{base_name} {i}"
        i += 1
    new_role = repo.create_role(db, client_id, {
        "name": name,
        "description": r.description,
        "is_system_role": False,
    })
    repo.log_activity(db, client_id, c.ACTION_ROLE_CLONED,
                      actor_id=actor_id, ip_address=ip,
                      extra={"source_role": r.name, "new_role": name})
    db.commit()
    return _role_to_dict(db, new_role)


def set_role_status(db: Session, client_id: str, role_id: str, is_active: bool,
                    actor_id: str, ip: Optional[str] = None):
    r = repo.get_role(db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    if r.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot deactivate system roles.")
    r.is_active = is_active
    from datetime import datetime as _dt
    r.updated_at = _dt.utcnow()
    action = c.ACTION_ROLE_ACTIVATED if is_active else c.ACTION_ROLE_DEACTIVATED
    repo.log_activity(db, client_id, action, actor_id=actor_id, ip_address=ip,
                      extra={"role_name": r.name})
    db.commit()


# ── Sessions ──────────────────────────────────────────────────────────────────

def record_login_session(
    db: Session,
    client_id: str,
    user_id: str,
    jti: str,
    email: str,
    *,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    expires_at: Optional[datetime] = None,
) -> None:
    """Called from portal_auth router after successful login."""
    repo.create_session(db, client_id, user_id, jti,
                        ip_address=ip, user_agent=user_agent, expires_at=expires_at)
    repo.create_login_log(db, client_id, c.LOGIN_EVENT_SUCCESS,
                          user_id=user_id, email=email, ip_address=ip, user_agent=user_agent)
    u = db.query(ClientAdminUser).filter(ClientAdminUser.id == user_id).first()
    if u:
        repo.stamp_last_login(db, u)
    db.commit()


def list_sessions(db: Session, client_id: str, *, page=1, page_size=50,
                  user_id=None, active_only=False):
    rows, total = repo.list_sessions(db, client_id, page=page, page_size=page_size,
                                     user_id=user_id, active_only=active_only)
    data = []
    for s in rows:
        u = db.query(ClientAdminUser).filter(ClientAdminUser.id == s.user_id).first()
        d = {
            "id": s.id,
            "client_id": s.client_id,
            "user_id": s.user_id,
            "user_name": (" ".join(filter(None, [u.first_name, u.last_name])) if u else None),
            "jti": s.jti,
            "ip_address": s.ip_address,
            "device_info": s.device_info,
            "browser_info": s.browser_info,
            "login_at": s.login_at,
            "last_activity_at": s.last_activity_at,
            "expires_at": s.expires_at,
            "is_active": s.is_active,
            "logged_out_at": s.logged_out_at,
        }
        data.append(d)
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def logout_session(db: Session, client_id: str, session_id: str, actor_id: str, ip=None):
    s = repo.get_session_by_id(db, client_id, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    repo.logout_session(db, s)
    repo.create_login_log(db, client_id, c.LOGIN_EVENT_LOGOUT,
                          user_id=s.user_id, ip_address=ip)
    db.commit()


def logout_all_user_sessions(db: Session, client_id: str, user_id: str, actor_id: str, ip=None):
    count = repo.logout_all_sessions(db, client_id, user_id)
    repo.create_login_log(db, client_id, c.LOGIN_EVENT_FORCED_LOGOUT,
                          user_id=user_id, ip_address=ip)
    db.commit()
    return {"sessions_terminated": count}


# ── Login Logs ────────────────────────────────────────────────────────────────

def list_login_logs(db: Session, client_id: str, *, page=1, page_size=50,
                    user_id=None, event_type=None):
    rows, total = repo.list_login_logs(db, client_id, page=page, page_size=page_size,
                                       user_id=user_id, event_type=event_type)
    data = []
    for log in rows:
        u = (db.query(ClientAdminUser).filter(ClientAdminUser.id == log.user_id).first()
             if log.user_id else None)
        data.append({
            "id": log.id,
            "client_id": log.client_id,
            "user_id": log.user_id,
            "user_name": (" ".join(filter(None, [u.first_name, u.last_name])) if u else None),
            "event_type": log.event_type,
            "email": log.email,
            "ip_address": log.ip_address,
            "device_info": log.device_info,
            "browser_info": log.browser_info,
            "created_at": log.created_at,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}


# ── Activity Logs ─────────────────────────────────────────────────────────────

def list_activity_logs(db: Session, client_id: str, *, page=1, page_size=50, user_id=None):
    rows, total = repo.list_activity_logs(db, client_id, page=page, page_size=page_size, user_id=user_id)
    data = []
    for log in rows:
        actor = (db.query(ClientAdminUser).filter(ClientAdminUser.id == log.actor_id).first()
                 if log.actor_id else None)
        target = (db.query(ClientAdminUser).filter(ClientAdminUser.id == log.target_user_id).first()
                  if log.target_user_id else None)
        data.append({
            "id": log.id,
            "client_id": log.client_id,
            "actor_id": log.actor_id,
            "actor_name": (" ".join(filter(None, [actor.first_name, actor.last_name])) if actor else None),
            "target_user_id": log.target_user_id,
            "target_user_name": (" ".join(filter(None, [target.first_name, target.last_name])) if target else None),
            "action": log.action,
            "ip_address": log.ip_address,
            "extra": log.extra,
            "created_at": log.created_at,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}
