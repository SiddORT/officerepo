"""Pydantic schemas for the Recruitment module."""
from __future__ import annotations

from datetime import date
from typing import List, Optional
from decimal import Decimal

from pydantic import BaseModel, EmailStr, field_validator


# ── Job Requisition ───────────────────────────────────────────────────────────

class RequisitionCreate(BaseModel):
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: str
    designation_id: str
    hiring_manager: Optional[str] = None
    number_of_positions: int = 1
    employment_type: Optional[str] = None
    employee_category: Optional[str] = None
    reason_for_hiring: Optional[str] = None
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    target_joining_date: Optional[date] = None
    job_description: Optional[str] = None
    skills_required: Optional[str] = None


class RequisitionUpdate(BaseModel):
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    hiring_manager: Optional[str] = None
    number_of_positions: Optional[int] = None
    employment_type: Optional[str] = None
    employee_category: Optional[str] = None
    reason_for_hiring: Optional[str] = None
    budget_min: Optional[Decimal] = None
    budget_max: Optional[Decimal] = None
    target_joining_date: Optional[date] = None
    job_description: Optional[str] = None
    skills_required: Optional[str] = None


class RequisitionApproveReject(BaseModel):
    rejection_reason: Optional[str] = None


# ── Job Opening ───────────────────────────────────────────────────────────────

class OpeningCreate(BaseModel):
    requisition_id: Optional[str] = None
    job_title: str
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    hiring_manager: Optional[str] = None
    number_of_vacancies: int = 1
    employment_type: Optional[str] = None
    employee_category: Optional[str] = None
    experience_required: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    application_deadline: Optional[date] = None
    expected_joining_date: Optional[date] = None


class OpeningUpdate(BaseModel):
    job_title: Optional[str] = None
    company_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    hiring_manager: Optional[str] = None
    number_of_vacancies: Optional[int] = None
    employment_type: Optional[str] = None
    employee_category: Optional[str] = None
    experience_required: Optional[str] = None
    salary_min: Optional[Decimal] = None
    salary_max: Optional[Decimal] = None
    application_deadline: Optional[date] = None
    expected_joining_date: Optional[date] = None
    status: Optional[str] = None


# ── Candidate ─────────────────────────────────────────────────────────────────

class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    mobile_number: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    total_experience: Optional[str] = None
    relevant_experience: Optional[str] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_salary: Optional[Decimal] = None
    expected_salary: Optional[Decimal] = None
    notice_period: Optional[str] = None
    source: Optional[str] = None
    applied_position_id: Optional[str] = None
    assigned_recruiter: Optional[str] = None


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    total_experience: Optional[str] = None
    relevant_experience: Optional[str] = None
    current_company: Optional[str] = None
    current_designation: Optional[str] = None
    current_salary: Optional[Decimal] = None
    expected_salary: Optional[Decimal] = None
    notice_period: Optional[str] = None
    source: Optional[str] = None
    applied_position_id: Optional[str] = None
    assigned_recruiter: Optional[str] = None


class CandidateStatusChange(BaseModel):
    status: str
    notes: Optional[str] = None


# ── Offer ─────────────────────────────────────────────────────────────────────

class OfferCreate(BaseModel):
    candidate_id: str
    opening_id: Optional[str] = None
    offered_designation_id: Optional[str] = None
    offered_department_id: Optional[str] = None
    offered_branch_id: Optional[str] = None
    joining_date: Optional[date] = None
    offered_salary: Optional[Decimal] = None
    offer_expiry_date: Optional[date] = None


class OfferUpdate(BaseModel):
    offered_designation_id: Optional[str] = None
    offered_department_id: Optional[str] = None
    offered_branch_id: Optional[str] = None
    joining_date: Optional[date] = None
    offered_salary: Optional[Decimal] = None
    offer_expiry_date: Optional[date] = None


class OfferAction(BaseModel):
    rejection_reason: Optional[str] = None
