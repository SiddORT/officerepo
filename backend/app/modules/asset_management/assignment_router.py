"""Asset Assignments Portal Router.

Prefix: /api/v1/portal/{subdomain}/assets/assignments
Requires: valid portal_access JWT + Asset Management module enabled.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management import assignment_service as svc
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

@router.get("/{subdomain}/assets/assignments/meta/options")
def assignment_meta(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


@router.get("/{subdomain}/assets/assignments/dashboard")
def assignment_dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_dashboard(client_db, portal_user["client_id"])).model_dump()


# ── Assignment Requests ────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/assignments/requests")
def list_requests(
    subdomain: str,
    page: int = 1, page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_requests(client_db, portal_user["client_id"],
                               search=search, status=status, priority=priority,
                               page=page, page_size=page_size)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/assets/assignments/requests", status_code=201)
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


@router.get("/{subdomain}/assets/assignments/requests/{request_id}")
def get_request(
    subdomain: str, request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_request(client_db, portal_user["client_id"], request_id)).model_dump()


@router.patch("/{subdomain}/assets/assignments/requests/{request_id}")
def update_request(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_request(client_db, portal_user["client_id"], request_id, payload,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request updated.").model_dump()


@router.post("/{subdomain}/assets/assignments/requests/{request_id}/submit")
def submit_request(
    subdomain: str, request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.submit_request(client_db, portal_user["client_id"], request_id,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request submitted.").model_dump()


@router.post("/{subdomain}/assets/assignments/requests/{request_id}/approve")
def approve_request(
    subdomain: str, request_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.approve_request(client_db, portal_user["client_id"], request_id,
                                 actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request approved.").model_dump()


@router.post("/{subdomain}/assets/assignments/requests/{request_id}/reject")
def reject_request(
    subdomain: str, request_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.reject_request(client_db, portal_user["client_id"], request_id,
                                reason=payload.get("reason", ""),
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Request rejected.").model_dump()


# ── Assignments ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/assignments")
def list_assignments(
    subdomain: str,
    page: int = 1, page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    assignee_type: Optional[str] = None,
    assignee_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    overdue_only: bool = False,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_assignments(
        client_db, portal_user["client_id"],
        search=search, status=status, assignee_type=assignee_type,
        assignee_id=assignee_id, asset_id=asset_id,
        overdue_only=overdue_only, page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/assets/assignments", status_code=201)
def assign_asset(
    subdomain: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    asset_id = payload.pop("asset_id", None)
    if not asset_id:
        raise HTTPException(400, "asset_id is required.")
    result = svc.assign_asset(client_db, portal_user["client_id"], asset_id, payload,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset assigned.").model_dump()


@router.get("/{subdomain}/assets/assignments/{assignment_id}")
def get_assignment(
    subdomain: str, assignment_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_assignment(client_db, portal_user["client_id"], assignment_id)).model_dump()


@router.post("/{subdomain}/assets/assignments/{assignment_id}/return")
def return_assignment(
    subdomain: str, assignment_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.return_asset(client_db, portal_user["client_id"], assignment_id, payload,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset returned.").model_dump()


@router.post("/{subdomain}/assets/assignments/{assignment_id}/transfer")
def transfer_assignment(
    subdomain: str, assignment_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.transfer_asset(client_db, portal_user["client_id"], assignment_id, payload,
                                actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset transferred.").model_dump()


@router.post("/{subdomain}/assets/assignments/{assignment_id}/damage")
def report_damage(
    subdomain: str, assignment_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.report_damage(client_db, portal_user["client_id"], assignment_id,
                               damage_notes=payload.get("notes", ""),
                               actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Damage reported.").model_dump()


@router.post("/{subdomain}/assets/assignments/{assignment_id}/lost")
def mark_lost(
    subdomain: str, assignment_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.mark_lost(client_db, portal_user["client_id"], assignment_id,
                           notes=payload.get("notes", ""),
                           actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset marked as lost.").model_dump()


@router.post("/{subdomain}/assets/assignments/{assignment_id}/acknowledge")
def acknowledge_assignment(
    subdomain: str, assignment_id: str,
    payload: dict,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.acknowledge_assignment(client_db, portal_user["client_id"], assignment_id,
                                        notes=payload.get("notes", ""),
                                        actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Assignment acknowledged.").model_dump()


# ── Employee Assets (for employee profile integration) ─────────────────────────

@router.get("/{subdomain}/assets/assignments/employee/{employee_id}")
def employee_assets(
    subdomain: str, employee_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.get_employee_assets(client_db, portal_user["client_id"], employee_id)
    return ApiResponse.ok(result).model_dump()
