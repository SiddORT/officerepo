"""Repository layer — Attendance Management."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Dict, List, Optional

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from backend.app.modules.attendance.models import (
    AttendanceShift, AttendanceShiftAssignment, AttendanceRecord,
    AttendanceRegularization, AttendanceOvertime, AttendancePolicy,
    AttendanceDevice, AttendanceSyncLog, AttendanceActivity,
)


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Shifts ────────────────────────────────────────────────────────────────────

def create_shift(db: Session, data: Dict) -> AttendanceShift:
    obj = AttendanceShift(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_shift(db: Session, shift_id: str, client_id: str) -> Optional[AttendanceShift]:
    return db.query(AttendanceShift).filter(
        AttendanceShift.id == shift_id,
        AttendanceShift.client_id == client_id,
        AttendanceShift.is_deleted.is_(False),
    ).first()


def list_shifts(db: Session, client_id: str, active_only: bool = False) -> List[AttendanceShift]:
    q = db.query(AttendanceShift).filter(
        AttendanceShift.client_id == client_id,
        AttendanceShift.is_deleted.is_(False),
    )
    if active_only:
        q = q.filter(AttendanceShift.is_active.is_(True))
    return q.order_by(AttendanceShift.shift_name).all()


def update_shift(db: Session, obj: AttendanceShift, data: Dict) -> AttendanceShift:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


def delete_shift(db: Session, obj: AttendanceShift):
    obj.is_deleted = True
    obj.deleted_at = _now()
    db.flush()


# ── Shift Assignments ─────────────────────────────────────────────────────────

def create_assignment(db: Session, data: Dict) -> AttendanceShiftAssignment:
    obj = AttendanceShiftAssignment(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_assignment(db: Session, asgn_id: str, client_id: str) -> Optional[AttendanceShiftAssignment]:
    return db.query(AttendanceShiftAssignment).filter(
        AttendanceShiftAssignment.id == asgn_id,
        AttendanceShiftAssignment.client_id == client_id,
        AttendanceShiftAssignment.is_deleted.is_(False),
    ).first()


def list_assignments(db: Session, client_id: str, shift_id: str = "",
                     employee_id: str = "") -> List[AttendanceShiftAssignment]:
    q = db.query(AttendanceShiftAssignment).filter(
        AttendanceShiftAssignment.client_id == client_id,
        AttendanceShiftAssignment.is_deleted.is_(False),
    )
    if shift_id:
        q = q.filter(AttendanceShiftAssignment.shift_id == shift_id)
    if employee_id:
        q = q.filter(AttendanceShiftAssignment.employee_id == employee_id)
    return q.order_by(AttendanceShiftAssignment.effective_from.desc()).all()


def get_active_assignment_for_employee(db: Session, client_id: str, employee_id: str,
                                        for_date: date) -> Optional[AttendanceShiftAssignment]:
    return db.query(AttendanceShiftAssignment).filter(
        AttendanceShiftAssignment.client_id == client_id,
        AttendanceShiftAssignment.employee_id == employee_id,
        AttendanceShiftAssignment.scope == "Employee",
        AttendanceShiftAssignment.is_active.is_(True),
        AttendanceShiftAssignment.is_deleted.is_(False),
        AttendanceShiftAssignment.effective_from <= for_date,
        (AttendanceShiftAssignment.effective_to.is_(None) |
         (AttendanceShiftAssignment.effective_to >= for_date)),
    ).order_by(AttendanceShiftAssignment.effective_from.desc()).first()


def update_assignment(db: Session, obj: AttendanceShiftAssignment, data: Dict) -> AttendanceShiftAssignment:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


def delete_assignment(db: Session, obj: AttendanceShiftAssignment):
    obj.is_deleted = True
    obj.deleted_at = _now()
    db.flush()


# ── Attendance Records ────────────────────────────────────────────────────────

def create_record(db: Session, data: Dict) -> AttendanceRecord:
    obj = AttendanceRecord(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_record(db: Session, record_id: str, client_id: str) -> Optional[AttendanceRecord]:
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.id == record_id,
        AttendanceRecord.client_id == client_id,
        AttendanceRecord.is_deleted.is_(False),
    ).first()


def get_record_by_employee_date(db: Session, client_id: str, employee_id: str,
                                 att_date: date) -> Optional[AttendanceRecord]:
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.client_id == client_id,
        AttendanceRecord.employee_id == employee_id,
        AttendanceRecord.attendance_date == att_date,
        AttendanceRecord.is_deleted.is_(False),
    ).first()


def list_records(db: Session, client_id: str, *, page: int = 1, page_size: int = 30,
                 employee_id: str = "", department_id: str = "", branch_id: str = "",
                 status: str = "", from_date: Optional[date] = None,
                 to_date: Optional[date] = None, search: str = "") -> Dict:
    q = db.query(AttendanceRecord).filter(
        AttendanceRecord.client_id == client_id,
        AttendanceRecord.is_deleted.is_(False),
    )
    if employee_id:
        q = q.filter(AttendanceRecord.employee_id == employee_id)
    if department_id:
        q = q.filter(AttendanceRecord.department_id == department_id)
    if branch_id:
        q = q.filter(AttendanceRecord.branch_id == branch_id)
    if status:
        q = q.filter(AttendanceRecord.status == status)
    if from_date:
        q = q.filter(AttendanceRecord.attendance_date >= from_date)
    if to_date:
        q = q.filter(AttendanceRecord.attendance_date <= to_date)
    if search:
        like = f"%{search}%"
        q = q.filter(
            AttendanceRecord.employee_name.ilike(like) |
            AttendanceRecord.employee_code.ilike(like)
        )
    total = q.count()
    items = q.order_by(AttendanceRecord.attendance_date.desc(),
                       AttendanceRecord.employee_name).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items}


def update_record(db: Session, obj: AttendanceRecord, data: Dict) -> AttendanceRecord:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


def delete_record(db: Session, obj: AttendanceRecord):
    obj.is_deleted = True
    obj.deleted_at = _now()
    db.flush()


# ── Regularizations ───────────────────────────────────────────────────────────

def create_regularization(db: Session, data: Dict) -> AttendanceRegularization:
    obj = AttendanceRegularization(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_regularization(db: Session, reg_id: str, client_id: str) -> Optional[AttendanceRegularization]:
    return db.query(AttendanceRegularization).filter(
        AttendanceRegularization.id == reg_id,
        AttendanceRegularization.client_id == client_id,
        AttendanceRegularization.is_deleted.is_(False),
    ).first()


def list_regularizations(db: Session, client_id: str, *, page: int = 1, page_size: int = 30,
                          status: str = "", employee_id: str = "") -> Dict:
    q = db.query(AttendanceRegularization).filter(
        AttendanceRegularization.client_id == client_id,
        AttendanceRegularization.is_deleted.is_(False),
    )
    if status:
        q = q.filter(AttendanceRegularization.status == status)
    if employee_id:
        q = q.filter(AttendanceRegularization.employee_id == employee_id)
    total = q.count()
    items = q.order_by(AttendanceRegularization.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items}


def update_regularization(db: Session, obj: AttendanceRegularization, data: Dict) -> AttendanceRegularization:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


# ── Overtime ──────────────────────────────────────────────────────────────────

def create_overtime(db: Session, data: Dict) -> AttendanceOvertime:
    obj = AttendanceOvertime(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_overtime(db: Session, ot_id: str, client_id: str) -> Optional[AttendanceOvertime]:
    return db.query(AttendanceOvertime).filter(
        AttendanceOvertime.id == ot_id,
        AttendanceOvertime.client_id == client_id,
        AttendanceOvertime.is_deleted.is_(False),
    ).first()


def list_overtime(db: Session, client_id: str, *, employee_id: str = "",
                  approval_status: str = "", page: int = 1, page_size: int = 30) -> Dict:
    q = db.query(AttendanceOvertime).filter(
        AttendanceOvertime.client_id == client_id,
        AttendanceOvertime.is_deleted.is_(False),
    )
    if employee_id:
        q = q.filter(AttendanceOvertime.employee_id == employee_id)
    if approval_status:
        q = q.filter(AttendanceOvertime.approval_status == approval_status)
    total = q.count()
    items = q.order_by(AttendanceOvertime.attendance_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items}


def update_overtime(db: Session, obj: AttendanceOvertime, data: Dict) -> AttendanceOvertime:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


# ── Policies ──────────────────────────────────────────────────────────────────

def create_policy(db: Session, data: Dict) -> AttendancePolicy:
    obj = AttendancePolicy(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_policy(db: Session, policy_id: str, client_id: str) -> Optional[AttendancePolicy]:
    return db.query(AttendancePolicy).filter(
        AttendancePolicy.id == policy_id,
        AttendancePolicy.client_id == client_id,
        AttendancePolicy.is_deleted.is_(False),
    ).first()


def list_policies(db: Session, client_id: str) -> List[AttendancePolicy]:
    return db.query(AttendancePolicy).filter(
        AttendancePolicy.client_id == client_id,
        AttendancePolicy.is_deleted.is_(False),
    ).order_by(AttendancePolicy.policy_name).all()


def update_policy(db: Session, obj: AttendancePolicy, data: Dict) -> AttendancePolicy:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


def delete_policy(db: Session, obj: AttendancePolicy):
    obj.is_deleted = True
    obj.deleted_at = _now()
    db.flush()


# ── Devices ───────────────────────────────────────────────────────────────────

def create_device(db: Session, data: Dict) -> AttendanceDevice:
    obj = AttendanceDevice(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def get_device(db: Session, device_id: str, client_id: str) -> Optional[AttendanceDevice]:
    return db.query(AttendanceDevice).filter(
        AttendanceDevice.id == device_id,
        AttendanceDevice.client_id == client_id,
        AttendanceDevice.is_deleted.is_(False),
    ).first()


def list_devices(db: Session, client_id: str) -> List[AttendanceDevice]:
    return db.query(AttendanceDevice).filter(
        AttendanceDevice.client_id == client_id,
        AttendanceDevice.is_deleted.is_(False),
    ).order_by(AttendanceDevice.device_name).all()


def update_device(db: Session, obj: AttendanceDevice, data: Dict) -> AttendanceDevice:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    db.flush()
    return obj


def delete_device(db: Session, obj: AttendanceDevice):
    obj.is_deleted = True
    obj.deleted_at = _now()
    db.flush()


def create_sync_log(db: Session, data: Dict) -> AttendanceSyncLog:
    obj = AttendanceSyncLog(id=_uuid(), **data)
    db.add(obj)
    db.flush()
    return obj


def list_sync_logs(db: Session, client_id: str, device_id: str,
                   limit: int = 20) -> List[AttendanceSyncLog]:
    return db.query(AttendanceSyncLog).filter(
        AttendanceSyncLog.client_id == client_id,
        AttendanceSyncLog.device_id == device_id,
    ).order_by(AttendanceSyncLog.created_at.desc()).limit(limit).all()


# ── Activities ────────────────────────────────────────────────────────────────

def log_activity(db: Session, client_id: str, entity_type: str, entity_id: str,
                 action: str, actor: str = "", employee_id: str = "",
                 old_value: str = "", new_value: str = "", notes: str = "") -> AttendanceActivity:
    obj = AttendanceActivity(
        id=_uuid(), client_id=client_id, entity_type=entity_type,
        entity_id=entity_id, employee_id=employee_id or None,
        action=action, actor=actor or None,
        old_value=old_value or None, new_value=new_value or None,
        notes=notes or None,
    )
    db.add(obj)
    db.flush()
    return obj


def list_activities(db: Session, client_id: str, entity_id: str = "",
                    entity_type: str = "", limit: int = 50) -> List[AttendanceActivity]:
    q = db.query(AttendanceActivity).filter(
        AttendanceActivity.client_id == client_id,
    )
    if entity_id:
        q = q.filter(AttendanceActivity.entity_id == entity_id)
    if entity_type:
        q = q.filter(AttendanceActivity.entity_type == entity_type)
    return q.order_by(AttendanceActivity.created_at.desc()).limit(limit).all()


# ── Dashboard aggregates ──────────────────────────────────────────────────────

def count_records_by_status(db: Session, client_id: str, for_date: date) -> Dict:
    rows = db.query(
        AttendanceRecord.status,
        func.count(AttendanceRecord.id).label("cnt"),
    ).filter(
        AttendanceRecord.client_id == client_id,
        AttendanceRecord.attendance_date == for_date,
        AttendanceRecord.is_deleted.is_(False),
    ).group_by(AttendanceRecord.status).all()
    return {r.status: r.cnt for r in rows}


def count_pending_regularizations(db: Session, client_id: str) -> int:
    return db.query(func.count(AttendanceRegularization.id)).filter(
        AttendanceRegularization.client_id == client_id,
        AttendanceRegularization.status == "Pending",
        AttendanceRegularization.is_deleted.is_(False),
    ).scalar() or 0


def count_pending_overtime(db: Session, client_id: str) -> int:
    return db.query(func.count(AttendanceOvertime.id)).filter(
        AttendanceOvertime.client_id == client_id,
        AttendanceOvertime.approval_status == "Pending",
        AttendanceOvertime.is_deleted.is_(False),
    ).scalar() or 0


def get_calendar_records(db: Session, client_id: str, employee_id: str,
                          from_date: date, to_date: date) -> List[AttendanceRecord]:
    return db.query(AttendanceRecord).filter(
        AttendanceRecord.client_id == client_id,
        AttendanceRecord.employee_id == employee_id,
        AttendanceRecord.attendance_date >= from_date,
        AttendanceRecord.attendance_date <= to_date,
        AttendanceRecord.is_deleted.is_(False),
    ).order_by(AttendanceRecord.attendance_date).all()
