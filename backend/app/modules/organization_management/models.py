"""Organization Management models — live in the CLIENT database (ClientBase).

Tables:
  org_companies     — companies owned by a client (ABC Group → ABC Tech, ABC Consulting …)
  org_branches      — physical offices / work locations per company
  org_departments   — departments within a company (supports self-referential hierarchy)
  org_designations  — job designations within a company / department
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class OrgCompany(ClientBase):
    __tablename__ = "org_companies"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    client_id           = Column(String(36), nullable=False, index=True)

    # General
    company_code        = Column(String(60),  nullable=False)
    company_name        = Column(String(200), nullable=False)
    legal_name          = Column(String(200), nullable=True)
    display_name        = Column(String(200), nullable=True)

    # Registration
    registration_number = Column(String(100), nullable=True)
    tax_number          = Column(String(100), nullable=True)

    # Contact
    email               = Column(String(254), nullable=True)
    phone               = Column(String(30),  nullable=True)
    phone_country_code  = Column(String(10),  nullable=True)
    website             = Column(String(255), nullable=True)

    # Address
    address_line_1      = Column(String(255), nullable=True)
    address_line_2      = Column(String(255), nullable=True)
    city                = Column(String(100), nullable=True)
    district            = Column(String(50),  nullable=True)
    state               = Column(String(100), nullable=True)
    country             = Column(String(100), nullable=True)
    postal_code         = Column(String(20),  nullable=True)

    # Industry
    industry            = Column(String(200), nullable=True)
    sub_industry        = Column(String(200), nullable=True)

    # Branding
    logo_url            = Column(String(500), nullable=True)

    # Classification / lifecycle
    company_type        = Column(String(60),  nullable=True)   # Private Limited / LLP / …
    date_of_incorporation = Column(Date, nullable=True)
    company_description = Column(Text, nullable=True)
    status              = Column(String(20),  nullable=False, default="Active")  # Draft/Active/Inactive/Suspended/Closed

    # Compliance
    cin_number          = Column(String(30),  nullable=True)
    pan_number          = Column(String(20),  nullable=True)
    tan_number          = Column(String(20),  nullable=True)
    msme_registered     = Column(Boolean, nullable=False, default=False)
    msme_number         = Column(String(30),  nullable=True)
    gst_registered      = Column(Boolean, nullable=False, default=False)
    gst_registration_date = Column(Date, nullable=True)
    tax_identification_number = Column(String(50), nullable=True)

    # Additional contacts
    primary_contact_person = Column(String(200), nullable=True)
    support_email       = Column(String(254), nullable=True)
    hr_email            = Column(String(254), nullable=True)
    accounts_email      = Column(String(254), nullable=True)

    # Office (operating) address — distinct from registered address above
    office_same         = Column(Boolean, nullable=False, default=True)
    off_address_line_1  = Column(String(255), nullable=True)
    off_address_line_2  = Column(String(255), nullable=True)
    off_city            = Column(String(100), nullable=True)
    off_district        = Column(String(50),  nullable=True)
    off_state           = Column(String(100), nullable=True)
    off_country         = Column(String(100), nullable=True)
    off_postal_code     = Column(String(20),  nullable=True)

    is_active           = Column(Boolean, nullable=False, default=True)
    is_deleted          = Column(Boolean, nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OrgBranch(ClientBase):
    __tablename__ = "org_branches"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    client_id           = Column(String(36), nullable=False, index=True)
    company_id          = Column(String(36), ForeignKey("org_companies.id", ondelete="RESTRICT"), nullable=False, index=True)

    branch_code         = Column(String(60),  nullable=False)
    branch_name         = Column(String(200), nullable=False)
    branch_type         = Column(String(60),  nullable=True)   # Head Office / Regional Office …

    # Contact
    email               = Column(String(254), nullable=True)
    phone               = Column(String(30),  nullable=True)
    phone_country_code  = Column(String(10),  nullable=True)

    # Address
    address_line_1      = Column(String(255), nullable=True)
    address_line_2      = Column(String(255), nullable=True)
    city                = Column(String(100), nullable=True)
    district            = Column(String(50),  nullable=True)
    state               = Column(String(100), nullable=True)
    country             = Column(String(100), nullable=True)
    postal_code         = Column(String(20),  nullable=True)
    description         = Column(Text, nullable=True)

    is_active           = Column(Boolean, nullable=False, default=True)
    is_deleted          = Column(Boolean, nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OrgDepartment(ClientBase):
    __tablename__ = "org_departments"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    client_id           = Column(String(36), nullable=False, index=True)
    company_id          = Column(String(36), ForeignKey("org_companies.id", ondelete="RESTRICT"), nullable=False, index=True)   # OrgCompany (same client DB)
    department_code     = Column(String(60),  nullable=False)
    department_name     = Column(String(200), nullable=False)
    parent_id           = Column(String(36), ForeignKey("org_departments.id", ondelete="RESTRICT"), nullable=True, index=True)    # self-ref
    head_user_id        = Column(String(36), nullable=True)                # ClientAdminUser in platform DB (legacy)
    head_employee_id    = Column(String(36), nullable=True)                # Employee in same client DB
    head_effective_from = Column(Date, nullable=True)
    head_effective_to   = Column(Date, nullable=True)
    description         = Column(Text, nullable=True)

    is_active           = Column(Boolean, nullable=False, default=True)
    is_deleted          = Column(Boolean, nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class OrgDesignation(ClientBase):
    __tablename__ = "org_designations"

    id                  = Column(String(36), primary_key=True, default=_uuid)
    client_id           = Column(String(36), nullable=False, index=True)
    company_id          = Column(String(36), ForeignKey("org_companies.id", ondelete="RESTRICT"), nullable=False, index=True)
    department_id       = Column(String(36), ForeignKey("org_departments.id", ondelete="SET NULL"), nullable=True,  index=True)   # optional
    designation_code    = Column(String(60),  nullable=False)
    designation_name    = Column(String(200), nullable=False)
    level               = Column(Integer, nullable=True)
    description         = Column(Text, nullable=True)

    is_active           = Column(Boolean, nullable=False, default=True)
    is_deleted          = Column(Boolean, nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
