"""Asset Requests Portal Router.

Prefix: /api/v1/portal/{subdomain}/assets/requests
Requires: valid portal_access JWT + Asset Management module enabled.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management import asset_request_service as svc
from backend.shared.response import ApiResponse

router = APIRouter()
MODULE_NAME = "Asset Management"


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


def _client_db_dep(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> Generator[Session, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    client_id = portal_user["client_id"]
    mod = client_repo.get_module(platform_db, client_id, MODULE_NAME)
    if not mod or not mod.is_enabled:
        raise HTTPException(403, f"{MODULE_NAME} is not enabled for this workspace.")

    conn = client_repo.get_db_connection(platform_db, client_id)
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(503, "Client workspace database is not provisioned.")

    url = build_client_db_url(conn)
    provision_portal_schema(url, force=False)

    session = make_client_session(url)
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _sub(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


def _actor(portal_user: dict):
    return portal_user.get("user_id"), portal_user.get("email", "")


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/requests/meta/options")
def asset_request_meta(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


# ── List / Create ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/requests")
def list_requests(
    subdomain: str,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_requests(
        client_db, portal_user["client_id"],
        search=search, status=status, priority=priority,
        request_type=request_type, page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/assets/requests", status_code=201)
def create_request(
    subdomain: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_request(client_db, portal_user["client_id"], payload,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request created.").model_dump()


# ── Detail / Update ───────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/requests/{request_id}")
def get_request(
    subdomain: str,
    request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_request(client_db, portal_user["client_id"], request_id)).model_dump()


@router.patch("/{subdomain}/assets/requests/{request_id}")
def update_request(
    subdomain: str,
    request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_request(client_db, portal_user["client_id"], request_id, payload,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request updated.").model_dump()


# ── Workflow actions ──────────────────────────────────────────────────────────

@router.post("/{subdomain}/assets/requests/{request_id}/submit")
def submit_request(
    subdomain: str,
    request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.submit_request(client_db, portal_user["client_id"], request_id,
                           actor_id=actor_id, actor_name=actor_name),
        "Request submitted."
    ).model_dump()


@router.post("/{subdomain}/assets/requests/{request_id}/review")
def review_request(
    subdomain: str,
    request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.review_request(client_db, portal_user["client_id"], request_id,
                           actor_id=actor_id, actor_name=actor_name),
        "Request marked under review."
    ).model_dump()


@router.post("/{subdomain}/assets/requests/{request_id}/approve")
def approve_request(
    subdomain: str,
    request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.approve_request(client_db, portal_user["client_id"], request_id,
                            notes=payload.get("notes", ""),
                            actor_id=actor_id, actor_name=actor_name),
        "Request approved."
    ).model_dump()


@router.post("/{subdomain}/assets/requests/{request_id}/reject")
def reject_request(
    subdomain: str,
    request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.reject_request(client_db, portal_user["client_id"], request_id,
                           reason=payload.get("reason", ""),
                           actor_id=actor_id, actor_name=actor_name),
        "Request rejected."
    ).model_dump()


@router.post("/{subdomain}/assets/requests/{request_id}/cancel")
def cancel_request(
    subdomain: str,
    request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.cancel_request(client_db, portal_user["client_id"], request_id,
                           actor_id=actor_id, actor_name=actor_name),
        "Request cancelled."
    ).model_dump()


@router.post("/{subdomain}/assets/requests/{request_id}/fulfil")
def fulfil_request(
    subdomain: str,
    request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    return ApiResponse.ok(
        svc.fulfil_request(client_db, portal_user["client_id"], request_id,
                           notes=payload.get("notes", ""),
                           actor_id=actor_id, actor_name=actor_name),
        "Request marked as fulfilled."
    ).model_dump()
