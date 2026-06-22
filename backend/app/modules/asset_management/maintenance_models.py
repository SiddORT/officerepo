"""Asset Maintenance models — live in the CLIENT database (ClientBase).

Tables:
  asset_maintenance_requests  — maintenance/repair request lifecycle
  asset_work_orders           — work orders linked to requests
  asset_warranties            — per-asset warranty tracking
  asset_amc_contracts         — Annual Maintenance Contracts
  asset_maintenance_activities — immutable activity log
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class AssetMaintenanceRequest(ClientBase):
    """Maintenance / repair request for an asset."""
    __tablename__ = "asset_maintenance_requests"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    request_number  = Column(String(30), nullable=False, index=True)   # MNT-YYYYMMDD-XXXXXXXX

    # Asset info (denormalized)
    asset_id        = Column(String(36), nullable=False, index=True)
    asset_number    = Column(String(20), nullable=True)
    asset_name      = Column(String(200), nullable=True)
    category_name   = Column(String(100), nullable=True)

    # Requester
    reported_by_id      = Column(String(36), nullable=True, index=True)
    reported_by_name    = Column(String(200), nullable=True)

    # Classification
    maintenance_type    = Column(String(60), nullable=False)
    # Preventive / Corrective / Breakdown / Scheduled Service /
    # Calibration / Warranty Repair / AMC Service

    issue_category      = Column(String(60), nullable=True)
    # Hardware / Software / Electrical / Mechanical / Network /
    # Performance / Calibration / Physical Damage

    issue_description   = Column(Text, nullable=True)
    priority            = Column(String(20), nullable=False, default="Medium")
    # Low / Medium / High / Critical

    reported_date           = Column(Date, nullable=True)
    estimated_downtime_hours = Column(Float, nullable=True)

    # Assignment
    assigned_technician_id      = Column(String(36), nullable=True)
    assigned_technician_name    = Column(String(200), nullable=True)
    vendor_name                 = Column(String(200), nullable=True)
    vendor_contact              = Column(String(100), nullable=True)
    vendor_support_contract     = Column(String(100), nullable=True)

    # Linked records
    warranty_id     = Column(String(36), nullable=True, index=True)
    amc_id          = Column(String(36), nullable=True, index=True)
    work_order_id   = Column(String(36), nullable=True, index=True)

    # Downtime tracking
    downtime_start          = Column(DateTime, nullable=True)
    downtime_end            = Column(DateTime, nullable=True)
    total_downtime_hours    = Column(Float, nullable=True)

    # Resolution
    resolution_notes    = Column(Text, nullable=True)
    next_service_date   = Column(Date, nullable=True)

    # Status: Open / Assigned / Under Inspection / Under Repair /
    #         Waiting For Parts / Quality Check / Completed / Closed / Cancelled
    status      = Column(String(30), nullable=False, default="Open", index=True)

    completed_at    = Column(DateTime, nullable=True)
    closed_at       = Column(DateTime, nullable=True)
    cancelled_at    = Column(DateTime, nullable=True)
    cancel_reason   = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetWorkOrder(ClientBase):
    """Work order for executing a maintenance request."""
    __tablename__ = "asset_work_orders"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    work_order_number = Column(String(30), nullable=False, index=True)  # WO-YYYYMMDD-XXXXXXXX

    request_id      = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=False, index=True)

    # Vendor / technician
    vendor_name             = Column(String(200), nullable=True)
    vendor_contact          = Column(String(100), nullable=True)
    vendor_support_contract = Column(String(100), nullable=True)
    service_sla             = Column(String(100), nullable=True)
    assigned_technician_name = Column(String(200), nullable=True)

    # Schedule
    planned_start_date  = Column(Date, nullable=True)
    planned_end_date    = Column(Date, nullable=True)
    actual_start_date   = Column(Date, nullable=True)
    actual_end_date     = Column(Date, nullable=True)

    # Work details
    parts_used          = Column(Text, nullable=True)   # free-text / JSON string
    labor_hours         = Column(Float, nullable=True)
    resolution_notes    = Column(Text, nullable=True)

    # Costs
    labor_cost          = Column(Float, nullable=True)
    parts_cost          = Column(Float, nullable=True)
    vendor_charges      = Column(Float, nullable=True)
    transport_cost      = Column(Float, nullable=True)
    misc_cost           = Column(Float, nullable=True)
    total_cost          = Column(Float, nullable=True)
    currency            = Column(String(10), nullable=True, default="INR")

    # Status: Pending / In Progress / Completed / Cancelled
    status      = Column(String(30), nullable=False, default="Pending", index=True)

    completed_at    = Column(DateTime, nullable=True)
    cancelled_at    = Column(DateTime, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetWarranty(ClientBase):
    """Warranty record linked to an asset."""
    __tablename__ = "asset_warranties"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    # Asset info (denormalized)
    asset_id        = Column(String(36), nullable=False, index=True)
    asset_number    = Column(String(20), nullable=True)
    asset_name      = Column(String(200), nullable=True)

    warranty_provider   = Column(String(200), nullable=True)
    vendor_contact      = Column(String(100), nullable=True)

    warranty_start_date = Column(Date, nullable=True)
    warranty_end_date   = Column(Date, nullable=True)
    coverage_details    = Column(Text, nullable=True)
    claim_process       = Column(Text, nullable=True)

    # Status: Active / Expired / Extended
    status  = Column(String(20), nullable=False, default="Active", index=True)

    # Alert tracking
    alert_sent_90   = Column(Boolean, nullable=False, default=False)
    alert_sent_60   = Column(Boolean, nullable=False, default=False)
    alert_sent_30   = Column(Boolean, nullable=False, default=False)

    notes   = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetAmcContract(ClientBase):
    """Annual Maintenance Contract for an asset."""
    __tablename__ = "asset_amc_contracts"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    # Asset info (denormalized)
    asset_id        = Column(String(36), nullable=False, index=True)
    asset_number    = Column(String(20), nullable=True)
    asset_name      = Column(String(200), nullable=True)

    amc_number      = Column(String(60), nullable=True)
    vendor_name     = Column(String(200), nullable=True)
    vendor_contact  = Column(String(100), nullable=True)
    service_sla     = Column(String(100), nullable=True)

    contract_value  = Column(Float, nullable=True)
    currency        = Column(String(10), nullable=True, default="INR")
    coverage        = Column(Text, nullable=True)

    start_date      = Column(Date, nullable=True)
    end_date        = Column(Date, nullable=True)
    renewal_date    = Column(Date, nullable=True)

    # Status: Active / Expired / Renewed
    status  = Column(String(20), nullable=False, default="Active", index=True)

    renewal_reminder_sent   = Column(Boolean, nullable=False, default=False)
    notes                   = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetMaintenanceActivity(ClientBase):
    """Immutable activity log for every maintenance lifecycle event."""
    __tablename__ = "asset_maintenance_activities"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    request_id      = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=True, index=True)

    event           = Column(String(60), nullable=False)
    description     = Column(Text, nullable=True)
    actor_id        = Column(String(36), nullable=True)
    actor_name      = Column(String(200), nullable=True)
    old_value       = Column(String(200), nullable=True)
    new_value       = Column(String(200), nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
