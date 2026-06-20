"""Leave Management — Pydantic schemas."""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, field_validator


# ── Leave Types ────────────────────────────────────────────────────────────────

class LeaveTypeCreate(BaseModel):
    leave_code:             str
    leave_name:             str
    description:            Optional[str]  = None
    color_code:             Optional[str]  = "#3B82F6"
    is_paid:                bool           = True
    requires_approval:      bool           = True
    requires_documents:     bool           = False
    allow_half_day:         bool           = True
    allow_negative_balance: bool           = False
    encashment_allowed:     bool           = False
    carry_forward_allowed:  bool           = False
    is_active:              bool           = True


class LeaveTypeUpdate(BaseModel):
    leave_name:             Optional[str]  = None
    description:            Optional[str]  = None
    color_code:             Optional[str]  = None
    is_paid:                Optional[bool] = None
    requires_approval:      Optional[bool] = None
    requires_documents:     Optional[bool] = None
    allow_half_day:         Optional[bool] = None
    allow_negative_balance: Optional[bool] = None
    encashment_allowed:     Optional[bool] = None
    carry_forward_allowed:  Optional[bool] = None
    is_active:              Optional[bool] = None


# ── Leave Policies ─────────────────────────────────────────────────────────────

class PolicyRuleIn(BaseModel):
    leave_type_id:              str
    allocation_type:            str             = "Fixed"
    days_per_year:              Optional[float] = None
    accrual_frequency:          Optional[str]   = None
    accrual_days:               Optional[float] = None
    max_balance:                Optional[float] = None
    max_consecutive_days:       Optional[int]   = None
    min_notice_period_days:     Optional[int]   = 0
    max_applications_per_month: Optional[int]   = None
    carry_forward_max_days:     Optional[float] = None
    carry_forward_expiry_month: Optional[int]   = None
    carry_forward_expiry_day:   Optional[int]   = None
    probation_restricted:       bool            = False
    is_active:                  bool            = True


class LeavePolicyCreate(BaseModel):
    policy_name:        str
    description:        Optional[str]        = None
    scope:              str                  = "Global"
    scope_id:           Optional[str]        = None
    scope_name:         Optional[str]        = None
    employee_category:  Optional[str]        = None
    effective_from:     Optional[date]       = None
    effective_to:       Optional[date]       = None
    approval_levels:    int                  = 1
    rules:              List[PolicyRuleIn]   = []


class LeavePolicyUpdate(BaseModel):
    policy_name:        Optional[str]        = None
    description:        Optional[str]        = None
    scope:              Optional[str]        = None
    scope_id:           Optional[str]        = None
    scope_name:         Optional[str]        = None
    employee_category:  Optional[str]        = None
    effective_from:     Optional[date]       = None
    effective_to:       Optional[date]       = None
    approval_levels:    Optional[int]        = None
    is_active:          Optional[bool]       = None
    rules:              Optional[List[PolicyRuleIn]] = None


# ── Holiday Calendars ──────────────────────────────────────────────────────────

class HolidayCalendarCreate(BaseModel):
    calendar_name:  str
    country:        Optional[str] = None
    state:          Optional[str] = None
    description:    Optional[str] = None
    scope:          Optional[str] = None
    scope_id:       Optional[str] = None
    scope_name:     Optional[str] = None
    year:           Optional[int] = None


class HolidayCalendarUpdate(BaseModel):
    calendar_name:  Optional[str] = None
    country:        Optional[str] = None
    state:          Optional[str] = None
    description:    Optional[str] = None
    scope:          Optional[str] = None
    scope_id:       Optional[str] = None
    scope_name:     Optional[str] = None
    year:           Optional[int] = None
    is_active:      Optional[bool] = None


class HolidayCreate(BaseModel):
    holiday_name:   str
    holiday_date:   date
    holiday_type:   str  = "Company Holiday"
    description:    Optional[str] = None
    is_recurring:   bool          = False


class HolidayUpdate(BaseModel):
    holiday_name:   Optional[str]  = None
    holiday_date:   Optional[date] = None
    holiday_type:   Optional[str]  = None
    description:    Optional[str]  = None
    is_recurring:   Optional[bool] = None


# ── Weekly Off Rules ───────────────────────────────────────────────────────────

class WeeklyOffCreate(BaseModel):
    rule_name:  str
    pattern:    str
    off_days:   Optional[str] = None
    scope:      Optional[str] = None
    scope_id:   Optional[str] = None
    scope_name: Optional[str] = None


class WeeklyOffUpdate(BaseModel):
    rule_name:  Optional[str]  = None
    pattern:    Optional[str]  = None
    off_days:   Optional[str]  = None
    scope:      Optional[str]  = None
    scope_id:   Optional[str]  = None
    scope_name: Optional[str]  = None
    is_active:  Optional[bool] = None


# ── Leave Balances ─────────────────────────────────────────────────────────────

class BalanceAdjust(BaseModel):
    employee_id:    str
    leave_type_id:  str
    year:           int
    adjustment:     float
    reason:         Optional[str] = None


class BalanceInitialize(BaseModel):
    employee_id:    str
    employee_name:  Optional[str]  = None
    employee_code:  Optional[str]  = None
    leave_type_id:  str
    year:           int
    opening_balance: float = 0.0


# ── Leave Requests ─────────────────────────────────────────────────────────────

class LeaveApplyRequest(BaseModel):
    employee_id:    str
    employee_name:  Optional[str] = None
    employee_code:  Optional[str] = None
    department_id:  Optional[str] = None
    department_name: Optional[str] = None
    branch_id:      Optional[str] = None
    branch_name:    Optional[str] = None
    leave_type_id:  str
    start_date:     date
    end_date:       date
    is_half_day:    bool          = False
    half_day_option: Optional[str] = None
    reason:         Optional[str] = None
    attachment_key: Optional[str] = None
    attachment_name: Optional[str] = None
    calendar_id:    Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_gte_start(cls, v, info):
        if "start_date" in info.data and v < info.data["start_date"]:
            raise ValueError("end_date must be >= start_date")
        return v


class LeaveReviewRequest(BaseModel):
    status:   str
    comments: Optional[str] = None


class LeaveCancelRequest(BaseModel):
    reason: Optional[str] = None


# ── Comp Off ───────────────────────────────────────────────────────────────────

class CompOffCreate(BaseModel):
    employee_id:    str
    employee_name:  Optional[str]  = None
    employee_code:  Optional[str]  = None
    worked_date:    date
    source:         str            = "Weekend Work"
    reason:         Optional[str]  = None
    days_earned:    float          = 1.0
    expiry_date:    Optional[date] = None


class CompOffReview(BaseModel):
    status:           str
    rejection_reason: Optional[str] = None


# ── Leave Encashments ──────────────────────────────────────────────────────────

class EncashmentCreate(BaseModel):
    employee_id:        str
    employee_name:      Optional[str]  = None
    employee_code:      Optional[str]  = None
    leave_type_id:      str
    encashment_date:    date
    days_encashed:      float
    amount:             Optional[float] = None
    notes:              Optional[str]   = None


class EncashmentReview(BaseModel):
    status: str
    notes:  Optional[str] = None
