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
    ROUND_TYPES, RECOMMENDATIONS, PANEL_ROLES, DEFAULT_SCORECARD_CRITERIA,
)
from backend.app.modules.interview.schemas import (
    PipelineCreate, PipelineUpdate, StageCreate, StageUpdate, StagesReorder,
    InterviewCreate, InterviewUpdate, InterviewReschedule, InterviewComplete, InterviewCancel,
    PanelMemberAdd, FeedbackCreate, FeedbackUpdate,
    SelectionDecision, RejectionDecision,
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
        "interview_statuses":     INTERVIEW_STATUSES,
        "interview_results":      INTERVIEW_RESULTS,
        "interview_modes":        INTERVIEW_MODES,
        "round_types":            ROUND_TYPES,
        "recommendations":        RECOMMENDATIONS,
        "panel_roles":            PANEL_ROLES,
        "scorecard_criteria":     DEFAULT_SCORECARD_CRITERIA,
    }).model_dump()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/dashboard")
def dashboard(subdomain: str,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.dashboard(db, _cid(portal_user))).model_dump()


# ── Calendar ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/calendar/events")
def calendar_events(subdomain: str,
                    start: str = Query(...),
                    end: str   = Query(...),
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.calendar_events(db, _cid(portal_user), start, end)).model_dump()


# ── Pipelines ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/pipelines")
def list_pipelines(subdomain: str,
                   active_only: bool = Query(False),
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_pipelines(db, _cid(portal_user), active_only=active_only)).model_dump()


@router.post("/{subdomain}/hrms/interviews/pipelines")
def create_pipeline(subdomain: str, body: PipelineCreate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_pipeline(db, _cid(portal_user), body, _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}")
def get_pipeline(subdomain: str, pipeline_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_pipeline(db, _cid(portal_user), pipeline_id)).model_dump()


@router.patch("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}")
def update_pipeline(subdomain: str, pipeline_id: str, body: PipelineUpdate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_pipeline(db, _cid(portal_user), pipeline_id, body, _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}")
def delete_pipeline(subdomain: str, pipeline_id: str,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_pipeline(db, _cid(portal_user), pipeline_id)
    return ApiResponse.ok({"deleted": True}).model_dump()


# Pipeline stages

@router.post("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}/stages")
def add_stage(subdomain: str, pipeline_id: str, body: StageCreate,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.add_stage(db, _cid(portal_user), pipeline_id, body, _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}/stages/{stage_id}")
def update_stage(subdomain: str, pipeline_id: str, stage_id: str, body: StageUpdate,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_stage(db, pipeline_id, stage_id, body, _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}/stages/{stage_id}")
def delete_stage(subdomain: str, pipeline_id: str, stage_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_stage(db, pipeline_id, stage_id)
    return ApiResponse.ok({"deleted": True}).model_dump()


@router.post("/{subdomain}/hrms/interviews/pipelines/{pipeline_id}/stages/reorder")
def reorder_stages(subdomain: str, pipeline_id: str, body: StagesReorder,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.reorder_stages(db, pipeline_id, body.stage_ids)).model_dump()


# ── Interviews (schedule must come before {interview_id}) ─────────────────────

@router.get("/{subdomain}/hrms/interviews/list")
def list_interviews(subdomain: str,
                    page: int          = Query(1, ge=1),
                    page_size: int     = Query(20, ge=1, le=100),
                    search: str        = Query(""),
                    status: str        = Query(""),
                    result: str        = Query(""),
                    candidate_id: str  = Query(""),
                    opening_id: str    = Query(""),
                    pipeline_id: str   = Query(""),
                    portal_user: dict  = Depends(_portal_jwt),
                    db: Session        = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    data = svc.list_interviews(
        db, _cid(portal_user),
        page=page, page_size=page_size,
        search=search, status=status, result=result,
        candidate_id=candidate_id, opening_id=opening_id, pipeline_id=pipeline_id,
    )
    return ApiResponse.ok(data).model_dump()


@router.post("/{subdomain}/hrms/interviews/schedule")
def schedule_interview(subdomain: str, body: InterviewCreate,
                       portal_user: dict = Depends(_portal_jwt),
                       db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.schedule_interview(db, _cid(portal_user), body, _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/interviews/{interview_id}")
def get_interview(subdomain: str, interview_id: str,
                  full: bool = Query(False),
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_interview(db, _cid(portal_user), interview_id, full=full)).model_dump()


@router.patch("/{subdomain}/hrms/interviews/{interview_id}")
def update_interview(subdomain: str, interview_id: str, body: InterviewUpdate,
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/interviews/{interview_id}")
def delete_interview(subdomain: str, interview_id: str,
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_interview(db, _cid(portal_user), interview_id)
    return ApiResponse.ok({"deleted": True}).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/reschedule")
def reschedule(subdomain: str, interview_id: str, body: InterviewReschedule,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.reschedule_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/complete")
def complete(subdomain: str, interview_id: str, body: InterviewComplete,
             portal_user: dict = Depends(_portal_jwt),
             db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.complete_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/cancel")
def cancel(subdomain: str, interview_id: str, body: InterviewCancel,
           portal_user: dict = Depends(_portal_jwt),
           db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.cancel_interview(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/no-show")
def no_show(subdomain: str, interview_id: str,
            portal_user: dict = Depends(_portal_jwt),
            db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.mark_no_show(db, _cid(portal_user), interview_id, _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/select")
def select_candidate(subdomain: str, interview_id: str, body: SelectionDecision,
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.select_candidate(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/reject")
def reject_candidate(subdomain: str, interview_id: str, body: RejectionDecision,
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.reject_candidate(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


# ── Panel ─────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/{interview_id}/panel")
def list_panel(subdomain: str, interview_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_panel(db, _cid(portal_user), interview_id)).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/panel")
def add_panel(subdomain: str, interview_id: str, body: PanelMemberAdd,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.add_panel_member(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/interviews/{interview_id}/panel/{panel_id}")
def remove_panel(subdomain: str, interview_id: str, panel_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.remove_panel_member(db, _cid(portal_user), interview_id, panel_id, _actor(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Feedback ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/{interview_id}/feedback")
def list_feedback(subdomain: str, interview_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_feedback(db, _cid(portal_user), interview_id)).model_dump()


@router.post("/{subdomain}/hrms/interviews/{interview_id}/feedback")
def submit_feedback(subdomain: str, interview_id: str, body: FeedbackCreate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.submit_feedback(db, _cid(portal_user), interview_id, body, _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/interviews/{interview_id}/feedback/{feedback_id}")
def update_feedback(subdomain: str, interview_id: str, feedback_id: str, body: FeedbackUpdate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_feedback(db, _cid(portal_user), interview_id, feedback_id, body, _actor(portal_user))).model_dump()


# ── Activities / Timeline ─────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/interviews/{interview_id}/activities")
def get_activities(subdomain: str, interview_id: str,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_activities(db, _cid(portal_user), interview_id=interview_id)).model_dump()
