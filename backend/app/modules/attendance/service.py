"""Service layer — Attendance Management."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.attendance import repository as repo
from backend.app.modules.attendance.models import (
    AttendanceShift, AttendanceShiftAssignment, AttendanceRecord,
    AttendanceRegularization, AttendanceOvertime, AttendancePolicy,
    AttendanceDevice, AttendanceSyncLog, AttendanceActivity,
    EmployeeWorkSchedule,
)
from backend.app.modules.attendance.constants import (
    ACT_CHECKIN, ACT_CHECKOUT, ACT_RECORD_UPDATED, ACT_REGULARIZATION_REQ,
    ACT_REGULARIZATION_APP, ACT_REGULARIZATION_REJ, ACT_OVERTIME_RECORDED,
    ACT_DEVICE_REGISTERED, ACT_SHIFT_CREATED, ACT_SHIFT_ASSIGNED, ACT_POLICY_UPDATED,
    ACT_WFH_CHECKIN, ACT_SCHEDULE_SET,
    ATT_PRESENT, ATT_LATE, ATT_ABSENT, ATT_HALF_DAY,
    DEFAULT_GRACE_PERIOD_MINS, DEFAULT_MIN_WORKING_HOURS, DEFAULT_HALF_DAY_HOURS,
    DEFAULT_OT_THRESHOLD_HOURS, WEEKDAY_MAP, WEEKDAYS, LOCATION_TYPES, LOC_WFH,
)


# ── Dict helpers ──────────────────────────────────────────────────────────────

def _time_str(t) -> Optional[str]:
    if t is None:
        return None
    if hasattr(t, "strftime"):
        return t.strftime("%H:%M")
    return str(t)


def _dt_str(dt) -> Optional[str]:
    if dt is None:
        return None
    return dt.isoformat() if hasattr(dt, "isoformat") else str(dt)


def _date_str(d) -> Optional[str]:
    if d is None:
        return None
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def _shift_dict(s: AttendanceShift) -> Dict:
    return {
        "id":                  s.id,
        "shift_name":          s.shift_name,
        "shift_code":          s.shift_code,
        "shift_type":          s.shift_type,
        "company_id":          s.company_id,
        "company_name":        s.company_name,
        "branch_id":           s.branch_id,
        "branch_name":         s.branch_name,
        "start_time":          _time_str(s.start_time),
        "end_time":            _time_str(s.end_time),
        "is_cross_day":        s.is_cross_day,
        "break_duration_mins": s.break_duration_mins,
        "grace_period_mins":   s.grace_period_mins,
        "min_working_hours":   s.min_working_hours,
        "description":         s.description,
        "is_active":           s.is_active,
        "created_at":          _dt_str(s.created_at),
        "updated_at":          _dt_str(s.updated_at),
    }


def _assignment_dict(a: AttendanceShiftAssignment) -> Dict:
    return {
        "id":            a.id,
        "shift_id":      a.shift_id,
        "shift_name":    a.shift.shift_name if a.shift else None,
        "scope":         a.scope,
        "scope_id":      a.scope_id,
        "scope_name":    a.scope_name,
        "employee_id":   a.employee_id,
        "employee_name": a.employee_name,
        "employee_code": a.employee_code,
        "effective_from": _date_str(a.effective_from),
        "effective_to":   _date_str(a.effective_to),
        "notes":         a.notes,
        "is_active":     a.is_active,
        "created_at":    _dt_str(a.created_at),
    }


def _record_dict(r: AttendanceRecord) -> Dict:
    return {
        "id":              r.id,
        "employee_id":     r.employee_id,
        "employee_name":   r.employee_name,
        "employee_code":   r.employee_code,
        "department_id":   r.department_id,
        "department_name": r.department_name,
        "branch_id":       r.branch_id,
        "branch_name":     r.branch_name,
        "shift_id":        r.shift_id,
        "shift_name":      r.shift_name,
        "attendance_date": _date_str(r.attendance_date),
        "check_in_time":   _dt_str(r.check_in_time),
        "check_out_time":  _dt_str(r.check_out_time),
        "source":          r.source,
        "work_mode":       r.work_mode,
        "location_type":   r.location_type,
        "work_mode_snapshot": r.work_mode_snapshot,
        "status":          r.status,
        "total_hours":     r.total_hours,
        "break_hours":     r.break_hours,
        "productive_hours": r.productive_hours,
        "overtime_hours":  r.overtime_hours,
        "notes":           r.notes,
        "is_regularized":  r.is_regularized,
        "created_at":      _dt_str(r.created_at),
        "updated_at":      _dt_str(r.updated_at),
    }


def _reg_dict(r: AttendanceRegularization) -> Dict:
    return {
        "id":                r.id,
        "record_id":         r.record_id,
        "employee_id":       r.employee_id,
        "employee_name":     r.employee_name,
        "employee_code":     r.employee_code,
        "attendance_date":   _date_str(r.attendance_date),
        "requested_checkin": _dt_str(r.requested_checkin),
        "requested_checkout": _dt_str(r.requested_checkout),
        "reason":            r.reason,
        "status":            r.status,
        "reviewed_by":       r.reviewed_by,
        "reviewed_at":       _dt_str(r.reviewed_at),
        "review_notes":      r.review_notes,
        "created_at":        _dt_str(r.created_at),
    }


def _ot_dict(o: AttendanceOvertime) -> Dict:
    return {
        "id":              o.id,
        "record_id":       o.record_id,
        "employee_id":     o.employee_id,
        "employee_name":   o.employee_name,
        "employee_code":   o.employee_code,
        "attendance_date": _date_str(o.attendance_date),
        "overtime_hours":  o.overtime_hours,
        "overtime_type":   o.overtime_type,
        "approval_status": o.approval_status,
        "approved_by":     o.approved_by,
        "approved_at":     _dt_str(o.approved_at),
        "notes":           o.notes,
        "created_at":      _dt_str(o.created_at),
    }


def _policy_dict(p: AttendancePolicy) -> Dict:
    return {
        "id":                p.id,
        "policy_name":       p.policy_name,
        "scope":             p.scope,
        "scope_id":          p.scope_id,
        "scope_name":        p.scope_name,
        "grace_period_mins": p.grace_period_mins,
        "min_working_hours": p.min_working_hours,
        "half_day_hours":    p.half_day_hours,
        "late_mark_after_mins": p.late_mark_after_mins,
        "ot_threshold_hours": p.ot_threshold_hours,
        "allow_regularization": p.allow_regularization,
        "max_regularization_per_month": p.max_regularization_per_month,
        "work_days":         p.work_days,
        "wfh_allowed":       p.wfh_allowed,
        "max_wfh_days_per_month": p.max_wfh_days_per_month,
        "require_wfh_approval":   p.require_wfh_approval,
        "allow_hybrid_override":  p.allow_hybrid_override,
        "description":       p.description,
        "is_active":         p.is_active,
        "created_at":        _dt_str(p.created_at),
    }


def _device_dict(d: AttendanceDevice) -> Dict:
    return {
        "id":                  d.id,
        "device_name":         d.device_name,
        "vendor":              d.vendor,
        "device_identifier":   d.device_identifier,
        "branch_id":           d.branch_id,
        "branch_name":         d.branch_name,
        "ip_address":          d.ip_address,
        "sync_method":         d.sync_method,
        "sync_frequency_mins": d.sync_frequency_mins,
        "last_sync_at":        _dt_str(d.last_sync_at),
        "status":              d.status,
        "notes":               d.notes,
        "created_at":          _dt_str(d.created_at),
    }


def _sync_log_dict(l: AttendanceSyncLog) -> Dict:
    return {
        "id":             l.id,
        "device_id":      l.device_id,
        "triggered_by":   l.triggered_by,
        "status":         l.status,
        "records_fetched": l.records_fetched,
        "records_saved":  l.records_saved,
        "error_message":  l.error_message,
        "started_at":     _dt_str(l.started_at),
        "finished_at":    _dt_str(l.finished_at),
    }


def _activity_dict(a: AttendanceActivity) -> Dict:
    return {
        "id":          a.id,
        "entity_type": a.entity_type,
        "entity_id":   a.entity_id,
        "employee_id": a.employee_id,
        "action":      a.action,
        "actor":       a.actor,
        "old_value":   a.old_value,
        "new_value":   a.new_value,
        "notes":       a.notes,
        "created_at":  _dt_str(a.created_at),
    }


def _schedule_entry_dict(s: EmployeeWorkSchedule) -> Dict:
    return {
        "weekday":               s.weekday,
        "expected_location_type": s.expected_location_type,
        "notes":                 s.notes,
    }


# ── Calculations ──────────────────────────────────────────────────────────────

def _compute_hours(check_in: datetime, check_out: datetime,
                   break_mins: int = 0) -> Dict:
    delta = (check_out - check_in).total_seconds() / 3600.0
    total = round(max(delta, 0), 2)
    brk   = round(break_mins / 60.0, 2)
    prod  = round(max(total - brk, 0), 2)
    return {"total": total, "break": brk, "productive": prod}


def _determine_status(check_in: Optional[datetime], shift: Optional[AttendanceShift],
                      productive_hours: float, policy: Optional[dict] = None) -> str:
    grace = (policy or {}).get("grace_period_mins", DEFAULT_GRACE_PERIOD_MINS)
    min_hrs = (policy or {}).get("min_working_hours", DEFAULT_MIN_WORKING_HOURS)
    half_day_hrs = (policy or {}).get("half_day_hours", DEFAULT_HALF_DAY_HOURS)

    if check_in is None:
        return ATT_ABSENT

    late = False
    if shift and shift.start_time:
        shift_start = datetime.combine(check_in.date(), shift.start_time)
        grace_cutoff = shift_start + timedelta(minutes=grace)
        if check_in > grace_cutoff:
            late = True

    if productive_hours <= 0:
        return ATT_ABSENT
    if productive_hours < half_day_hrs:
        return ATT_HALF_DAY
    if late:
        return ATT_LATE
    return ATT_PRESENT


def _parse_time(time_str: str):
    """Parse HH:MM string into datetime.time."""
    from datetime import time as dt_time
    parts = time_str.split(":")
    return dt_time(int(parts[0]), int(parts[1]))


# ── Dashboard ─────────────────────────────────────────────────────────────────

def dashboard(db: Session, client_id: str) -> Dict:
    today = date.today()
    by_status   = repo.count_records_by_status(db, client_id, today)
    by_location = repo.count_records_by_location(db, client_id, today)
    pending_regs = repo.count_pending_regularizations(db, client_id)
    pending_ot   = repo.count_pending_overtime(db, client_id)
    return {
        "today":             today.isoformat(),
        "present":           by_status.get("Present", 0) + by_status.get("Late", 0),
        "absent":            by_status.get("Absent", 0),
        "late":              by_status.get("Late", 0),
        "half_day":          by_status.get("Half Day", 0),
        "on_leave":          by_status.get("On Leave", 0),
        "wfh_today":         by_location.get("Work From Home", 0),
        "office_today":      by_location.get("Office", 0),
        "remote_today":      by_location.get("Remote", 0),
        "client_site_today": by_location.get("Client Site", 0),
        "pending_regularizations": pending_regs,
        "pending_overtime":  pending_ot,
        "total_today":       sum(by_status.values()),
    }


# ── Employee Work Schedules ───────────────────────────────────────────────────

def get_employee_schedule(db: Session, client_id: str, employee_id: str) -> Dict:
    entries = repo.get_employee_schedule(db, client_id, employee_id)
    schedule_map = {e.weekday: _schedule_entry_dict(e) for e in entries}
    # Return all 7 weekdays; days without a rule default to None
    result = []
    for wd in WEEKDAYS:
        if wd in schedule_map:
            result.append(schedule_map[wd])
        else:
            result.append({"weekday": wd, "expected_location_type": None, "notes": None})
    return {"employee_id": employee_id, "schedule": result}


def set_employee_schedule(db: Session, client_id: str, employee_id: str,
                           data: Dict, actor: str = "") -> Dict:
    employee_name = data.get("employee_name", "")
    employee_code = data.get("employee_code", "")
    entries = data.get("schedule", [])

    # Delete existing entries first
    repo.delete_employee_schedule(db, client_id, employee_id)

    for entry in entries:
        weekday = entry.get("weekday", "")
        location = entry.get("expected_location_type", "")
        if weekday not in WEEKDAYS:
            continue
        if location not in LOCATION_TYPES:
            continue
        repo.upsert_schedule_entry(
            db, client_id, employee_id, weekday, location,
            employee_name=employee_name, employee_code=employee_code,
            notes=entry.get("notes", ""), actor=actor,
        )

    repo.log_activity(db, client_id, "schedule", employee_id, ACT_SCHEDULE_SET,
                      actor=actor, employee_id=employee_id,
                      new_value=f"{len(entries)} days configured")
    db.commit()
    return get_employee_schedule(db, client_id, employee_id)


def get_today_location_for_employee(db: Session, client_id: str,
                                     employee_id: str) -> Optional[str]:
    """Return expected location_type for today based on the employee's schedule."""
    today_weekday = WEEKDAY_MAP.get(date.today().weekday())
    if not today_weekday:
        return None
    entry = repo.get_schedule_for_weekday(db, client_id, employee_id, today_weekday)
    return entry.expected_location_type if entry else None


# ── WFH Today ─────────────────────────────────────────────────────────────────

def wfh_today(db: Session, client_id: str) -> Dict:
    today   = date.today()
    records = repo.get_wfh_today(db, client_id, today)
    return {
        "date":  today.isoformat(),
        "count": len(records),
        "employees": [
            {
                "employee_id":   r.employee_id,
                "employee_name": r.employee_name,
                "employee_code": r.employee_code,
                "check_in_time": _dt_str(r.check_in_time),
                "check_out_time": _dt_str(r.check_out_time),
            }
            for r in records
        ],
    }


# ── Shifts ────────────────────────────────────────────────────────────────────

def create_shift(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"]  = client_id
    data["created_by"] = actor
    if "start_time" in data and isinstance(data["start_time"], str):
        data["start_time"] = _parse_time(data["start_time"])
    if "end_time" in data and isinstance(data["end_time"], str):
        data["end_time"] = _parse_time(data["end_time"])
    obj = repo.create_shift(db, data)
    repo.log_activity(db, client_id, "shift", obj.id, ACT_SHIFT_CREATED, actor=actor,
                      new_value=obj.shift_name)
    db.commit()
    return _shift_dict(obj)


def list_shifts(db: Session, client_id: str, active_only: bool = False) -> List[Dict]:
    return [_shift_dict(s) for s in repo.list_shifts(db, client_id, active_only=active_only)]


def get_shift(db: Session, shift_id: str, client_id: str) -> Dict:
    obj = repo.get_shift(db, shift_id, client_id)
    if not obj:
        raise HTTPException(404, "Shift not found.")
    return _shift_dict(obj)


def update_shift(db: Session, shift_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    obj = repo.get_shift(db, shift_id, client_id)
    if not obj:
        raise HTTPException(404, "Shift not found.")
    if "start_time" in data and data["start_time"] and isinstance(data["start_time"], str):
        data["start_time"] = _parse_time(data["start_time"])
    if "end_time" in data and data["end_time"] and isinstance(data["end_time"], str):
        data["end_time"] = _parse_time(data["end_time"])
    old_name = obj.shift_name
    repo.update_shift(db, obj, {k: v for k, v in data.items() if v is not None})
    repo.log_activity(db, client_id, "shift", obj.id, "Shift Updated", actor=actor,
                      old_value=old_name, new_value=obj.shift_name)
    db.commit()
    return _shift_dict(obj)


def delete_shift(db: Session, shift_id: str, client_id: str, actor: str = ""):
    obj = repo.get_shift(db, shift_id, client_id)
    if not obj:
        raise HTTPException(404, "Shift not found.")
    repo.delete_shift(db, obj)
    repo.log_activity(db, client_id, "shift", obj.id, "Shift Deleted", actor=actor,
                      old_value=obj.shift_name)
    db.commit()


# ── Shift Assignments ─────────────────────────────────────────────────────────

def create_assignment(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    shift = repo.get_shift(db, data["shift_id"], client_id)
    if not shift:
        raise HTTPException(404, "Shift not found.")
    data["client_id"]  = client_id
    data["created_by"] = actor
    for k in ("effective_from", "effective_to"):
        if k in data and isinstance(data[k], str) and data[k]:
            from datetime import date as dt_date
            data[k] = dt_date.fromisoformat(data[k])
    obj = repo.create_assignment(db, data)
    repo.log_activity(db, client_id, "shift", obj.shift_id, ACT_SHIFT_ASSIGNED, actor=actor,
                      new_value=f"{obj.scope}: {obj.scope_name or obj.employee_name}")
    db.commit()
    return _assignment_dict(obj)


def list_assignments(db: Session, client_id: str, shift_id: str = "",
                     employee_id: str = "") -> List[Dict]:
    items = repo.list_assignments(db, client_id, shift_id=shift_id, employee_id=employee_id)
    return [_assignment_dict(a) for a in items]


def delete_assignment(db: Session, asgn_id: str, client_id: str, actor: str = ""):
    obj = repo.get_assignment(db, asgn_id, client_id)
    if not obj:
        raise HTTPException(404, "Assignment not found.")
    repo.delete_assignment(db, obj)
    db.commit()


# ── Check-In ──────────────────────────────────────────────────────────────────

def check_in(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    today  = date.today()
    emp_id = data["employee_id"]

    existing = repo.get_record_by_employee_date(db, client_id, emp_id, today)
    if existing and existing.check_in_time:
        raise HTTPException(400, "Employee already checked in today.")

    # Find shift
    shift_id   = data.get("shift_id")
    shift_name = None
    shift_obj  = None
    if not shift_id:
        asgn = repo.get_active_assignment_for_employee(db, client_id, emp_id, today)
        if asgn:
            shift_id   = asgn.shift_id
            shift_name = asgn.shift.shift_name if asgn.shift else None
            shift_obj  = asgn.shift
    else:
        shift_obj  = repo.get_shift(db, shift_id, client_id)
        shift_name = shift_obj.shift_name if shift_obj else None

    # Determine location_type: use supplied, default to Office
    location_type      = data.get("location_type") or "Office"
    work_mode_snapshot = data.get("work_mode_snapshot")
    device_info        = data.get("device_info")

    now = datetime.utcnow()
    # Choose activity action
    act_action = ACT_WFH_CHECKIN if location_type == LOC_WFH else ACT_CHECKIN

    if existing:
        existing.check_in_time  = now
        existing.shift_id       = shift_id
        existing.shift_name     = shift_name
        existing.source         = data.get("source", "Web Check-In")
        existing.work_mode      = data.get("work_mode")
        existing.location_type  = location_type
        existing.work_mode_snapshot = work_mode_snapshot
        existing.device_info    = device_info
        existing.checkin_latitude  = data.get("latitude")
        existing.checkin_longitude = data.get("longitude")
        existing.checkin_ip        = data.get("ip_address")
        db.flush()
        record = existing
    else:
        record_data = {
            "client_id":        client_id,
            "employee_id":      emp_id,
            "employee_name":    data.get("employee_name"),
            "employee_code":    data.get("employee_code"),
            "branch_id":        data.get("branch_id"),
            "branch_name":      data.get("branch_name"),
            "shift_id":         shift_id,
            "shift_name":       shift_name,
            "attendance_date":  today,
            "check_in_time":    now,
            "source":           data.get("source", "Web Check-In"),
            "work_mode":        data.get("work_mode"),
            "location_type":    location_type,
            "work_mode_snapshot": work_mode_snapshot,
            "device_info":      device_info,
            "status":           ATT_PRESENT,
            "checkin_latitude":  data.get("latitude"),
            "checkin_longitude": data.get("longitude"),
            "checkin_ip":        data.get("ip_address"),
            "created_by":       actor,
        }
        record = repo.create_record(db, record_data)

    repo.log_activity(db, client_id, "record", record.id, act_action, actor=actor,
                      employee_id=emp_id,
                      new_value=f"{now.isoformat()} ({location_type})")
    db.commit()
    return _record_dict(record)


def check_out(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    today  = date.today()
    emp_id = data["employee_id"]
    record_id = data.get("record_id")

    record = None
    if record_id:
        record = repo.get_record(db, record_id, client_id)
    if not record:
        record = repo.get_record_by_employee_date(db, client_id, emp_id, today)
    if not record:
        raise HTTPException(404, "No check-in record found for today.")
    if record.check_in_time is None:
        raise HTTPException(400, "Employee has not checked in yet.")
    if record.check_out_time:
        raise HTTPException(400, "Employee already checked out.")

    now = datetime.utcnow()
    record.check_out_time  = now
    record.checkout_latitude  = data.get("latitude")
    record.checkout_longitude = data.get("longitude")
    record.checkout_ip        = data.get("ip_address")

    shift_obj = repo.get_shift(db, record.shift_id, client_id) if record.shift_id else None
    brk_mins  = shift_obj.break_duration_mins if shift_obj else 0
    hours     = _compute_hours(record.check_in_time, now, brk_mins or 0)
    record.total_hours       = hours["total"]
    record.break_hours       = hours["break"]
    record.productive_hours  = hours["productive"]

    ot_threshold = DEFAULT_OT_THRESHOLD_HOURS
    if shift_obj and shift_obj.min_working_hours:
        ot_threshold = shift_obj.min_working_hours + 1.0
    ot = round(max(hours["productive"] - ot_threshold, 0), 2)
    record.overtime_hours = ot

    record.status = _determine_status(record.check_in_time, shift_obj, hours["productive"])
    db.flush()

    if ot >= 0.5:
        ot_type = "Weekday"
        wd = today.weekday()
        if wd >= 5:
            ot_type = "Weekend"
        repo.create_overtime(db, {
            "client_id":      client_id,
            "record_id":      record.id,
            "employee_id":    emp_id,
            "employee_name":  record.employee_name,
            "employee_code":  record.employee_code,
            "attendance_date": today,
            "overtime_hours": ot,
            "overtime_type":  ot_type,
            "created_by":     actor,
        })

    act_action = ACT_CHECKOUT
    repo.log_activity(db, client_id, "record", record.id, act_action, actor=actor,
                      employee_id=emp_id, new_value=now.isoformat())
    db.commit()
    return _record_dict(record)


# ── Attendance Records (admin CRUD) ───────────────────────────────────────────

def list_records(db: Session, client_id: str, **kwargs) -> Dict:
    result = repo.list_records(db, client_id, **kwargs)
    return {"total": result["total"], "items": [_record_dict(r) for r in result["items"]]}


def get_record(db: Session, record_id: str, client_id: str) -> Dict:
    obj = repo.get_record(db, record_id, client_id)
    if not obj:
        raise HTTPException(404, "Attendance record not found.")
    return _record_dict(obj)


def update_record(db: Session, record_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    obj = repo.get_record(db, record_id, client_id)
    if not obj:
        raise HTTPException(404, "Attendance record not found.")
    repo.update_record(db, obj, {k: v for k, v in data.items() if v is not None})
    if obj.check_in_time and obj.check_out_time:
        shift_obj = repo.get_shift(db, obj.shift_id, client_id) if obj.shift_id else None
        brk_mins  = shift_obj.break_duration_mins if shift_obj else 0
        hours     = _compute_hours(obj.check_in_time, obj.check_out_time, brk_mins or 0)
        obj.total_hours      = hours["total"]
        obj.break_hours      = hours["break"]
        obj.productive_hours = hours["productive"]
        ot_threshold = DEFAULT_OT_THRESHOLD_HOURS
        obj.overtime_hours = round(max(hours["productive"] - ot_threshold, 0), 2)
        obj.status = _determine_status(obj.check_in_time, shift_obj, hours["productive"])
        db.flush()
    repo.log_activity(db, client_id, "record", obj.id, ACT_RECORD_UPDATED, actor=actor,
                      employee_id=obj.employee_id)
    db.commit()
    return _record_dict(obj)


def create_manual_record(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    emp_id = data["employee_id"]
    att_date = data["attendance_date"]
    if isinstance(att_date, str):
        att_date = date.fromisoformat(att_date)
        data["attendance_date"] = att_date
    existing = repo.get_record_by_employee_date(db, client_id, emp_id, att_date)
    if existing:
        raise HTTPException(409, f"Attendance record already exists for this employee on {att_date}.")
    data["client_id"]  = client_id
    data["created_by"] = actor
    if data.get("check_in_time") and data.get("check_out_time"):
        shift_obj = repo.get_shift(db, data.get("shift_id", ""), client_id) if data.get("shift_id") else None
        brk_mins  = shift_obj.break_duration_mins if shift_obj else 0
        hours = _compute_hours(data["check_in_time"], data["check_out_time"], brk_mins or 0)
        data.setdefault("total_hours", hours["total"])
        data.setdefault("break_hours", hours["break"])
        data.setdefault("productive_hours", hours["productive"])
        data.setdefault("status", ATT_PRESENT)
    obj = repo.create_record(db, data)
    repo.log_activity(db, client_id, "record", obj.id, ACT_RECORD_UPDATED, actor=actor,
                      employee_id=emp_id, new_value="Manual Entry")
    db.commit()
    return _record_dict(obj)


# ── Regularizations ───────────────────────────────────────────────────────────

def create_regularization(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"]  = client_id
    data["created_by"] = actor
    obj = repo.create_regularization(db, data)
    repo.log_activity(db, client_id, "regularization", obj.id, ACT_REGULARIZATION_REQ,
                      actor=actor, employee_id=obj.employee_id)
    db.commit()
    return _reg_dict(obj)


def list_regularizations(db: Session, client_id: str, **kwargs) -> Dict:
    result = repo.list_regularizations(db, client_id, **kwargs)
    return {"total": result["total"], "items": [_reg_dict(r) for r in result["items"]]}


def review_regularization(db: Session, reg_id: str, client_id: str,
                           data: Dict, actor: str = "") -> Dict:
    obj = repo.get_regularization(db, reg_id, client_id)
    if not obj:
        raise HTTPException(404, "Regularization not found.")
    status = data.get("status", "")
    if status not in ("Approved", "Rejected"):
        raise HTTPException(400, "Status must be Approved or Rejected.")
    obj.status       = status
    obj.reviewed_by  = actor
    obj.reviewed_at  = datetime.utcnow()
    obj.review_notes = data.get("review_notes")
    if status == "Approved" and obj.record_id:
        record = repo.get_record(db, obj.record_id, client_id)
        if record:
            if obj.requested_checkin:
                record.check_in_time = obj.requested_checkin
            if obj.requested_checkout:
                record.check_out_time = obj.requested_checkout
            record.is_regularized = True
            if record.check_in_time and record.check_out_time:
                shift_obj = repo.get_shift(db, record.shift_id, client_id) if record.shift_id else None
                brk_mins  = shift_obj.break_duration_mins if shift_obj else 0
                hours = _compute_hours(record.check_in_time, record.check_out_time, brk_mins or 0)
                record.total_hours      = hours["total"]
                record.break_hours      = hours["break"]
                record.productive_hours = hours["productive"]
                record.status = _determine_status(record.check_in_time, shift_obj, hours["productive"])
    action = ACT_REGULARIZATION_APP if status == "Approved" else ACT_REGULARIZATION_REJ
    repo.log_activity(db, client_id, "regularization", obj.id, action,
                      actor=actor, employee_id=obj.employee_id)
    db.commit()
    return _reg_dict(obj)


# ── Overtime ──────────────────────────────────────────────────────────────────

def create_overtime(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"]  = client_id
    data["created_by"] = actor
    obj = repo.create_overtime(db, data)
    repo.log_activity(db, client_id, "overtime", obj.id, ACT_OVERTIME_RECORDED,
                      actor=actor, employee_id=obj.employee_id)
    db.commit()
    return _ot_dict(obj)


def list_overtime(db: Session, client_id: str, **kwargs) -> Dict:
    result = repo.list_overtime(db, client_id, **kwargs)
    return {"total": result["total"], "items": [_ot_dict(o) for o in result["items"]]}


def review_overtime(db: Session, ot_id: str, client_id: str,
                    data: Dict, actor: str = "") -> Dict:
    obj = repo.get_overtime(db, ot_id, client_id)
    if not obj:
        raise HTTPException(404, "Overtime record not found.")
    status = data.get("approval_status", "")
    if status not in ("Approved", "Rejected"):
        raise HTTPException(400, "approval_status must be Approved or Rejected.")
    obj.approval_status = status
    obj.approved_by     = actor
    obj.approved_at     = datetime.utcnow()
    obj.notes           = data.get("notes") or obj.notes
    db.commit()
    return _ot_dict(obj)


# ── Policies ──────────────────────────────────────────────────────────────────

def create_policy(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"]  = client_id
    data["created_by"] = actor
    obj = repo.create_policy(db, data)
    repo.log_activity(db, client_id, "policy", obj.id, ACT_POLICY_UPDATED,
                      actor=actor, new_value=obj.policy_name)
    db.commit()
    return _policy_dict(obj)


def list_policies(db: Session, client_id: str) -> List[Dict]:
    return [_policy_dict(p) for p in repo.list_policies(db, client_id)]


def get_policy(db: Session, policy_id: str, client_id: str) -> Dict:
    obj = repo.get_policy(db, policy_id, client_id)
    if not obj:
        raise HTTPException(404, "Policy not found.")
    return _policy_dict(obj)


def update_policy(db: Session, policy_id: str, client_id: str,
                  data: Dict, actor: str = "") -> Dict:
    obj = repo.get_policy(db, policy_id, client_id)
    if not obj:
        raise HTTPException(404, "Policy not found.")
    repo.update_policy(db, obj, {k: v for k, v in data.items() if v is not None})
    repo.log_activity(db, client_id, "policy", obj.id, ACT_POLICY_UPDATED, actor=actor,
                      new_value=obj.policy_name)
    db.commit()
    return _policy_dict(obj)


def delete_policy(db: Session, policy_id: str, client_id: str, actor: str = ""):
    obj = repo.get_policy(db, policy_id, client_id)
    if not obj:
        raise HTTPException(404, "Policy not found.")
    repo.delete_policy(db, obj)
    db.commit()


# ── Devices ───────────────────────────────────────────────────────────────────

def create_device(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"]  = client_id
    data["created_by"] = actor
    obj = repo.create_device(db, data)
    repo.log_activity(db, client_id, "device", obj.id, ACT_DEVICE_REGISTERED, actor=actor,
                      new_value=obj.device_name)
    db.commit()
    return _device_dict(obj)


def list_devices(db: Session, client_id: str) -> List[Dict]:
    return [_device_dict(d) for d in repo.list_devices(db, client_id)]


def get_device(db: Session, device_id: str, client_id: str) -> Dict:
    obj = repo.get_device(db, device_id, client_id)
    if not obj:
        raise HTTPException(404, "Device not found.")
    return _device_dict(obj)


def update_device(db: Session, device_id: str, client_id: str,
                  data: Dict, actor: str = "") -> Dict:
    obj = repo.get_device(db, device_id, client_id)
    if not obj:
        raise HTTPException(404, "Device not found.")
    repo.update_device(db, obj, {k: v for k, v in data.items() if v is not None})
    db.commit()
    return _device_dict(obj)


def delete_device(db: Session, device_id: str, client_id: str, actor: str = ""):
    obj = repo.get_device(db, device_id, client_id)
    if not obj:
        raise HTTPException(404, "Device not found.")
    repo.delete_device(db, obj)
    db.commit()


def trigger_sync(db: Session, device_id: str, client_id: str, actor: str = "") -> Dict:
    obj = repo.get_device(db, device_id, client_id)
    if not obj:
        raise HTTPException(404, "Device not found.")
    log = repo.create_sync_log(db, {
        "client_id":       client_id,
        "device_id":       device_id,
        "triggered_by":    actor,
        "status":          "Success",
        "records_fetched": 0,
        "records_saved":   0,
    })
    obj.last_sync_at = datetime.utcnow()
    db.commit()
    return _sync_log_dict(log)


def list_sync_logs(db: Session, device_id: str, client_id: str) -> List[Dict]:
    return [_sync_log_dict(l) for l in repo.list_sync_logs(db, client_id, device_id)]


# ── Activities ────────────────────────────────────────────────────────────────

def list_activities(db: Session, client_id: str, **kwargs) -> List[Dict]:
    return [_activity_dict(a) for a in repo.list_activities(db, client_id, **kwargs)]


# ── Calendar ──────────────────────────────────────────────────────────────────

def calendar(db: Session, client_id: str, employee_id: str, year: int, month: int) -> List[Dict]:
    from calendar import monthrange
    _, last_day = monthrange(year, month)
    from_date   = date(year, month, 1)
    to_date     = date(year, month, last_day)
    records     = repo.get_calendar_records(db, client_id, employee_id, from_date, to_date)
    rec_map     = {r.attendance_date: r for r in records}

    result = []
    for day in range(1, last_day + 1):
        d = date(year, month, day)
        r = rec_map.get(d)
        if r:
            result.append({
                "attendance_date": _date_str(r.attendance_date),
                "status":          r.status,
                "location_type":   r.location_type,
                "work_mode":       r.work_mode,
                "check_in_time":   _dt_str(r.check_in_time),
                "check_out_time":  _dt_str(r.check_out_time),
                "productive_hours": r.productive_hours,
                "shift_name":      r.shift_name,
            })
        else:
            result.append({
                "attendance_date": d.isoformat(),
                "status":          None,
                "location_type":   None,
                "work_mode":       None,
                "check_in_time":   None,
                "check_out_time":  None,
                "productive_hours": None,
                "shift_name":      None,
            })
    return result
