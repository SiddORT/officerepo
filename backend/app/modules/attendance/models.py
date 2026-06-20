"""Attendance Management models — stored in the CLIENT database (ClientBase).

Tables:
  attendance_shifts             — shift definitions
  attendance_shift_assignments  — employee / dept / branch shift mapping
  attendance_records            — daily check-in/check-out records
  attendance_regularizations    — correction requests
  attendance_overtime           — overtime records
  attendance_policies           — attendance rules per org unit
  attendance_devices            — biometric device registry (future)
  attendance_sync_logs          — biometric sync audit logs (future)
  attendance_activities         — module-wide activity/audit trail
  employee_work_schedules       — hybrid/WFH per-weekday schedule per employee
"""
from __future__ import annotations

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, String, Text, Time, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Shift ─────────────────────────────────────────────────────────────────────

class AttendanceShift(ClientBase):
    __tablename__ = "attendance_shifts"

    id             = Column(String(36),  primary_key=True, default=_uuid)
    client_id      = Column(String(36),  nullable=False, index=True)
    shift_name     = Column(String(100), nullable=False)
    shift_code     = Column(String(30),  nullable=False)
    shift_type     = Column(String(30),  nullable=False, default="General")
    company_id     = Column(String(36),  nullable=True)
    company_name   = Column(String(200), nullable=True)
    branch_id      = Column(String(36),  nullable=True)
    branch_name    = Column(String(200), nullable=True)
    start_time     = Column(Time,        nullable=False)
    end_time       = Column(Time,        nullable=False)
    is_cross_day   = Column(Boolean,     nullable=False, default=False)
    break_duration_mins  = Column(Integer, nullable=True, default=0)
    grace_period_mins    = Column(Integer, nullable=True, default=15)
    min_working_hours    = Column(Float,   nullable=True, default=8.0)
    description    = Column(Text,        nullable=True)
    is_active      = Column(Boolean,     nullable=False, default=True)
    is_deleted     = Column(Boolean,     nullable=False, default=False)
    deleted_at     = Column(DateTime,    nullable=True)
    created_at     = Column(DateTime,    nullable=False, default=_now)
    updated_at     = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by     = Column(String(200), nullable=True)

    assignments = relationship("AttendanceShiftAssignment", back_populates="shift",
                               primaryjoin="and_(AttendanceShift.id==AttendanceShiftAssignment.shift_id, "
                                           "AttendanceShiftAssignment.is_deleted==False)",
                               lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("client_id", "shift_code", name="uq_shift_code_client"),
    )


# ── Shift Assignment ──────────────────────────────────────────────────────────

class AttendanceShiftAssignment(ClientBase):
    __tablename__ = "attendance_shift_assignments"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    shift_id        = Column(String(36),  ForeignKey("attendance_shifts.id"), nullable=False)
    scope           = Column(String(20),  nullable=False)
    scope_id        = Column(String(36),  nullable=True)
    scope_name      = Column(String(200), nullable=True)
    employee_id     = Column(String(36),  nullable=True, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)
    effective_from  = Column(Date,        nullable=False)
    effective_to    = Column(Date,        nullable=True)
    notes           = Column(Text,        nullable=True)
    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    deleted_at      = Column(DateTime,    nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by      = Column(String(200), nullable=True)

    shift = relationship("AttendanceShift", back_populates="assignments",
                         foreign_keys=[shift_id])


# ── Attendance Record ─────────────────────────────────────────────────────────

class AttendanceRecord(ClientBase):
    __tablename__ = "attendance_records"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    employee_id      = Column(String(36),  nullable=False, index=True)
    employee_name    = Column(String(200), nullable=True)
    employee_code    = Column(String(50),  nullable=True)
    department_id    = Column(String(36),  nullable=True)
    department_name  = Column(String(200), nullable=True)
    branch_id        = Column(String(36),  nullable=True)
    branch_name      = Column(String(200), nullable=True)
    shift_id         = Column(String(36),  nullable=True)
    shift_name       = Column(String(100), nullable=True)
    attendance_date  = Column(Date,        nullable=False, index=True)
    check_in_time    = Column(DateTime,    nullable=True)
    check_out_time   = Column(DateTime,    nullable=True)
    source           = Column(String(50),  nullable=True, default="Manual Entry")
    work_mode        = Column(String(30),  nullable=True)
    # WFH: distinct from work_mode — the actual location used for THIS day
    location_type    = Column(String(30),  nullable=True)   # Office/Work From Home/Client Site/Remote
    work_mode_snapshot = Column(String(30), nullable=True)  # employee work_mode at time of check-in
    device_info      = Column(Text,        nullable=True)   # JSON: browser/device context
    status           = Column(String(30),  nullable=False, default="Present")
    # Computed fields
    total_hours      = Column(Float,       nullable=True)
    break_hours      = Column(Float,       nullable=True, default=0.0)
    productive_hours = Column(Float,       nullable=True)
    overtime_hours   = Column(Float,       nullable=True, default=0.0)
    # Geolocation
    checkin_latitude   = Column(Float,     nullable=True)
    checkin_longitude  = Column(Float,     nullable=True)
    checkin_ip         = Column(String(45),nullable=True)
    checkout_latitude  = Column(Float,     nullable=True)
    checkout_longitude = Column(Float,     nullable=True)
    checkout_ip        = Column(String(45),nullable=True)
    # Admin
    notes            = Column(Text,        nullable=True)
    is_regularized   = Column(Boolean,     nullable=False, default=False)
    is_deleted       = Column(Boolean,     nullable=False, default=False)
    deleted_at       = Column(DateTime,    nullable=True)
    created_at       = Column(DateTime,    nullable=False, default=_now)
    updated_at       = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by       = Column(String(200), nullable=True)

    regularizations = relationship("AttendanceRegularization",
                                   foreign_keys="AttendanceRegularization.record_id",
                                   back_populates="record", lazy="dynamic")

    __table_args__ = (
        UniqueConstraint("client_id", "employee_id", "attendance_date",
                         name="uq_attendance_employee_date"),
    )


# ── Regularization ────────────────────────────────────────────────────────────

class AttendanceRegularization(ClientBase):
    __tablename__ = "attendance_regularizations"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    record_id           = Column(String(36),  ForeignKey("attendance_records.id"), nullable=True)
    employee_id         = Column(String(36),  nullable=False, index=True)
    employee_name       = Column(String(200), nullable=True)
    employee_code       = Column(String(50),  nullable=True)
    attendance_date     = Column(Date,        nullable=False)
    requested_checkin   = Column(DateTime,    nullable=True)
    requested_checkout  = Column(DateTime,    nullable=True)
    reason              = Column(Text,        nullable=False)
    attachment_key      = Column(String(500), nullable=True)
    status              = Column(String(20),  nullable=False, default="Pending")
    reviewed_by         = Column(String(200), nullable=True)
    reviewed_at         = Column(DateTime,    nullable=True)
    review_notes        = Column(Text,        nullable=True)
    is_deleted          = Column(Boolean,     nullable=False, default=False)
    deleted_at          = Column(DateTime,    nullable=True)
    created_at          = Column(DateTime,    nullable=False, default=_now)
    updated_at          = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by          = Column(String(200), nullable=True)

    record = relationship("AttendanceRecord", back_populates="regularizations",
                          foreign_keys=[record_id])


# ── Overtime ──────────────────────────────────────────────────────────────────

class AttendanceOvertime(ClientBase):
    __tablename__ = "attendance_overtime"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    record_id        = Column(String(36),  ForeignKey("attendance_records.id"), nullable=True)
    employee_id      = Column(String(36),  nullable=False, index=True)
    employee_name    = Column(String(200), nullable=True)
    employee_code    = Column(String(50),  nullable=True)
    attendance_date  = Column(Date,        nullable=False)
    overtime_hours   = Column(Float,       nullable=False)
    overtime_type    = Column(String(20),  nullable=False, default="Weekday")
    approval_status  = Column(String(20),  nullable=False, default="Pending")
    approved_by      = Column(String(200), nullable=True)
    approved_at      = Column(DateTime,    nullable=True)
    notes            = Column(Text,        nullable=True)
    is_deleted       = Column(Boolean,     nullable=False, default=False)
    deleted_at       = Column(DateTime,    nullable=True)
    created_at       = Column(DateTime,    nullable=False, default=_now)
    updated_at       = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by       = Column(String(200), nullable=True)


# ── Attendance Policy ─────────────────────────────────────────────────────────

class AttendancePolicy(ClientBase):
    __tablename__ = "attendance_policies"

    id                   = Column(String(36),  primary_key=True, default=_uuid)
    client_id            = Column(String(36),  nullable=False, index=True)
    policy_name          = Column(String(200), nullable=False)
    scope                = Column(String(20),  nullable=True)
    scope_id             = Column(String(36),  nullable=True)
    scope_name           = Column(String(200), nullable=True)
    grace_period_mins    = Column(Integer,     nullable=True, default=15)
    min_working_hours    = Column(Float,       nullable=True, default=8.0)
    half_day_hours       = Column(Float,       nullable=True, default=4.0)
    late_mark_after_mins = Column(Integer,     nullable=True, default=30)
    ot_threshold_hours   = Column(Float,       nullable=True, default=9.0)
    allow_regularization = Column(Boolean,     nullable=False, default=True)
    max_regularization_per_month = Column(Integer, nullable=True, default=3)
    work_days            = Column(String(100), nullable=True, default="Mon,Tue,Wed,Thu,Fri")
    # WFH policy fields
    wfh_allowed          = Column(Boolean,     nullable=False, default=True)
    max_wfh_days_per_month = Column(Integer,   nullable=True, default=10)
    require_wfh_approval = Column(Boolean,     nullable=False, default=False)
    allow_hybrid_override = Column(Boolean,    nullable=False, default=True)
    description          = Column(Text,        nullable=True)
    is_active            = Column(Boolean,     nullable=False, default=True)
    is_deleted           = Column(Boolean,     nullable=False, default=False)
    deleted_at           = Column(DateTime,    nullable=True)
    created_at           = Column(DateTime,    nullable=False, default=_now)
    updated_at           = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by           = Column(String(200), nullable=True)


# ── Employee Work Schedule (Hybrid/WFH per-weekday) ──────────────────────────

class EmployeeWorkSchedule(ClientBase):
    """Per-weekday expected location for a specific employee.
    Used by hybrid employees to define which days are office vs WFH.
    """
    __tablename__ = "employee_work_schedules"

    id                    = Column(String(36),  primary_key=True, default=_uuid)
    client_id             = Column(String(36),  nullable=False, index=True)
    employee_id           = Column(String(36),  nullable=False, index=True)
    employee_name         = Column(String(200), nullable=True)
    employee_code         = Column(String(50),  nullable=True)
    weekday               = Column(String(20),  nullable=False)  # Monday..Sunday
    expected_location_type = Column(String(30), nullable=False)  # Office/Work From Home/etc.
    notes                 = Column(Text,        nullable=True)
    created_at            = Column(DateTime,    nullable=False, default=_now)
    updated_at            = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by            = Column(String(200), nullable=True)

    __table_args__ = (
        UniqueConstraint("client_id", "employee_id", "weekday",
                         name="uq_emp_schedule_weekday"),
    )


# ── Biometric Device Registry (Future) ────────────────────────────────────────

class AttendanceDevice(ClientBase):
    __tablename__ = "attendance_devices"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    device_name     = Column(String(200), nullable=False)
    vendor          = Column(String(50),  nullable=False)
    device_identifier = Column(String(200), nullable=True)
    branch_id       = Column(String(36),  nullable=True)
    branch_name     = Column(String(200), nullable=True)
    ip_address      = Column(String(45),  nullable=True)
    sync_method     = Column(String(50),  nullable=True)
    sync_frequency_mins = Column(Integer, nullable=True, default=60)
    last_sync_at    = Column(DateTime,    nullable=True)
    status          = Column(String(20),  nullable=False, default="Active")
    notes           = Column(Text,        nullable=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    deleted_at      = Column(DateTime,    nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)
    created_by      = Column(String(200), nullable=True)

    sync_logs = relationship("AttendanceSyncLog", back_populates="device",
                             primaryjoin="AttendanceDevice.id==AttendanceSyncLog.device_id",
                             lazy="dynamic")


# ── Sync Log (Future) ─────────────────────────────────────────────────────────

class AttendanceSyncLog(ClientBase):
    __tablename__ = "attendance_sync_logs"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    device_id       = Column(String(36),  ForeignKey("attendance_devices.id"), nullable=False)
    triggered_by    = Column(String(200), nullable=True)
    status          = Column(String(20),  nullable=False, default="Success")
    records_fetched = Column(Integer,     nullable=True, default=0)
    records_saved   = Column(Integer,     nullable=True, default=0)
    error_message   = Column(Text,        nullable=True)
    started_at      = Column(DateTime,    nullable=False, default=_now)
    finished_at     = Column(DateTime,    nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)

    device = relationship("AttendanceDevice", back_populates="sync_logs",
                          foreign_keys=[device_id])


# ── Activity Log ──────────────────────────────────────────────────────────────

class AttendanceActivity(ClientBase):
    __tablename__ = "attendance_activities"

    id           = Column(String(36),  primary_key=True, default=_uuid)
    client_id    = Column(String(36),  nullable=False, index=True)
    entity_type  = Column(String(30),  nullable=True)
    entity_id    = Column(String(36),  nullable=True, index=True)
    employee_id  = Column(String(36),  nullable=True, index=True)
    action       = Column(String(100), nullable=False)
    actor        = Column(String(200), nullable=True)
    old_value    = Column(Text,        nullable=True)
    new_value    = Column(Text,        nullable=True)
    notes        = Column(Text,        nullable=True)
    created_at   = Column(DateTime,    nullable=False, default=_now)
