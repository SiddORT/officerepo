"""Asset Returns Portal Router.

Prefix: /api/v1/portal/{subdomain}/assets/returns
Requires: valid portal_access JWT + Asset Management module enabled.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management import return_service as svc
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


# ── Meta / Dashboard ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/returns/meta/options")
def return_meta(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


@router.get("/{subdomain}/assets/returns/dashboard")
def return_dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_dashboard(client_db, portal_user["client_id"])).model_dump()


# ── List / Get ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/returns")
def list_returns(
    subdomain: str,
    page: int = 1, page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    asset_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    overdue_only: bool = False,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_returns(
        client_db, portal_user["client_id"],
        search=search, status=status, asset_id=asset_id,
        employee_id=employee_id, overdue_only=overdue_only,
        page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/assets/returns/{return_id}")
def get_return(
    subdomain: str, return_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_return(client_db, portal_user["client_id"], return_id)).model_dump()


# ── Create / Lifecycle ─────────────────────────────────────────────────────────

@router.post("/{subdomain}/assets/returns", status_code=201)
def create_return(
    subdomain: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_return(client_db, portal_user["client_id"], payload,
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Return request created.").model_dump()


@router.post("/{subdomain}/assets/returns/{return_id}/submit")
def submit_return(
    subdomain: str, return_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.submit_return(client_db, portal_user["client_id"], return_id,
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Return submitted.").model_dump()


@router.post("/{subdomain}/assets/returns/{return_id}/approve")
def approve_return(
    subdomain: str, return_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.approve_return(client_db, portal_user["client_id"], return_id,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Return approved.").model_dump()


@router.post("/{subdomain}/assets/returns/{return_id}/reject")
def reject_return(
    subdomain: str, return_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.reject_return(client_db, portal_user["client_id"], return_id,
                               reason=payload.get("reason", ""),
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Return rejected.").model_dump()


@router.post("/{subdomain}/assets/returns/{return_id}/complete")
def complete_return(
    subdomain: str, return_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.complete_return(client_db, portal_user["client_id"], return_id, payload,
                                 actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset return completed.").model_dump()


@router.post("/{subdomain}/assets/returns/{return_id}/close")
def close_return(
    subdomain: str, return_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.close_return(client_db, portal_user["client_id"], return_id,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Return closed.").model_dump()


# ── Assessment ─────────────────────────────────────────────────────────────────

@router.post("/{subdomain}/assets/returns/{return_id}/assessment")
def save_assessment(
    subdomain: str, return_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.save_assessment(client_db, portal_user["client_id"], return_id, payload,
                                 actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Assessment saved.").model_dump()


# ── Recovery ───────────────────────────────────────────────────────────────────

@router.post("/{subdomain}/assets/returns/{return_id}/recovery")
def save_recovery(
    subdomain: str, return_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.save_recovery(client_db, portal_user["client_id"], return_id, payload,
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Recovery record saved.").model_dump()
