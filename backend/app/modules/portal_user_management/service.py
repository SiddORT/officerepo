"""Service layer for Client Portal User Management.

Two database sessions are in play:
  platform_db — contains ClientAdminUser (auth, profile, status)
  client_db   — contains ClientRole, ClientUserRole, ClientLoginLog,
                ClientUserSession, ClientPortalActivityLog
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.portal_user_management import constants as c
from backend.app.modules.portal_user_management import repository as repo
from backend.app.modules.client_management.models import ClientAdminUser


# ── Encryption helpers ─────────────────────────────────────────────────────────

def _enc(text: str) -> Optional[str]:
    if not text:
        return None
    from backend.shared.security.encryption import encrypt_value
    return encrypt_value(text)


def _dec(cipher: Optional[str]) -> Optional[str]:
    if not cipher:
        return None
    from backend.app.modules.client_management.service import _dec as cm_dec
    return cm_dec(cipher)


def _hash_pw(password: str) -> str:
    from backend.app.core.security import hash_password
    return hash_password(password)


# ── User serialization ─────────────────────────────────────────────────────────

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


def _resolve_user_name(platform_db: Session, user_id: Optional[str]) -> Optional[str]:
    if not user_id:
        return None
    u = platform_db.query(ClientAdminUser).filter(ClientAdminUser.id == user_id).first()
    if not u:
        return None
    return " ".join(filter(None, [u.first_name, u.last_name])) or u.first_name


# ── Users ──────────────────────────────────────────────────────────────────────

def list_users(
    platform_db: Session, client_db: Session, client_id: str,
    *, page=1, page_size=20, search=None, status=None,
) -> Dict:
    rows, total = repo.list_users(platform_db, client_id, page=page, page_size=page_size,
                                  search=search, status=status)
    data = []
    for u in rows:
        roles = repo.get_user_roles(client_db, u.id)
        data.append(_user_to_dict(u, roles))
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def get_user(platform_db: Session, client_db: Session, client_id: str, user_id: str) -> Dict:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    roles = repo.get_user_roles(client_db, u.id)
    return _user_to_dict(u, roles)


def create_user(
    platform_db: Session, client_db: Session, client_id: str,
    payload, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    data = payload.model_dump()
    u = repo.create_user(platform_db, client_id, data, _enc)
    if data.get("role_ids"):
        _validate_roles(client_db, client_id, data["role_ids"])
        repo.set_user_roles(client_db, u.id, data["role_ids"])
    repo.log_activity(client_db, client_id, c.ACTION_USER_CREATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip,
                      extra={"name": u.first_name})
    platform_db.commit()
    client_db.commit()
    roles = repo.get_user_roles(client_db, u.id)
    return _user_to_dict(u, roles)


def update_user(
    platform_db: Session, client_db: Session, client_id: str,
    user_id: str, payload, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    data = payload.model_dump(exclude_unset=True)
    role_ids = data.pop("role_ids", None)
    repo.update_user(platform_db, u, data, _enc)
    if role_ids is not None:
        _validate_roles(client_db, client_id, role_ids)
        repo.set_user_roles(client_db, u.id, role_ids)
    repo.log_activity(client_db, client_id, c.ACTION_USER_UPDATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    platform_db.commit()
    client_db.commit()
    roles = repo.get_user_roles(client_db, u.id)
    return _user_to_dict(u, roles)


def activate_user(
    platform_db: Session, client_db: Session, client_id: str,
    user_id: str, actor_id: str, ip: Optional[str] = None,
) -> None:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    repo.activate_user(platform_db, u)
    repo.log_activity(client_db, client_id, c.ACTION_USER_ACTIVATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    platform_db.commit()
    client_db.commit()


def deactivate_user(
    platform_db: Session, client_db: Session, client_id: str,
    user_id: str, actor_id: str, ip: Optional[str] = None,
) -> None:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    if u.id == actor_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    repo.deactivate_user(platform_db, u)
    repo.log_activity(client_db, client_id, c.ACTION_USER_DEACTIVATED,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    platform_db.commit()
    client_db.commit()


def reset_password(
    platform_db: Session, client_db: Session, client_id: str,
    user_id: str, new_password: str, actor_id: str, ip: Optional[str] = None,
) -> None:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    repo.set_password(platform_db, u, _hash_pw(new_password))
    repo.log_activity(client_db, client_id, c.ACTION_PASSWORD_RESET,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip)
    platform_db.commit()
    client_db.commit()


def force_logout(
    platform_db: Session, client_db: Session, client_id: str,
    user_id: str, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    u = repo.get_user(platform_db, client_id, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found.")
    count = repo.logout_all_sessions(client_db, client_id, user_id)
    repo.create_login_log(client_db, client_id, c.LOGIN_EVENT_FORCED_LOGOUT,
                          user_id=user_id, ip_address=ip)
    repo.log_activity(client_db, client_id, c.ACTION_FORCE_LOGOUT,
                      actor_id=actor_id, target_user_id=u.id, ip_address=ip,
                      extra={"sessions_terminated": count})
    client_db.commit()
    return {"sessions_terminated": count}


# ── Roles ──────────────────────────────────────────────────────────────────────

def _role_to_dict(client_db: Session, role) -> Dict:
    count = repo.count_users_with_role(client_db, role.id)
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


def _validate_roles(client_db: Session, client_id: str, role_ids: List[str]) -> None:
    for rid in role_ids:
        if not repo.get_role(client_db, client_id, rid):
            raise HTTPException(status_code=400, detail=f"Role {rid} not found.")


def list_roles(client_db: Session, client_id: str) -> List[Dict]:
    repo.seed_default_roles(client_db, client_id)
    client_db.commit()
    return [_role_to_dict(client_db, r) for r in repo.list_roles(client_db, client_id)]


def get_role(client_db: Session, client_id: str, role_id: str) -> Dict:
    r = repo.get_role(client_db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    return _role_to_dict(client_db, r)


def create_role(
    client_db: Session, client_id: str,
    payload, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    data = payload.model_dump()
    if repo.get_role_by_name(client_db, client_id, data["name"]):
        raise HTTPException(status_code=409, detail=f"A role named '{data['name']}' already exists.")
    role = repo.create_role(client_db, client_id, data)
    repo.log_activity(client_db, client_id, c.ACTION_ROLE_CREATED,
                      actor_id=actor_id, ip_address=ip, extra={"role_name": role.name})
    client_db.commit()
    return _role_to_dict(client_db, role)


def update_role(
    client_db: Session, client_id: str,
    role_id: str, payload, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    r = repo.get_role(client_db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    if r.is_system_role:
        raise HTTPException(status_code=400, detail="System roles cannot be renamed.")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        existing = repo.get_role_by_name(client_db, client_id, data["name"])
        if existing and existing.id != role_id:
            raise HTTPException(status_code=409, detail=f"A role named '{data['name']}' already exists.")
    repo.update_role(client_db, r, data)
    repo.log_activity(client_db, client_id, c.ACTION_ROLE_UPDATED,
                      actor_id=actor_id, ip_address=ip, extra={"role_name": r.name})
    client_db.commit()
    return _role_to_dict(client_db, r)


def clone_role(
    client_db: Session, client_id: str,
    role_id: str, actor_id: str, ip: Optional[str] = None,
) -> Dict:
    r = repo.get_role(client_db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    base_name = f"{r.name} (Copy)"
    name, i = base_name, 2
    while repo.get_role_by_name(client_db, client_id, name):
        name = f"{base_name} {i}"; i += 1
    new_role = repo.create_role(client_db, client_id, {
        "name": name, "description": r.description, "is_system_role": False,
    })
    repo.log_activity(client_db, client_id, c.ACTION_ROLE_CLONED,
                      actor_id=actor_id, ip_address=ip,
                      extra={"source_role": r.name, "new_role": name})
    client_db.commit()
    return _role_to_dict(client_db, new_role)


def set_role_status(
    client_db: Session, client_id: str,
    role_id: str, is_active: bool, actor_id: str, ip: Optional[str] = None,
) -> None:
    r = repo.get_role(client_db, client_id, role_id)
    if not r:
        raise HTTPException(status_code=404, detail="Role not found.")
    if r.is_system_role:
        raise HTTPException(status_code=400, detail="Cannot deactivate system roles.")
    r.is_active = is_active
    r.updated_at = datetime.utcnow()
    action = c.ACTION_ROLE_ACTIVATED if is_active else c.ACTION_ROLE_DEACTIVATED
    repo.log_activity(client_db, client_id, action, actor_id=actor_id,
                      ip_address=ip, extra={"role_name": r.name})
    client_db.commit()


# ── Sessions ───────────────────────────────────────────────────────────────────

def record_login_session(
    client_db: Session,
    platform_db: Session,
    client_id: str,
    user_id: str,
    jti: str,
    email: str,
    *,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
    expires_at=None,
) -> None:
    """Called from portal_auth router after successful login."""
    repo.create_session(client_db, client_id, user_id, jti,
                        ip_address=ip, user_agent=user_agent, expires_at=expires_at)
    repo.create_login_log(client_db, client_id, c.LOGIN_EVENT_SUCCESS,
                          user_id=user_id, email=email, ip_address=ip, user_agent=user_agent)
    # Stamp last_login on platform DB (ClientAdminUser lives there)
    u = platform_db.query(ClientAdminUser).filter(ClientAdminUser.id == user_id).first()
    if u:
        repo.stamp_last_login(platform_db, u)
        platform_db.commit()
    client_db.commit()


def list_sessions(
    client_db: Session, platform_db: Session, client_id: str,
    *, page=1, page_size=50, user_id=None, active_only=False,
) -> Dict:
    rows, total = repo.list_sessions(client_db, client_id, page=page, page_size=page_size,
                                     user_id=user_id, active_only=active_only)
    data = []
    for s in rows:
        data.append({
            "id": s.id, "client_id": s.client_id, "user_id": s.user_id,
            "user_name": _resolve_user_name(platform_db, s.user_id),
            "jti": s.jti, "ip_address": s.ip_address,
            "device_info": s.device_info, "browser_info": s.browser_info,
            "login_at": s.login_at, "last_activity_at": s.last_activity_at,
            "expires_at": s.expires_at, "is_active": s.is_active,
            "logged_out_at": s.logged_out_at,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def logout_session(
    client_db: Session, client_id: str, session_id: str,
    actor_id: str, ip: Optional[str] = None,
) -> None:
    s = repo.get_session_by_id(client_db, client_id, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    repo.logout_session(client_db, s)
    repo.create_login_log(client_db, client_id, c.LOGIN_EVENT_LOGOUT,
                          user_id=s.user_id, ip_address=ip)
    client_db.commit()


def logout_all_user_sessions(
    client_db: Session, client_id: str, user_id: str,
    actor_id: str, ip: Optional[str] = None,
) -> Dict:
    count = repo.logout_all_sessions(client_db, client_id, user_id)
    repo.create_login_log(client_db, client_id, c.LOGIN_EVENT_FORCED_LOGOUT,
                          user_id=user_id, ip_address=ip)
    client_db.commit()
    return {"sessions_terminated": count}


# ── Login Logs ─────────────────────────────────────────────────────────────────

def list_login_logs(
    client_db: Session, platform_db: Session, client_id: str,
    *, page=1, page_size=50, user_id=None, event_type=None,
) -> Dict:
    rows, total = repo.list_login_logs(client_db, client_id, page=page, page_size=page_size,
                                       user_id=user_id, event_type=event_type)
    data = []
    for log in rows:
        data.append({
            "id": log.id, "client_id": log.client_id, "user_id": log.user_id,
            "user_name": _resolve_user_name(platform_db, log.user_id),
            "event_type": log.event_type, "email": log.email,
            "ip_address": log.ip_address, "device_info": log.device_info,
            "browser_info": log.browser_info, "created_at": log.created_at,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}


# ── Activity Logs ──────────────────────────────────────────────────────────────

def list_activity_logs(
    client_db: Session, platform_db: Session, client_id: str,
    *, page=1, page_size=50, user_id=None,
) -> Dict:
    rows, total = repo.list_activity_logs(client_db, client_id, page=page, page_size=page_size,
                                          user_id=user_id)
    data = []
    for log in rows:
        data.append({
            "id": log.id, "client_id": log.client_id,
            "actor_id": log.actor_id,
            "actor_name": _resolve_user_name(platform_db, log.actor_id),
            "target_user_id": log.target_user_id,
            "target_user_name": _resolve_user_name(platform_db, log.target_user_id),
            "action": log.action, "ip_address": log.ip_address,
            "extra": log.extra, "created_at": log.created_at,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}
