"""Asset Maintenance Portal Router.

Prefix: /api/v1/portal/{subdomain}/assets/maintenance
Requires: valid portal_access JWT + Asset Management module enabled.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management import maintenance_service as svc
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

@router.get("/{subdomain}/assets/maintenance/meta/options")
def maintenance_meta(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


@router.get("/{subdomain}/assets/maintenance/dashboard")
def maintenance_dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_dashboard(client_db, portal_user["client_id"])).model_dump()


# ── Maintenance Requests ───────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/maintenance")
def list_requests(
    subdomain: str,
    page: int = 1, page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    asset_id: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_requests(
        client_db, portal_user["client_id"],
        search=search, status=status, priority=priority,
        maintenance_type=maintenance_type, asset_id=asset_id,
        page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/assets/maintenance/{request_id}")
def get_request(
    subdomain: str, request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_request(client_db, portal_user["client_id"], request_id)).model_dump()


@router.post("/{subdomain}/assets/maintenance", status_code=201)
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
    return ApiResponse.ok(result, "Maintenance request created.").model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/assign")
def assign_request(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.assign_request(client_db, portal_user["client_id"], request_id, payload,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request assigned.").model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/status")
def update_status(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    new_status = payload.get("status")
    if not new_status:
        raise HTTPException(400, "status is required.")
    result = svc.update_status(client_db, portal_user["client_id"], request_id, new_status,
                               notes=payload.get("notes"),
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, f"Status updated to {new_status}.").model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/complete")
def complete_request(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.complete_request(client_db, portal_user["client_id"], request_id, payload,
                                  actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Maintenance completed. Asset is now available.").model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/close")
def close_request(
    subdomain: str, request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.close_request(client_db, portal_user["client_id"], request_id,
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request closed.").model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/cancel")
def cancel_request(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.cancel_request(client_db, portal_user["client_id"], request_id,
                                reason=payload.get("reason", ""),
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request cancelled.").model_dump()


# ── Work Orders ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/maintenance/work-orders/list")
def list_work_orders(
    subdomain: str,
    request_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1, page_size: int = 20,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_work_orders(
        client_db, portal_user["client_id"],
        request_id=request_id, asset_id=asset_id, status=status,
        page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/assets/maintenance/{request_id}/work-orders", status_code=201)
def create_work_order(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_work_order(client_db, portal_user["client_id"], request_id, payload,
                                   actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Work order created.").model_dump()


@router.patch("/{subdomain}/assets/maintenance/work-orders/{wo_id}")
def update_work_order(
    subdomain: str, wo_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_work_order(client_db, portal_user["client_id"], wo_id, payload,
                                   actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Work order updated.").model_dump()


# ── Warranties ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/warranties")
def list_warranties(
    subdomain: str,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1, page_size: int = 20,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_warranties(client_db, portal_user["client_id"],
                                 asset_id=asset_id, status=status, page=page, page_size=page_size)
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/assets/warranties/{warranty_id}")
def get_warranty(
    subdomain: str, warranty_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_warranty(client_db, portal_user["client_id"], warranty_id)).model_dump()


@router.post("/{subdomain}/assets/warranties", status_code=201)
def create_warranty(
    subdomain: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_warranty(client_db, portal_user["client_id"], payload,
                                 actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Warranty created.").model_dump()


@router.patch("/{subdomain}/assets/warranties/{warranty_id}")
def update_warranty(
    subdomain: str, warranty_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_warranty(client_db, portal_user["client_id"], warranty_id, payload,
                                 actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Warranty updated.").model_dump()


# ── AMC Contracts ──────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/amc")
def list_amcs(
    subdomain: str,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1, page_size: int = 20,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_amcs(client_db, portal_user["client_id"],
                            asset_id=asset_id, status=status, page=page, page_size=page_size)
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/assets/amc/{amc_id}")
def get_amc(
    subdomain: str, amc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_amc(client_db, portal_user["client_id"], amc_id)).model_dump()


@router.post("/{subdomain}/assets/amc", status_code=201)
def create_amc(
    subdomain: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_amc(client_db, portal_user["client_id"], payload,
                             actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "AMC contract created.").model_dump()


@router.patch("/{subdomain}/assets/amc/{amc_id}")
def update_amc(
    subdomain: str, amc_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_amc(client_db, portal_user["client_id"], amc_id, payload,
                             actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "AMC contract updated.").model_dump()
