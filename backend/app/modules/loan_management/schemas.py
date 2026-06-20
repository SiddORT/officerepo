"""Employee Loan Management — Pydantic schemas."""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Loan Type ────────────────────────────────────────────────────────────────────

class LoanTypeCreate(BaseModel):
    loan_type_code: str = Field(..., max_length=30)
    loan_type_name: str = Field(..., max_length=150)
    description: Optional[str] = None
    interest_applicable: bool = False
    is_active: bool = True


class LoanTypeUpdate(BaseModel):
    loan_type_name: Optional[str] = Field(None, max_length=150)
    description: Optional[str] = None
    interest_applicable: Optional[bool] = None
    is_active: Optional[bool] = None


# ── Loan Policy ──────────────────────────────────────────────────────────────────

class LoanPolicyCreate(BaseModel):
    policy_name: str = Field(..., max_length=200)
    loan_type_id: str
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    employee_category: Optional[str] = None
    designation_id: Optional[str] = None
    designation_name: Optional[str] = None
    min_service_months: Optional[int] = None
    max_active_loans: Optional[int] = 1
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    max_tenure_months: Optional[int] = None
    interest_type: Optional[str] = None
    interest_rate: Optional[float] = None
    processing_fee: Optional[float] = None
    repayment_method: Optional[str] = None
    require_guarantor: bool = False
    require_documents: bool = False
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: bool = True


class LoanPolicyUpdate(BaseModel):
    policy_name: Optional[str] = Field(None, max_length=200)
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    employee_category: Optional[str] = None
    designation_id: Optional[str] = None
    designation_name: Optional[str] = None
    min_service_months: Optional[int] = None
    max_active_loans: Optional[int] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    max_tenure_months: Optional[int] = None
    interest_type: Optional[str] = None
    interest_rate: Optional[float] = None
    processing_fee: Optional[float] = None
    repayment_method: Optional[str] = None
    require_guarantor: Optional[bool] = None
    require_documents: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None


# ── Loan Application ─────────────────────────────────────────────────────────────

class LoanApplicationCreate(BaseModel):
    employee_id: str
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    designation_name: Optional[str] = None
    loan_type_id: str
    loan_policy_id: Optional[str] = None
    requested_amount: float = Field(..., gt=0)
    requested_tenure: int = Field(..., gt=0)
    purpose: Optional[str] = None
    emi_start_date: Optional[date] = None
    notes: Optional[str] = None


class LoanApplicationUpdate(BaseModel):
    requested_amount: Optional[float] = Field(None, gt=0)
    requested_tenure: Optional[int] = Field(None, gt=0)
    purpose: Optional[str] = None
    emi_start_date: Optional[date] = None
    notes: Optional[str] = None


class LoanApplicationApprove(BaseModel):
    approved_amount: float = Field(..., gt=0)
    approved_tenure: int = Field(..., gt=0)
    interest_type: Optional[str] = None
    interest_rate: Optional[float] = None
    processing_fee: Optional[float] = None
    repayment_method: Optional[str] = None
    comments: Optional[str] = None


class LoanApplicationReject(BaseModel):
    rejection_reason: str


class LoanApplicationCancel(BaseModel):
    reason: Optional[str] = None


# ── Loan Disbursement ────────────────────────────────────────────────────────────

class LoanDisbursementCreate(BaseModel):
    disbursed_amount: float = Field(..., gt=0)
    disbursement_date: date
    payment_method: str = "Bank Transfer"
    transaction_reference: Optional[str] = None
    bank_account: Optional[str] = None
    remarks: Optional[str] = None


# ── Repayment Schedule ───────────────────────────────────────────────────────────

class InstallmentUpdate(BaseModel):
    status: str
    paid_amount: Optional[float] = None
    paid_date: Optional[date] = None
    waiver_reason: Optional[str] = None
    deduction_ref: Optional[str] = None


# ── Loan Closure ─────────────────────────────────────────────────────────────────

class LoanClosureCreate(BaseModel):
    closure_type: str
    closure_date: date
    outstanding_at_closure: float
    amount_recovered: Optional[float] = None
    waived_amount: Optional[float] = None
    closure_notes: Optional[str] = None
