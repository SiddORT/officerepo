"""Employee Loan Management — FastAPI router (portal/{subdomain}/hrms/loans)."""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.shared.response import ApiResponse

from . import constants as C
from . import service as svc
from .schemas import (
    InstallmentUpdate, LoanApplicationApprove,
    LoanApplicationCancel, LoanApplicationCreate,
    LoanApplicationReject, LoanApplicationUpdate,
    LoanClosureCreate, LoanDisbursementCreate,
    LoanPolicyCreate, LoanPolicyUpdate,
    LoanTypeCreate, LoanTypeUpdate,
)

router = APIRouter()

BASE = "/{subdomain}/hrms/loans"


# ── Auth / DB helpers ──────────────────────────────────────────────────────────

def _portal_jwt(request: Request) -> dict:
    auth  = request.headers.get("Authorization", "")
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
) -> Generator[Session, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.database.platform import get_platform_db
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    platform_db_gen = get_platform_db()
    platform_db = next(platform_db_gen)
    try:
        client_id = portal_user.get("client_id", "")
        conn = client_repo.get_db_connection(platform_db, client_id)
        if not conn or conn.db_status != DB_STATUS_ACTIVE:
            raise HTTPException(503, "Client database not available.")
        url = build_client_db_url(conn)
        provision_portal_schema(url)
        session = make_client_session(url)
        try:
            yield session
        finally:
            session.close()
    finally:
        try:
            next(platform_db_gen)
        except StopIteration:
            pass
        platform_db.close()


def _client_id(portal_user: dict) -> str:
    cid = portal_user.get("client_id") or portal_user.get("sub", "")
    if not cid:
        raise HTTPException(401, "client_id missing from token")
    return str(cid)


def _actor(portal_user: dict) -> str:
    return portal_user.get("name") or portal_user.get("email") or portal_user.get("sub", "system")


def _sub(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


# ── Meta options ───────────────────────────────────────────────────────────────

@router.get(BASE + "/meta/options")
def meta_options(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.get_meta_options(db, _client_id(jwt)))


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get(BASE + "/dashboard")
def dashboard(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.get_dashboard(db, _client_id(jwt)))


# ── Loan Types ─────────────────────────────────────────────────────────────────

@router.get(BASE + "/types")
def list_types(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.list_loan_types(db, _client_id(jwt)))


@router.post(BASE + "/types")
def create_type(
    subdomain: str,
    body: LoanTypeCreate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.create_loan_type(db, _client_id(jwt), body.model_dump(), _actor(jwt)), status_code=201)


@router.patch(BASE + "/types/{type_id}")
def update_type(
    subdomain: str, type_id: str,
    body: LoanTypeUpdate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return ApiResponse.ok(svc.update_loan_type(db, _client_id(jwt), type_id, data, _actor(jwt)))


@router.delete(BASE + "/types/{type_id}")
def delete_type(
    subdomain: str, type_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    svc.delete_loan_type(db, _client_id(jwt), type_id, _actor(jwt))
    return ApiResponse.ok({"deleted": True})


# ── Loan Policies ──────────────────────────────────────────────────────────────

@router.get(BASE + "/policies")
def list_policies(
    subdomain: str,
    loan_type_id: Optional[str] = Query(None),
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.list_loan_policies(db, _client_id(jwt), loan_type_id))


@router.post(BASE + "/policies")
def create_policy(
    subdomain: str,
    body: LoanPolicyCreate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.create_loan_policy(db, _client_id(jwt), body.model_dump(), _actor(jwt)), status_code=201)


@router.patch(BASE + "/policies/{policy_id}")
def update_policy(
    subdomain: str, policy_id: str,
    body: LoanPolicyUpdate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return ApiResponse.ok(svc.update_loan_policy(db, _client_id(jwt), policy_id, data, _actor(jwt)))


@router.delete(BASE + "/policies/{policy_id}")
def delete_policy(
    subdomain: str, policy_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    svc.delete_loan_policy(db, _client_id(jwt), policy_id, _actor(jwt))
    return ApiResponse.ok({"deleted": True})


# ── Loan Applications ──────────────────────────────────────────────────────────

@router.get(BASE + "/applications")
def list_applications(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    loan_type_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.list_applications(
        db, _client_id(jwt),
        employee_id=employee_id, loan_type_id=loan_type_id,
        status=status, search=search, page=page, page_size=page_size,
    ))


@router.post(BASE + "/applications")
def create_application(
    subdomain: str,
    body: LoanApplicationCreate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.create_application(db, _client_id(jwt), body.model_dump(), _actor(jwt)), status_code=201)


@router.get(BASE + "/applications/{app_id}")
def get_application(
    subdomain: str, app_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.get_application_detail(db, _client_id(jwt), app_id))


@router.patch(BASE + "/applications/{app_id}")
def update_application(
    subdomain: str, app_id: str,
    body: LoanApplicationUpdate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return ApiResponse.ok(svc.update_application(db, _client_id(jwt), app_id, data, _actor(jwt)))


@router.post(BASE + "/applications/{app_id}/submit")
def submit_application(
    subdomain: str, app_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.submit_application(db, _client_id(jwt), app_id, _actor(jwt)))


@router.post(BASE + "/applications/{app_id}/approve")
def approve_application(
    subdomain: str, app_id: str,
    body: LoanApplicationApprove,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.approve_application(db, _client_id(jwt), app_id, body.model_dump(), _actor(jwt)))


@router.post(BASE + "/applications/{app_id}/reject")
def reject_application(
    subdomain: str, app_id: str,
    body: LoanApplicationReject,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.reject_application(db, _client_id(jwt), app_id, body.rejection_reason, _actor(jwt)))


@router.post(BASE + "/applications/{app_id}/cancel")
def cancel_application(
    subdomain: str, app_id: str,
    body: LoanApplicationCancel,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.cancel_application(db, _client_id(jwt), app_id, body.reason, _actor(jwt)))


@router.post(BASE + "/applications/{app_id}/disburse")
def disburse_application(
    subdomain: str, app_id: str,
    body: LoanDisbursementCreate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    data = body.model_dump()
    return ApiResponse.ok(svc.disburse_application(db, _client_id(jwt), app_id, data, _actor(jwt)))


# ── Repayment Schedule ─────────────────────────────────────────────────────────

@router.get(BASE + "/applications/{app_id}/schedule")
def get_schedule(
    subdomain: str, app_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.get_repayment_schedule(db, _client_id(jwt), app_id))


@router.patch(BASE + "/applications/{app_id}/schedule/{inst_id}")
def update_installment(
    subdomain: str, app_id: str, inst_id: str,
    body: InstallmentUpdate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    return ApiResponse.ok(svc.update_installment(db, _client_id(jwt), app_id, inst_id, data, _actor(jwt)))


# ── Loan Closure ───────────────────────────────────────────────────────────────

@router.post(BASE + "/applications/{app_id}/close")
def close_loan(
    subdomain: str, app_id: str,
    body: LoanClosureCreate,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.close_loan(db, _client_id(jwt), app_id, body.model_dump(), _actor(jwt)))


# ── Payroll Integration ────────────────────────────────────────────────────────

@router.get(BASE + "/payroll/active-emis")
def active_emis(
    subdomain: str,
    employee_id: str = Query(...),
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    return ApiResponse.ok(svc.get_active_emi_for_employee(db, _client_id(jwt), employee_id))


# ── Activities ─────────────────────────────────────────────────────────────────

@router.get(BASE + "/applications/{app_id}/activities")
def get_activities(
    subdomain: str, app_id: str,
    jwt: dict = Depends(_portal_jwt),
    db:  Session = Depends(_client_db_dep),
):
    _sub(jwt, subdomain)
    from . import repository as repo
    return ApiResponse.ok([svc._activity_dict(a) for a in repo.get_activities(db, "loan_application", app_id)])
