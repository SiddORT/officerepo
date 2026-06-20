"""Payroll Management — Pydantic schemas."""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, field_validator


# ── Salary Components ───────────────────────────────────────────────────────────

class SalaryComponentCreate(BaseModel):
    component_code: str
    component_name: str
    component_type: str
    calc_method: str = "Fixed"
    default_value: Optional[float] = None
    formula: Optional[str] = None
    description: Optional[str] = None
    is_taxable: bool = True
    is_pro_rata: bool = True
    is_active: bool = True

    @field_validator("component_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()


class SalaryComponentUpdate(BaseModel):
    component_name: Optional[str] = None
    component_type: Optional[str] = None
    calc_method: Optional[str] = None
    default_value: Optional[float] = None
    formula: Optional[str] = None
    description: Optional[str] = None
    is_taxable: Optional[bool] = None
    is_pro_rata: Optional[bool] = None
    is_active: Optional[bool] = None


# ── Salary Structures ───────────────────────────────────────────────────────────

class StructureComponentItem(BaseModel):
    component_id: str
    amount: Optional[float] = None
    percentage: Optional[float] = None
    formula: Optional[str] = None
    display_order: int = 0


class SalaryStructureCreate(BaseModel):
    structure_name: str
    description: Optional[str] = None
    currency: str = "INR"
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    components: Optional[List[StructureComponentItem]] = None


class SalaryStructureUpdate(BaseModel):
    structure_name: Optional[str] = None
    description: Optional[str] = None
    currency: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    components: Optional[List[StructureComponentItem]] = None


# ── Employee Compensation ───────────────────────────────────────────────────────

class EmployeeCompensationCreate(BaseModel):
    employee_id: str
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department_name: Optional[str] = None
    designation_name: Optional[str] = None
    structure_id: Optional[str] = None
    structure_name: Optional[str] = None
    ctc_annual: Optional[float] = None
    gross_monthly: Optional[float] = None
    currency: str = "INR"
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    revision_reason: Optional[str] = None


class EmployeeCompensationUpdate(BaseModel):
    structure_id: Optional[str] = None
    structure_name: Optional[str] = None
    ctc_annual: Optional[float] = None
    gross_monthly: Optional[float] = None
    currency: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    revision_reason: Optional[str] = None
    status: Optional[str] = None


# ── Payroll Cycles ──────────────────────────────────────────────────────────────

class PayrollCycleCreate(BaseModel):
    cycle_name: str
    frequency: str = "Monthly"
    processing_day: Optional[int] = None
    salary_day: Optional[int] = None
    cutoff_day: Optional[int] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    branch_id: Optional[str] = None
    branch_name: Optional[str] = None
    description: Optional[str] = None
    is_default: bool = False


class PayrollCycleUpdate(BaseModel):
    cycle_name: Optional[str] = None
    frequency: Optional[str] = None
    processing_day: Optional[int] = None
    salary_day: Optional[int] = None
    cutoff_day: Optional[int] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


# ── Payroll Runs ────────────────────────────────────────────────────────────────

class PayrollRunCreate(BaseModel):
    cycle_id: Optional[str] = None
    period_month: int
    period_year: int
    notes: Optional[str] = None

    @field_validator("period_month")
    @classmethod
    def valid_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("period_month must be 1–12")
        return v


class PayrollRunApprove(BaseModel):
    notes: Optional[str] = None


class PayrollRunProcess(BaseModel):
    employee_ids: Optional[List[str]] = None   # None = all active employees


# ── Statutory Components ────────────────────────────────────────────────────────

class StatutoryComponentCreate(BaseModel):
    statutory_type: str
    component_name: str
    description: Optional[str] = None
    employee_rate: Optional[float] = None
    employer_rate: Optional[float] = None
    fixed_amount: Optional[float] = None
    ceiling_amount: Optional[float] = None
    is_percentage: bool = True
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    applies_to: Optional[str] = None


class StatutoryComponentUpdate(BaseModel):
    statutory_type: Optional[str] = None
    component_name: Optional[str] = None
    description: Optional[str] = None
    employee_rate: Optional[float] = None
    employer_rate: Optional[float] = None
    fixed_amount: Optional[float] = None
    ceiling_amount: Optional[float] = None
    is_percentage: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    applies_to: Optional[str] = None
    is_active: Optional[bool] = None
