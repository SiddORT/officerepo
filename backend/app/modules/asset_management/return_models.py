"""Asset Returns models — live in the CLIENT database (ClientBase).

Tables:
  asset_returns               — return request / lifecycle record
  asset_return_assessments    — condition assessment at return
  asset_return_recoveries     — recovery amount (lost/damaged)
  asset_return_activities     — immutable activity log
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class AssetReturn(ClientBase):
    """Full lifecycle record for returning an assigned asset."""
    __tablename__ = "asset_returns"

    id              = Column(String(36), primary_key=True, default=_uuid)
    client_id       = Column(String(36), nullable=False, index=True)

    return_number   = Column(String(30), nullable=False, index=True)   # RET-YYYYMMDD-XXXXXXXX

    # Source assignment + asset (denormalized for query speed)
    assignment_id       = Column(String(36), nullable=False, index=True)
    asset_id            = Column(String(36), nullable=False, index=True)
    asset_number        = Column(String(20), nullable=True)
    asset_name          = Column(String(200), nullable=True)
    category_name       = Column(String(100), nullable=True)
    assignee_id         = Column(String(36), nullable=True, index=True)
    assignee_name       = Column(String(200), nullable=True)
    employee_id         = Column(String(36), nullable=True, index=True)
    employee_name       = Column(String(200), nullable=True)

    # Classification
    return_type   = Column(String(60), nullable=False, default="Full Return")
    # Full Return / Partial Return / Temporary Assignment Return / Replacement Return

    return_source = Column(String(60), nullable=True)
    # Employee Exit / Replacement Request / Temporary Assignment Expiry
    # Manual Return / Transfer Request

    return_reason = Column(String(100), nullable=True)
    # Employee Exit / Project Completed / Asset Upgrade / Temporary Assignment Ended
    # Replacement Requested / Asset No Longer Required

    # Source references
    exit_id       = Column(String(36), nullable=True, index=True)
    request_id    = Column(String(36), nullable=True, index=True)

    # Request fields
    requested_by_id     = Column(String(36), nullable=True)
    requested_by_name   = Column(String(200), nullable=True)
    requested_return_date = Column(Date, nullable=True)
    remarks             = Column(Text, nullable=True)

    # Processing
    return_date         = Column(Date, nullable=True)
    received_by_id      = Column(String(36), nullable=True)
    received_by_name    = Column(String(200), nullable=True)
    receiving_location  = Column(String(200), nullable=True)
    return_notes        = Column(Text, nullable=True)

    # Approval
    approved_by_id      = Column(String(36), nullable=True)
    approved_by_name    = Column(String(200), nullable=True)
    approved_at         = Column(DateTime, nullable=True)
    rejection_reason    = Column(Text, nullable=True)

    # Acknowledgement
    is_acknowledged     = Column(Boolean, nullable=False, default=False)
    acknowledged_at     = Column(DateTime, nullable=True)
    acknowledged_by_name = Column(String(200), nullable=True)

    # Status
    status = Column(String(30), nullable=False, default="Draft", index=True)
    # Draft / Submitted / Approved / Rejected / In Progress / Returned / Closed

    closed_at   = Column(DateTime, nullable=True)
    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetReturnAssessment(ClientBase):
    """Condition assessment captured when an asset is physically returned."""
    __tablename__ = "asset_return_assessments"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    return_id   = Column(String(36), nullable=False, index=True)
    asset_id    = Column(String(36), nullable=False, index=True)

    # Condition values: Excellent / Good / Fair / Damaged / Lost
    physical_condition      = Column(String(30), nullable=True)
    functional_condition    = Column(String(30), nullable=True)
    accessories_returned    = Column(Boolean, nullable=False, default=True)
    inspection_notes        = Column(Text, nullable=True)

    assessed_by_id      = Column(String(36), nullable=True)
    assessed_by_name    = Column(String(200), nullable=True)
    assessed_at         = Column(DateTime, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetReturnRecovery(ClientBase):
    """Recovery amount record for lost or damaged assets."""
    __tablename__ = "asset_return_recoveries"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    return_id   = Column(String(36), nullable=False, index=True)
    asset_id    = Column(String(36), nullable=False, index=True)

    # Full Recovery / Partial Recovery / Waived
    recovery_type           = Column(String(30), nullable=True)
    estimated_cost          = Column(Numeric(14, 2), nullable=True)
    approved_recovery_amount = Column(Numeric(14, 2), nullable=True)
    currency                = Column(String(10), nullable=True, default="INR")
    recovery_notes          = Column(Text, nullable=True)

    approved_by_id      = Column(String(36), nullable=True)
    approved_by_name    = Column(String(200), nullable=True)
    approved_at         = Column(DateTime, nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at  = Column(DateTime, nullable=False, default=datetime.utcnow,
                         onupdate=datetime.utcnow)


class AssetReturnActivity(ClientBase):
    """Immutable activity log for every return lifecycle event."""
    __tablename__ = "asset_return_activities"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    return_id   = Column(String(36), nullable=False, index=True)
    asset_id    = Column(String(36), nullable=True, index=True)

    event       = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    actor_id    = Column(String(36), nullable=True)
    actor_name  = Column(String(200), nullable=True)
    old_value   = Column(String(200), nullable=True)
    new_value   = Column(String(200), nullable=True)

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)
