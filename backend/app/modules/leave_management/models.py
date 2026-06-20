"""Leave Management — SQLAlchemy models (client DB, ClientBase)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, Index,
)

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Leave Types ────────────────────────────────────────────────────────────────

class LeaveType(ClientBase):
    __tablename__ = "leave_types"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    leave_code      = Column(String(20),  nullable=False)
    leave_name      = Column(String(100), nullable=False)
    description     = Column(Text,        nullable=True)
    color_code      = Column(String(10),  nullable=True, default="#3B82F6")

    is_paid             = Column(Boolean, nullable=False, default=True)
    requires_approval   = Column(Boolean, nullable=False, default=True)
    requires_documents  = Column(Boolean, nullable=False, default=False)
    allow_half_day      = Column(Boolean, nullable=False, default=True)
    allow_negative_balance = Column(Boolean, nullable=False, default=False)
    encashment_allowed  = Column(Boolean, nullable=False, default=False)
    carry_forward_allowed = Column(Boolean, nullable=False, default=False)

    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("client_id", "leave_code", name="uq_leave_type_code"),
        Index("ix_leave_types_client", "client_id"),
    )


# ── Leave Policies ─────────────────────────────────────────────────────────────

class LeavePolicy(ClientBase):
    __tablename__ = "leave_policies"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)

    policy_name     = Column(String(150), nullable=False)
    description     = Column(Text,        nullable=True)
    scope           = Column(String(50),  nullable=False, default="Global")
    scope_id        = Column(String(36),  nullable=True)
    scope_name      = Column(String(150), nullable=True)
    employee_category = Column(String(50), nullable=True)

    effective_from  = Column(Date,        nullable=True)
    effective_to    = Column(Date,        nullable=True)

    # Workflow
    approval_levels = Column(Integer,     nullable=False, default=1)

    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_leave_policies_client", "client_id"),)


# ── Leave Policy Rules (leave type allocation rules within a policy) ───────────

class LeavePolicyRule(ClientBase):
    """Maps a leave type to a policy with allocation rules."""
    __tablename__ = "leave_policy_rules"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    policy_id       = Column(String(36),  nullable=False, index=True)
    leave_type_id   = Column(String(36),  nullable=False, index=True)

    allocation_type         = Column(String(30),  nullable=False, default="Fixed")
    days_per_year           = Column(Float,       nullable=True)    # Fixed allocation
    accrual_frequency       = Column(String(30),  nullable=True)    # Monthly / Quarterly / Yearly
    accrual_days            = Column(Float,       nullable=True)    # Days per accrual period

    max_balance             = Column(Float,       nullable=True)
    max_consecutive_days    = Column(Integer,     nullable=True)
    min_notice_period_days  = Column(Integer,     nullable=True, default=0)
    max_applications_per_month = Column(Integer,  nullable=True)
    carry_forward_max_days  = Column(Float,       nullable=True)
    carry_forward_expiry_month = Column(Integer,  nullable=True)   # e.g. 3 = March
    carry_forward_expiry_day   = Column(Integer,  nullable=True)   # e.g. 31

    probation_restricted    = Column(Boolean,     nullable=False, default=False)
    is_active               = Column(Boolean,     nullable=False, default=True)

    created_at  = Column(DateTime, nullable=False, default=_now)
    updated_at  = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("policy_id", "leave_type_id", name="uq_policy_leave_type"),
        Index("ix_leave_policy_rules_policy", "policy_id"),
    )


# ── Holiday Calendars ──────────────────────────────────────────────────────────

class HolidayCalendar(ClientBase):
    __tablename__ = "holiday_calendars"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)

    calendar_name   = Column(String(150), nullable=False)
    country         = Column(String(100), nullable=True)
    state           = Column(String(100), nullable=True)
    description     = Column(Text,        nullable=True)

    # Scope assignment
    scope       = Column(String(50),  nullable=True)
    scope_id    = Column(String(36),  nullable=True)
    scope_name  = Column(String(150), nullable=True)

    year        = Column(Integer,     nullable=True)
    is_active   = Column(Boolean,     nullable=False, default=True)
    is_deleted  = Column(Boolean,     nullable=False, default=False)
    created_by  = Column(String(100), nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=_now)
    updated_at  = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_holiday_calendars_client", "client_id"),)


class Holiday(ClientBase):
    __tablename__ = "holidays"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    calendar_id     = Column(String(36),  nullable=False, index=True)

    holiday_name    = Column(String(150), nullable=False)
    holiday_date    = Column(Date,        nullable=False)
    holiday_type    = Column(String(30),  nullable=False, default="Company Holiday")
    description     = Column(Text,        nullable=True)
    is_recurring    = Column(Boolean,     nullable=False, default=False)

    created_at  = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        Index("ix_holidays_calendar", "calendar_id"),
        Index("ix_holidays_date", "holiday_date"),
    )


# ── Weekly Off Rules ───────────────────────────────────────────────────────────

class WeeklyOffRule(ClientBase):
    __tablename__ = "weekly_off_rules"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)

    rule_name       = Column(String(150), nullable=False)
    pattern         = Column(String(50),  nullable=False)   # Sunday Only / Sat+Sun / etc.
    off_days        = Column(String(50),  nullable=True)    # CSV of weekday numbers (0=Mon)
    scope           = Column(String(50),  nullable=True)
    scope_id        = Column(String(36),  nullable=True)
    scope_name      = Column(String(150), nullable=True)

    is_active   = Column(Boolean,  nullable=False, default=True)
    created_by  = Column(String(100), nullable=True)
    created_at  = Column(DateTime, nullable=False, default=_now)
    updated_at  = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_weekly_off_rules_client", "client_id"),)


# ── Leave Balances ─────────────────────────────────────────────────────────────

class LeaveBalance(ClientBase):
    __tablename__ = "leave_balances"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)
    leave_type_id   = Column(String(36),  nullable=False, index=True)
    leave_type_code = Column(String(20),  nullable=True)
    leave_type_name = Column(String(100), nullable=True)
    year            = Column(Integer,     nullable=False)

    opening_balance     = Column(Float, nullable=False, default=0.0)
    earned              = Column(Float, nullable=False, default=0.0)
    used                = Column(Float, nullable=False, default=0.0)
    encashed            = Column(Float, nullable=False, default=0.0)
    carried_forward     = Column(Float, nullable=False, default=0.0)
    lapsed              = Column(Float, nullable=False, default=0.0)
    adjusted            = Column(Float, nullable=False, default=0.0)

    created_at  = Column(DateTime, nullable=False, default=_now)
    updated_at  = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("client_id", "employee_id", "leave_type_id", "year",
                         name="uq_leave_balance"),
        Index("ix_leave_balances_emp", "employee_id"),
    )

    @property
    def available_balance(self) -> float:
        return round(
            self.opening_balance + self.earned + self.carried_forward
            + self.adjusted - self.used - self.encashed, 2
        )


# ── Leave Requests ─────────────────────────────────────────────────────────────

class LeaveRequest(ClientBase):
    __tablename__ = "leave_requests"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    request_number  = Column(String(30),  nullable=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)
    department_id   = Column(String(36),  nullable=True)
    department_name = Column(String(100), nullable=True)
    branch_id       = Column(String(36),  nullable=True)
    branch_name     = Column(String(100), nullable=True)

    leave_type_id   = Column(String(36),  nullable=False, index=True)
    leave_type_code = Column(String(20),  nullable=True)
    leave_type_name = Column(String(100), nullable=True)

    start_date      = Column(Date,        nullable=False)
    end_date        = Column(Date,        nullable=False)
    is_half_day     = Column(Boolean,     nullable=False, default=False)
    half_day_option = Column(String(20),  nullable=True)   # First Half / Second Half
    leave_days      = Column(Float,       nullable=False, default=1.0)

    reason          = Column(Text,        nullable=True)
    attachment_key  = Column(String(500), nullable=True)
    attachment_name = Column(String(255), nullable=True)

    status          = Column(String(30),  nullable=False, default="Draft", index=True)
    applied_at      = Column(DateTime,    nullable=True)
    approved_at     = Column(DateTime,    nullable=True)
    rejected_at     = Column(DateTime,    nullable=True)
    cancelled_at    = Column(DateTime,    nullable=True)
    cancel_reason   = Column(Text,        nullable=True)

    current_approver_level = Column(Integer, nullable=True)
    total_approval_levels  = Column(Integer, nullable=True, default=1)

    payroll_synced  = Column(Boolean,     nullable=False, default=False)
    attendance_synced = Column(Boolean,   nullable=False, default=False)

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_leave_requests_emp_date", "employee_id", "start_date"),
        Index("ix_leave_requests_status", "status"),
    )


# ── Leave Approvals ────────────────────────────────────────────────────────────

class LeaveApproval(ClientBase):
    __tablename__ = "leave_approvals"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    request_id      = Column(String(36),  nullable=False, index=True)

    level           = Column(Integer,     nullable=False, default=1)
    approver_role   = Column(String(50),  nullable=True)
    approver_id     = Column(String(100), nullable=True)
    approver_name   = Column(String(200), nullable=True)

    status          = Column(String(30),  nullable=False, default="Pending")
    comments        = Column(Text,        nullable=True)
    acted_at        = Column(DateTime,    nullable=True)

    created_at      = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (Index("ix_leave_approvals_request", "request_id"),)


# ── Comp Off ───────────────────────────────────────────────────────────────────

class CompOff(ClientBase):
    __tablename__ = "comp_offs"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)

    worked_date     = Column(Date,        nullable=False)
    source          = Column(String(50),  nullable=False, default="Weekend Work")
    reason          = Column(Text,        nullable=True)

    days_earned     = Column(Float,       nullable=False, default=1.0)
    days_used       = Column(Float,       nullable=False, default=0.0)
    expiry_date     = Column(Date,        nullable=True)

    status          = Column(String(30),  nullable=False, default="Pending")
    approved_by     = Column(String(200), nullable=True)
    approved_at     = Column(DateTime,    nullable=True)
    rejection_reason = Column(Text,       nullable=True)

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_comp_offs_emp", "employee_id"),)


# ── Leave Encashments ──────────────────────────────────────────────────────────

class LeaveEncashment(ClientBase):
    __tablename__ = "leave_encashments"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)

    leave_type_id   = Column(String(36),  nullable=False)
    leave_type_name = Column(String(100), nullable=True)

    encashment_date = Column(Date,        nullable=False)
    days_encashed   = Column(Float,       nullable=False)
    amount          = Column(Float,       nullable=True)

    status          = Column(String(30),  nullable=False, default="Pending")
    processed_by    = Column(String(200), nullable=True)
    processed_at    = Column(DateTime,    nullable=True)
    notes           = Column(Text,        nullable=True)

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_leave_encashments_emp", "employee_id"),)


# ── Leave Activities (audit trail) ─────────────────────────────────────────────

class LeaveActivity(ClientBase):
    __tablename__ = "leave_activities"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)
    entity_type = Column(String(50),  nullable=False)
    entity_id   = Column(String(36),  nullable=False, index=True)
    employee_id = Column(String(36),  nullable=True)
    action      = Column(String(100), nullable=False)
    actor       = Column(String(200), nullable=True)
    old_value   = Column(Text,        nullable=True)
    new_value   = Column(Text,        nullable=True)
    notes       = Column(Text,        nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=_now)

    __table_args__ = (Index("ix_leave_activities_entity", "entity_type", "entity_id"),)
