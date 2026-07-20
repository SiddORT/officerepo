"""Pydantic schemas for Organization Management."""
from __future__ import annotations

from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# ── Companies ──────────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    company_code:        str = Field(..., max_length=60)
    company_name:        str = Field(..., max_length=200)
    legal_name:          Optional[str] = Field(None, max_length=200)
    display_name:        Optional[str] = Field(None, max_length=200)
    registration_number: Optional[str] = Field(None, max_length=100)
    tax_number:          Optional[str] = Field(None, max_length=100)
    email:               Optional[str] = Field(None, max_length=254)
    phone:               Optional[str] = Field(None, max_length=30)
    phone_country_code:  Optional[str] = Field(None, max_length=10)
    website:             Optional[str] = Field(None, max_length=255)
    address_line_1:      Optional[str] = Field(None, max_length=255)
    address_line_2:      Optional[str] = Field(None, max_length=255)
    city:                Optional[str] = Field(None, max_length=100)
    district:            Optional[str] = Field(None, max_length=50)
    state:               Optional[str] = Field(None, max_length=100)
    country:             Optional[str] = Field(None, max_length=100)
    postal_code:         Optional[str] = Field(None, max_length=20)
    industry:            Optional[str] = Field(None, max_length=200)
    logo_url:            Optional[str] = Field(None, max_length=500)

    # Classification / lifecycle
    company_type:          Optional[str] = Field(None, max_length=60)
    date_of_incorporation: Optional[date] = None
    company_description:   Optional[str] = None
    status:                Optional[str] = Field(None, max_length=20)

    # Compliance
    cin_number:                Optional[str] = Field(None, max_length=30)
    pan_number:                Optional[str] = Field(None, max_length=20)
    tan_number:                Optional[str] = Field(None, max_length=20)
    msme_registered:            Optional[bool] = None
    msme_number:                Optional[str] = Field(None, max_length=30)
    gst_registered:              Optional[bool] = None
    gst_registration_date:      Optional[date] = None
    tax_identification_number:  Optional[str] = Field(None, max_length=50)

    # Additional contacts
    primary_contact_person: Optional[str] = Field(None, max_length=200)
    support_email:           Optional[str] = Field(None, max_length=254)
    hr_email:                Optional[str] = Field(None, max_length=254)
    accounts_email:          Optional[str] = Field(None, max_length=254)

    # Office (operating) address
    office_same:         Optional[bool] = None
    off_address_line_1:  Optional[str] = Field(None, max_length=255)
    off_address_line_2:  Optional[str] = Field(None, max_length=255)
    off_city:            Optional[str] = Field(None, max_length=100)
    off_district:        Optional[str] = Field(None, max_length=50)
    off_state:           Optional[str] = Field(None, max_length=100)
    off_country:         Optional[str] = Field(None, max_length=100)
    off_postal_code:     Optional[str] = Field(None, max_length=20)

    @field_validator("company_code")
    @classmethod
    def strip_code(cls, v: str) -> str:
        return v.strip().upper()


class CompanyUpdate(BaseModel):
    company_name:        Optional[str] = Field(None, max_length=200)
    legal_name:          Optional[str] = Field(None, max_length=200)
    display_name:        Optional[str] = Field(None, max_length=200)
    registration_number: Optional[str] = Field(None, max_length=100)
    tax_number:          Optional[str] = Field(None, max_length=100)
    email:               Optional[str] = Field(None, max_length=254)
    phone:               Optional[str] = Field(None, max_length=30)
    phone_country_code:  Optional[str] = Field(None, max_length=10)
    website:             Optional[str] = Field(None, max_length=255)
    address_line_1:      Optional[str] = Field(None, max_length=255)
    address_line_2:      Optional[str] = Field(None, max_length=255)
    city:                Optional[str] = Field(None, max_length=100)
    district:            Optional[str] = Field(None, max_length=50)
    state:               Optional[str] = Field(None, max_length=100)
    country:             Optional[str] = Field(None, max_length=100)
    postal_code:         Optional[str] = Field(None, max_length=20)
    industry:            Optional[str] = Field(None, max_length=200)
    logo_url:            Optional[str] = Field(None, max_length=500)

    company_type:          Optional[str] = Field(None, max_length=60)
    date_of_incorporation: Optional[date] = None
    company_description:   Optional[str] = None
    status:                Optional[str] = Field(None, max_length=20)

    cin_number:                Optional[str] = Field(None, max_length=30)
    pan_number:                Optional[str] = Field(None, max_length=20)
    tan_number:                Optional[str] = Field(None, max_length=20)
    msme_registered:            Optional[bool] = None
    msme_number:                Optional[str] = Field(None, max_length=30)
    gst_registered:              Optional[bool] = None
    gst_registration_date:      Optional[date] = None
    tax_identification_number:  Optional[str] = Field(None, max_length=50)

    primary_contact_person: Optional[str] = Field(None, max_length=200)
    support_email:           Optional[str] = Field(None, max_length=254)
    hr_email:                Optional[str] = Field(None, max_length=254)
    accounts_email:          Optional[str] = Field(None, max_length=254)

    office_same:         Optional[bool] = None
    off_address_line_1:  Optional[str] = Field(None, max_length=255)
    off_address_line_2:  Optional[str] = Field(None, max_length=255)
    off_city:            Optional[str] = Field(None, max_length=100)
    off_district:        Optional[str] = Field(None, max_length=50)
    off_state:           Optional[str] = Field(None, max_length=100)
    off_country:         Optional[str] = Field(None, max_length=100)
    off_postal_code:     Optional[str] = Field(None, max_length=20)


# ── Branches ───────────────────────────────────────────────────────────────────

_GSTIN_RE = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"


class BranchCreate(BaseModel):
    company_id:    str
    branch_code:   str = Field(..., max_length=60)
    branch_name:   str = Field(..., max_length=200)
    branch_type:   Optional[str] = Field(None, max_length=60)
    email:         Optional[str] = Field(None, max_length=254)
    phone:         Optional[str] = Field(None, max_length=30)
    phone_country_code: Optional[str] = Field(None, max_length=10)
    branch_manager: Optional[str] = Field(None, max_length=200)
    branch_manager_id: Optional[str] = Field(None, max_length=36)
    landline:       Optional[str] = Field(None, max_length=30)
    landline_country_code: Optional[str] = Field(None, max_length=10)
    additional_emails: Optional[list] = None
    additional_phones: Optional[list] = None
    address_line_1: Optional[str] = Field(None, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city:          Optional[str] = Field(None, max_length=100)
    district:      Optional[str] = Field(None, max_length=50)
    state:         Optional[str] = Field(None, max_length=100)
    country:       Optional[str] = Field(None, max_length=100)
    postal_code:   Optional[str] = Field(None, max_length=20)
    description:   Optional[str] = None
    # GST & Tax
    gst_registered:        Optional[bool]  = None
    gstin:                 Optional[str]   = Field(None, max_length=15)
    gst_registration_date: Optional[date]  = None
    gst_jurisdiction:      Optional[str]   = Field(None, max_length=100)
    state_code:            Optional[str]   = Field(None, max_length=10)

    @field_validator("branch_code")
    @classmethod
    def strip_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v):
        if v:
            import re
            if not re.match(_GSTIN_RE, v.strip().upper()):
                raise ValueError("Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5")
            return v.strip().upper()
        return v


class BranchUpdate(BaseModel):
    branch_name:   Optional[str] = Field(None, max_length=200)
    branch_code:   Optional[str] = Field(None, max_length=60)
    branch_type:   Optional[str] = Field(None, max_length=60)
    email:         Optional[str] = Field(None, max_length=254)
    phone:         Optional[str] = Field(None, max_length=30)
    phone_country_code: Optional[str] = Field(None, max_length=10)
    branch_manager: Optional[str] = Field(None, max_length=200)
    branch_manager_id: Optional[str] = Field(None, max_length=36)
    landline:       Optional[str] = Field(None, max_length=30)
    landline_country_code: Optional[str] = Field(None, max_length=10)
    additional_emails: Optional[list] = None
    additional_phones: Optional[list] = None
    address_line_1: Optional[str] = Field(None, max_length=255)
    address_line_2: Optional[str] = Field(None, max_length=255)
    city:          Optional[str] = Field(None, max_length=100)
    district:      Optional[str] = Field(None, max_length=50)
    state:         Optional[str] = Field(None, max_length=100)
    country:       Optional[str] = Field(None, max_length=100)
    postal_code:   Optional[str] = Field(None, max_length=20)
    description:   Optional[str] = None
    # GST & Tax
    gst_registered:        Optional[bool]  = None
    gstin:                 Optional[str]   = Field(None, max_length=15)
    gst_registration_date: Optional[date]  = None
    gst_jurisdiction:      Optional[str]   = Field(None, max_length=100)
    state_code:            Optional[str]   = Field(None, max_length=10)

    @field_validator("branch_code")
    @classmethod
    def strip_code(cls, v) -> Optional[str]:
        if v:
            return v.strip().upper()
        return v

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v):
        if v:
            import re
            if not re.match(_GSTIN_RE, v.strip().upper()):
                raise ValueError("Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5")
            return v.strip().upper()
        return v


# ── Departments ────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    company_id:          str
    department_code:     str = Field(..., max_length=60)
    department_name:     str = Field(..., max_length=200)
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
    department_name:     Optional[str] = Field(None, max_length=200)
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
    designation_code: str = Field(..., max_length=60)
    designation_name: str = Field(..., max_length=200)
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
    designation_name: Optional[str] = Field(None, max_length=200)
    department_id:    Optional[str] = None
    level:            Optional[int] = None
    description:      Optional[str] = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, v):
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Level must be between 1 and 10.")
        return v
