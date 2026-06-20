"""Exit Management — Pydantic v2 schemas."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from backend.app.modules.exit_management.constants import (
    ALL_SEPARATION_TYPES, ALL_RESIGNATION_STATUSES, ALL_NP_STATUSES,
    ALL_CLEARANCE_STATUSES, ALL_INTERVIEW_MODES, ALL_INTERVIEW_STATUSES,
    ALL_SETTLEMENT_STATUSES, ALL_DOC_TYPES, ALL_QUESTION_TYPES,
    RES_DRAFT, NP_SERVING, CLR_PENDING, INT_PENDING, SETTLE_DRAFT,
)


# ── Shared helpers ────────────────────────────────────────────────────────────
class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Exit Policy ───────────────────────────────────────────────────────────────
class ExitPolicyCreate(_Base):
    policy_name: str
    separation_type: str
    notice_period_days: int = 30
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    require_exit_interview: bool = True
    require_asset_clearance: bool = True
    require_loan_clearance: bool = True
    require_expense_clearance: bool = True
    require_manager_approval: bool = True
    require_hr_approval: bool = True
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: bool = True
    description: Optional[str] = None

    @field_validator("separation_type")
    @classmethod
    def _sep(cls, v):
        if v not in ALL_SEPARATION_TYPES:
            raise ValueError(f"Invalid separation_type: {v}")
        return v

    @field_validator("notice_period_days")
    @classmethod
    def _npd(cls, v):
        if v < 0:
            raise ValueError("notice_period_days must be >= 0")
        return v


class ExitPolicyUpdate(_Base):
    policy_name: Optional[str] = None
    notice_period_days: Optional[int] = None
    require_exit_interview: Optional[bool] = None
    require_asset_clearance: Optional[bool] = None
    require_loan_clearance: Optional[bool] = None
    require_expense_clearance: Optional[bool] = None
    require_manager_approval: Optional[bool] = None
    require_hr_approval: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class ExitPolicyOut(_Base):
    id: str
    policy_name: str
    separation_type: str
    notice_period_days: int
    company_id: Optional[str]
    branch_id: Optional[str]
    department_id: Optional[str]
    designation_id: Optional[str]
    require_exit_interview: bool
    require_asset_clearance: bool
    require_loan_clearance: bool
    require_expense_clearance: bool
    require_manager_approval: bool
    require_hr_approval: bool
    effective_from: Optional[date]
    effective_to: Optional[date]
    is_active: bool
    description: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Resignation Request ───────────────────────────────────────────────────────
class ResignationCreate(_Base):
    employee_id: str
    separation_type: str = "Resignation"
    resignation_date: date
    requested_last_working_day: date
    reason_category: Optional[str] = None
    reason_description: Optional[str] = None

    @field_validator("separation_type")
    @classmethod
    def _sep(cls, v):
        if v not in ALL_SEPARATION_TYPES:
            raise ValueError(f"Invalid separation_type: {v}")
        return v

    @model_validator(mode="after")
    def _lwd(self):
        if self.requested_last_working_day < self.resignation_date:
            raise ValueError("requested_last_working_day must be >= resignation_date")
        return self


class ResignationUpdate(_Base):
    resignation_date: Optional[date] = None
    requested_last_working_day: Optional[date] = None
    reason_category: Optional[str] = None
    reason_description: Optional[str] = None


class ResignationApprove(_Base):
    approved_last_working_day: Optional[date] = None
    comments: Optional[str] = None


class ResignationReject(_Base):
    rejection_reason: str


class ResignationWithdraw(_Base):
    reason: Optional[str] = None


class ResignationOut(_Base):
    id: str
    resignation_number: str
    employee_id: str
    separation_type: str
    resignation_date: date
    requested_last_working_day: date
    approved_last_working_day: Optional[date]
    actual_last_working_day: Optional[date]
    reason_category: Optional[str]
    reason_description: Optional[str]
    status: str
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    withdrawn_at: Optional[datetime]
    approved_by: Optional[str]
    rejected_by: Optional[str]
    approval_comments: Optional[str]
    rejection_reason: Optional[str]
    policy_id: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Notice Period ─────────────────────────────────────────────────────────────
class NoticePeriodUpdate(_Base):
    status: Optional[str] = None
    actual_end_date: Optional[date] = None
    buyout_days: Optional[int] = None
    buyout_amount: Optional[float] = None
    waiver_days: Optional[int] = None
    waiver_amount: Optional[float] = None
    waiver_reason: Optional[str] = None
    extension_days: Optional[int] = None
    extension_reason: Optional[str] = None
    notes: Optional[str] = None


class NoticePeriodOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    required_notice_days: int
    notice_start_date: date
    notice_end_date: date
    actual_end_date: Optional[date]
    served_notice_days: int
    status: str
    buyout_days: int
    buyout_amount: float
    waiver_days: int
    waiver_amount: float
    waiver_reason: Optional[str]
    extension_days: int
    extension_reason: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Clearance ─────────────────────────────────────────────────────────────────
class ClearanceTaskUpdate(_Base):
    status: str
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _s(cls, v):
        if v not in ALL_CLEARANCE_STATUSES:
            raise ValueError(f"Invalid status: {v}")
        return v


class ClearanceTaskOut(_Base):
    id: str
    clearance_id: str
    task_name: str
    description: Optional[str]
    is_mandatory: bool
    status: str
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    notes: Optional[str]
    display_order: int
    created_at: datetime


class ClearanceOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    department: str
    status: str
    assigned_to: Optional[str]
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    notes: Optional[str]
    tasks: list[ClearanceTaskOut] = []
    created_at: datetime
    updated_at: datetime


# ── Exit Interview ────────────────────────────────────────────────────────────
class ExitInterviewUpdate(_Base):
    mode: Optional[str] = None
    is_anonymous: Optional[bool] = None
    status: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    conducted_by: Optional[str] = None
    notes: Optional[str] = None


class InterviewResponseItem(_Base):
    question_id: str
    rating_value: Optional[int] = None
    text_value: Optional[str] = None


class SubmitInterviewResponses(_Base):
    responses: list[InterviewResponseItem]


class ExitInterviewQuestionOut(_Base):
    id: str
    question_text: str
    question_type: str
    topic: Optional[str]
    options: list[Any] = []
    is_required: bool
    display_order: int


class ExitInterviewOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    mode: str
    is_anonymous: bool
    status: str
    scheduled_at: Optional[datetime]
    conducted_by: Optional[str]
    completed_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Asset Recovery ────────────────────────────────────────────────────────────
class AssetRecoveryCreate(_Base):
    asset_assignment_id: str
    asset_id: str
    asset_name: str
    asset_code: Optional[str] = None
    action: str = "Returned"
    condition: Optional[str] = None
    return_date: Optional[date] = None
    recovery_amount: float = 0.0
    notes: Optional[str] = None


class AssetRecoveryUpdate(_Base):
    action: Optional[str] = None
    condition: Optional[str] = None
    return_date: Optional[date] = None
    recovery_amount: Optional[float] = None
    notes: Optional[str] = None


class AssetRecoveryOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    asset_assignment_id: str
    asset_id: str
    asset_name: str
    asset_code: Optional[str]
    action: str
    condition: Optional[str]
    return_date: Optional[date]
    recovery_amount: float
    notes: Optional[str]
    processed_by: Optional[str]
    processed_at: Optional[datetime]
    created_at: datetime


# ── Final Settlement ──────────────────────────────────────────────────────────
class SettlementCalculate(_Base):
    pending_salary: float = 0.0
    leave_encashment: float = 0.0
    approved_reimbursements: float = 0.0
    other_earnings: float = 0.0
    loan_outstanding: float = 0.0
    notice_buyout: float = 0.0
    asset_recovery: float = 0.0
    advance_recovery: float = 0.0
    other_deductions: float = 0.0
    notes: Optional[str] = None


class SettlementApprove(_Base):
    comments: Optional[str] = None


class SettlementMarkPaid(_Base):
    payment_reference: Optional[str] = None
    notes: Optional[str] = None


class FinalSettlementOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    status: str
    pending_salary: float
    leave_encashment: float
    approved_reimbursements: float
    other_earnings: float
    total_earnings: float
    loan_outstanding: float
    notice_buyout: float
    asset_recovery: float
    advance_recovery: float
    other_deductions: float
    total_deductions: float
    net_amount: float
    calculated_at: Optional[datetime]
    approved_at: Optional[datetime]
    paid_at: Optional[datetime]
    payment_reference: Optional[str]
    approval_comments: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Exit Documents ────────────────────────────────────────────────────────────
class ExitDocumentGenerate(_Base):
    document_type: str
    notes: Optional[str] = None

    @field_validator("document_type")
    @classmethod
    def _dt(cls, v):
        if v not in ALL_DOC_TYPES:
            raise ValueError(f"Invalid document_type: {v}")
        return v


class ExitDocumentOut(_Base):
    id: str
    resignation_id: str
    employee_id: str
    document_type: str
    file_name: Optional[str]
    storage_key: Optional[str]
    version: int
    generated_at: Optional[datetime]
    notes: Optional[str]
    created_at: datetime


# ── Dashboard ─────────────────────────────────────────────────────────────────
class ExitDashboardOut(_Base):
    pending_resignations: int = 0
    under_review: int = 0
    serving_notice: int = 0
    pending_clearances: int = 0
    assets_pending_return: int = 0
    settlements_pending: int = 0
    exited_this_month: int = 0
    recent_resignations: list[dict] = []
