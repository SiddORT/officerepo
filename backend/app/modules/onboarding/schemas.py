"""Pydantic schemas for the Employee Onboarding module."""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ── Template ──────────────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    template_name:     str
    employee_category: Optional[str] = None
    description:       Optional[str] = None
    department_id:     Optional[str] = None
    department_name:   Optional[str] = None
    designation_id:    Optional[str] = None
    designation_name:  Optional[str] = None
    is_active:         bool = True
    is_default:        bool = False


class TemplateUpdate(BaseModel):
    template_name:     Optional[str] = None
    employee_category: Optional[str] = None
    description:       Optional[str] = None
    department_id:     Optional[str] = None
    department_name:   Optional[str] = None
    designation_id:    Optional[str] = None
    designation_name:  Optional[str] = None
    is_active:         Optional[bool] = None
    is_default:        Optional[bool] = None


# ── Template Task ─────────────────────────────────────────────────────────────

class TemplateTaskCreate(BaseModel):
    task_name:       str
    category:        str = "HR"
    owner_team:      Optional[str] = None
    description:     Optional[str] = None
    due_offset_days: int = 0
    sequence:        int = 1
    is_mandatory:    bool = True
    is_active:       bool = True


class TemplateTaskUpdate(BaseModel):
    task_name:       Optional[str] = None
    category:        Optional[str] = None
    owner_team:      Optional[str] = None
    description:     Optional[str] = None
    due_offset_days: Optional[int] = None
    sequence:        Optional[int] = None
    is_mandatory:    Optional[bool] = None
    is_active:       Optional[bool] = None


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingStart(BaseModel):
    employee_id:       str
    offer_id:          Optional[str] = None
    candidate_id:      Optional[str] = None
    template_id:       Optional[str] = None
    joining_date:      Optional[date] = None
    employee_category: Optional[str] = None
    notes:             Optional[str] = None


class OnboardingUpdate(BaseModel):
    status:            Optional[str] = None
    template_id:       Optional[str] = None
    joining_date:      Optional[date] = None
    employee_category: Optional[str] = None
    notes:             Optional[str] = None


# ── Onboarding Task ───────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    task_name:    str
    category:     str = "HR"
    owner_team:   Optional[str] = None
    description:  Optional[str] = None
    due_date:     Optional[date] = None
    sequence:     int = 1
    is_mandatory: bool = False


class TaskStatusUpdate(BaseModel):
    status: str
    notes:  Optional[str] = None


# ── Account ───────────────────────────────────────────────────────────────────

class AccountCreate(BaseModel):
    account_type: str
    username:     Optional[str] = None
    notes:        Optional[str] = None
    status:       str = "Pending"
    created_date: Optional[date] = None


class AccountUpdate(BaseModel):
    account_type: Optional[str] = None
    username:     Optional[str] = None
    notes:        Optional[str] = None
    status:       Optional[str] = None
    created_date: Optional[date] = None


# ── Training ──────────────────────────────────────────────────────────────────

class TrainingCreate(BaseModel):
    course_name:  str
    course_type:  Optional[str] = None
    provider:     Optional[str] = None
    description:  Optional[str] = None
    is_mandatory: bool = False
    assigned_date: Optional[date] = None
    due_date:      Optional[date] = None
    status:        str = "Assigned"


class TrainingUpdate(BaseModel):
    course_name:    Optional[str] = None
    course_type:    Optional[str] = None
    provider:       Optional[str] = None
    description:    Optional[str] = None
    is_mandatory:   Optional[bool] = None
    assigned_date:  Optional[date] = None
    due_date:       Optional[date] = None
    completed_date: Optional[date] = None
    status:         Optional[str] = None


# ── Asset assignment (proxy to asset_management) ──────────────────────────────

class OnboardingAssetAssign(BaseModel):
    asset_id:             str
    assigned_date:        Optional[date] = None
    expected_return_date: Optional[date] = None
    assignment_notes:     Optional[str] = None
