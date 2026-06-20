"""Employee Document Management models — live in the CLIENT database (ClientBase).

Tables:
  emp_document_types           — document type catalog (system + custom)
  employee_documents           — one document record per employee-doctype
  employee_document_versions   — version history for each document
  employee_document_activities — full audit trail
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class EmpDocumentType(ClientBase):
    """Document type catalog — mix of system defaults and client-custom entries."""
    __tablename__ = "emp_document_types"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)

    code        = Column(String(50),  nullable=False, index=True)
    name        = Column(String(150), nullable=False)
    category    = Column(String(100), nullable=False)

    expiry_tracking       = Column(Boolean, nullable=False, default=False)
    verification_required = Column(Boolean, nullable=False, default=False)
    mandatory_onboarding  = Column(Boolean, nullable=False, default=False)

    is_system   = Column(Boolean, nullable=False, default=True)
    is_active   = Column(Boolean, nullable=False, default=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeDocument(ClientBase):
    """One document record per employee. Supports multiple versions."""
    __tablename__ = "employee_documents"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=False, index=True)
    employee_code   = Column(String(30),  nullable=True)   # denormalized
    employee_name   = Column(String(200), nullable=True)   # denormalized

    document_type_id   = Column(String(36),  nullable=False, index=True)
    document_type_code = Column(String(50),  nullable=True)
    document_type_name = Column(String(150), nullable=True)  # denormalized
    category           = Column(String(100), nullable=True)

    document_number    = Column(String(100), nullable=True)
    issue_date         = Column(Date,        nullable=True)
    expiry_date        = Column(Date,        nullable=True)
    issuing_authority  = Column(String(200), nullable=True)
    remarks            = Column(Text,        nullable=True)

    status         = Column(String(30),  nullable=False, default="Pending Upload", index=True)
    version_number = Column(Integer,     nullable=False, default=0)

    # Latest file snapshot (denormalized from current version)
    file_name   = Column(String(255), nullable=True)
    file_key    = Column(String(500), nullable=True)   # rootless storage key
    file_size   = Column(Integer,     nullable=True)
    file_type   = Column(String(50),  nullable=True)

    # Verification
    verified_by      = Column(String(36),  nullable=True)
    verified_by_name = Column(String(200), nullable=True)
    verified_at      = Column(DateTime,    nullable=True)
    rejection_reason = Column(Text,        nullable=True)

    is_deleted  = Column(Boolean,  nullable=False, default=False)
    deleted_at  = Column(DateTime, nullable=True)
    created_by  = Column(String(200), nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime,    nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeDocumentVersion(ClientBase):
    """Immutable snapshot of each uploaded file (version history)."""
    __tablename__ = "employee_document_versions"

    id              = Column(String(36), primary_key=True, default=_uuid)
    document_id     = Column(String(36), nullable=False, index=True)
    version_number  = Column(Integer,    nullable=False)
    file_name       = Column(String(255), nullable=False)
    file_key        = Column(String(500), nullable=False)
    file_size       = Column(Integer,     nullable=True)
    file_type       = Column(String(50),  nullable=True)
    change_notes    = Column(Text,        nullable=True)
    uploaded_by     = Column(String(200), nullable=True)
    uploaded_at     = Column(DateTime,    nullable=False, default=datetime.utcnow)


class EmployeeDocumentActivity(ClientBase):
    """Audit trail for every action on a document."""
    __tablename__ = "employee_document_activities"

    id          = Column(String(36),  primary_key=True, default=_uuid)
    document_id = Column(String(36),  nullable=False, index=True)
    employee_id = Column(String(36),  nullable=False, index=True)
    action      = Column(String(100), nullable=False)
    actor       = Column(String(200), nullable=True)
    notes       = Column(Text,        nullable=True)
    old_value   = Column(Text,        nullable=True)
    new_value   = Column(Text,        nullable=True)
    created_at  = Column(DateTime,    nullable=False, default=datetime.utcnow)
