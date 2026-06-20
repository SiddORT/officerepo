"""Leave Management — FastAPI router (portal/{subdomain}/hrms/leave)."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.shared.response import ApiResponse

from . import constants as C
from . import service as svc
from .schemas import (
    BalanceAdjust, BalanceInitialize, CompOffCreate, CompOffReview,
    EncashmentCreate, EncashmentReview, HolidayCalendarCreate, HolidayCalendarUpdate,
    HolidayCreate, HolidayUpdate, LeaveApplyRequest, LeaveCancelRequest,
    LeavePolicyCreate, LeavePolicyUpdate, LeaveReviewRequest, LeaveTypeCreate,
    LeaveTypeUpdate, WeeklyOffCreate, WeeklyOffUpdate,
)

router = APIRouter()


# ── Auth / DB dependencies ─────────────────────────────────────────────────────

def _portal_jwt(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    payload = decode_access_token(auth.split(" ", 1)[1])
    if not payload or payload.get("token_type") != "portal_access":
        raise HTTPException(status_code=401, detail="Invalid portal token")
    return payload


def _client_db_dep(request: Request, subdomain: str) -> Session:
    url = build_client_db_url(subdomain)
    if not url:
        raise HTTPException(status_code=404, detail="Client not found")
    provision_portal_schema(url)
    db = make_client_session(url)
    try:
        yield db
    finally:
        db.close()


def _client_id(payload: dict) -> str:
    cid = payload.get("client_id") or payload.get("sub", "")
    if not cid:
        raise HTTPException(status_code=401, detail="client_id missing from token")
    return str(cid)


def _actor(payload: dict) -> str:
    return payload.get("name") or payload.get("email") or payload.get("sub", "system")


# ── Meta options ───────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/meta/options")
def meta_options(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    client_id = _client_id(jwt)
    leave_types = svc.list_leave_types(db, client_id, active_only=True)
    return ApiResponse.ok({
        "leave_request_statuses":  [{"value": s, "label": s} for s in C.LEAVE_REQUEST_STATUSES],
        "accrual_frequencies":     [{"value": s, "label": s} for s in C.ACCRUAL_FREQUENCIES],
        "allocation_types":        [{"value": s, "label": s} for s in C.ALLOCATION_TYPES],
        "employee_categories":     [{"value": s, "label": s} for s in C.EMPLOYEE_CATEGORIES],
        "policy_scopes":           [{"value": s, "label": s} for s in C.POLICY_SCOPES],
        "holiday_types":           [{"value": s, "label": s} for s in C.HOLIDAY_TYPES],
        "weekly_off_patterns":     [{"value": s, "label": s} for s in C.WEEKLY_OFF_PATTERNS],
        "compoff_sources":         [{"value": s, "label": s} for s in C.COMPOFF_SOURCES],
        "compoff_statuses":        [{"value": s, "label": s} for s in C.COMPOFF_STATUSES],
        "encashment_statuses":     [{"value": s, "label": s} for s in C.ENCASHMENT_STATUSES],
        "approver_levels":         [{"value": s, "label": s} for s in C.APPROVER_LEVELS],
        "half_day_options":        [{"value": s, "label": s} for s in C.HALF_DAY_OPTIONS],
        "leave_types":             leave_types,
    })


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/dashboard")
def dashboard(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    client_id = _client_id(jwt)
    return ApiResponse.ok(svc.get_dashboard(db, client_id))


# ── Leave Types ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/types")
def list_leave_types(
    subdomain: str,
    active_only: bool = Query(False),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_leave_types(db, _client_id(jwt), active_only))


@router.post("/{subdomain}/hrms/leave/types", status_code=201)
def create_leave_type(
    subdomain: str, body: LeaveTypeCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.create_leave_type(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/leave/types/{type_id}")
def update_leave_type(
    subdomain: str, type_id: str, body: LeaveTypeUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_leave_type(db, _client_id(jwt), type_id,
                                                     body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/leave/types/{type_id}", status_code=204)
def delete_leave_type(
    subdomain: str, type_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_leave_type(db, _client_id(jwt), type_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Leave Policies ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/policies")
def list_policies(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_leave_policies(db, _client_id(jwt)))


@router.post("/{subdomain}/hrms/leave/policies", status_code=201)
def create_policy(
    subdomain: str, body: LeavePolicyCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.create_leave_policy(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)


@router.get("/{subdomain}/hrms/leave/policies/{policy_id}")
def get_policy(
    subdomain: str, policy_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.get_leave_policy(db, _client_id(jwt), policy_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.patch("/{subdomain}/hrms/leave/policies/{policy_id}")
def update_policy(
    subdomain: str, policy_id: str, body: LeavePolicyUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_leave_policy(db, _client_id(jwt), policy_id,
                                                       body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/leave/policies/{policy_id}", status_code=204)
def delete_policy(
    subdomain: str, policy_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_leave_policy(db, _client_id(jwt), policy_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Holiday Calendars ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/holiday-calendars")
def list_calendars(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_calendars(db, _client_id(jwt)))


@router.post("/{subdomain}/hrms/leave/holiday-calendars", status_code=201)
def create_calendar(
    subdomain: str, body: HolidayCalendarCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.create_calendar(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)


@router.patch("/{subdomain}/hrms/leave/holiday-calendars/{calendar_id}")
def update_calendar(
    subdomain: str, calendar_id: str, body: HolidayCalendarUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_calendar(db, _client_id(jwt), calendar_id,
                                                   body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/leave/holiday-calendars/{calendar_id}", status_code=204)
def delete_calendar(
    subdomain: str, calendar_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_calendar(db, _client_id(jwt), calendar_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.get("/{subdomain}/hrms/leave/holiday-calendars/{calendar_id}/holidays")
def list_holidays(
    subdomain: str, calendar_id: str,
    year: Optional[int] = Query(None),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_holidays(db, _client_id(jwt), calendar_id, year))


@router.post("/{subdomain}/hrms/leave/holiday-calendars/{calendar_id}/holidays", status_code=201)
def add_holiday(
    subdomain: str, calendar_id: str, body: HolidayCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.add_holiday(db, _client_id(jwt), calendar_id,
                                               body.model_dump(), _actor(jwt)), 201)
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.delete("/{subdomain}/hrms/leave/holiday-calendars/{calendar_id}/holidays/{holiday_id}", status_code=204)
def delete_holiday(
    subdomain: str, calendar_id: str, holiday_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        svc.delete_holiday(db, _client_id(jwt), holiday_id, _actor(jwt))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Weekly Off Rules ───────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/weekly-off-rules")
def list_weekly_off(
    subdomain: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_weekly_off_rules(db, _client_id(jwt)))


@router.post("/{subdomain}/hrms/leave/weekly-off-rules", status_code=201)
def create_weekly_off(
    subdomain: str, body: WeeklyOffCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.create_weekly_off_rule(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)


@router.patch("/{subdomain}/hrms/leave/weekly-off-rules/{rule_id}")
def update_weekly_off(
    subdomain: str, rule_id: str, body: WeeklyOffUpdate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.update_weekly_off_rule(db, _client_id(jwt), rule_id,
                                                          body.model_dump(exclude_none=True), _actor(jwt)))
    except LookupError as e:
        raise HTTPException(404, str(e))


# ── Leave Balances ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/balances")
def get_balances(
    subdomain: str,
    employee_id: str = Query(...),
    year: Optional[int] = Query(None),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    y = year or date.today().year
    return ApiResponse.ok(svc.get_employee_balances(db, _client_id(jwt), employee_id, y))


@router.post("/{subdomain}/hrms/leave/balances/initialize", status_code=201)
def initialize_balance(
    subdomain: str, body: BalanceInitialize,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.initialize_balance(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.post("/{subdomain}/hrms/leave/balances/adjust")
def adjust_balance(
    subdomain: str, body: BalanceAdjust,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.adjust_balance(db, _client_id(jwt), body.model_dump(), _actor(jwt)))
    except (LookupError, ValueError) as e:
        raise HTTPException(400, str(e))


# ── Leave Requests ─────────────────────────────────────────────────────────────

@router.post("/{subdomain}/hrms/leave/requests", status_code=201)
def apply_leave(
    subdomain: str, body: LeaveApplyRequest,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.apply_leave(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except (ValueError, LookupError) as e:
        raise HTTPException(400, str(e))


@router.get("/{subdomain}/hrms/leave/requests")
def list_requests(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    leave_type_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_leave_requests(db, _client_id(jwt), {
        "employee_id": employee_id, "department_id": department_id,
        "status": status, "leave_type_id": leave_type_id,
        "start_date": start_date, "end_date": end_date,
        "page": page, "page_size": page_size,
    }))


@router.get("/{subdomain}/hrms/leave/requests/{request_id}")
def get_request(
    subdomain: str, request_id: str,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.get_leave_request(db, _client_id(jwt), request_id))
    except LookupError as e:
        raise HTTPException(404, str(e))


@router.patch("/{subdomain}/hrms/leave/requests/{request_id}/review")
def review_leave(
    subdomain: str, request_id: str, body: LeaveReviewRequest,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    action = body.status.lower()
    if action not in ("approve", "reject"):
        raise HTTPException(400, "status must be 'approve' or 'reject'")
    try:
        return ApiResponse.ok(svc.review_leave(db, _client_id(jwt), request_id,
                                                action, body.comments, _actor(jwt)))
    except (LookupError, ValueError) as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/leave/requests/{request_id}/cancel")
def cancel_leave(
    subdomain: str, request_id: str, body: LeaveCancelRequest,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.cancel_leave(db, _client_id(jwt), request_id,
                                                body.reason, _actor(jwt)))
    except (LookupError, ValueError) as e:
        raise HTTPException(400, str(e))


# ── Calendar ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/calendar")
def calendar(
    subdomain: str,
    start: date = Query(...),
    end: date = Query(...),
    employee_id: Optional[str] = Query(None),
    department_id: Optional[str] = Query(None),
    calendar_id: Optional[str] = Query(None),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.get_calendar_events(db, _client_id(jwt), start, end,
                                                   employee_id, department_id, calendar_id))


# ── Comp Off ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/comp-offs")
def list_comp_offs(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_comp_offs(db, _client_id(jwt),
                                              {"employee_id": employee_id, "status": status,
                                               "page": page, "page_size": page_size}))


@router.post("/{subdomain}/hrms/leave/comp-offs", status_code=201)
def request_comp_off(
    subdomain: str, body: CompOffCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.request_comp_off(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)


@router.patch("/{subdomain}/hrms/leave/comp-offs/{comp_off_id}/review")
def review_comp_off(
    subdomain: str, comp_off_id: str, body: CompOffReview,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.review_comp_off(db, _client_id(jwt), comp_off_id,
                                                   body.status, body.rejection_reason, _actor(jwt)))
    except (LookupError, ValueError) as e:
        raise HTTPException(400, str(e))


# ── Leave Encashments ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/encashments")
def list_encashments(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.list_encashments(db, _client_id(jwt),
                                                {"employee_id": employee_id,
                                                 "page": page, "page_size": page_size}))


@router.post("/{subdomain}/hrms/leave/encashments", status_code=201)
def request_encashment(
    subdomain: str, body: EncashmentCreate,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.request_encashment(db, _client_id(jwt), body.model_dump(), _actor(jwt)), 201)
    except (ValueError, LookupError) as e:
        raise HTTPException(400, str(e))


@router.patch("/{subdomain}/hrms/leave/encashments/{enc_id}/review")
def review_encashment(
    subdomain: str, enc_id: str, body: EncashmentReview,
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    try:
        return ApiResponse.ok(svc.review_encashment(db, _client_id(jwt), enc_id,
                                                     body.status, body.notes, _actor(jwt)))
    except (LookupError, ValueError) as e:
        raise HTTPException(400, str(e))


# ── Payroll Summary ────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/leave/payroll-summary")
def payroll_summary(
    subdomain: str,
    employee_id: str = Query(...),
    year: int = Query(...),
    month: int = Query(...),
    jwt: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    return ApiResponse.ok(svc.get_payroll_summary(db, _client_id(jwt), employee_id, year, month))
