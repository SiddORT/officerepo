"""Employee Management models — live in the CLIENT database (ClientBase).

Tables:
  employees                     — master employee record
  employee_education            — education history (multiple per employee)
  employee_previous_employment  — work history (multiple per employee)
  employee_family_members       — family / dependents (multiple per employee)
  employee_emergency_contacts   — emergency contacts (multiple per employee)
  employee_bank_details         — bank account + salary + TDS info (one per employee)
  employee_government_ids       — government ID numbers (one per employee)
  employee_activities           — activity/audit log
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class Employee(ClientBase):
    __tablename__ = "employees"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)

    # Employment org references
    company_id      = Column(String(36), nullable=False, index=True)
    department_id   = Column(String(36), nullable=True,  index=True)
    designation_id  = Column(String(36), nullable=True,  index=True)

    # Code (EMP-00001 series)
    employee_code   = Column(String(30), nullable=False, index=True)

    # Personal
    first_name      = Column(String(100), nullable=False)
    middle_name     = Column(String(100), nullable=True)
    last_name       = Column(String(100), nullable=False)
    display_name    = Column(String(200), nullable=True)
    gender          = Column(String(30),  nullable=True)
    date_of_birth   = Column(Date,        nullable=True)
    marital_status  = Column(String(30),  nullable=True)
    blood_group     = Column(String(10),  nullable=True)
    nationality     = Column(String(100), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)

    # Resume
    resume_url      = Column(String(500), nullable=True)
    resume_filename = Column(String(255), nullable=True)

    # Contact
    personal_email      = Column(String(254), nullable=True)
    official_email      = Column(String(254), nullable=False, index=True)
    mobile_country_code = Column(String(10),  nullable=True, default="+91")
    mobile_number       = Column(String(30),  nullable=False)
    alternate_mobile_country_code = Column(String(10), nullable=True, default="+91")
    alternate_mobile    = Column(String(30),  nullable=True)
    landline_number     = Column(String(30),  nullable=True)

    # Current address
    current_address_line_1 = Column(String(255), nullable=True)
    current_address_line_2 = Column(String(255), nullable=True)
    current_city           = Column(String(100), nullable=True)
    current_state          = Column(String(100), nullable=True)
    current_country        = Column(String(100), nullable=True)
    current_postal_code    = Column(String(20),  nullable=True)

    # Permanent address
    permanent_same_as_current = Column(Boolean, nullable=False, default=True)
    permanent_address_line_1  = Column(String(255), nullable=True)
    permanent_address_line_2  = Column(String(255), nullable=True)
    permanent_city            = Column(String(100), nullable=True)
    permanent_state           = Column(String(100), nullable=True)
    permanent_country         = Column(String(100), nullable=True)
    permanent_postal_code     = Column(String(20),  nullable=True)

    # Employment classification
    employee_category   = Column(String(50), nullable=True)
    employment_type     = Column(String(50), nullable=True)
    employment_status   = Column(String(50), nullable=False, default="Draft")

    # Dates
    joining_date        = Column(Date, nullable=True)
    confirmation_date   = Column(Date, nullable=True)
    relieving_date      = Column(Date, nullable=True)

    # Reporting
    reporting_manager_id   = Column(String(36), nullable=True)
    functional_manager_id  = Column(String(36), nullable=True)

    # Audit
    is_active   = Column(Boolean,  nullable=False, default=True)
    is_deleted  = Column(Boolean,  nullable=False, default=False)
    deleted_at  = Column(DateTime, nullable=True)
    created_by  = Column(String(36), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeEducation(ClientBase):
    __tablename__ = "employee_education"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    employee_id     = Column(String(36), nullable=False, index=True)

    qualification   = Column(String(100), nullable=True)
    degree          = Column(String(150), nullable=True)
    specialization  = Column(String(150), nullable=True)
    institution_name= Column(String(200), nullable=True)
    university      = Column(String(200), nullable=True)
    country         = Column(String(100), nullable=True)
    start_year      = Column(Integer,     nullable=True)
    end_year        = Column(Integer,     nullable=True)
    percentage      = Column(Numeric(5,2),nullable=True)
    cgpa            = Column(Numeric(4,2),nullable=True)
    is_completed    = Column(Boolean,     nullable=False, default=True)
    remarks         = Column(Text,        nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeePreviousEmployment(ClientBase):
    __tablename__ = "employee_previous_employment"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    employee_id     = Column(String(36), nullable=False, index=True)

    company_name            = Column(String(200), nullable=True)
    designation             = Column(String(150), nullable=True)
    department              = Column(String(150), nullable=True)
    employment_type         = Column(String(50),  nullable=True)
    start_date              = Column(Date,        nullable=True)
    end_date                = Column(Date,        nullable=True)
    last_salary             = Column(Numeric(12,2),nullable=True)
    reporting_manager_name  = Column(String(150), nullable=True)
    reporting_manager_contact= Column(String(50),  nullable=True)
    reason_for_leaving      = Column(Text,        nullable=True)
    remarks                 = Column(Text,        nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeFamilyMember(ClientBase):
    __tablename__ = "employee_family_members"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    employee_id     = Column(String(36), nullable=False, index=True)

    member_name         = Column(String(150), nullable=False)
    relationship        = Column(String(50),  nullable=True)
    date_of_birth       = Column(Date,        nullable=True)
    gender              = Column(String(20),  nullable=True)
    occupation          = Column(String(100), nullable=True)
    phone_country_code  = Column(String(10),  nullable=True, default="+91")
    phone               = Column(String(30),  nullable=True)
    is_dependent        = Column(Boolean,     nullable=False, default=False)
    is_nominee          = Column(Boolean,     nullable=False, default=False)
    nomination_percentage = Column(Numeric(5,2), nullable=True)
    remarks             = Column(Text,        nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeEmergencyContact(ClientBase):
    __tablename__ = "employee_emergency_contacts"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    employee_id     = Column(String(36), nullable=False, index=True)

    contact_name        = Column(String(150), nullable=False)
    relationship        = Column(String(50),  nullable=True)
    mobile_country_code = Column(String(10),  nullable=True, default="+91")
    mobile_number       = Column(String(30),  nullable=False)
    alternate_country_code = Column(String(10), nullable=True, default="+91")
    alternate_number    = Column(String(30),  nullable=True)
    address             = Column(Text,        nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeBankDetails(ClientBase):
    __tablename__ = "employee_bank_details"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    client_id           = Column(String(36), nullable=False, index=True)
    employee_id         = Column(String(36), nullable=False, index=True, unique=True)

    # Bank account
    account_holder_name = Column(String(200), nullable=True)
    bank_name           = Column(String(200), nullable=True)
    branch_name         = Column(String(200), nullable=True)
    account_number      = Column(String(50),  nullable=True)
    account_type        = Column(String(30),  nullable=True)   # Savings / Current / Salary
    ifsc_code           = Column(String(20),  nullable=True)
    swift_code          = Column(String(20),  nullable=True)
    upi_id              = Column(String(100), nullable=True)

    # Salary details
    salary_credit_date  = Column(Integer,     nullable=True)   # day of month (1-31)
    salary_cycle        = Column(String(20),  nullable=True)   # Monthly / Weekly / Bi-weekly

    # PF / ESI / Gratuity
    pf_account_number   = Column(String(30),  nullable=True)
    pf_uan_number       = Column(String(30),  nullable=True)
    esi_number          = Column(String(30),  nullable=True)
    gratuity_applicable = Column(Boolean,     nullable=True, default=False)

    # TDS
    tds_applicable      = Column(Boolean,     nullable=True, default=False)
    tds_percentage      = Column(Numeric(5,2),nullable=True)
    pan_linked_to_account = Column(Boolean,   nullable=True, default=False)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeGovernmentIds(ClientBase):
    __tablename__ = "employee_government_ids"

    id                      = Column(String(36), primary_key=True, default=_uuid)
    client_id               = Column(String(36), nullable=False, index=True)
    employee_id             = Column(String(36), nullable=False, index=True, unique=True)

    pan_number              = Column(String(20),  nullable=True)
    aadhar_number           = Column(String(20),  nullable=True)
    passport_number         = Column(String(30),  nullable=True)
    driving_license_number  = Column(String(30),  nullable=True)
    voter_id_number         = Column(String(30),  nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EmployeeActivity(ClientBase):
    __tablename__ = "employee_activities"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    employee_id = Column(String(36), nullable=False, index=True)

    action      = Column(String(60),  nullable=False)
    actor_id    = Column(String(36),  nullable=True)
    ip_address  = Column(String(50),  nullable=True)
    old_value   = Column(Text,        nullable=True)
    new_value   = Column(Text,        nullable=True)
    notes       = Column(Text,        nullable=True)

    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
