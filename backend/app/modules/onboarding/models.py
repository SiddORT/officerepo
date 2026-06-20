"""Employee Onboarding models — stored in the CLIENT database (ClientBase).

Tables:
  onboarding_templates         — reusable onboarding workflow templates
  onboarding_template_tasks    — ordered tasks within a template
  employee_onboarding          — one active onboarding record per employee
  employee_onboarding_tasks    — task instances for a specific onboarding
  employee_accounts            — provisioned accounts (email, VPN, HRMS, etc.)
  employee_training_assignments— training / LMS course assignments
  onboarding_activities        — full audit trail
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class OnboardingTemplate(ClientBase):
    """Reusable onboarding workflow template."""
    __tablename__ = "onboarding_templates"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)

    template_name     = Column(String(200), nullable=False)
    employee_category = Column(String(100), nullable=True)
    description       = Column(Text,        nullable=True)

    department_id     = Column(String(36),  nullable=True)
    department_name   = Column(String(200), nullable=True)
    designation_id    = Column(String(36),  nullable=True)
    designation_name  = Column(String(200), nullable=True)

    is_active    = Column(Boolean,  nullable=False, default=True)
    is_default   = Column(Boolean,  nullable=False, default=False)

    is_deleted   = Column(Boolean,  nullable=False, default=False)
    deleted_at   = Column(DateTime, nullable=True)
    created_by   = Column(String(200), nullable=True)
    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingTemplateTask(ClientBase):
    """An ordered task within an onboarding template."""
    __tablename__ = "onboarding_template_tasks"

    id              = Column(String(36),  primary_key=True, default=_uuid)
    client_id       = Column(String(36),  nullable=False, index=True)
    template_id     = Column(String(36),  nullable=False, index=True)

    task_name       = Column(String(200), nullable=False)
    category        = Column(String(50),  nullable=False, default="HR")  # HR/IT/Admin/Manager/Finance
    owner_team      = Column(String(100), nullable=True)
    description     = Column(Text,        nullable=True)
    due_offset_days = Column(Integer,     nullable=False, default=0)  # days after joining
    sequence        = Column(Integer,     nullable=False, default=1)
    is_mandatory    = Column(Boolean,     nullable=False, default=True)
    is_active       = Column(Boolean,     nullable=False, default=True)

    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeOnboarding(ClientBase):
    """One onboarding record per new hire."""
    __tablename__ = "employee_onboarding"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    onboarding_number   = Column(String(40),  nullable=False, unique=True, index=True)

    # Linked records
    employee_id         = Column(String(36),  nullable=False, index=True)
    employee_name       = Column(String(200), nullable=True)   # denormalized
    employee_code       = Column(String(30),  nullable=True)   # denormalized

    candidate_id        = Column(String(36),  nullable=True, index=True)
    offer_id            = Column(String(36),  nullable=True, index=True)

    # Template used
    template_id         = Column(String(36),  nullable=True)
    template_name       = Column(String(200), nullable=True)

    # Metadata
    joining_date        = Column(Date,        nullable=True)
    employee_category   = Column(String(100), nullable=True)
    department_name     = Column(String(200), nullable=True)
    designation_name    = Column(String(200), nullable=True)

    # Status & progress
    status              = Column(String(60),  nullable=False, default="Preboarding", index=True)
    progress_percent    = Column(Integer,     nullable=False, default=0)
    notes               = Column(Text,        nullable=True)

    # Completion
    started_at          = Column(DateTime,    nullable=True)
    completed_at        = Column(DateTime,    nullable=True)
    completed_by        = Column(String(200), nullable=True)
    activated_at        = Column(DateTime,    nullable=True)
    activated_by        = Column(String(200), nullable=True)

    is_deleted   = Column(Boolean,  nullable=False, default=False)
    deleted_at   = Column(DateTime, nullable=True)
    created_by   = Column(String(200), nullable=True)
    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeOnboardingTask(ClientBase):
    """A task instance within a specific employee's onboarding."""
    __tablename__ = "employee_onboarding_tasks"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    onboarding_id    = Column(String(36),  nullable=False, index=True)
    template_task_id = Column(String(36),  nullable=True)   # nullable = ad-hoc task

    task_name        = Column(String(200), nullable=False)
    category         = Column(String(50),  nullable=False, default="HR")
    owner_team       = Column(String(100), nullable=True)
    description      = Column(Text,        nullable=True)
    due_date         = Column(Date,        nullable=True)
    sequence         = Column(Integer,     nullable=False, default=1)
    is_mandatory     = Column(Boolean,     nullable=False, default=True)

    status           = Column(String(30),  nullable=False, default="Pending", index=True)
    completed_by     = Column(String(200), nullable=True)
    completed_at     = Column(DateTime,    nullable=True)
    notes            = Column(Text,        nullable=True)

    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeAccount(ClientBase):
    """Account provisioned for an employee during onboarding."""
    __tablename__ = "employee_accounts"

    id            = Column(String(36),  primary_key=True, default=_uuid)
    client_id     = Column(String(36),  nullable=False, index=True)
    onboarding_id = Column(String(36),  nullable=False, index=True)
    employee_id   = Column(String(36),  nullable=False, index=True)

    account_type  = Column(String(100), nullable=False)   # Official Email / VPN / etc.
    username      = Column(String(200), nullable=True)
    notes         = Column(Text,        nullable=True)
    status        = Column(String(30),  nullable=False, default="Pending")
    created_date  = Column(Date,        nullable=True)

    created_by    = Column(String(200), nullable=True)
    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at    = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeTrainingAssignment(ClientBase):
    """Training / LMS course assigned to an employee during onboarding."""
    __tablename__ = "employee_training_assignments"

    id            = Column(String(36),  primary_key=True, default=_uuid)
    client_id     = Column(String(36),  nullable=False, index=True)
    onboarding_id = Column(String(36),  nullable=False, index=True)
    employee_id   = Column(String(36),  nullable=False, index=True)

    course_name   = Column(String(200), nullable=False)
    course_type   = Column(String(60),  nullable=True)   # Mandatory/Policy/Compliance/etc.
    provider      = Column(String(200), nullable=True)
    description   = Column(Text,        nullable=True)
    is_mandatory  = Column(Boolean,     nullable=False, default=False)

    assigned_date  = Column(Date,     nullable=True)
    due_date       = Column(Date,     nullable=True)
    completed_date = Column(Date,     nullable=True)
    status         = Column(String(30), nullable=False, default="Assigned", index=True)

    assigned_by    = Column(String(200), nullable=True)
    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingActivity(ClientBase):
    """Audit trail for the onboarding lifecycle."""
    __tablename__ = "onboarding_activities"

    id            = Column(String(36),  primary_key=True, default=_uuid)
    client_id     = Column(String(36),  nullable=False, index=True)
    onboarding_id = Column(String(36),  nullable=False, index=True)
    employee_id   = Column(String(36),  nullable=True, index=True)

    action        = Column(String(100), nullable=False)
    actor         = Column(String(200), nullable=True)
    old_value     = Column(String(500), nullable=True)
    new_value     = Column(String(500), nullable=True)
    notes         = Column(Text,        nullable=True)

    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
