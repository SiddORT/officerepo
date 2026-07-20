"""Pydantic schemas for Employee Management."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, field_validator


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    company_id:     str
    department_id:  Optional[str] = None
    designation_id: Optional[str] = None

    first_name:     str
    middle_name:    Optional[str] = None
    last_name:      str
    display_name:   Optional[str] = None
    gender:         Optional[str] = None
    date_of_birth:  Optional[date] = None
    marital_status: Optional[str] = None
    blood_group:    Optional[str] = None
    nationality:    Optional[str] = None
    profile_photo_url: Optional[str] = None

    resume_url:      Optional[str] = None
    resume_filename: Optional[str] = None

    personal_email:   Optional[str] = None
    official_email:   str
    mobile_country_code: Optional[str] = "+91"
    mobile_number:    str
    alternate_mobile_country_code: Optional[str] = "+91"
    alternate_mobile: Optional[str] = None
    landline_number:  Optional[str] = None

    current_address_line_1: Optional[str] = None
    current_address_line_2: Optional[str] = None
    current_city:           Optional[str] = None
    current_district:       Optional[str] = None
    current_state:          Optional[str] = None
    current_country:        Optional[str] = None
    current_postal_code:    Optional[str] = None

    permanent_same_as_current: bool = True
    permanent_address_line_1:  Optional[str] = None
    permanent_address_line_2:  Optional[str] = None
    permanent_city:            Optional[str] = None
    permanent_district:        Optional[str] = None
    permanent_state:           Optional[str] = None
    permanent_country:         Optional[str] = None
    permanent_postal_code:     Optional[str] = None

    employee_category:  Optional[str] = None
    employment_type:    Optional[str] = None
    employment_status:  str = "Draft"

    joining_date:       Optional[date] = None
    confirmation_date:  Optional[date] = None
    relieving_date:     Optional[date] = None

    reporting_manager_id:  Optional[str] = None
    functional_manager_id: Optional[str] = None

    @field_validator("official_email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class EmployeeUpdate(BaseModel):
    department_id:  Optional[str] = None
    designation_id: Optional[str] = None

    first_name:     Optional[str] = None
    middle_name:    Optional[str] = None
    last_name:      Optional[str] = None
    display_name:   Optional[str] = None
    gender:         Optional[str] = None
    date_of_birth:  Optional[date] = None
    marital_status: Optional[str] = None
    blood_group:    Optional[str] = None
    nationality:    Optional[str] = None
    profile_photo_url: Optional[str] = None

    resume_url:      Optional[str] = None
    resume_filename: Optional[str] = None

    personal_email:   Optional[str] = None
    official_email:   Optional[str] = None
    mobile_country_code: Optional[str] = None
    mobile_number:    Optional[str] = None
    alternate_mobile_country_code: Optional[str] = None
    alternate_mobile: Optional[str] = None
    landline_number:  Optional[str] = None

    current_address_line_1: Optional[str] = None
    current_address_line_2: Optional[str] = None
    current_city:           Optional[str] = None
    current_district:       Optional[str] = None
    current_state:          Optional[str] = None
    current_country:        Optional[str] = None
    current_postal_code:    Optional[str] = None

    permanent_same_as_current: Optional[bool] = None
    permanent_address_line_1:  Optional[str] = None
    permanent_address_line_2:  Optional[str] = None
    permanent_city:            Optional[str] = None
    permanent_district:        Optional[str] = None
    permanent_state:           Optional[str] = None
    permanent_country:         Optional[str] = None
    permanent_postal_code:     Optional[str] = None

    employee_category:  Optional[str] = None
    employment_type:    Optional[str] = None
    employment_status:  Optional[str] = None

    joining_date:       Optional[date] = None
    confirmation_date:  Optional[date] = None
    relieving_date:     Optional[date] = None

    reporting_manager_id:  Optional[str] = None
    functional_manager_id: Optional[str] = None


# ── Education ─────────────────────────────────────────────────────────────────

class EducationCreate(BaseModel):
    qualification:    Optional[str] = None
    degree:           Optional[str] = None
    specialization:   Optional[str] = None
    institution_name: Optional[str] = None
    university:       Optional[str] = None
    country:          Optional[str] = None
    start_year:       Optional[int] = None
    end_year:         Optional[int] = None
    percentage:       Optional[Decimal] = None
    cgpa:             Optional[Decimal] = None
    is_completed:     bool = True
    remarks:          Optional[str] = None


class EducationUpdate(EducationCreate):
    pass


# ── Previous Employment ───────────────────────────────────────────────────────

class PreviousEmploymentCreate(BaseModel):
    company_name:              Optional[str] = None
    designation:               Optional[str] = None
    department:                Optional[str] = None
    employment_type:           Optional[str] = None
    start_date:                Optional[date] = None
    end_date:                  Optional[date] = None
    last_salary:               Optional[Decimal] = None
    reporting_manager_name:    Optional[str] = None
    reporting_manager_contact: Optional[str] = None
    reason_for_leaving:        Optional[str] = None
    remarks:                   Optional[str] = None


class PreviousEmploymentUpdate(PreviousEmploymentCreate):
    pass


# ── Family Members ────────────────────────────────────────────────────────────

class FamilyMemberCreate(BaseModel):
    member_name:                  str
    relationship:                 Optional[str] = None
    date_of_birth:                Optional[date] = None
    gender:                       Optional[str] = None
    occupation:                   Optional[str] = None
    phone_country_code:           Optional[str] = "+91"
    phone:                        Optional[str] = None
    alternate_phone_country_code: Optional[str] = "+91"
    alternate_phone:              Optional[str] = None
    email:                        Optional[str] = None
    address:                      Optional[str] = None
    is_dependent:                 bool = False
    is_nominee:                   bool = False
    nomination_percentage:        Optional[Decimal] = None
    is_emergency_contact:         bool = False
    remarks:                      Optional[str] = None


class FamilyMemberUpdate(BaseModel):
    member_name:                  Optional[str] = None
    relationship:                 Optional[str] = None
    date_of_birth:                Optional[date] = None
    gender:                       Optional[str] = None
    occupation:                   Optional[str] = None
    phone_country_code:           Optional[str] = None
    phone:                        Optional[str] = None
    alternate_phone_country_code: Optional[str] = None
    alternate_phone:              Optional[str] = None
    email:                        Optional[str] = None
    address:                      Optional[str] = None
    is_dependent:                 Optional[bool] = None
    is_nominee:                   Optional[bool] = None
    nomination_percentage:        Optional[Decimal] = None
    is_emergency_contact:         Optional[bool] = None
    remarks:                      Optional[str] = None


# ── Bank Details ──────────────────────────────────────────────────────────────

class BankDetailsUpsert(BaseModel):
    account_holder_name:   Optional[str] = None
    bank_name:             Optional[str] = None
    branch_name:           Optional[str] = None
    account_number:        Optional[str] = None
    account_type:          Optional[str] = None
    ifsc_code:             Optional[str] = None
    swift_code:            Optional[str] = None
    upi_id:                Optional[str] = None
    salary_credit_date:    Optional[int] = None
    salary_cycle:          Optional[str] = None
    pf_account_number:     Optional[str] = None
    pf_uan_number:         Optional[str] = None
    esi_number:            Optional[str] = None
    gratuity_applicable:   Optional[bool] = None
    tds_applicable:        Optional[bool] = None
    tds_percentage:        Optional[Decimal] = None
    pan_linked_to_account: Optional[bool] = None


# ── Government IDs ────────────────────────────────────────────────────────────

class GovernmentIdsUpsert(BaseModel):
    pan_number:             Optional[str] = None
    aadhar_number:          Optional[str] = None
    passport_number:        Optional[str] = None
    driving_license_number: Optional[str] = None
    voter_id_number:        Optional[str] = None


# ── Employee Photos ────────────────────────────────────────────────────────────

class PhotoUpdate(BaseModel):
    label:           Optional[str]  = None
    is_profile_icon: Optional[bool] = None
