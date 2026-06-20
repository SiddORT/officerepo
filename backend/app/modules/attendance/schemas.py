"""Pydantic schemas for the Attendance Management module."""
from __future__ import annotations

from datetime import date, datetime, time
from typing import List, Optional
from pydantic import BaseModel, field_validator


# ── Shift ─────────────────────────────────────────────────────────────────────

class ShiftCreate(BaseModel):
    shift_name:          str
    shift_code:          str
    shift_type:          Optional[str] = "General"
    company_id:          Optional[str] = None
    company_name:        Optional[str] = None
    branch_id:           Optional[str] = None
    branch_name:         Optional[str] = None
    start_time:          str   # "HH:MM"
    end_time:            str   # "HH:MM"
    is_cross_day:        Optional[bool] = False
    break_duration_mins: Optional[int] = 0
    grace_period_mins:   Optional[int] = 15
    min_working_hours:   Optional[float] = 8.0
    description:         Optional[str] = None


class ShiftUpdate(BaseModel):
    shift_name:          Optional[str] = None
    shift_type:          Optional[str] = None
    branch_id:           Optional[str] = None
    branch_name:         Optional[str] = None
    start_time:          Optional[str] = None
    end_time:            Optional[str] = None
    is_cross_day:        Optional[bool] = None
    break_duration_mins: Optional[int] = None
    grace_period_mins:   Optional[int] = None
    min_working_hours:   Optional[float] = None
    description:         Optional[str] = None
    is_active:           Optional[bool] = None


# ── Shift Assignment ──────────────────────────────────────────────────────────

class ShiftAssignCreate(BaseModel):
    shift_id:       str
    scope:          str   # Employee / Department / Branch / Company
    scope_id:       Optional[str] = None
    scope_name:     Optional[str] = None
    employee_id:    Optional[str] = None
    employee_name:  Optional[str] = None
    employee_code:  Optional[str] = None
    effective_from: date
    effective_to:   Optional[date] = None
    notes:          Optional[str] = None


class ShiftAssignUpdate(BaseModel):
    effective_to: Optional[date] = None
    notes:        Optional[str] = None
    is_active:    Optional[bool] = None


# ── Attendance Record ─────────────────────────────────────────────────────────

class AttendanceCreate(BaseModel):
    employee_id:      str
    employee_name:    Optional[str] = None
    employee_code:    Optional[str] = None
    department_id:    Optional[str] = None
    department_name:  Optional[str] = None
    branch_id:        Optional[str] = None
    branch_name:      Optional[str] = None
    shift_id:         Optional[str] = None
    shift_name:       Optional[str] = None
    attendance_date:  date
    check_in_time:    Optional[datetime] = None
    check_out_time:   Optional[datetime] = None
    source:           Optional[str] = "Manual Entry"
    work_mode:        Optional[str] = None
    status:           Optional[str] = "Present"
    notes:            Optional[str] = None
    # Geo
    checkin_latitude:  Optional[float] = None
    checkin_longitude: Optional[float] = None
    checkin_ip:        Optional[str] = None


class CheckInRequest(BaseModel):
    employee_id:       str
    employee_name:     Optional[str] = None
    employee_code:     Optional[str] = None
    shift_id:          Optional[str] = None
    source:            Optional[str] = "Web Check-In"
    work_mode:         Optional[str] = None
    branch_id:         Optional[str] = None
    branch_name:       Optional[str] = None
    latitude:          Optional[float] = None
    longitude:         Optional[float] = None
    ip_address:        Optional[str] = None
    notes:             Optional[str] = None


class CheckOutRequest(BaseModel):
    record_id:         Optional[str] = None    # if known
    employee_id:       str
    source:            Optional[str] = "Web Check-In"
    latitude:          Optional[float] = None
    longitude:         Optional[float] = None
    ip_address:        Optional[str] = None
    notes:             Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in_time:   Optional[datetime] = None
    check_out_time:  Optional[datetime] = None
    status:          Optional[str] = None
    shift_id:        Optional[str] = None
    shift_name:      Optional[str] = None
    source:          Optional[str] = None
    work_mode:       Optional[str] = None
    notes:           Optional[str] = None


# ── Regularization ────────────────────────────────────────────────────────────

class RegularizationCreate(BaseModel):
    record_id:           Optional[str] = None
    employee_id:         str
    employee_name:       Optional[str] = None
    employee_code:       Optional[str] = None
    attendance_date:     date
    requested_checkin:   Optional[datetime] = None
    requested_checkout:  Optional[datetime] = None
    reason:              str


class RegularizationReview(BaseModel):
    status:        str    # Approved / Rejected
    review_notes:  Optional[str] = None


# ── Overtime ──────────────────────────────────────────────────────────────────

class OvertimeCreate(BaseModel):
    record_id:       Optional[str] = None
    employee_id:     str
    employee_name:   Optional[str] = None
    employee_code:   Optional[str] = None
    attendance_date: date
    overtime_hours:  float
    overtime_type:   Optional[str] = "Weekday"
    notes:           Optional[str] = None


class OvertimeReview(BaseModel):
    approval_status: str   # Approved / Rejected
    notes:           Optional[str] = None


# ── Policy ────────────────────────────────────────────────────────────────────

class PolicyCreate(BaseModel):
    policy_name:              str
    scope:                    Optional[str] = None
    scope_id:                 Optional[str] = None
    scope_name:               Optional[str] = None
    grace_period_mins:        Optional[int] = 15
    min_working_hours:        Optional[float] = 8.0
    half_day_hours:           Optional[float] = 4.0
    late_mark_after_mins:     Optional[int] = 30
    ot_threshold_hours:       Optional[float] = 9.0
    allow_regularization:     Optional[bool] = True
    max_regularization_per_month: Optional[int] = 3
    work_days:                Optional[str] = "Mon,Tue,Wed,Thu,Fri"
    description:              Optional[str] = None


class PolicyUpdate(BaseModel):
    policy_name:              Optional[str] = None
    grace_period_mins:        Optional[int] = None
    min_working_hours:        Optional[float] = None
    half_day_hours:           Optional[float] = None
    late_mark_after_mins:     Optional[int] = None
    ot_threshold_hours:       Optional[float] = None
    allow_regularization:     Optional[bool] = None
    max_regularization_per_month: Optional[int] = None
    work_days:                Optional[str] = None
    description:              Optional[str] = None
    is_active:                Optional[bool] = None


# ── Biometric Device ──────────────────────────────────────────────────────────

class DeviceCreate(BaseModel):
    device_name:         str
    vendor:              str
    device_identifier:   Optional[str] = None
    branch_id:           Optional[str] = None
    branch_name:         Optional[str] = None
    ip_address:          Optional[str] = None
    sync_method:         Optional[str] = None
    sync_frequency_mins: Optional[int] = 60
    notes:               Optional[str] = None


class DeviceUpdate(BaseModel):
    device_name:         Optional[str] = None
    ip_address:          Optional[str] = None
    sync_method:         Optional[str] = None
    sync_frequency_mins: Optional[int] = None
    status:              Optional[str] = None
    notes:               Optional[str] = None
