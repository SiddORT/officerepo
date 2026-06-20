"""Interview Management Portal Router.

Prefix  : /api/v1/portal/{subdomain}/hrms/interviews
Requires: valid portal_access JWT + Interview Management module enabled.
Data    : CLIENT database.
"""
from __future__ import annotations

from typing import Generator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.interview import service as svc
from backend.app.modules.interview.constants import (
    MODULE_NAME, INTERVIEW_STATUSES, INTERVIEW_RESULTS, INTERVIEW_MODES,
    ROUND_TYPES, FEEDBACK_RATINGS,
)
from backend.app.modules.interview.schemas import (
    InterviewCreate, InterviewUpdate, InterviewComplete, InterviewCancel,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Auth / DB dependencies ────────────────────────────────────────────────────

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
        raise HTTPException(403, f"{MODULE_NAME} module is not enabled for this workspace.")

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


def _actor(portal_user: dict) -> str:
    return portal_user.get("email") or portal_user.get("name") or "Portal User"


def _cid(portal_user: dict) -> str:
    return portal_user["client_id"]


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/meta/options")
def meta_options(subdomain: str, portal_user: dict = Depends(_portal_jwt)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok({
        "interview_statuses": INTERVIEW_STATUSES,
        "interview_results":  INTERVIEW_RESULTS,
        "interview_modes":    INTERVIEW_MODES,
        "round_types":        ROUND_TYPES,
        "feedback_ratings":   FEEDBACK_RATINGS,
    }).model_dump()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/dashboard")
def dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.dashboard(db, _cid(portal_user))).model_dump()


# ── List / Create ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews")
def list_interviews(
    subdomain: str,
    page: int        = Query(1, ge=1),
    page_size: int   = Query(20, ge=1, le=100),
    search: str      = Query(""),
    status: str      = Query(""),
    result: str      = Query(""),
    candidate_id: str = Query(""),
    opening_id: str  = Query(""),
    portal_user: dict = Depends(_portal_jwt),
    db: Session      = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.list_interviews(
        db, _cid(portal_user),
        page=page, page_size=page_size,
        search=search, status=status, result=result,
        candidate_id=candidate_id, opening_id=opening_id,
    )
    return ApiResponse.ok(data).model_dump()


@router.post("/{subdomain}/hrms/interviews")
def create_interview(
    subdomain: str,
    body: InterviewCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.create_interview(db, _cid(portal_user), body, _actor(portal_user))
    return ApiResponse.ok(data).model_dump()


# ── Single interview ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/{interview_id}")
def get_interview(
    subdomain: str,
    interview_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_interview(db, _cid(portal_user), interview_id)).model_dump()


@router.patch("/{subdomain}/hrms/interviews/{interview_id}")
def update_interview(
    subdomain: str,
    interview_id: str,
    body: InterviewUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.update_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))
    return ApiResponse.ok(data).model_dump()


@router.delete("/{subdomain}/hrms/interviews/{interview_id}")
def delete_interview(
    subdomain: str,
    interview_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_interview(db, _cid(portal_user), interview_id)
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Status transitions ────────────────────────────────────────────────────────

@router.post("/{subdomain}/hrms/interviews/{interview_id}/complete")
def complete_interview(
    subdomain: str,
    interview_id: str,
    body: InterviewComplete,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.complete_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))
    return ApiResponse.ok(data).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/cancel")
def cancel_interview(
    subdomain: str,
    interview_id: str,
    body: InterviewCancel,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.cancel_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))
    return ApiResponse.ok(data).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/no-show")
def no_show(
    subdomain: str,
    interview_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session       = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    data = svc.mark_no_show(db, _cid(portal_user), interview_id, _actor(portal_user))
    return ApiResponse.ok(data).model_dump()
