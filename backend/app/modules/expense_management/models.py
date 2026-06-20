"""Expense & Reimbursements — SQLAlchemy models (client/tenant DB)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Index,
    Integer, String, Text,
)
from sqlalchemy.orm import relationship

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.utcnow()


# ── Expense Categories ────────────────────────────────────────────────────────
class ExpenseCategory(ClientBase):
    __tablename__ = "expense_categories"

    id               = Column(String(36), primary_key=True, default=_uuid)
    code             = Column(String(50), nullable=False, unique=True)
    name             = Column(String(120), nullable=False)
    description      = Column(Text, nullable=True)
    is_active        = Column(Boolean, nullable=False, default=True)

    # rules
    receipt_required  = Column(Boolean, nullable=False, default=False)
    approval_required = Column(Boolean, nullable=False, default=False)
    max_amount        = Column(Float, nullable=True)
    daily_limit       = Column(Float, nullable=True)
    monthly_limit     = Column(Float, nullable=True)

    created_at  = Column(DateTime, default=_now, nullable=False)
    updated_at  = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    claims      = relationship("ExpenseClaim",     back_populates="category", lazy="dynamic")
    claim_items = relationship("ExpenseClaimItem", back_populates="category", lazy="dynamic")

    __table_args__ = (
        Index("ix_expense_categories_code",      "code"),
        Index("ix_expense_categories_is_active", "is_active"),
    )


# ── Expense Policies ──────────────────────────────────────────────────────────
class ExpensePolicy(ClientBase):
    __tablename__ = "expense_policies"

    id             = Column(String(36), primary_key=True, default=_uuid)
    name           = Column(String(120), nullable=False)
    description    = Column(Text, nullable=True)
    is_active      = Column(Boolean, nullable=False, default=True)

    # applicability
    company_id     = Column(String(36), nullable=True)
    branch_id      = Column(String(36), nullable=True)
    department_id  = Column(String(36), nullable=True)
    designation_id = Column(String(36), nullable=True)

    # limits
    daily_limit    = Column(Float, nullable=True)
    monthly_limit  = Column(Float, nullable=True)
    yearly_limit   = Column(Float, nullable=True)

    # approval levels required
    approval_levels    = Column(Integer, nullable=False, default=1)
    receipt_required   = Column(Boolean, nullable=False, default=True)

    # eligible categories (comma-separated category codes, null = all)
    eligible_categories = Column(Text, nullable=True)

    effective_from = Column(DateTime, nullable=True)
    effective_to   = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=_now, nullable=False)
    updated_at = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        Index("ix_expense_policies_is_active",    "is_active"),
        Index("ix_expense_policies_department_id", "department_id"),
    )


# ── Expense Claims ────────────────────────────────────────────────────────────
class ExpenseClaim(ClientBase):
    __tablename__ = "expense_claims"

    id             = Column(String(36), primary_key=True, default=_uuid)
    claim_number   = Column(String(40), nullable=False, unique=True)
    employee_id    = Column(String(36), nullable=False, index=True)

    # single-line convenience fields (also supports multi-line via claim_items)
    category_id    = Column(String(36), ForeignKey("expense_categories.id"), nullable=True)
    expense_date   = Column(DateTime, nullable=True)
    amount         = Column(Float, nullable=False, default=0.0)
    approved_amount = Column(Float, nullable=True)
    currency       = Column(String(10), nullable=False, default="INR")

    title          = Column(String(200), nullable=False)
    description    = Column(Text, nullable=True)
    project        = Column(String(120), nullable=True)
    cost_center    = Column(String(120), nullable=True)
    client_ref     = Column(String(120), nullable=True)

    status         = Column(String(40), nullable=False, default="Draft", index=True)
    rejection_reason = Column(Text, nullable=True)
    return_reason  = Column(Text, nullable=True)

    submitted_at   = Column(DateTime, nullable=True)
    approved_at    = Column(DateTime, nullable=True)
    reimbursed_at  = Column(DateTime, nullable=True)

    is_deleted     = Column(Boolean, nullable=False, default=False)
    deleted_at     = Column(DateTime, nullable=True)
    created_at     = Column(DateTime, default=_now, nullable=False)
    updated_at     = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    category    = relationship("ExpenseCategory",   back_populates="claims")
    items       = relationship("ExpenseClaimItem",  back_populates="claim",
                               cascade="all, delete-orphan")
    approvals   = relationship("ExpenseApproval",   back_populates="claim",
                               cascade="all, delete-orphan",
                               order_by="ExpenseApproval.approval_level")
    receipts    = relationship("ExpenseReceipt",    back_populates="claim",
                               cascade="all, delete-orphan")
    reimbursements = relationship("ExpenseReimbursement", back_populates="claim")
    activities  = relationship("ExpenseActivity",   back_populates="claim",
                               cascade="all, delete-orphan",
                               order_by="ExpenseActivity.created_at")

    __table_args__ = (
        Index("ix_expense_claims_employee_id", "employee_id"),
        Index("ix_expense_claims_status",      "status"),
        Index("ix_expense_claims_claim_number","claim_number"),
    )


# ── Expense Claim Items (multi-line) ──────────────────────────────────────────
class ExpenseClaimItem(ClientBase):
    __tablename__ = "expense_claim_items"

    id          = Column(String(36), primary_key=True, default=_uuid)
    claim_id    = Column(String(36), ForeignKey("expense_claims.id"), nullable=False, index=True)
    category_id = Column(String(36), ForeignKey("expense_categories.id"), nullable=True)
    expense_date = Column(DateTime, nullable=False)
    amount       = Column(Float, nullable=False)
    tax_amount   = Column(Float, nullable=False, default=0.0)
    approved_amount = Column(Float, nullable=True)
    notes        = Column(Text, nullable=True)
    currency     = Column(String(10), nullable=False, default="INR")

    created_at   = Column(DateTime, default=_now, nullable=False)
    updated_at   = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    claim    = relationship("ExpenseClaim",    back_populates="items")
    category = relationship("ExpenseCategory", back_populates="claim_items")

    __table_args__ = (
        Index("ix_expense_claim_items_claim_id", "claim_id"),
    )


# ── Expense Approvals ─────────────────────────────────────────────────────────
class ExpenseApproval(ClientBase):
    __tablename__ = "expense_approvals"

    id              = Column(String(36), primary_key=True, default=_uuid)
    claim_id        = Column(String(36), ForeignKey("expense_claims.id"), nullable=False, index=True)
    approval_level  = Column(Integer, nullable=False)
    approver_id     = Column(String(36), nullable=True)
    approver_name   = Column(String(120), nullable=True)
    approver_role   = Column(String(80), nullable=True)
    status          = Column(String(30), nullable=False, default="Pending")
    approved_amount = Column(Float, nullable=True)
    comments        = Column(Text, nullable=True)
    actioned_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, default=_now, nullable=False)

    claim = relationship("ExpenseClaim", back_populates="approvals")

    __table_args__ = (
        Index("ix_expense_approvals_claim_id", "claim_id"),
        Index("ix_expense_approvals_status",   "status"),
    )


# ── Expense Receipts ──────────────────────────────────────────────────────────
class ExpenseReceipt(ClientBase):
    __tablename__ = "expense_receipts"

    id          = Column(String(36), primary_key=True, default=_uuid)
    claim_id    = Column(String(36), ForeignKey("expense_claims.id"), nullable=False, index=True)
    item_id     = Column(String(36), ForeignKey("expense_claim_items.id"), nullable=True)
    file_name   = Column(String(255), nullable=False)
    storage_key = Column(String(500), nullable=False)
    file_size   = Column(Integer, nullable=True)
    mime_type   = Column(String(100), nullable=True)
    ocr_status  = Column(String(30), nullable=False, default="Not Done")
    uploaded_by = Column(String(36), nullable=True)
    uploaded_at = Column(DateTime, default=_now, nullable=False)
    is_deleted  = Column(Boolean, nullable=False, default=False)
    deleted_at  = Column(DateTime, nullable=True)

    claim = relationship("ExpenseClaim", back_populates="receipts")

    __table_args__ = (
        Index("ix_expense_receipts_claim_id", "claim_id"),
    )


# ── Expense Reimbursements ────────────────────────────────────────────────────
class ExpenseReimbursement(ClientBase):
    __tablename__ = "expense_reimbursements"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    claim_id            = Column(String(36), ForeignKey("expense_claims.id"), nullable=False, index=True)
    employee_id         = Column(String(36), nullable=False, index=True)
    amount              = Column(Float, nullable=False)
    currency            = Column(String(10), nullable=False, default="INR")
    method              = Column(String(40), nullable=False, default="Payroll")
    status              = Column(String(30), nullable=False, default="Pending")
    transaction_ref     = Column(String(120), nullable=True)
    payroll_run_id      = Column(String(36), nullable=True)
    reimbursement_date  = Column(DateTime, nullable=True)
    notes               = Column(Text, nullable=True)
    processed_by        = Column(String(36), nullable=True)
    created_at          = Column(DateTime, default=_now, nullable=False)
    updated_at          = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    claim = relationship("ExpenseClaim", back_populates="reimbursements")

    __table_args__ = (
        Index("ix_expense_reimbursements_claim_id",    "claim_id"),
        Index("ix_expense_reimbursements_employee_id", "employee_id"),
        Index("ix_expense_reimbursements_status",      "status"),
    )


# ── Mileage Claims ────────────────────────────────────────────────────────────
class MileageClaim(ClientBase):
    __tablename__ = "mileage_claims"

    id              = Column(String(36), primary_key=True, default=_uuid)
    claim_id        = Column(String(36), ForeignKey("expense_claims.id"), nullable=True)
    employee_id     = Column(String(36), nullable=False, index=True)
    trip_date       = Column(DateTime, nullable=False)
    from_location   = Column(String(255), nullable=False)
    to_location     = Column(String(255), nullable=False)
    distance_km     = Column(Float, nullable=False)
    rate_per_km     = Column(Float, nullable=False)
    total_amount    = Column(Float, nullable=False)
    currency        = Column(String(10), nullable=False, default="INR")
    purpose         = Column(Text, nullable=True)
    status          = Column(String(40), nullable=False, default="Draft", index=True)
    approved_amount = Column(Float, nullable=True)
    is_deleted      = Column(Boolean, nullable=False, default=False)
    created_at      = Column(DateTime, default=_now, nullable=False)
    updated_at      = Column(DateTime, default=_now, onupdate=_now, nullable=False)

    __table_args__ = (
        Index("ix_mileage_claims_employee_id", "employee_id"),
        Index("ix_mileage_claims_status",      "status"),
    )


# ── Expense Activities ────────────────────────────────────────────────────────
class ExpenseActivity(ClientBase):
    __tablename__ = "expense_activities"

    id          = Column(String(36), primary_key=True, default=_uuid)
    claim_id    = Column(String(36), ForeignKey("expense_claims.id"), nullable=False, index=True)
    actor_id    = Column(String(36), nullable=True)
    actor_name  = Column(String(120), nullable=True)
    activity    = Column(String(80), nullable=False)
    description = Column(Text, nullable=True)
    old_value   = Column(Text, nullable=True)
    new_value   = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=_now, nullable=False)

    claim = relationship("ExpenseClaim", back_populates="activities")

    __table_args__ = (
        Index("ix_expense_activities_claim_id", "claim_id"),
    )
