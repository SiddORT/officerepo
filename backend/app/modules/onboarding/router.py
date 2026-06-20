"""Employee Onboarding Portal Router.

Prefix  : /api/v1/portal/{subdomain}/hrms/onboarding
Requires: valid portal_access JWT + Employee Onboarding module enabled.
Data    : CLIENT database.
"""
from __future__ import annotations

from typing import Generator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.onboarding import service as svc
from backend.app.modules.onboarding.constants import (
    MODULE_NAME, ONBOARDING_STATUSES, TASK_STATUSES, TASK_CATEGORIES,
    ACCOUNT_TYPES, ACCOUNT_STATUSES, TRAINING_TYPES, TRAINING_STATUSES,
    EMPLOYEE_CATEGORIES,
)
from backend.app.modules.onboarding.schemas import (
    TemplateCreate, TemplateUpdate, TemplateTaskCreate, TemplateTaskUpdate,
    OnboardingStart, OnboardingUpdate, TaskCreate, TaskStatusUpdate,
    AccountCreate, AccountUpdate, TrainingCreate, TrainingUpdate,
    OnboardingAssetAssign,
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


def _sub(portal_user: dict, subdomain: str):
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


def _actor(portal_user: dict) -> str:
    return portal_user.get("email") or portal_user.get("name") or "Portal User"


def _cid(portal_user: dict) -> str:
    return portal_user["client_id"]


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/meta/options")
def meta_options(subdomain: str, portal_user: dict = Depends(_portal_jwt)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok({
        "onboarding_statuses":  ONBOARDING_STATUSES,
        "task_statuses":        TASK_STATUSES,
        "task_categories":      TASK_CATEGORIES,
        "account_types":        ACCOUNT_TYPES,
        "account_statuses":     ACCOUNT_STATUSES,
        "training_types":       TRAINING_TYPES,
        "training_statuses":    TRAINING_STATUSES,
        "employee_categories":  EMPLOYEE_CATEGORIES,
    }).model_dump()


@router.get("/{subdomain}/hrms/onboarding/dashboard")
def dashboard(subdomain: str, portal_user: dict = Depends(_portal_jwt), db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.dashboard(db, _cid(portal_user))).model_dump()


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/templates")
def list_templates(subdomain: str, active_only: bool = Query(False),
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_templates(db, _cid(portal_user), active_only=active_only)).model_dump()


@router.post("/{subdomain}/hrms/onboarding/templates")
def create_template(subdomain: str, body: TemplateCreate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_template(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/onboarding/templates/{template_id}")
def get_template(subdomain: str, template_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_template(db, template_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/templates/{template_id}")
def update_template(subdomain: str, template_id: str, body: TemplateUpdate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_template(db, template_id, _cid(portal_user), body.model_dump())).model_dump()


@router.delete("/{subdomain}/hrms/onboarding/templates/{template_id}")
def delete_template(subdomain: str, template_id: str,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_template(db, template_id, _cid(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


@router.post("/{subdomain}/hrms/onboarding/templates/{template_id}/tasks")
def add_template_task(subdomain: str, template_id: str, body: TemplateTaskCreate,
                      portal_user: dict = Depends(_portal_jwt),
                      db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_template_task(db, template_id, _cid(portal_user), body.model_dump())).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/templates/{template_id}/tasks/{task_id}")
def update_template_task(subdomain: str, template_id: str, task_id: str, body: TemplateTaskUpdate,
                         portal_user: dict = Depends(_portal_jwt),
                         db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_template_task(db, template_id, task_id, _cid(portal_user), body.model_dump())).model_dump()


@router.delete("/{subdomain}/hrms/onboarding/templates/{template_id}/tasks/{task_id}")
def delete_template_task(subdomain: str, template_id: str, task_id: str,
                         portal_user: dict = Depends(_portal_jwt),
                         db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_template_task(db, template_id, task_id, _cid(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Onboarding Records ─────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding")
def list_onboarding(subdomain: str,
                    page: int = Query(1, ge=1),
                    page_size: int = Query(20, ge=1, le=100),
                    search: str = Query(""),
                    status: str = Query(""),
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_onboarding(db, _cid(portal_user),
                                              page=page, page_size=page_size,
                                              search=search, status=status)).model_dump()


@router.post("/{subdomain}/hrms/onboarding/start")
def start_onboarding(subdomain: str, body: OnboardingStart,
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.start_onboarding(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}")
def get_onboarding(subdomain: str, onboarding_id: str,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_onboarding_detail(db, onboarding_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/{onboarding_id}/status")
def update_status(subdomain: str, onboarding_id: str, body: OnboardingUpdate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    if not body.status:
        raise HTTPException(422, "status is required.")
    return ApiResponse.ok(svc.update_onboarding_status(
        db, onboarding_id, _cid(portal_user), body.status, _actor(portal_user), body.notes or ""
    )).model_dump()


@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/readiness")
def get_readiness(subdomain: str, onboarding_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_readiness(db, onboarding_id, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/onboarding/{onboarding_id}/activate")
def activate_employee(subdomain: str, onboarding_id: str,
                      portal_user: dict = Depends(_portal_jwt),
                      db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.activate_employee(db, onboarding_id, _cid(portal_user), _actor(portal_user))).model_dump()


# ── Tasks ─────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/tasks")
def list_tasks(subdomain: str, onboarding_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_tasks(db, onboarding_id, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/onboarding/{onboarding_id}/tasks")
def add_task(subdomain: str, onboarding_id: str, body: TaskCreate,
             portal_user: dict = Depends(_portal_jwt),
             db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.add_task(db, onboarding_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/{onboarding_id}/tasks/{task_id}")
def update_task(subdomain: str, onboarding_id: str, task_id: str, body: TaskStatusUpdate,
                portal_user: dict = Depends(_portal_jwt),
                db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_task_status(db, onboarding_id, task_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Accounts ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/accounts")
def list_accounts(subdomain: str, onboarding_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_accounts(db, onboarding_id, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/onboarding/{onboarding_id}/accounts")
def create_account(subdomain: str, onboarding_id: str, body: AccountCreate,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_account(db, onboarding_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/{onboarding_id}/accounts/{account_id}")
def update_account(subdomain: str, onboarding_id: str, account_id: str, body: AccountUpdate,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_account(db, onboarding_id, account_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/onboarding/{onboarding_id}/accounts/{account_id}")
def delete_account(subdomain: str, onboarding_id: str, account_id: str,
                   portal_user: dict = Depends(_portal_jwt),
                   db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_account(db, onboarding_id, account_id, _cid(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Training ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/training")
def list_training(subdomain: str, onboarding_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_training(db, onboarding_id, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/onboarding/{onboarding_id}/training")
def create_training(subdomain: str, onboarding_id: str, body: TrainingCreate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_training(db, onboarding_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/onboarding/{onboarding_id}/training/{training_id}")
def update_training(subdomain: str, onboarding_id: str, training_id: str, body: TrainingUpdate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_training(db, onboarding_id, training_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/onboarding/{onboarding_id}/training/{training_id}")
def delete_training(subdomain: str, onboarding_id: str, training_id: str,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_training(db, onboarding_id, training_id, _cid(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Assets ────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/assets")
def get_assets(subdomain: str, onboarding_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_assets(db, onboarding_id, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/onboarding/{onboarding_id}/assets")
def assign_asset(subdomain: str, onboarding_id: str, body: OnboardingAssetAssign,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.assign_asset(db, onboarding_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Activities ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/onboarding/{onboarding_id}/activities")
def list_activities(subdomain: str, onboarding_id: str,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    ob = _get_ob(db, onboarding_id, _cid(portal_user))
    acts = svc.repo.list_activities(db, onboarding_id, _cid(portal_user))
    return ApiResponse.ok([svc._activity_dict(a) for a in acts]).model_dump()


def _get_ob(db, onboarding_id, client_id):
    import backend.app.modules.onboarding.repository as r
    ob = r.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    return ob
