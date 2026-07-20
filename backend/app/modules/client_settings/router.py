"""Client Settings Router.

Prefix: /api/v1/portal/{subdomain}/settings
System module — always accessible (no module gate).

Routes
  General
    GET   /{subdomain}/settings/general
    PATCH /{subdomain}/settings/general

  Branding
    GET    /{subdomain}/settings/branding
    PATCH  /{subdomain}/settings/branding
    DELETE /{subdomain}/settings/branding/{field}

  Localization
    GET   /{subdomain}/settings/localization
    PATCH /{subdomain}/settings/localization

  Notification Channels
    GET   /{subdomain}/settings/notification-channels
    PATCH /{subdomain}/settings/notification-channels/{channel}

  Credentials
    GET    /{subdomain}/settings/credentials
    PATCH  /{subdomain}/settings/credentials/{credential_type}
    DELETE /{subdomain}/settings/credentials/{credential_type}

  Common Masters
    GET    /{subdomain}/settings/common-masters
    GET    /{subdomain}/settings/common-masters/{master_type}
    POST   /{subdomain}/settings/common-masters/{master_type}
    PATCH  /{subdomain}/settings/common-masters/{master_type}/{item_id}
    DELETE /{subdomain}/settings/common-masters/{master_type}/{item_id}
    POST   /{subdomain}/settings/common-masters/{master_type}/seed
"""
from __future__ import annotations

from typing import Generator

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import (
    build_client_db_url, make_client_session, provision_portal_schema,
)
from backend.shared.response import ApiResponse
from . import service as svc
from .schemas import (
    GeneralSettingsUpdate, BrandingUpdate, LocalizationUpdate,
    NotificationChannelUpdate, CredentialConfigUpdate,
    CommonMasterCreate, CommonMasterUpdate,
)

router = APIRouter()

BRANDING_IMAGE_FIELDS = {"logo_url", "favicon_url", "seal_url", "signature_url"}


# ── Auth guard ─────────────────────────────────────────────────────────────────

def _portal_jwt(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Portal authentication required.")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired portal token.")
    if payload.get("token_type") != "portal_access":
        raise HTTPException(401, "Portal token required.")
    return payload


# ── Client DB dependency (mirrors portal_user_management pattern) ───────────────

def _client_db_dep(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> Generator[tuple, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    conn = client_repo.get_db_connection(platform_db, portal_user["client_id"])
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(
            status_code=503,
            detail="This workspace's database has not been provisioned yet.",
        )
    url = build_client_db_url(conn)
    provision_portal_schema(url)
    session = make_client_session(url)
    try:
        yield portal_user, session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


# ── General ────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/general")
def get_general(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_general(db, portal_user["client_id"])
    return ApiResponse.ok(data.model_dump(), "General settings retrieved.").model_dump()


@router.patch("/{subdomain}/settings/general")
def update_general(subdomain: str, body: GeneralSettingsUpdate, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.update_general(db, portal_user["client_id"], body.model_dump(exclude_none=True), portal_user)
    return ApiResponse.ok(data.model_dump(), "General settings updated.").model_dump()


# ── Branding ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/branding")
def get_branding(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_branding(db, portal_user["client_id"])
    return ApiResponse.ok(data.model_dump(), "Branding retrieved.").model_dump()


@router.patch("/{subdomain}/settings/branding")
def update_branding(subdomain: str, body: BrandingUpdate, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.update_branding(db, portal_user["client_id"], body.model_dump(exclude_none=True), portal_user)
    return ApiResponse.ok(data.model_dump(), "Branding updated.").model_dump()


@router.delete("/{subdomain}/settings/branding/{field}")
def clear_branding_field(subdomain: str, field: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    if field not in BRANDING_IMAGE_FIELDS:
        raise HTTPException(400, f"Field '{field}' cannot be cleared via this endpoint.")
    data = svc.clear_branding_field(db, portal_user["client_id"], field, portal_user)
    return ApiResponse.ok(data.model_dump(), f"Branding field '{field}' cleared.").model_dump()


# ── Localization ───────────────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/localization")
def get_localization(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_localization(db, portal_user["client_id"])
    return ApiResponse.ok(data.model_dump(), "Localization retrieved.").model_dump()


@router.patch("/{subdomain}/settings/localization")
def update_localization(subdomain: str, body: LocalizationUpdate, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.update_localization(db, portal_user["client_id"], body.model_dump(exclude_none=True), portal_user)
    return ApiResponse.ok(data.model_dump(), "Localization updated.").model_dump()


# ── Notification Channels ──────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/notification-channels")
def get_notification_channels(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_notification_channels(db, portal_user["client_id"])
    return ApiResponse.ok(data, "Notification channels retrieved.").model_dump()


@router.patch("/{subdomain}/settings/notification-channels/{channel}")
def update_notification_channel(
    subdomain: str, channel: str, body: NotificationChannelUpdate, deps=Depends(_client_db_dep),
):
    portal_user, db = deps
    result = svc.update_notification_channel(db, portal_user["client_id"], channel, body.is_enabled, portal_user)
    if result is None:
        raise HTTPException(404, f"Channel '{channel}' not found.")
    return ApiResponse.ok(result, "Channel updated.").model_dump()


# ── Credentials ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/credentials")
def get_credentials(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_credentials(db, portal_user["client_id"])
    return ApiResponse.ok(data, "Credentials retrieved.").model_dump()


@router.patch("/{subdomain}/settings/credentials/{credential_type}")
def update_credential(
    subdomain: str, credential_type: str, body: CredentialConfigUpdate, deps=Depends(_client_db_dep),
):
    portal_user, db = deps
    result = svc.update_credential(db, portal_user["client_id"], credential_type, body.config, portal_user)
    if result is None:
        raise HTTPException(404, f"Credential type '{credential_type}' not found.")
    return ApiResponse.ok(result, "Credential updated.").model_dump()


@router.delete("/{subdomain}/settings/credentials/{credential_type}")
def clear_credential(subdomain: str, credential_type: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    result = svc.clear_credential(db, portal_user["client_id"], credential_type, portal_user)
    if result is None:
        raise HTTPException(404, f"Credential type '{credential_type}' not found.")
    return ApiResponse.ok(result, "Credential cleared.").model_dump()


# ── Common Masters ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/settings/common-masters")
def get_all_master_types(subdomain: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.get_all_master_types(db, portal_user["client_id"])
    return ApiResponse.ok(data, "Master types retrieved.").model_dump()


@router.get("/{subdomain}/settings/common-masters/{master_type}")
def list_common_masters(subdomain: str, master_type: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    data = svc.list_common_masters(db, portal_user["client_id"], master_type)
    return ApiResponse.ok(data, f"{master_type} masters retrieved.").model_dump()


@router.post("/{subdomain}/settings/common-masters/{master_type}")
def create_common_master(
    subdomain: str, master_type: str, body: CommonMasterCreate, deps=Depends(_client_db_dep),
):
    portal_user, db = deps
    item = svc.create_common_master(db, portal_user["client_id"], master_type, body.model_dump(), portal_user)
    return ApiResponse.ok(item.model_dump(), "Master item created.").model_dump()


@router.patch("/{subdomain}/settings/common-masters/{master_type}/{item_id}")
def update_common_master(
    subdomain: str, master_type: str, item_id: str, body: CommonMasterUpdate, deps=Depends(_client_db_dep),
):
    portal_user, db = deps
    item = svc.update_common_master(db, portal_user["client_id"], item_id, body.model_dump(exclude_none=True), portal_user)
    if not item:
        raise HTTPException(404, "Master item not found.")
    return ApiResponse.ok(item.model_dump(), "Master item updated.").model_dump()


@router.delete("/{subdomain}/settings/common-masters/{master_type}/{item_id}")
def delete_common_master(subdomain: str, master_type: str, item_id: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    ok = svc.delete_common_master(db, portal_user["client_id"], item_id)
    if not ok:
        raise HTTPException(404, "Master item not found.")
    return ApiResponse.ok({"deleted": item_id}, "Master item deleted.").model_dump()


@router.post("/{subdomain}/settings/common-masters/{master_type}/seed")
def seed_common_masters(subdomain: str, master_type: str, deps=Depends(_client_db_dep)):
    portal_user, db = deps
    result = svc.seed_common_masters(db, portal_user["client_id"], master_type, portal_user)
    return ApiResponse.ok(result, f"Seeded {result['seeded']} {master_type} items.").model_dump()
