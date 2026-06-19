"""Asset Inventory models — live in the CLIENT database (ClientBase).

Tables:
  assets               — actual client-owned assets
  asset_assignments    — assignment history (employee ↔ asset)
  asset_documents      — uploaded files per asset
  asset_activities     — full audit trail
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class Asset(ClientBase):
    """Physical or virtual asset owned by a client."""
    __tablename__ = "assets"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    # Number + public UUID (for QR)
    asset_number    = Column(String(20),  nullable=False, index=True)   # AST-000001
    asset_uuid      = Column(String(36),  nullable=False, unique=True, default=_uuid)

    # Classification (denormalized for query speed)
    asset_name          = Column(String(200), nullable=False)
    category_id         = Column(String(36),  nullable=True, index=True)
    category_name       = Column(String(100), nullable=True)
    sub_category_id     = Column(String(36),  nullable=True, index=True)
    sub_category_name   = Column(String(100), nullable=True)
    asset_master_id     = Column(String(36),  nullable=True, index=True)

    # Status
    status          = Column(String(30), nullable=False, default="Available", index=True)

    # Asset details
    brand           = Column(String(100), nullable=True)
    manufacturer    = Column(String(150), nullable=True)
    model_number    = Column(String(100), nullable=True)
    part_number     = Column(String(100), nullable=True)
    serial_number   = Column(String(150), nullable=True, index=True)
    barcode_number  = Column(String(100), nullable=True)

    # Organization mapping
    company_id      = Column(String(36), nullable=True, index=True)
    company_name    = Column(String(200), nullable=True)
    branch_id       = Column(String(36), nullable=True, index=True)
    branch_name     = Column(String(200), nullable=True)
    department_id   = Column(String(36), nullable=True, index=True)
    department_name = Column(String(200), nullable=True)

    # Active assignment (denormalized snapshot)
    assigned_employee_id    = Column(String(36),  nullable=True, index=True)
    assigned_employee_name  = Column(String(200), nullable=True)
    assigned_date           = Column(Date, nullable=True)
    expected_return_date    = Column(Date, nullable=True)
    assignment_notes        = Column(Text, nullable=True)

    # Work location
    work_location_type = Column(String(30), nullable=True)  # Office/Remote/Hybrid/Shared

    # Purchase info
    purchase_date           = Column(Date,    nullable=True)
    purchase_cost           = Column(Numeric(14, 2), nullable=True)
    currency                = Column(String(10), nullable=True, default="INR")
    vendor_name             = Column(String(200), nullable=True)
    vendor_contact          = Column(String(100), nullable=True)
    invoice_number          = Column(String(100), nullable=True)
    purchase_order_number   = Column(String(100), nullable=True)

    # Warranty
    warranty_available      = Column(Boolean, nullable=False, default=False)
    warranty_start_date     = Column(Date, nullable=True)
    warranty_end_date       = Column(Date, nullable=True)
    warranty_provider       = Column(String(200), nullable=True)
    warranty_reference_number = Column(String(100), nullable=True)

    # AMC
    amc_applicable  = Column(Boolean, nullable=False, default=False)
    amc_start_date  = Column(Date, nullable=True)
    amc_end_date    = Column(Date, nullable=True)
    amc_vendor      = Column(String(200), nullable=True)
    amc_cost        = Column(Numeric(14, 2), nullable=True)

    # Insurance
    insurance_available     = Column(Boolean, nullable=False, default=False)
    insurance_provider      = Column(String(200), nullable=True)
    policy_number           = Column(String(100), nullable=True)
    coverage_amount         = Column(Numeric(14, 2), nullable=True)
    insurance_start_date    = Column(Date, nullable=True)
    insurance_end_date      = Column(Date, nullable=True)

    # Maintenance
    maintenance_required    = Column(Boolean, nullable=False, default=False)
    last_maintenance_date   = Column(Date, nullable=True)
    next_maintenance_date   = Column(Date, nullable=True)
    maintenance_frequency   = Column(String(30), nullable=True)

    # Soft delete
    is_deleted  = Column(Boolean, nullable=False, default=False)
    deleted_at  = Column(DateTime, nullable=True)

    created_by      = Column(String(36), nullable=True)
    created_by_name = Column(String(200), nullable=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)


class AssetAssignment(ClientBase):
    """Assignment history — one active row per asset when assigned."""
    __tablename__ = "asset_assignments"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=False, index=True)

    employee_id     = Column(String(36),  nullable=True, index=True)
    employee_name   = Column(String(200), nullable=True)
    employee_code   = Column(String(30),  nullable=True)

    assigned_date           = Column(Date, nullable=True)
    expected_return_date    = Column(Date, nullable=True)
    actual_return_date      = Column(Date, nullable=True)

    assignment_notes    = Column(Text, nullable=True)
    return_notes        = Column(Text, nullable=True)
    condition_on_return = Column(String(30), nullable=True)  # Good/Damaged/Lost

    status          = Column(String(20), nullable=False, default="Active", index=True)

    assigned_by     = Column(String(200), nullable=True)
    returned_by     = Column(String(200), nullable=True)

    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)


class AssetDocument(ClientBase):
    """Uploaded documents attached to an asset."""
    __tablename__ = "asset_documents"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=False, index=True)

    document_type   = Column(String(50),  nullable=False)
    file_key        = Column(String(500), nullable=True)
    original_filename = Column(String(255), nullable=True)
    remarks         = Column(Text, nullable=True)

    uploaded_by     = Column(String(200), nullable=True)
    uploaded_at     = Column(DateTime, nullable=False, default=datetime.utcnow)

    is_deleted  = Column(Boolean, nullable=False, default=False)
    deleted_at  = Column(DateTime, nullable=True)


class AssetActivity(ClientBase):
    """Full lifecycle audit trail for each asset."""
    __tablename__ = "asset_activities"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    asset_id    = Column(String(36), nullable=False, index=True)

    action      = Column(String(60),  nullable=False)
    description = Column(Text,        nullable=True)
    actor_id    = Column(String(36),  nullable=True)
    actor_name  = Column(String(200), nullable=True)
    old_value   = Column(Text, nullable=True)
    new_value   = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
