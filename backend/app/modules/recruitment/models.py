"""Recruitment module models — stored in the CLIENT database (ClientBase).

Tables:
  job_requisitions      — department requests for new headcount
  job_openings          — active positions derived from approved requisitions
  candidates            — applicant records
  candidate_documents   — supporting files per candidate
  offers                — formal offer records
  candidate_activities  — audit trail for all candidate events
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class JobRequisition(ClientBase):
    """A department's request to fill one or more positions."""
    __tablename__ = "job_requisitions"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    requisition_number  = Column(String(40),  nullable=False, unique=True, index=True)

    company_id          = Column(String(36),  nullable=True, index=True)
    company_name        = Column(String(200), nullable=True)
    branch_id           = Column(String(36),  nullable=True)
    branch_name         = Column(String(200), nullable=True)
    department_id       = Column(String(36),  nullable=False, index=True)
    department_name     = Column(String(200), nullable=True)
    designation_id      = Column(String(36),  nullable=False, index=True)
    designation_name    = Column(String(200), nullable=True)

    hiring_manager      = Column(String(200), nullable=True)
    number_of_positions = Column(Integer,     nullable=False, default=1)
    employment_type     = Column(String(50),  nullable=True)
    employee_category   = Column(String(50),  nullable=True)
    reason_for_hiring   = Column(String(50),  nullable=True)

    budget_min          = Column(Numeric(14, 2), nullable=True)
    budget_max          = Column(Numeric(14, 2), nullable=True)
    target_joining_date = Column(Date,        nullable=True)

    job_description     = Column(Text, nullable=True)
    skills_required     = Column(Text, nullable=True)

    status              = Column(String(30), nullable=False, default="Draft", index=True)
    rejection_reason    = Column(Text, nullable=True)

    is_deleted          = Column(Boolean,  nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(String(200), nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobOpening(ClientBase):
    """An active job vacancy created from an approved requisition."""
    __tablename__ = "job_openings"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    opening_number   = Column(String(40),  nullable=False, unique=True, index=True)

    requisition_id   = Column(String(36),  nullable=True, index=True)  # optional link
    job_title        = Column(String(200), nullable=False)

    company_id       = Column(String(36),  nullable=True, index=True)
    company_name     = Column(String(200), nullable=True)
    branch_id        = Column(String(36),  nullable=True)
    branch_name      = Column(String(200), nullable=True)
    department_id    = Column(String(36),  nullable=True, index=True)
    department_name  = Column(String(200), nullable=True)
    designation_id   = Column(String(36),  nullable=True)
    designation_name = Column(String(200), nullable=True)

    number_of_vacancies  = Column(Integer,  nullable=False, default=1)
    employment_type      = Column(String(50), nullable=True)
    employee_category    = Column(String(50), nullable=True)
    experience_required  = Column(String(100), nullable=True)
    location             = Column(String(200), nullable=True)

    salary_min           = Column(Numeric(14, 2), nullable=True)
    salary_max           = Column(Numeric(14, 2), nullable=True)
    application_deadline = Column(Date,    nullable=True)

    status           = Column(String(30), nullable=False, default="Open", index=True)

    is_deleted       = Column(Boolean,  nullable=False, default=False)
    deleted_at       = Column(DateTime, nullable=True)
    created_by       = Column(String(200), nullable=True)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Candidate(ClientBase):
    """An applicant in the recruitment pipeline."""
    __tablename__ = "candidates"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    candidate_number    = Column(String(40),  nullable=False, unique=True, index=True)

    # Basic information
    first_name          = Column(String(100), nullable=False)
    last_name           = Column(String(100), nullable=False)
    email               = Column(String(200), nullable=False, index=True)
    mobile_number       = Column(String(20),  nullable=False)
    date_of_birth       = Column(Date,        nullable=True)
    gender              = Column(String(30),  nullable=True)

    # Professional information
    total_experience    = Column(String(50),  nullable=True)   # e.g. "3 years"
    relevant_experience = Column(String(50),  nullable=True)
    current_company     = Column(String(200), nullable=True)
    current_designation = Column(String(200), nullable=True)
    current_salary      = Column(Numeric(14, 2), nullable=True)
    expected_salary     = Column(Numeric(14, 2), nullable=True)
    notice_period       = Column(String(50),  nullable=True)   # e.g. "30 days"

    # Application information
    source              = Column(String(100), nullable=True)
    applied_position_id = Column(String(36),  nullable=True, index=True)  # job_opening id
    applied_position    = Column(String(200), nullable=True)  # denormalized
    assigned_recruiter  = Column(String(200), nullable=True)

    status              = Column(String(50),  nullable=False, default="Applied", index=True)

    # Resume
    resume_file_name    = Column(String(255), nullable=True)
    resume_file_key     = Column(String(500), nullable=True)
    resume_file_size    = Column(Integer,     nullable=True)
    resume_file_type    = Column(String(50),  nullable=True)

    # Employee conversion link
    employee_id         = Column(String(36),  nullable=True, index=True)

    is_deleted          = Column(Boolean,  nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(String(200), nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CandidateDocument(ClientBase):
    """Supporting documents attached to a candidate."""
    __tablename__ = "candidate_documents"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    candidate_id    = Column(String(36),  nullable=False, index=True)

    document_type   = Column(String(100), nullable=False)
    file_name       = Column(String(255), nullable=False)
    file_key        = Column(String(500), nullable=False)
    file_size       = Column(Integer,     nullable=True)
    file_type       = Column(String(50),  nullable=True)

    verification_status = Column(String(30), nullable=False, default="Pending")
    verified_by     = Column(String(200), nullable=True)
    verified_at     = Column(DateTime,    nullable=True)

    uploaded_by     = Column(String(200), nullable=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Offer(ClientBase):
    """Formal job offer made to a selected candidate."""
    __tablename__ = "offers"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    offer_number        = Column(String(40),  nullable=False, unique=True, index=True)

    candidate_id        = Column(String(36),  nullable=False, index=True)
    candidate_name      = Column(String(200), nullable=True)  # denormalized

    opening_id          = Column(String(36),  nullable=True, index=True)

    offered_designation_id   = Column(String(36),  nullable=True)
    offered_designation_name = Column(String(200), nullable=True)
    offered_department_id    = Column(String(36),  nullable=True)
    offered_department_name  = Column(String(200), nullable=True)
    offered_branch_id        = Column(String(36),  nullable=True)
    offered_branch_name      = Column(String(200), nullable=True)

    joining_date        = Column(Date,         nullable=True)
    offered_salary      = Column(Numeric(14,2), nullable=True)
    offer_expiry_date   = Column(Date,         nullable=True)

    status              = Column(String(30),  nullable=False, default="Draft", index=True)
    rejection_reason    = Column(Text, nullable=True)

    # Employee created on acceptance
    employee_id         = Column(String(36),  nullable=True)

    is_deleted          = Column(Boolean,  nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(String(200), nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class CandidateActivity(ClientBase):
    """Full audit trail for candidate-related events."""
    __tablename__ = "candidate_activities"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    candidate_id    = Column(String(36),  nullable=False, index=True)

    action          = Column(String(100), nullable=False)
    actor           = Column(String(200), nullable=True)
    old_value       = Column(Text,        nullable=True)
    new_value       = Column(Text,        nullable=True)
    notes           = Column(Text,        nullable=True)

    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
