"""
Service layer — Auth / SuperAdmin account.

Business logic: credential verification, token issuance, profile management,
and password change. JWT operations live here alongside DB calls so that
the router stays a thin HTTP adapter.
"""
from __future__ import annotations

from datetime import datetime, timezone as _tz
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.core.security import (
    create_access_token, create_refresh_token, decode_refresh_token,
)
from backend.app.modules.auth import repository as repo
from backend.app.modules.auth.schemas import ProfileUpdateRequest
from backend.app.modules.rbac import service as rbac_service
from backend.app.platform.superadmin.models import SuperAdmin
from jose import JWTError


def login(db: Session, email: str, password: str) -> dict:
    """Verify credentials and return tokens + resolved permissions."""
    admin = repo.get_active_by_email(db, email)
    if not admin or not admin.verify_password(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_data = {
        "user_id": admin.id,
        "role": "superadmin",
        "device_type": "web",
        "email": admin.email,
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "user_id": admin.id,
        "role": "superadmin",
        "device_type": "web",
        "permissions": rbac_service.permissions_for_client(db, admin.id),
    }


def refresh_tokens(refresh_token: str) -> dict:
    """Validate a refresh token and issue a new access + refresh pair."""
    try:
        data = decode_refresh_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    claims = {
        "user_id": data["user_id"],
        "role": data["role"],
        "device_type": data.get("device_type", "web"),
        "email": data.get("email"),
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
    """Return the full identity dict for the /me endpoint."""
    admin_id = token_payload.get("user_id")
    admin = repo.get_by_id(db, admin_id)
    return {
        "user_id": admin_id,
        "email": admin.email if admin else token_payload.get("email"),
        "name": admin.name if admin else None,
        "phone": admin.phone if admin else None,
        "role": token_payload.get("role"),
        "permissions": rbac_service.permissions_for_client(db, admin_id),
    }


def get_profile(db: Session, admin_id: int) -> dict:
    admin = _require_admin(db, admin_id)
    return {
        "user_id": admin.id,
        "email": admin.email,
        "name": admin.name,
        "phone": admin.phone,
        "role": "superadmin",
    }


def update_profile(db: Session, admin_id: int, payload: ProfileUpdateRequest) -> dict:
    admin = _require_admin(db, admin_id)
    if payload.name is not None:
        admin.name = payload.name
    if payload.phone is not None or "phone" in payload.model_fields_set:
        admin.phone = payload.phone
    admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, admin)
    return {
        "user_id": admin.id,
        "email": admin.email,
        "name": admin.name,
        "phone": admin.phone,
        "role": "superadmin",
    }


def change_password(db: Session, admin_id: int, current_password: str, new_password: str) -> dict:
    admin = _require_admin(db, admin_id)
    if not admin.verify_password(current_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    admin.hashed_password = SuperAdmin.hash_password(new_password)
    admin.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, admin)
    return {"message": "Password updated successfully"}
