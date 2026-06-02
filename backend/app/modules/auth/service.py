"""
Service layer — Auth / SuperAdmin account.

Business logic: credential verification, token issuance, profile management,
avatar upload/removal, and password change. JWT operations live here alongside
DB calls so that the router stays a thin HTTP adapter.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone as _tz

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.core.security import (
    create_access_token, create_refresh_token, decode_refresh_token,
)
from backend.app.modules.auth import repository as repo
from backend.app.modules.auth.schemas import ProfileUpdateRequest
from backend.app.modules.rbac import service as rbac_service
from backend.app.platform.superadmin.models import SuperAdmin
from backend.shared.storage.file_handler import (
    Visibility, delete_file, storage,
)
from jose import JWTError

_AVATAR_SCOPE = "platform/avatars"
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
_EXT_MAP = {
    "image/jpeg": ".jpg", "image/png": ".png",
    "image/gif": ".gif", "image/webp": ".webp",
}
_ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


def _avatar_url(key: str | None) -> str | None:
    if not key:
        return None
    return f"/uploads/{key}"


def _full_name(admin: SuperAdmin) -> str:
    parts = " ".join(filter(None, [admin.first_name, admin.last_name])).strip()
    return parts or admin.name or ""


def _profile_dict(admin: SuperAdmin) -> dict:
    return {
        "user_id": admin.id,
        "email": admin.email,
        "first_name": admin.first_name,
        "last_name": admin.last_name,
        "display_name": admin.display_name,
        "name": _full_name(admin),
        "phone": admin.phone,
        "role": "superadmin",
        "has_avatar": bool(admin.avatar_key),
        "avatar_url": _avatar_url(admin.avatar_key),
    }


def login(db: Session, email: str, password: str) -> dict:
    admin = repo.get_active_by_email(db, email)
    if not admin or not admin.verify_password(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token_data = {
        "user_id": admin.id, "role": "superadmin",
        "device_type": "web", "email": admin.email,
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user_id": admin.id, "role": "superadmin", "device_type": "web",
        "permissions": rbac_service.permissions_for_client(db, admin.id),
    }


def refresh_tokens(refresh_token: str) -> dict:
    try:
        data = decode_refresh_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")
    claims = {
        "user_id": data["user_id"], "role": data["role"],
        "device_type": data.get("device_type", "web"), "email": data.get("email"),
    }
    return {
        "access_token": create_access_token(claims),
        "refresh_token": create_refresh_token(claims),
        "token_type": "bearer",
    }


def _require_admin(db: Session, admin_id: int) -> SuperAdmin:
    admin = repo.get_by_id(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Account not found")
    return admin


def get_identity(db: Session, token_payload: dict) -> dict:
    admin_id = token_payload.get("user_id")
    admin = repo.get_by_id(db, admin_id)
    return {
        "user_id": admin_id,
        "email": admin.email if admin else token_payload.get("email"),
        "name": _full_name(admin) if admin else None,
        "phone": admin.phone if admin else None,
        "role": token_payload.get("role"),
        "has_avatar": bool(admin.avatar_key) if admin else False,
        "avatar_url": _avatar_url(admin.avatar_key) if admin else None,
        "permissions": rbac_service.permissions_for_client(db, admin_id),
    }


def get_profile(db: Session, admin_id: int) -> dict:
    return _profile_dict(_require_admin(db, admin_id))


def update_profile(db: Session, admin_id: int, payload: ProfileUpdateRequest) -> dict:
    admin = _require_admin(db, admin_id)
    fs = payload.model_fields_set
    if "first_name" in fs:
        admin.first_name = payload.first_name
    if "last_name" in fs:
        admin.last_name = payload.last_name
    if "display_name" in fs:
        admin.display_name = payload.display_name
    if "phone" in fs:
        admin.phone = payload.phone
    admin.name = _full_name(admin)
    admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, admin)
    return _profile_dict(admin)


def upload_avatar(db: Session, admin_id: int, file: UploadFile) -> dict:
    admin = _require_admin(db, admin_id)

    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Allowed: jpeg, png, gif, webp.")

    _, ext = os.path.splitext(file.filename or "")
    ext = ext.lower()
    if ext not in _ALLOWED_EXTS:
        ext = _EXT_MAP.get(content_type, ".jpg")

    contents = file.file.read()
    if len(contents) > _MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5 MB.")

    if admin.avatar_key:
        try:
            delete_file(admin.avatar_key, Visibility.PUBLIC)
        except Exception:
            pass

    key = f"{_AVATAR_SCOPE}/{admin_id}_{uuid.uuid4().hex[:12]}{ext}"
    storage.save(key, contents, Visibility.PUBLIC)

    admin.avatar_key = key
    admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, admin)
    return _profile_dict(admin)


def remove_avatar(db: Session, admin_id: int) -> dict:
    admin = _require_admin(db, admin_id)
    if admin.avatar_key:
        try:
            delete_file(admin.avatar_key, Visibility.PUBLIC)
        except Exception:
            pass
        admin.avatar_key = None
        admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
        repo.save(db, admin)
    return _profile_dict(admin)


def change_password(db: Session, admin_id: int, current_password: str, new_password: str) -> dict:
    admin = _require_admin(db, admin_id)
    if not admin.verify_password(current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    admin.hashed_password = SuperAdmin.hash_password(new_password)
    admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, admin)
    return {"message": "Password updated successfully"}
