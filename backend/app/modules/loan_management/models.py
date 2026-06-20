"""Employee Loan Management — SQLAlchemy models (client DB, ClientBase)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float,
    Index, Integer, String, Text, UniqueConstraint,
)

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Loan Types ───────────────────────────────────────────────────────────────────

class LoanType(ClientBase):
    """Configurable loan category (e.g. Salary Advance, Medical, Housing)."""
    __tablename__ = "loan_types"

    id                   = Column(String(36),  primary_key=True, default=_uuid)
    client_id            = Column(String(36),  nullable=False, index=True)

    loan_type_code       = Column(String(30),  nullable=False)
    loan_type_name       = Column(String(150), nullable=False)
    description          = Column(Text,        nullable=True)
    interest_applicable  = Column(Boolean,     nullable=False, default=False)
    is_system            = Column(Boolean,     nullable=False, default=False)
    is_active            = Column(Boolean,     nullable=False, default=True)
    is_deleted           = Column(Boolean,     nullable=False, default=False)

    created_by  = Column(String(100), nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=_now)
    updated_at  = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("client_id", "loan_type_code", name="uq_loan_type_code"),
        Index("ix_loan_types_client", "client_id"),
    )


# ── Loan Policies ────────────────────────────────────────────────────────────────

class LoanPolicy(ClientBase):
    """Rules that govern eligibility, limits, and interest for a loan type."""
    __tablename__ = "loan_policies"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)

    policy_name      = Column(String(200), nullable=False)
    loan_type_id     = Column(String(36),  nullable=False, index=True)
    loan_type_name   = Column(String(150), nullable=True)

    # Scoping (any may be null = applies to all)
    company_id       = Column(String(36),  nullable=True)
    company_name     = Column(String(150), nullable=True)
    branch_id        = Column(String(36),  nullable=True)
    branch_name      = Column(String(150), nullable=True)
    department_id    = Column(String(36),  nullable=True)
    department_name  = Column(String(150), nullable=True)
    employee_category = Column(String(50), nullable=True)  # Permanent / Contract / …
    designation_id   = Column(String(36),  nullable=True)
    designation_name = Column(String(150), nullable=True)

    # Eligibility
    min_service_months    = Column(Integer, nullable=True)   # months of service required
    max_active_loans      = Column(Integer, nullable=True, default=1)

    # Amount & tenure
    min_amount       = Column(Float,   nullable=True)
    max_amount       = Column(Float,   nullable=True)
    max_tenure_months = Column(Integer, nullable=True)

    # Interest
    interest_type    = Column(String(30), nullable=True)     # Interest Free / Flat / Reducing Balance
    interest_rate    = Column(Float,      nullable=True)     # annual %
    processing_fee   = Column(Float,      nullable=True)     # fixed fee

    # Repayment
    repayment_method  = Column(String(30), nullable=True)    # EMI / Fixed Principal / Bullet

    # Requirements
    require_guarantor  = Column(Boolean, nullable=False, default=False)
    require_documents  = Column(Boolean, nullable=False, default=False)

    effective_from   = Column(Date, nullable=True)
    effective_to     = Column(Date, nullable=True)

    is_active  = Column(Boolean,  nullable=False, default=True)
    is_deleted = Column(Boolean,  nullable=False, default=False)

    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime,    nullable=False, default=_now)
    updated_at = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (Index("ix_loan_policies_client", "client_id"),)


# ── Loan Applications ────────────────────────────────────────────────────────────

class LoanApplication(ClientBase):
    """An employee's loan request, from draft through closure."""
    __tablename__ = "loan_applications"

    id                 = Column(String(36),  primary_key=True, default=_uuid)
    client_id          = Column(String(36),  nullable=False, index=True)
    application_number = Column(String(40),  nullable=True, index=True)  # LOAN-YYYYMMDD-XXXX

    employee_id        = Column(String(36),  nullable=False, index=True)
    employee_name      = Column(String(200), nullable=True)
    employee_code      = Column(String(50),  nullable=True)
    department_name    = Column(String(100), nullable=True)
    designation_name   = Column(String(100), nullable=True)

    loan_type_id       = Column(String(36),  nullable=False, index=True)
    loan_type_name     = Column(String(150), nullable=True)
    loan_policy_id     = Column(String(36),  nullable=True)

    requested_amount   = Column(Float,   nullable=False)
    requested_tenure   = Column(Integer, nullable=False)   # months
    purpose            = Column(Text,    nullable=True)
    emi_start_date     = Column(Date,    nullable=True)

    # Computed / approved values
    approved_amount    = Column(Float,   nullable=True)
    approved_tenure    = Column(Integer, nullable=True)
    interest_type      = Column(String(30), nullable=True)
    interest_rate      = Column(Float,   nullable=True)    # annual %
    processing_fee     = Column(Float,   nullable=True)
    repayment_method   = Column(String(30), nullable=True)
    emi_amount         = Column(Float,   nullable=True)

    # Outstanding tracking
    principal_outstanding = Column(Float, nullable=False, default=0.0)
    total_interest     = Column(Float, nullable=False, default=0.0)
    total_paid         = Column(Float, nullable=False, default=0.0)

    status             = Column(String(30), nullable=False, default="Draft", index=True)

    # Rejection / cancellation
    rejection_reason   = Column(Text, nullable=True)
    cancelled_by       = Column(String(200), nullable=True)
    cancelled_at       = Column(DateTime, nullable=True)

    # Closure
    closed_at          = Column(DateTime, nullable=True)
    closure_type       = Column(String(30), nullable=True)

    submitted_at       = Column(DateTime, nullable=True)
    approved_at        = Column(DateTime, nullable=True)
    disbursed_at       = Column(DateTime, nullable=True)

    notes              = Column(Text, nullable=True)

    is_deleted = Column(Boolean,  nullable=False, default=False)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime,    nullable=False, default=_now)
    updated_at = Column(DateTime,    nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_loan_apps_client",   "client_id"),
        Index("ix_loan_apps_employee", "employee_id"),
        Index("ix_loan_apps_status",   "status"),
    )


# ── Loan Approvals ───────────────────────────────────────────────────────────────

class LoanApproval(ClientBase):
    """One step in the multi-level approval workflow for a loan application."""
    __tablename__ = "loan_approvals"

    id             = Column(String(36),  primary_key=True, default=_uuid)
    client_id      = Column(String(36),  nullable=False, index=True)
    application_id = Column(String(36),  nullable=False, index=True)

    step_number    = Column(Integer, nullable=False, default=1)
    approver_role  = Column(String(100), nullable=True)   # e.g. "Reporting Manager"
    approver_id    = Column(String(36),  nullable=True)
    approver_name  = Column(String(200), nullable=True)

    status         = Column(String(30), nullable=False, default="Pending")
    comments       = Column(Text, nullable=True)
    actioned_at    = Column(DateTime, nullable=True)

    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        Index("ix_loan_approvals_app", "application_id"),
        Index("ix_loan_approvals_client", "client_id"),
    )


# ── Loan Disbursements ───────────────────────────────────────────────────────────

class LoanDisbursement(ClientBase):
    """Record of money transferred to the employee after approval."""
    __tablename__ = "loan_disbursements"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    application_id   = Column(String(36),  nullable=False, index=True)

    disbursed_amount = Column(Float,   nullable=False)
    disbursement_date = Column(Date,   nullable=False)
    payment_method   = Column(String(30), nullable=False, default="Bank Transfer")
    transaction_reference = Column(String(200), nullable=True)
    bank_account     = Column(String(100), nullable=True)
    remarks          = Column(Text, nullable=True)

    disbursed_by     = Column(String(200), nullable=True)

    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("application_id", name="uq_disbursement_per_loan"),
        Index("ix_loan_disbursements_app", "application_id"),
        Index("ix_loan_disbursements_client", "client_id"),
    )


# ── Loan Repayment Schedules ─────────────────────────────────────────────────────

class LoanRepaymentSchedule(ClientBase):
    """One EMI installment row in the repayment plan for a loan."""
    __tablename__ = "loan_repayment_schedules"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    application_id   = Column(String(36),  nullable=False, index=True)

    installment_number = Column(Integer, nullable=False)
    due_date         = Column(Date,    nullable=False)
    principal_amount = Column(Float,   nullable=False, default=0.0)
    interest_amount  = Column(Float,   nullable=False, default=0.0)
    emi_amount       = Column(Float,   nullable=False, default=0.0)
    outstanding_balance = Column(Float, nullable=False, default=0.0)

    status           = Column(String(30), nullable=False, default="Pending", index=True)
    paid_amount      = Column(Float, nullable=True)
    paid_date        = Column(Date,  nullable=True)
    waiver_reason    = Column(Text,  nullable=True)
    deduction_ref    = Column(String(100), nullable=True)  # payroll run ID

    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("application_id", "installment_number", name="uq_installment_per_loan"),
        Index("ix_repayment_app",    "application_id"),
        Index("ix_repayment_client", "client_id"),
        Index("ix_repayment_due",    "due_date"),
    )


# ── Loan Payroll Deductions ──────────────────────────────────────────────────────

class LoanPayrollDeduction(ClientBase):
    """Links a payroll run to one or more EMI deductions to prevent duplicates."""
    __tablename__ = "loan_payroll_deductions"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    application_id   = Column(String(36),  nullable=False, index=True)
    schedule_id      = Column(String(36),  nullable=False, index=True)

    payroll_run_id   = Column(String(36),  nullable=True)
    period_month     = Column(Integer,     nullable=True)
    period_year      = Column(Integer,     nullable=True)

    deduction_amount = Column(Float, nullable=False)
    deducted_at      = Column(DateTime, nullable=True)
    deducted_by      = Column(String(200), nullable=True)

    is_reversed      = Column(Boolean, nullable=False, default=False)
    reversal_reason  = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (
        UniqueConstraint("schedule_id", "payroll_run_id", name="uq_deduction_per_run"),
        Index("ix_loan_deductions_app",    "application_id"),
        Index("ix_loan_deductions_client", "client_id"),
    )


# ── Loan Closures ────────────────────────────────────────────────────────────────

class LoanClosure(ClientBase):
    """Records how and when a loan was closed."""
    __tablename__ = "loan_closures"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    application_id   = Column(String(36),  nullable=False, index=True)

    closure_type     = Column(String(30),  nullable=False)   # Regular / Early / Settlement / Write-Off
    closure_date     = Column(Date,        nullable=False)

    outstanding_at_closure = Column(Float, nullable=False, default=0.0)
    amount_recovered       = Column(Float, nullable=True)
    waived_amount          = Column(Float, nullable=True)

    closure_notes    = Column(Text, nullable=True)
    closed_by        = Column(String(200), nullable=True)

    created_at = Column(DateTime, nullable=False, default=_now)
    updated_at = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint("application_id", name="uq_closure_per_loan"),
        Index("ix_loan_closures_app",    "application_id"),
        Index("ix_loan_closures_client", "client_id"),
    )


# ── Loan Activities (audit trail) ────────────────────────────────────────────────

class LoanActivity(ClientBase):
    __tablename__ = "loan_activities"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    client_id   = Column(String(36),  nullable=False, index=True)
    entity_type = Column(String(50),  nullable=False)   # loan_application / loan_type / loan_policy
    entity_id   = Column(String(36),  nullable=False, index=True)
    action      = Column(String(100), nullable=False)
    actor       = Column(String(200), nullable=True)
    old_value   = Column(Text, nullable=True)
    new_value   = Column(Text, nullable=True)
    notes       = Column(Text, nullable=True)
    created_at  = Column(DateTime, nullable=False, default=_now)

    __table_args__ = (Index("ix_loan_act_entity", "entity_type", "entity_id"),)
