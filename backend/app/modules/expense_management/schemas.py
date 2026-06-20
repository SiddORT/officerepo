"""Expense & Reimbursements — Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


# ── Category ──────────────────────────────────────────────────────────────────
class ExpenseCategoryCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_active: bool = True
    receipt_required: bool = False
    approval_required: bool = False
    max_amount: Optional[float] = None
    daily_limit: Optional[float] = None
    monthly_limit: Optional[float] = None


class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    receipt_required: Optional[bool] = None
    approval_required: Optional[bool] = None
    max_amount: Optional[float] = None
    daily_limit: Optional[float] = None
    monthly_limit: Optional[float] = None


# ── Policy ────────────────────────────────────────────────────────────────────
class ExpensePolicyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    daily_limit: Optional[float] = None
    monthly_limit: Optional[float] = None
    yearly_limit: Optional[float] = None
    approval_levels: int = 1
    receipt_required: bool = True
    eligible_categories: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None


class ExpensePolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    daily_limit: Optional[float] = None
    monthly_limit: Optional[float] = None
    yearly_limit: Optional[float] = None
    approval_levels: Optional[int] = None
    receipt_required: Optional[bool] = None
    eligible_categories: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None


# ── Claim item ────────────────────────────────────────────────────────────────
class ClaimItemCreate(BaseModel):
    category_id: Optional[str] = None
    expense_date: datetime
    amount: float
    tax_amount: float = 0.0
    notes: Optional[str] = None
    currency: str = "INR"

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class ClaimItemUpdate(BaseModel):
    category_id: Optional[str] = None
    expense_date: Optional[datetime] = None
    amount: Optional[float] = None
    tax_amount: Optional[float] = None
    notes: Optional[str] = None
    currency: Optional[str] = None


# ── Expense Claim ─────────────────────────────────────────────────────────────
class ExpenseClaimCreate(BaseModel):
    title: str
    employee_id: str
    category_id: Optional[str] = None
    expense_date: Optional[datetime] = None
    amount: float = 0.0
    currency: str = "INR"
    description: Optional[str] = None
    project: Optional[str] = None
    cost_center: Optional[str] = None
    client_ref: Optional[str] = None
    items: List[ClaimItemCreate] = []


class ExpenseClaimUpdate(BaseModel):
    title: Optional[str] = None
    category_id: Optional[str] = None
    expense_date: Optional[datetime] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    project: Optional[str] = None
    cost_center: Optional[str] = None
    client_ref: Optional[str] = None
    items: Optional[List[ClaimItemCreate]] = None


class ExpenseClaimSubmit(BaseModel):
    notes: Optional[str] = None


class ExpenseClaimApprove(BaseModel):
    approved_amount: Optional[float] = None
    comments: Optional[str] = None
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None


class ExpenseClaimReject(BaseModel):
    reason: str
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None


class ExpenseClaimReturn(BaseModel):
    reason: str


class ExpenseClaimCancel(BaseModel):
    reason: Optional[str] = None


# ── Reimbursement ─────────────────────────────────────────────────────────────
class ReimbursementCreate(BaseModel):
    claim_id: str
    method: str = "Payroll"
    notes: Optional[str] = None
    reimbursement_date: Optional[datetime] = None
    transaction_ref: Optional[str] = None


class ReimbursementUpdate(BaseModel):
    status: Optional[str] = None
    transaction_ref: Optional[str] = None
    reimbursement_date: Optional[datetime] = None
    payroll_run_id: Optional[str] = None
    notes: Optional[str] = None


# ── Mileage Claim ─────────────────────────────────────────────────────────────
class MileageClaimCreate(BaseModel):
    employee_id: str
    trip_date: datetime
    from_location: str
    to_location: str
    distance_km: float
    rate_per_km: float
    currency: str = "INR"
    purpose: Optional[str] = None

    @field_validator("distance_km", "rate_per_km")
    @classmethod
    def positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Must be positive")
        return v


class MileageClaimUpdate(BaseModel):
    trip_date: Optional[datetime] = None
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    distance_km: Optional[float] = None
    rate_per_km: Optional[float] = None
    currency: Optional[str] = None
    purpose: Optional[str] = None
    status: Optional[str] = None
    approved_amount: Optional[float] = None
