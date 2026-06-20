"""Payroll Management — SQLAlchemy models (client DB, ClientBase)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, Index,
    Integer, String, Text, UniqueConstraint,
)

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Salary Components ───────────────────────────────────────────────────────────

class SalaryComponent(ClientBase):
    """Configurable earning / deduction / employer-contribution component."""
    __tablename__ = "salary_components"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    component_code  = Column(String(30),  nullable=False)
    component_name  = Column(String(150), nullable=False)
    component_type  = Column(String(50),  nullable=False)   # Earning / Deduction / Employer Contribution
    calc_method     = Column(String(30),  nullable=False, default="Fixed")  # Fixed / Percentage / Formula
    default_value   = Column(Float,       nullable=True)    # amount or percentage
    formula         = Column(Text,        nullable=True)    # expression for Formula type
    description     = Column(Text,        nullable=True)

    is_taxable      = Column(Boolean,     nullable=False, default=True)
    is_pro_rata     = Column(Boolean,     nullable=False, default=True)
    is_system       = Column(Boolean,     nullable=False, default=False)  # seeded defaults
    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)

    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("client_id", "component_code", name="uq_salary_component_code"),
        Index("ix_salary_components_client", "client_id"),
    )


# ── Salary Structures ───────────────────────────────────────────────────────────

class SalaryStructure(ClientBase):
    """Reusable compensation template (e.g. Software Engineer Grade A)."""
    __tablename__ = "salary_structures"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    structure_name  = Column(String(150), nullable=False)
    description     = Column(Text,        nullable=True)
    currency        = Column(String(10),  nullable=False, default="INR")

    # Scope
    company_id      = Column(String(36),  nullable=True)
    company_name    = Column(String(150), nullable=True)

    effective_from  = Column(Date,        nullable=True)
    effective_to    = Column(Date,        nullable=True)

    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_salary_structures_client", "client_id"),)


# ── Salary Structure Components (M:M join with amounts) ─────────────────────────

class SalaryStructureComponent(ClientBase):
    """Links a component to a structure with overridden value/percentage."""
    __tablename__ = "salary_structure_components"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    structure_id    = Column(String(36),  nullable=False, index=True)
    component_id    = Column(String(36),  nullable=False, index=True)

    amount          = Column(Float,       nullable=True)    # override fixed amount
    percentage      = Column(Float,       nullable=True)    # override percentage
    formula         = Column(Text,        nullable=True)    # override formula

    display_order   = Column(Integer,     nullable=False, default=0)
    is_active       = Column(Boolean,     nullable=False, default=True)

    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("structure_id", "component_id", name="uq_structure_component"),
        Index("ix_struct_comp_structure", "structure_id"),
    )


# ── Employee Compensation ───────────────────────────────────────────────────────

class EmployeeCompensation(ClientBase):
    """Salary structure assignment for an employee (supports history/revisions)."""
    __tablename__ = "employee_compensations"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)
    department_name = Column(String(100), nullable=True)
    designation_name = Column(String(100), nullable=True)

    structure_id    = Column(String(36),  nullable=True)
    structure_name  = Column(String(150), nullable=True)

    ctc_annual      = Column(Float,       nullable=True)    # CTC per year
    gross_monthly   = Column(Float,       nullable=True)    # Monthly gross
    currency        = Column(String(10),  nullable=False, default="INR")

    effective_from  = Column(Date,        nullable=True)
    effective_to    = Column(Date,        nullable=True)
    status          = Column(String(30),  nullable=False, default="Active")  # Active / Revised / Inactive

    revision_reason = Column(Text,        nullable=True)
    previous_comp_id = Column(String(36), nullable=True)    # link to prior row on revision

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_emp_comp_employee", "employee_id"),
        Index("ix_emp_comp_client", "client_id"),
    )


# ── Payroll Cycles ──────────────────────────────────────────────────────────────

class PayrollCycle(ClientBase):
    """Defines when/how payroll is processed (Monthly / Bi-Weekly / Weekly)."""
    __tablename__ = "payroll_cycles"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    cycle_name      = Column(String(150), nullable=False)
    frequency       = Column(String(30),  nullable=False, default="Monthly")
    processing_day  = Column(Integer,     nullable=True)    # day-of-month for monthly
    salary_day      = Column(Integer,     nullable=True)    # day-of-month salary is credited
    cutoff_day      = Column(Integer,     nullable=True)    # attendance cutoff day

    # Scope
    company_id      = Column(String(36),  nullable=True)
    company_name    = Column(String(150), nullable=True)
    branch_id       = Column(String(36),  nullable=True)
    branch_name     = Column(String(150), nullable=True)

    description     = Column(Text,        nullable=True)
    is_default      = Column(Boolean,     nullable=False, default=False)
    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_payroll_cycles_client", "client_id"),)


# ── Payroll Runs ────────────────────────────────────────────────────────────────

class PayrollRun(ClientBase):
    """A single payroll processing run for a given period."""
    __tablename__ = "payroll_runs"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    run_number      = Column(String(30),  nullable=True)    # e.g. PAY-202506-001

    cycle_id        = Column(String(36),  nullable=True)
    cycle_name      = Column(String(150), nullable=True)
    frequency       = Column(String(30),  nullable=False, default="Monthly")

    period_month    = Column(Integer,     nullable=False)   # 1–12
    period_year     = Column(Integer,     nullable=False)
    period_label    = Column(String(30),  nullable=True)    # e.g. "June 2026"

    status          = Column(String(30),  nullable=False, default="Draft", index=True)

    total_employees = Column(Integer,     nullable=False, default=0)
    total_gross     = Column(Float,       nullable=False, default=0.0)
    total_deductions = Column(Float,      nullable=False, default=0.0)
    total_net       = Column(Float,       nullable=False, default=0.0)
    total_employer_contribution = Column(Float, nullable=False, default=0.0)

    processed_at    = Column(DateTime,    nullable=True)
    approved_at     = Column(DateTime,    nullable=True)
    locked_at       = Column(DateTime,    nullable=True)
    paid_at         = Column(DateTime,    nullable=True)

    processed_by    = Column(String(200), nullable=True)
    approved_by     = Column(String(200), nullable=True)
    locked_by       = Column(String(200), nullable=True)
    paid_by         = Column(String(200), nullable=True)
    notes           = Column(Text,        nullable=True)

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("client_id", "cycle_id", "period_month", "period_year",
                         name="uq_payroll_run_period"),
        Index("ix_payroll_runs_client", "client_id"),
        Index("ix_payroll_runs_period", "period_year", "period_month"),
    )


# ── Payroll Run Employees ───────────────────────────────────────────────────────

class PayrollRunEmployee(ClientBase):
    """Per-employee computed payroll amounts within a PayrollRun."""
    __tablename__ = "payroll_run_employees"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    run_id          = Column(String(36),  nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)
    department_name = Column(String(100), nullable=True)
    designation_name = Column(String(100), nullable=True)
    branch_name     = Column(String(100), nullable=True)

    compensation_id = Column(String(36),  nullable=True)
    structure_name  = Column(String(150), nullable=True)
    currency        = Column(String(10),  nullable=False, default="INR")

    # Attendance
    total_days      = Column(Integer,     nullable=False, default=0)
    present_days    = Column(Float,       nullable=False, default=0.0)
    paid_leave_days = Column(Float,       nullable=False, default=0.0)
    unpaid_leave_days = Column(Float,     nullable=False, default=0.0)
    overtime_hours  = Column(Float,       nullable=False, default=0.0)
    lop_days        = Column(Float,       nullable=False, default=0.0)   # Loss of Pay

    # Computed amounts (stored as JSON strings for component breakdown)
    earnings_breakdown   = Column(Text,   nullable=True)   # JSON: [{code, name, amount}]
    deductions_breakdown = Column(Text,   nullable=True)   # JSON: [{code, name, amount}]
    employer_breakdown   = Column(Text,   nullable=True)   # JSON: [{code, name, amount}]

    gross_salary    = Column(Float,       nullable=False, default=0.0)
    total_deductions = Column(Float,      nullable=False, default=0.0)
    reimbursements  = Column(Float,       nullable=False, default=0.0)
    loan_deductions = Column(Float,       nullable=False, default=0.0)
    net_salary      = Column(Float,       nullable=False, default=0.0)
    employer_contribution = Column(Float, nullable=False, default=0.0)

    status          = Column(String(30),  nullable=False, default="Pending")
    hold_reason     = Column(Text,        nullable=True)

    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("run_id", "employee_id", name="uq_run_employee"),
        Index("ix_run_employees_run", "run_id"),
        Index("ix_run_employees_emp", "employee_id"),
    )


# ── Payslips ────────────────────────────────────────────────────────────────────

class Payslip(ClientBase):
    """Generated payslip record for one employee in one payroll run."""
    __tablename__ = "payslips"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    run_id          = Column(String(36),  nullable=False, index=True)
    run_employee_id = Column(String(36),  nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(50),  nullable=True)

    period_month    = Column(Integer,     nullable=False)
    period_year     = Column(Integer,     nullable=False)
    period_label    = Column(String(30),  nullable=True)

    gross_salary    = Column(Float,       nullable=False, default=0.0)
    total_deductions = Column(Float,      nullable=False, default=0.0)
    net_salary      = Column(Float,       nullable=False, default=0.0)
    currency        = Column(String(10),  nullable=False, default="INR")

    slip_data       = Column(Text,        nullable=True)    # full JSON snapshot
    file_key        = Column(String(500), nullable=True)    # storage key for PDF

    status          = Column(String(30),  nullable=False, default="Generated")
    generated_at    = Column(DateTime,    nullable=True)
    sent_at         = Column(DateTime,    nullable=True)
    generated_by    = Column(String(200), nullable=True)

    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("run_id", "employee_id", name="uq_payslip_run_emp"),
        Index("ix_payslips_client", "client_id"),
        Index("ix_payslips_emp", "employee_id"),
    )


# ── Statutory Components ────────────────────────────────────────────────────────

class StatutoryComponent(ClientBase):
    """Configurable compliance / statutory deduction / contribution rules."""
    __tablename__ = "statutory_components"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)

    statutory_type  = Column(String(50),  nullable=False)   # PF / ESI / PT / TDS …
    component_name  = Column(String(150), nullable=False)
    description     = Column(Text,        nullable=True)

    employee_rate   = Column(Float,       nullable=True)    # %
    employer_rate   = Column(Float,       nullable=True)    # %
    fixed_amount    = Column(Float,       nullable=True)    # for fixed deductions (PT slabs etc.)
    ceiling_amount  = Column(Float,       nullable=True)    # e.g. PF ceiling ₹15000 basic
    is_percentage   = Column(Boolean,     nullable=False, default=True)

    effective_from  = Column(Date,        nullable=True)
    effective_to    = Column(Date,        nullable=True)

    applies_to      = Column(String(50),  nullable=True)    # All / Permanent / Contract …

    is_active       = Column(Boolean,     nullable=False, default=True)
    is_deleted      = Column(Boolean,     nullable=False, default=False)
    created_by      = Column(String(100), nullable=True)
    created_at      = Column(DateTime,    nullable=False, default=_now)
    updated_at      = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_statutory_client", "client_id"),)


# ── Payroll Activities (audit trail) ────────────────────────────────────────────

class PayrollActivity(ClientBase):
    __tablename__ = "payroll_activities"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)
    entity_type = Column(String(50),  nullable=False)
    entity_id   = Column(String(36),  nullable=False, index=True)
    action      = Column(String(100), nullable=False)
    actor       = Column(String(200), nullable=True)
    old_value   = Column(Text,        nullable=True)
    new_value   = Column(Text,        nullable=True)
    notes       = Column(Text,        nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=_now)

    __table_args__ = (Index("ix_payroll_act_entity", "entity_type", "entity_id"),)
