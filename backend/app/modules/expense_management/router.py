"""Expense & Reimbursements — FastAPI router (portal/{subdomain}/hrms/expenses)."""
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
    ExpenseCategoryCreate, ExpenseCategoryUpdate,
    ExpenseClaimApprove, ExpenseClaimCancel, ExpenseClaimCreate,
    ExpenseClaimReject, ExpenseClaimReturn, ExpenseClaimUpdate,
    ExpensePolicyCreate, ExpensePolicyUpdate,
    MileageClaimCreate, MileageClaimUpdate,
    ReimbursementCreate, ReimbursementUpdate,
)

router = APIRouter()

BASE = "/{subdomain}/hrms/expenses"


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


def _actor(portal_user: dict) -> tuple[Optional[str], Optional[str]]:
    return portal_user.get("user_id"), portal_user.get("name") or portal_user.get("email")


# ── Options ────────────────────────────────────────────────────────────────────

@router.get(BASE + "/meta/options")
def get_options():
    return ApiResponse.success({
        "statuses": C.ALL_STATUSES,
        "approval_statuses": C.ALL_APPROVAL_STATUSES,
        "reimbursement_methods": C.ALL_REIMB_METHODS,
        "reimbursement_statuses": C.ALL_REIMB_STATUSES,
        "status_colors": C.STATUS_COLORS,
        "default_currency": C.DEFAULT_CURRENCY,
    })


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get(BASE + "/dashboard")
def dashboard(
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    svc.seed_default_categories(db)
    return ApiResponse.success(svc.get_dashboard(db))


# ── Expense Categories ─────────────────────────────────────────────────────────

@router.get(BASE + "/categories")
def list_categories(
    include_inactive: bool = Query(False),
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    svc.seed_default_categories(db)
    return ApiResponse.success(svc.list_categories(db, include_inactive))


@router.post(BASE + "/categories")
def create_category(
    payload: ExpenseCategoryCreate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.create_category(db, payload), status_code=201)


@router.patch(BASE + "/categories/{category_id}")
def update_category(
    category_id: str,
    payload: ExpenseCategoryUpdate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.update_category(db, category_id, payload))


# ── Expense Policies ───────────────────────────────────────────────────────────

@router.get(BASE + "/policies")
def list_policies(
    include_inactive: bool = Query(False),
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.list_policies(db, include_inactive))


@router.post(BASE + "/policies")
def create_policy(
    payload: ExpensePolicyCreate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.create_policy(db, payload), status_code=201)


@router.patch(BASE + "/policies/{policy_id}")
def update_policy(
    policy_id: str,
    payload: ExpensePolicyUpdate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.update_policy(db, policy_id, payload))


@router.delete(BASE + "/policies/{policy_id}")
def delete_policy(
    policy_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    svc.delete_policy(db, policy_id)
    return ApiResponse.success({"deleted": True})


# ── Expense Claims ─────────────────────────────────────────────────────────────

@router.get(BASE + "/claims")
def list_claims(
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.list_claims(db, employee_id, status, search, page, page_size))


@router.post(BASE + "/claims")
def create_claim(
    payload: ExpenseClaimCreate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.create_claim(db, payload), status_code=201)


@router.get(BASE + "/claims/{claim_id}")
def get_claim(
    claim_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.get_claim(db, claim_id))


@router.patch(BASE + "/claims/{claim_id}")
def update_claim(
    claim_id: str,
    payload: ExpenseClaimUpdate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.update_claim(db, claim_id, payload))


@router.delete(BASE + "/claims/{claim_id}")
def delete_claim(
    claim_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    svc.delete_claim(db, claim_id)
    return ApiResponse.success({"deleted": True})


# ── Claim actions ──────────────────────────────────────────────────────────────

@router.post(BASE + "/claims/{claim_id}/submit")
def submit_claim(
    claim_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    _, actor_name = _actor(portal_user)
    return ApiResponse.success(svc.submit_claim(db, claim_id, actor_name))


@router.post(BASE + "/claims/{claim_id}/approve")
def approve_claim(
    claim_id: str,
    payload: ExpenseClaimApprove,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    actor_id, _ = _actor(portal_user)
    return ApiResponse.success(svc.approve_claim(db, claim_id, payload, actor_id))


@router.post(BASE + "/claims/{claim_id}/reject")
def reject_claim(
    claim_id: str,
    payload: ExpenseClaimReject,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    actor_id, _ = _actor(portal_user)
    return ApiResponse.success(svc.reject_claim(db, claim_id, payload, actor_id))


@router.post(BASE + "/claims/{claim_id}/cancel")
def cancel_claim(
    claim_id: str,
    payload: ExpenseClaimCancel,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    _, actor_name = _actor(portal_user)
    return ApiResponse.success(svc.cancel_claim(db, claim_id, payload.reason, actor_name))


@router.post(BASE + "/claims/{claim_id}/return")
def return_claim(
    claim_id: str,
    payload: ExpenseClaimReturn,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    _, actor_name = _actor(portal_user)
    return ApiResponse.success(svc.return_claim(db, claim_id, payload, actor_name))


# ── Reimbursements ─────────────────────────────────────────────────────────────

@router.get(BASE + "/reimbursements")
def list_reimbursements(
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.list_reimbursements(db, employee_id, status, page, page_size))


@router.post(BASE + "/reimbursements")
def process_reimbursement(
    payload: ReimbursementCreate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    actor_id, _ = _actor(portal_user)
    return ApiResponse.success(svc.process_reimbursement(db, payload, actor_id), status_code=201)


@router.patch(BASE + "/reimbursements/{reimb_id}")
def update_reimbursement(
    reimb_id: str,
    payload: ReimbursementUpdate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.mark_reimbursement_paid(db, reimb_id, payload))


@router.get(BASE + "/reimbursements/payroll/{employee_id}")
def get_payroll_reimbursements(
    employee_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.get_pending_reimbursements_for_payroll(db, employee_id))


# ── Mileage Claims ─────────────────────────────────────────────────────────────

@router.get(BASE + "/mileage")
def list_mileage(
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.list_mileage_claims(db, employee_id, status, page, page_size))


@router.post(BASE + "/mileage")
def create_mileage(
    payload: MileageClaimCreate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.create_mileage_claim(db, payload), status_code=201)


@router.patch(BASE + "/mileage/{mileage_id}")
def update_mileage(
    mileage_id: str,
    payload: MileageClaimUpdate,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    return ApiResponse.success(svc.update_mileage_claim(db, mileage_id, payload))


@router.delete(BASE + "/mileage/{mileage_id}")
def delete_mileage(
    mileage_id: str,
    db: Session = Depends(_client_db_dep),
    portal_user: dict = Depends(_portal_jwt),
):
    svc.delete_mileage_claim(db, mileage_id)
    return ApiResponse.success({"deleted": True})
