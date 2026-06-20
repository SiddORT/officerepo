"""Exit Management — SQLAlchemy models (client DB)."""
from __future__ import annotations

import json
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Index, Integer, String, Text, func,
)

from backend.app.database.client_db import ClientBase
from backend.app.modules.exit_management.constants import (
    ALL_SEPARATION_TYPES, ALL_RESIGNATION_STATUSES, ALL_NP_STATUSES,
    ALL_CLEARANCE_STATUSES, ALL_INTERVIEW_STATUSES, ALL_SETTLEMENT_STATUSES,
    ALL_DOC_TYPES, RES_DRAFT, CLR_PENDING, NP_SERVING,
    INT_PENDING, SETTLE_DRAFT,
)


# ── Exit Policies ─────────────────────────────────────────────────────────────
class ExitPolicy(ClientBase):
    __tablename__ = "exit_policies"

    id                    = Column(String(36), primary_key=True)
    policy_name           = Column(String(200), nullable=False)
    separation_type       = Column(String(50), nullable=False)
    notice_period_days    = Column(Integer, nullable=False, default=30)

    # Applicability scope
    company_id            = Column(String(36), nullable=True)
    branch_id             = Column(String(36), nullable=True)
    department_id         = Column(String(36), nullable=True)
    designation_id        = Column(String(36), nullable=True)

    # Clearance requirements
    require_exit_interview = Column(Boolean, default=True)
    require_asset_clearance = Column(Boolean, default=True)
    require_loan_clearance  = Column(Boolean, default=True)
    require_expense_clearance = Column(Boolean, default=True)
    require_manager_approval  = Column(Boolean, default=True)
    require_hr_approval       = Column(Boolean, default=True)

    # Effective dates
    effective_from  = Column(Date, nullable=True)
    effective_to    = Column(Date, nullable=True)
    is_active       = Column(Boolean, default=True)
    description     = Column(Text, nullable=True)

    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(String(36), nullable=True)

    __table_args__ = (
        Index("ix_exit_policies_separation_type", "separation_type"),
        Index("ix_exit_policies_is_active", "is_active"),
    )


# ── Resignation Requests ──────────────────────────────────────────────────────
class ResignationRequest(ClientBase):
    __tablename__ = "resignation_requests"

    id                    = Column(String(36), primary_key=True)
    resignation_number    = Column(String(30), unique=True, nullable=False)
    employee_id           = Column(String(36), nullable=False)

    separation_type       = Column(String(50), nullable=False, default="Resignation")
    resignation_date      = Column(Date, nullable=False)
    requested_last_working_day = Column(Date, nullable=False)
    approved_last_working_day  = Column(Date, nullable=True)
    actual_last_working_day    = Column(Date, nullable=True)

    reason_category       = Column(String(100), nullable=True)
    reason_description    = Column(Text, nullable=True)

    status                = Column(String(30), nullable=False, default=RES_DRAFT)
    submitted_at          = Column(DateTime, nullable=True)
    approved_at           = Column(DateTime, nullable=True)
    rejected_at           = Column(DateTime, nullable=True)
    withdrawn_at          = Column(DateTime, nullable=True)

    approved_by           = Column(String(36), nullable=True)
    rejected_by           = Column(String(36), nullable=True)
    approval_comments     = Column(Text, nullable=True)
    rejection_reason      = Column(Text, nullable=True)

    policy_id             = Column(String(36), ForeignKey("exit_policies.id"), nullable=True)

    is_deleted  = Column(Boolean, default=False)
    deleted_at  = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, default=func.now(), nullable=False)
    updated_at  = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by  = Column(String(36), nullable=True)

    __table_args__ = (
        Index("ix_resignation_requests_employee_id", "employee_id"),
        Index("ix_resignation_requests_status", "status"),
        Index("ix_resignation_requests_separation_type", "separation_type"),
    )


# ── Notice Periods ────────────────────────────────────────────────────────────
class NoticePeriod(ClientBase):
    __tablename__ = "notice_periods"

    id                  = Column(String(36), primary_key=True)
    resignation_id      = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False, unique=True)
    employee_id         = Column(String(36), nullable=False)

    required_notice_days = Column(Integer, nullable=False, default=30)
    notice_start_date   = Column(Date, nullable=False)
    notice_end_date     = Column(Date, nullable=False)
    actual_end_date     = Column(Date, nullable=True)
    served_notice_days  = Column(Integer, default=0)

    status              = Column(String(30), nullable=False, default=NP_SERVING)

    # Buyout / waiver
    buyout_days         = Column(Integer, default=0)
    buyout_amount       = Column(Float, default=0.0)
    waiver_days         = Column(Integer, default=0)
    waiver_amount       = Column(Float, default=0.0)
    waiver_reason       = Column(Text, nullable=True)

    # Extension
    extension_days      = Column(Integer, default=0)
    extension_reason    = Column(Text, nullable=True)

    notes               = Column(Text, nullable=True)
    created_at          = Column(DateTime, default=func.now(), nullable=False)
    updated_at          = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_notice_periods_employee_id", "employee_id"),
        Index("ix_notice_periods_status", "status"),
    )


# ── Exit Clearances ───────────────────────────────────────────────────────────
class ExitClearance(ClientBase):
    __tablename__ = "exit_clearances"

    id              = Column(String(36), primary_key=True)
    resignation_id  = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False)
    employee_id     = Column(String(36), nullable=False)
    department      = Column(String(50), nullable=False)
    status          = Column(String(30), nullable=False, default=CLR_PENDING)
    assigned_to     = Column(String(36), nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    completed_by    = Column(String(36), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=func.now(), nullable=False)
    updated_at      = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_clearances_resignation_id", "resignation_id"),
        Index("ix_exit_clearances_employee_id", "employee_id"),
        Index("ix_exit_clearances_status", "status"),
    )


# ── Exit Clearance Tasks ──────────────────────────────────────────────────────
class ExitClearanceTask(ClientBase):
    __tablename__ = "exit_clearance_tasks"

    id              = Column(String(36), primary_key=True)
    clearance_id    = Column(String(36), ForeignKey("exit_clearances.id"), nullable=False)
    task_name       = Column(String(200), nullable=False)
    description     = Column(Text, nullable=True)
    is_mandatory    = Column(Boolean, default=True)
    status          = Column(String(30), nullable=False, default=CLR_PENDING)
    completed_at    = Column(DateTime, nullable=True)
    completed_by    = Column(String(36), nullable=True)
    notes           = Column(Text, nullable=True)
    display_order   = Column(Integer, default=0)
    created_at      = Column(DateTime, default=func.now(), nullable=False)
    updated_at      = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_clearance_tasks_clearance_id", "clearance_id"),
        Index("ix_clearance_tasks_status", "status"),
    )


# ── Exit Interview ────────────────────────────────────────────────────────────
class ExitInterview(ClientBase):
    __tablename__ = "exit_interviews"

    id              = Column(String(36), primary_key=True)
    resignation_id  = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False, unique=True)
    employee_id     = Column(String(36), nullable=False)
    mode            = Column(String(30), nullable=False, default="Self-Service")
    is_anonymous    = Column(Boolean, default=False)
    status          = Column(String(30), nullable=False, default=INT_PENDING)
    scheduled_at    = Column(DateTime, nullable=True)
    conducted_by    = Column(String(36), nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=func.now(), nullable=False)
    updated_at      = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_interviews_employee_id", "employee_id"),
        Index("ix_exit_interviews_status", "status"),
    )


# ── Exit Interview Questions (per-org questionnaire) ─────────────────────────
class ExitInterviewQuestion(ClientBase):
    __tablename__ = "exit_interview_questions"

    id              = Column(String(36), primary_key=True)
    question_text   = Column(Text, nullable=False)
    question_type   = Column(String(30), nullable=False, default="Rating Scale")
    topic           = Column(String(100), nullable=True)
    options_json    = Column(Text, nullable=True)   # JSON list for MCQ
    is_required     = Column(Boolean, default=True)
    is_active       = Column(Boolean, default=True)
    display_order   = Column(Integer, default=0)
    created_at      = Column(DateTime, default=func.now(), nullable=False)

    @property
    def options(self):
        if self.options_json:
            return json.loads(self.options_json)
        return []

    __table_args__ = (
        Index("ix_exit_interview_questions_active", "is_active"),
    )


# ── Exit Interview Responses ──────────────────────────────────────────────────
class ExitInterviewResponse(ClientBase):
    __tablename__ = "exit_interview_responses"

    id              = Column(String(36), primary_key=True)
    interview_id    = Column(String(36), ForeignKey("exit_interviews.id"), nullable=False)
    question_id     = Column(String(36), ForeignKey("exit_interview_questions.id"), nullable=False)
    rating_value    = Column(Integer, nullable=True)    # for Rating Scale
    text_value      = Column(Text, nullable=True)        # for Text Area / MCQ
    created_at      = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_interview_responses_interview_id", "interview_id"),
    )


# ── Exit Asset Recovery ───────────────────────────────────────────────────────
class ExitAssetRecovery(ClientBase):
    """Tracks asset return/damage per resignation — no duplicate asset tables."""
    __tablename__ = "exit_asset_recoveries"

    id                  = Column(String(36), primary_key=True)
    resignation_id      = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False)
    employee_id         = Column(String(36), nullable=False)
    asset_assignment_id = Column(String(36), nullable=False)  # FK → asset_assignments
    asset_id            = Column(String(36), nullable=False)  # FK → assets (denorm for queries)
    asset_name          = Column(String(200), nullable=False)  # snapshot
    asset_code          = Column(String(100), nullable=True)

    action              = Column(String(30), nullable=False, default="Returned")
    condition           = Column(String(50), nullable=True)    # Good / Damaged / Lost
    return_date         = Column(Date, nullable=True)
    recovery_amount     = Column(Float, default=0.0)
    notes               = Column(Text, nullable=True)

    processed_by        = Column(String(36), nullable=True)
    processed_at        = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=func.now(), nullable=False)
    updated_at          = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_asset_recoveries_resignation_id", "resignation_id"),
        Index("ix_exit_asset_recoveries_employee_id", "employee_id"),
    )


# ── Final Settlements ─────────────────────────────────────────────────────────
class FinalSettlement(ClientBase):
    __tablename__ = "final_settlements"

    id                   = Column(String(36), primary_key=True)
    resignation_id       = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False, unique=True)
    employee_id          = Column(String(36), nullable=False)
    status               = Column(String(30), nullable=False, default=SETTLE_DRAFT)

    # Earnings
    pending_salary       = Column(Float, default=0.0)
    leave_encashment     = Column(Float, default=0.0)
    approved_reimbursements = Column(Float, default=0.0)
    other_earnings       = Column(Float, default=0.0)
    total_earnings       = Column(Float, default=0.0)

    # Deductions
    loan_outstanding     = Column(Float, default=0.0)
    notice_buyout        = Column(Float, default=0.0)
    asset_recovery       = Column(Float, default=0.0)
    advance_recovery     = Column(Float, default=0.0)
    other_deductions     = Column(Float, default=0.0)
    total_deductions     = Column(Float, default=0.0)

    # Net
    net_amount           = Column(Float, default=0.0)

    # Approval
    calculated_at        = Column(DateTime, nullable=True)
    calculated_by        = Column(String(36), nullable=True)
    approved_at          = Column(DateTime, nullable=True)
    approved_by          = Column(String(36), nullable=True)
    paid_at              = Column(DateTime, nullable=True)
    paid_by              = Column(String(36), nullable=True)
    payment_reference    = Column(String(200), nullable=True)
    approval_comments    = Column(Text, nullable=True)
    notes                = Column(Text, nullable=True)

    created_at           = Column(DateTime, default=func.now(), nullable=False)
    updated_at           = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_final_settlements_employee_id", "employee_id"),
        Index("ix_final_settlements_status", "status"),
    )


# ── Exit Documents ────────────────────────────────────────────────────────────
class ExitDocument(ClientBase):
    __tablename__ = "exit_documents"

    id              = Column(String(36), primary_key=True)
    resignation_id  = Column(String(36), ForeignKey("resignation_requests.id"), nullable=False)
    employee_id     = Column(String(36), nullable=False)
    document_type   = Column(String(100), nullable=False)
    file_name       = Column(String(300), nullable=True)
    storage_key     = Column(String(500), nullable=True)
    version         = Column(Integer, default=1)
    generated_at    = Column(DateTime, nullable=True)
    generated_by    = Column(String(36), nullable=True)
    notes           = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_documents_resignation_id", "resignation_id"),
        Index("ix_exit_documents_employee_id", "employee_id"),
        Index("ix_exit_documents_type", "document_type"),
    )


# ── Exit Activities ───────────────────────────────────────────────────────────
class ExitActivity(ClientBase):
    __tablename__ = "exit_activities"

    id              = Column(String(36), primary_key=True)
    resignation_id  = Column(String(36), nullable=True)
    employee_id     = Column(String(36), nullable=True)
    activity_type   = Column(String(80), nullable=False)
    title           = Column(String(300), nullable=True)
    description     = Column(Text, nullable=True)
    old_value       = Column(Text, nullable=True)
    new_value       = Column(Text, nullable=True)
    performed_by    = Column(String(36), nullable=True)
    created_at      = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_exit_activities_resignation_id", "resignation_id"),
        Index("ix_exit_activities_employee_id", "employee_id"),
        Index("ix_exit_activities_type", "activity_type"),
    )
