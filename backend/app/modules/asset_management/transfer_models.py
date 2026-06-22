"""Asset Transfers models — live in the CLIENT database (ClientBase).

Tables:
  asset_transfers                 — transfer request / lifecycle record
  asset_transfer_acknowledgements — source handover + destination acceptance
  asset_transfer_activities       — immutable activity log
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class AssetTransfer(ClientBase):
    """Full lifecycle record for transferring an assigned asset."""
    __tablename__ = "asset_transfers"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    transfer_number = Column(String(30), nullable=False, index=True)   # TRF-YYYYMMDD-XXXXXXXX

    # Asset being transferred (denormalized for query speed)
    asset_id            = Column(String(36), nullable=False, index=True)
    asset_number        = Column(String(20), nullable=True)
    asset_name          = Column(String(200), nullable=True)
    category_name       = Column(String(100), nullable=True)

    # Current (source) assignment
    from_assignment_id  = Column(String(36), nullable=False, index=True)
    from_assignee_id    = Column(String(36), nullable=True, index=True)
    from_assignee_name  = Column(String(200), nullable=True)
    from_assignee_type  = Column(String(30), nullable=True)   # Employee/Department/Branch/Company
    from_employee_id    = Column(String(36), nullable=True, index=True)
    from_employee_name  = Column(String(200), nullable=True)
    from_branch_id      = Column(String(36), nullable=True)
    from_branch_name    = Column(String(200), nullable=True)
    from_department_id  = Column(String(36), nullable=True)
    from_department_name = Column(String(200), nullable=True)

    # Destination (target)
    to_assignee_id      = Column(String(36), nullable=True, index=True)
    to_assignee_name    = Column(String(200), nullable=True)
    to_assignee_type    = Column(String(30), nullable=True)   # Employee/Department/Branch/Company
    to_employee_id      = Column(String(36), nullable=True, index=True)
    to_employee_name    = Column(String(200), nullable=True)
    to_branch_id        = Column(String(36), nullable=True)
    to_branch_name      = Column(String(200), nullable=True)
    to_department_id    = Column(String(36), nullable=True)
    to_department_name  = Column(String(200), nullable=True)

    # New assignment created on completion
    to_assignment_id    = Column(String(36), nullable=True, index=True)

    # Classification
    transfer_type   = Column(String(60), nullable=False, default="Employee Transfer")
    # Employee Transfer / Department Transfer / Branch Transfer / Company Transfer / Temporary Transfer

    transfer_reason = Column(String(100), nullable=True)
    # Employee Exit / Role Change / Department Change / Branch Relocation
    # Replacement / Temporary Requirement

    # Temporary transfer fields
    is_temporary            = Column(Boolean, nullable=False, default=False)
    expected_return_date    = Column(Date, nullable=True)

    transfer_date           = Column(Date, nullable=True)
    remarks                 = Column(Text, nullable=True)

    # Request
    requested_by_id         = Column(String(36), nullable=True)
    requested_by_name       = Column(String(200), nullable=True)

    # Approval
    approved_by_id          = Column(String(36), nullable=True)
    approved_by_name        = Column(String(200), nullable=True)
    approved_at             = Column(DateTime, nullable=True)
    rejection_reason        = Column(Text, nullable=True)

    # Status: Draft / Submitted / Approved / Rejected / In Transit / Completed / Cancelled
    status      = Column(String(30), nullable=False, default="Draft", index=True)

    completed_at    = Column(DateTime, nullable=True)
    cancelled_at    = Column(DateTime, nullable=True)
    cancel_reason   = Column(Text, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetTransferAcknowledgement(ClientBase):
    """Handover and acceptance records for a transfer."""
    __tablename__ = "asset_transfer_acknowledgements"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    transfer_id     = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=False, index=True)

    # Source handover
    handover_date       = Column(Date, nullable=True)
    handed_over_by_id   = Column(String(36), nullable=True)
    handed_over_by_name = Column(String(200), nullable=True)
    condition_at_handover = Column(String(30), nullable=True)   # Excellent/Good/Fair/Damaged
    handover_notes      = Column(Text, nullable=True)
    handover_confirmed  = Column(Boolean, nullable=False, default=False)

    # Destination acceptance
    received_date       = Column(Date, nullable=True)
    received_by_id      = Column(String(36), nullable=True)
    received_by_name    = Column(String(200), nullable=True)
    condition_at_receipt = Column(String(30), nullable=True)    # Excellent/Good/Fair/Damaged
    receipt_notes       = Column(Text, nullable=True)
    receipt_confirmed   = Column(Boolean, nullable=False, default=False)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetTransferActivity(ClientBase):
    """Immutable activity log for every transfer lifecycle event."""
    __tablename__ = "asset_transfer_activities"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)
    transfer_id     = Column(String(36), nullable=False, index=True)
    asset_id        = Column(String(36), nullable=True, index=True)

    event           = Column(String(50), nullable=False)
    description     = Column(Text, nullable=True)
    actor_id        = Column(String(36), nullable=True)
    actor_name      = Column(String(200), nullable=True)
    old_value       = Column(String(200), nullable=True)
    new_value       = Column(String(200), nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
