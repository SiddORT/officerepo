"""Payroll Management — FastAPI router (portal/{subdomain}/hrms/payroll)."""
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
    EmployeeCompensationCreate, EmployeeCompensationUpdate,
    PayrollCycleCreate, PayrollCycleUpdate,
    PayrollRunApprove, PayrollRunCreate, PayrollRunProcess,
    SalaryComponentCreate, SalaryComponentUpdate,
    SalaryStructureCreate, SalaryStructureUpdate,
    StatutoryComponentCreate, StatutoryComponentUpdate,
)

router = APIRouter()


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

@router.get("/{subdomain}/hrms/payroll/meta/options")
def meta_options(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok({
        "component_types":       [{"value": s, "label": s} for s in C.COMPONENT_TYPES],
        "calc_methods":          [{"value": s, "label": s} for s in C.CALC_METHODS],
        "payroll_frequencies":   [{"value": s, "label": s} for s in C.PAYROLL_FREQUENCIES],
        "run_statuses":          [{"value": s, "label": s} for s in C.PAYROLL_RUN_STATUSES],
        "payslip_statuses":      [{"value": s, "label": s} for s in C.PAYSLIP_STATUSES],
        "statutory_types":       [{"value": s, "label": s} for s in C.STATUTORY_TYPES],
        "compensation_statuses": [{"value": s, "label": s} for s in C.COMPENSATION_STATUSES],
    })


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/dashboard")
def dashboard(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.get_dashboard(db, _client_id(jwt)))


# ── Salary Components ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/components")
def list_components(
    subdomain: str,
    active_only: bool = Query(False),
    comp_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    client_id = _client_id(jwt)
    svc.seed_defaults(db, client_id)
    return ApiResponse.ok(svc.list_salary_components(db, client_id, active_only, comp_type, search, page, page_size))


@router.post("/{subdomain}/hrms/payroll/components", status_code=201)
def create_component(
    subdomain: str, body: SalaryComponentCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_salary_component(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/payroll/components/{comp_id}")
def update_component(
    subdomain: str, comp_id: str, body: SalaryComponentUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_salary_component(db, _client_id(jwt), comp_id,
                                                           body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{subdomain}/hrms/payroll/components/{comp_id}", status_code=204)
def delete_component(
    subdomain: str, comp_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_salary_component(db, _client_id(jwt), comp_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Salary Structures ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/structures")
def list_structures(
    subdomain: str,
    active_only: bool = Query(False),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_salary_structures(db, _client_id(jwt), active_only, search, page, page_size))


@router.get("/{subdomain}/hrms/payroll/structures/{struct_id}")
def get_structure(
    subdomain: str, struct_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.get_salary_structure(db, _client_id(jwt), struct_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.post("/{subdomain}/hrms/payroll/structures", status_code=201)
def create_structure(
    subdomain: str, body: SalaryStructureCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_salary_structure(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/payroll/structures/{struct_id}")
def update_structure(
    subdomain: str, struct_id: str, body: SalaryStructureUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_salary_structure(db, _client_id(jwt), struct_id,
                                                           body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/payroll/structures/{struct_id}", status_code=204)
def delete_structure(
    subdomain: str, struct_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_salary_structure(db, _client_id(jwt), struct_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Employee Compensation ──────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/compensations")
def list_compensations(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_compensations(db, _client_id(jwt), employee_id, status, page, page_size))


@router.post("/{subdomain}/hrms/payroll/compensations", status_code=201)
def create_compensation(
    subdomain: str, body: EmployeeCompensationCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_compensation(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/payroll/compensations/{comp_id}")
def update_compensation(
    subdomain: str, comp_id: str, body: EmployeeCompensationUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_compensation(db, _client_id(jwt), comp_id,
                                                       body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/payroll/compensations/{comp_id}", status_code=204)
def delete_compensation(
    subdomain: str, comp_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_compensation(db, _client_id(jwt), comp_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Payroll Cycles ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/cycles")
def list_cycles(
    subdomain: str,
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_payroll_cycles(db, _client_id(jwt), active_only, page, page_size))


@router.post("/{subdomain}/hrms/payroll/cycles", status_code=201)
def create_cycle(
    subdomain: str, body: PayrollCycleCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_payroll_cycle(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/payroll/cycles/{cycle_id}")
def update_cycle(
    subdomain: str, cycle_id: str, body: PayrollCycleUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_payroll_cycle(db, _client_id(jwt), cycle_id,
                                                        body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/payroll/cycles/{cycle_id}", status_code=204)
def delete_cycle(
    subdomain: str, cycle_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_payroll_cycle(db, _client_id(jwt), cycle_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Payroll Runs ───────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/runs")
def list_runs(
    subdomain: str,
    status: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_payroll_runs(db, _client_id(jwt), status, year, page, page_size))


@router.get("/{subdomain}/hrms/payroll/runs/{run_id}")
def get_run_detail(
    subdomain: str, run_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.get_run_detail(db, _client_id(jwt), run_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.post("/{subdomain}/hrms/payroll/runs", status_code=201)
def create_run(
    subdomain: str, body: PayrollRunCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_payroll_run(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{subdomain}/hrms/payroll/runs/{run_id}/process")
def process_run(
    subdomain: str, run_id: str, body: PayrollRunProcess,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.process_payroll_run(db, _client_id(jwt), run_id,
                                                       _actor(jwt), body.employee_ids))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{subdomain}/hrms/payroll/runs/{run_id}/approve")
def approve_run(
    subdomain: str, run_id: str, body: PayrollRunApprove,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.approve_payroll_run(db, _client_id(jwt), run_id,
                                                       _actor(jwt), body.notes))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{subdomain}/hrms/payroll/runs/{run_id}/lock")
def lock_run(
    subdomain: str, run_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.lock_payroll_run(db, _client_id(jwt), run_id, _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{subdomain}/hrms/payroll/runs/{run_id}/mark-paid")
def mark_paid(
    subdomain: str, run_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.mark_run_paid(db, _client_id(jwt), run_id, _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{subdomain}/hrms/payroll/runs/{run_id}/generate-payslips")
def generate_payslips(
    subdomain: str, run_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.generate_payslips(db, _client_id(jwt), run_id, _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── Payslips ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/payslips")
def list_payslips(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    run_id: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_payslips(db, _client_id(jwt), employee_id, run_id, year, page, page_size))


@router.get("/{subdomain}/hrms/payroll/payslips/{slip_id}")
def get_payslip(
    subdomain: str, slip_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.get_payslip_detail(db, _client_id(jwt), slip_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Statutory Components ───────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/payroll/statutory")
def list_statutory(
    subdomain: str,
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_statutory(db, _client_id(jwt), active_only, page, page_size))


@router.post("/{subdomain}/hrms/payroll/statutory", status_code=201)
def create_statutory(
    subdomain: str, body: StatutoryComponentCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_statutory(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/payroll/statutory/{item_id}")
def update_statutory(
    subdomain: str, item_id: str, body: StatutoryComponentUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_statutory(db, _client_id(jwt), item_id,
                                                    body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/payroll/statutory/{item_id}", status_code=204)
def delete_statutory(
    subdomain: str, item_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_statutory(db, _client_id(jwt), item_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))
