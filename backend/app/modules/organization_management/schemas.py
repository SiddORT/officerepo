"""Pydantic schemas for Organization Management."""
from __future__ import annotations

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, field_validator


# ── Companies ──────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    company_code:        str
    company_name:        str
    legal_name:          Optional[str] = None
    display_name:        Optional[str] = None
    registration_number: Optional[str] = None
    tax_number:          Optional[str] = None
    email:               Optional[str] = None
    phone:               Optional[str] = None
    website:             Optional[str] = None
    address_line_1:      Optional[str] = None
    address_line_2:      Optional[str] = None
    city:                Optional[str] = None
    state:               Optional[str] = None
    country:             Optional[str] = None
    postal_code:         Optional[str] = None
    logo_url:            Optional[str] = None

    @field_validator("company_code")
    @classmethod
    def strip_code(cls, v: str) -> str:
        return v.strip().upper()


class CompanyUpdate(BaseModel):
    company_name:        Optional[str] = None
    legal_name:          Optional[str] = None
    display_name:        Optional[str] = None
    registration_number: Optional[str] = None
    tax_number:          Optional[str] = None
    email:               Optional[str] = None
    phone:               Optional[str] = None
    website:             Optional[str] = None
    address_line_1:      Optional[str] = None
    address_line_2:      Optional[str] = None
    city:                Optional[str] = None
    state:               Optional[str] = None
    country:             Optional[str] = None
    postal_code:         Optional[str] = None
    logo_url:            Optional[str] = None


# ── Departments ────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    company_id:          str
    department_code:     str
    department_name:     str
    parent_id:           Optional[str] = None
    head_user_id:        Optional[str] = None
    head_employee_id:    Optional[str] = None
    head_effective_from: Optional[date] = None
    head_effective_to:   Optional[date] = None
    description:         Optional[str] = None

    @field_validator("department_code")
    @classmethod
    def strip_code(cls, v: str) -> str:
        return v.strip().upper()


class DepartmentUpdate(BaseModel):
    department_name:     Optional[str] = None
    parent_id:           Optional[str] = None
    head_user_id:        Optional[str] = None
    head_employee_id:    Optional[str] = None
    head_effective_from: Optional[date] = None
    head_effective_to:   Optional[date] = None
    description:         Optional[str] = None


# ── Designations ───────────────────────────────────────────────────────────────

class DesignationCreate(BaseModel):
    company_id:       str
    department_id:    Optional[str] = None
    designation_code: str
    designation_name: str
    level:            Optional[int] = None
    description:      Optional[str] = None

    @field_validator("designation_code")
    @classmethod
    def strip_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Level must be between 1 and 10.")
        return v


class DesignationUpdate(BaseModel):
    designation_name: Optional[str] = None
    department_id:    Optional[str] = None
    level:            Optional[int] = None
    description:      Optional[str] = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Level must be between 1 and 10.")
        return v
