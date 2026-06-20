"""Router — Attendance Management.

All routes under: /api/v1/portal/{subdomain}/hrms/attendance/
Auth:  portal JWT (portal_access token_type).
DB:    client-specific database via make_client_session.
"""
from __future__ import annotations

from typing import Generator

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.client_db import (
    build_client_db_url, make_client_session, provision_portal_schema,
)
from backend.app.modules.attendance import service as svc
from backend.app.modules.attendance.schemas import (
    ShiftCreate, ShiftUpdate,
    ShiftAssignCreate,
    AttendanceCreate, AttendanceUpdate, CheckInRequest, CheckOutRequest,
    RegularizationCreate, RegularizationReview,
    OvertimeCreate, OvertimeReview,
    PolicyCreate, PolicyUpdate,
    DeviceCreate, DeviceUpdate,
    EmployeeScheduleSet,
)
from backend.app.modules.attendance.constants import (
    ATTENDANCE_STATUSES, ATTENDANCE_SOURCES, WORK_MODES, LOCATION_TYPES,
    REGULARIZATION_STATUSES, OVERTIME_TYPES, OT_APPROVAL_STATUSES,
    SHIFT_TYPES, ASSIGNMENT_SCOPES,
    DEVICE_VENDORS, DEVICE_STATUSES, SYNC_METHODS, WEEKDAYS,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Auth dependencies ─────────────────────────────────────────────────────────

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
        client_id  = portal_user.get("client_id", "")
        subdomain  = portal_user.get("subdomain", "")
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


def _sub(portal_user: dict, subdomain: str):
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


def _actor(portal_user: dict) -> str:
    return portal_user.get("email") or portal_user.get("name") or "Portal User"


def _cid(portal_user: dict) -> str:
    return portal_user["client_id"]


# ── Meta ───────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/meta/options")
def meta_options(subdomain: str, portal_user: dict = Depends(_portal_jwt)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok({
        "attendance_statuses":     ATTENDANCE_STATUSES,
        "attendance_sources":      ATTENDANCE_SOURCES,
        "work_modes":              WORK_MODES,
        "location_types":          LOCATION_TYPES,
        "regularization_statuses": REGULARIZATION_STATUSES,
        "overtime_types":          OVERTIME_TYPES,
        "ot_approval_statuses":    OT_APPROVAL_STATUSES,
        "shift_types":             SHIFT_TYPES,
        "assignment_scopes":       ASSIGNMENT_SCOPES,
        "device_vendors":          DEVICE_VENDORS,
        "device_statuses":         DEVICE_STATUSES,
        "sync_methods":            SYNC_METHODS,
        "weekdays":                WEEKDAYS,
    }).model_dump()


@router.get("/{subdomain}/hrms/attendance/dashboard")
def dashboard(subdomain: str,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.dashboard(db, _cid(portal_user))).model_dump()


# ── WFH Today ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/wfh/today")
def wfh_today(subdomain: str,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.wfh_today(db, _cid(portal_user))).model_dump()


# ── Employee Work Schedules ───────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/employees/{employee_id}/schedule")
def get_employee_schedule(subdomain: str, employee_id: str,
                          portal_user: dict = Depends(_portal_jwt),
                          db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_employee_schedule(db, _cid(portal_user), employee_id)).model_dump()


@router.put("/{subdomain}/hrms/attendance/employees/{employee_id}/schedule")
def set_employee_schedule(subdomain: str, employee_id: str, body: EmployeeScheduleSet,
                          portal_user: dict = Depends(_portal_jwt),
                          db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.set_employee_schedule(
        db, _cid(portal_user), employee_id, body.model_dump(), _actor(portal_user)
    )
    return ApiResponse.ok(result).model_dump()


# ── Shifts ─────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/shifts")
def list_shifts(subdomain: str, active_only: bool = Query(False),
                portal_user: dict = Depends(_portal_jwt),
                db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_shifts(db, _cid(portal_user), active_only=active_only)).model_dump()


@router.post("/{subdomain}/hrms/attendance/shifts")
def create_shift(subdomain: str, body: ShiftCreate,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_shift(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/attendance/shifts/{shift_id}")
def get_shift(subdomain: str, shift_id: str,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_shift(db, shift_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/shifts/{shift_id}")
def update_shift(subdomain: str, shift_id: str, body: ShiftUpdate,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_shift(db, shift_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/attendance/shifts/{shift_id}")
def delete_shift(subdomain: str, shift_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_shift(db, shift_id, _cid(portal_user), _actor(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Shift Assignments ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/shift-assignments")
def list_assignments(subdomain: str,
                     shift_id:    str = Query(""),
                     employee_id: str = Query(""),
                     portal_user: dict = Depends(_portal_jwt),
                     db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_assignments(db, _cid(portal_user),
                                               shift_id=shift_id, employee_id=employee_id)).model_dump()


@router.post("/{subdomain}/hrms/attendance/shift-assignments")
def create_assignment(subdomain: str, body: ShiftAssignCreate,
                      portal_user: dict = Depends(_portal_jwt),
                      db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_assignment(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/attendance/shift-assignments/{asgn_id}")
def delete_assignment(subdomain: str, asgn_id: str,
                      portal_user: dict = Depends(_portal_jwt),
                      db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_assignment(db, asgn_id, _cid(portal_user), _actor(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Check-In / Check-Out ───────────────────────────────────────────────────────

@router.post("/{subdomain}/hrms/attendance/check-in")
def check_in(subdomain: str, body: CheckInRequest,
             portal_user: dict = Depends(_portal_jwt),
             db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.check_in(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/attendance/check-out")
def check_out(subdomain: str, body: CheckOutRequest,
              portal_user: dict = Depends(_portal_jwt),
              db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.check_out(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Attendance Records ─────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/records")
def list_records(subdomain: str,
                 page:          int = Query(1),
                 page_size:     int = Query(30),
                 employee_id:   str = Query(""),
                 department_id: str = Query(""),
                 branch_id:     str = Query(""),
                 status:        str = Query(""),
                 location_type: str = Query(""),
                 from_date:     str = Query(""),
                 to_date:       str = Query(""),
                 search:        str = Query(""),
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    from datetime import date as dt_date
    fd = dt_date.fromisoformat(from_date) if from_date else None
    td = dt_date.fromisoformat(to_date)   if to_date   else None
    return ApiResponse.ok(svc.list_records(
        db, _cid(portal_user),
        page=page, page_size=page_size,
        employee_id=employee_id, department_id=department_id,
        branch_id=branch_id, status=status, location_type=location_type,
        from_date=fd, to_date=td, search=search,
    )).model_dump()


@router.post("/{subdomain}/hrms/attendance/records")
def create_record(subdomain: str, body: AttendanceCreate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_manual_record(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/attendance/records/{record_id}")
def get_record(subdomain: str, record_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_record(db, record_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/records/{record_id}")
def update_record(subdomain: str, record_id: str, body: AttendanceUpdate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_record(db, record_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Calendar ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/calendar")
def calendar(subdomain: str,
             employee_id: str = Query(...),
             year:        int = Query(...),
             month:       int = Query(...),
             portal_user: dict = Depends(_portal_jwt),
             db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.calendar(db, _cid(portal_user), employee_id, year, month)).model_dump()


# ── Regularizations ────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/regularizations")
def list_regularizations(subdomain: str,
                         page:        int = Query(1),
                         page_size:   int = Query(30),
                         status:      str = Query(""),
                         employee_id: str = Query(""),
                         portal_user: dict = Depends(_portal_jwt),
                         db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_regularizations(
        db, _cid(portal_user), page=page, page_size=page_size,
        status=status, employee_id=employee_id,
    )).model_dump()


@router.post("/{subdomain}/hrms/attendance/regularizations")
def create_regularization(subdomain: str, body: RegularizationCreate,
                          portal_user: dict = Depends(_portal_jwt),
                          db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_regularization(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/regularizations/{reg_id}/review")
def review_regularization(subdomain: str, reg_id: str, body: RegularizationReview,
                          portal_user: dict = Depends(_portal_jwt),
                          db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.review_regularization(db, reg_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Overtime ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/overtime")
def list_overtime(subdomain: str,
                  page:            int = Query(1),
                  page_size:       int = Query(30),
                  employee_id:     str = Query(""),
                  approval_status: str = Query(""),
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_overtime(
        db, _cid(portal_user), page=page, page_size=page_size,
        employee_id=employee_id, approval_status=approval_status,
    )).model_dump()


@router.post("/{subdomain}/hrms/attendance/overtime")
def create_overtime(subdomain: str, body: OvertimeCreate,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_overtime(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/overtime/{ot_id}/review")
def review_overtime(subdomain: str, ot_id: str, body: OvertimeReview,
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.review_overtime(db, ot_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


# ── Policies ───────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/policies")
def list_policies(subdomain: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_policies(db, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/attendance/policies")
def create_policy(subdomain: str, body: PolicyCreate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_policy(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/attendance/policies/{policy_id}")
def get_policy(subdomain: str, policy_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_policy(db, policy_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/policies/{policy_id}")
def update_policy(subdomain: str, policy_id: str, body: PolicyUpdate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_policy(db, policy_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/attendance/policies/{policy_id}")
def delete_policy(subdomain: str, policy_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_policy(db, policy_id, _cid(portal_user), _actor(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


# ── Biometric Devices ──────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/devices")
def list_devices(subdomain: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_devices(db, _cid(portal_user))).model_dump()


@router.post("/{subdomain}/hrms/attendance/devices")
def create_device(subdomain: str, body: DeviceCreate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.create_device(db, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.get("/{subdomain}/hrms/attendance/devices/{device_id}")
def get_device(subdomain: str, device_id: str,
               portal_user: dict = Depends(_portal_jwt),
               db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_device(db, device_id, _cid(portal_user))).model_dump()


@router.patch("/{subdomain}/hrms/attendance/devices/{device_id}")
def update_device(subdomain: str, device_id: str, body: DeviceUpdate,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.update_device(db, device_id, _cid(portal_user), body.model_dump(), _actor(portal_user))).model_dump()


@router.delete("/{subdomain}/hrms/attendance/devices/{device_id}")
def delete_device(subdomain: str, device_id: str,
                  portal_user: dict = Depends(_portal_jwt),
                  db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_device(db, device_id, _cid(portal_user), _actor(portal_user))
    return ApiResponse.ok({"deleted": True}).model_dump()


@router.post("/{subdomain}/hrms/attendance/devices/{device_id}/sync")
def trigger_sync(subdomain: str, device_id: str,
                 portal_user: dict = Depends(_portal_jwt),
                 db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.trigger_sync(db, device_id, _cid(portal_user), _actor(portal_user))).model_dump()


# ── Activities ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/hrms/attendance/activities")
def list_activities(subdomain: str,
                    entity_id:   str = Query(""),
                    entity_type: str = Query(""),
                    limit:       int = Query(50),
                    portal_user: dict = Depends(_portal_jwt),
                    db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_activities(
        db, _cid(portal_user), entity_id=entity_id, entity_type=entity_type, limit=limit,
    )).model_dump()
