"""Repository layer — Asset Transfers. Raw SQLAlchemy queries only."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.modules.asset_management.transfer_models import (
    AssetTransfer, AssetTransferAcknowledgement, AssetTransferActivity,
)


# ── Sequence number ────────────────────────────────────────────────────────────

def next_transfer_number(db: Session, client_id: str) -> str:
    prefix = f"TRF-{datetime.utcnow().strftime('%Y%m%d')}-"
    count = (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id,
                AssetTransfer.transfer_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}{(count + 1):08d}"


# ── Asset Transfers ────────────────────────────────────────────────────────────

def create_transfer(db: Session, data: dict) -> AssetTransfer:
    obj = AssetTransfer(**data)
    db.add(obj)
    db.flush()
    return obj


def get_transfer(db: Session, client_id: str, transfer_id: str) -> Optional[AssetTransfer]:
    return (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id, AssetTransfer.id == transfer_id)
        .first()
    )


def get_transfer_by_assignment(db: Session, client_id: str, assignment_id: str,
                                active_only: bool = True) -> Optional[AssetTransfer]:
    q = db.query(AssetTransfer).filter(
        AssetTransfer.client_id == client_id,
        AssetTransfer.from_assignment_id == assignment_id,
    )
    if active_only:
        q = q.filter(AssetTransfer.status.notin_(["Rejected", "Cancelled", "Completed"]))
    return q.first()


def update_transfer(db: Session, obj: AssetTransfer, data: dict) -> AssetTransfer:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_transfers(
    db: Session, client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    transfer_type: Optional[str] = None,
    asset_id: Optional[str] = None,
    from_employee_id: Optional[str] = None,
    to_employee_id: Optional[str] = None,
    is_temporary: Optional[bool] = None,
    page: int = 1, page_size: int = 20,
) -> Tuple[List[AssetTransfer], int]:
    q = db.query(AssetTransfer).filter(AssetTransfer.client_id == client_id)

    if status:
        q = q.filter(AssetTransfer.status == status)
    if transfer_type:
        q = q.filter(AssetTransfer.transfer_type == transfer_type)
    if asset_id:
        q = q.filter(AssetTransfer.asset_id == asset_id)
    if from_employee_id:
        q = q.filter(AssetTransfer.from_employee_id == from_employee_id)
    if to_employee_id:
        q = q.filter(AssetTransfer.to_employee_id == to_employee_id)
    if is_temporary is not None:
        q = q.filter(AssetTransfer.is_temporary == is_temporary)
    if search:
        like = f"%{search}%"
        q = q.filter(
            AssetTransfer.transfer_number.ilike(like) |
            AssetTransfer.asset_name.ilike(like) |
            AssetTransfer.from_assignee_name.ilike(like) |
            AssetTransfer.to_assignee_name.ilike(like) |
            AssetTransfer.from_employee_name.ilike(like) |
            AssetTransfer.to_employee_name.ilike(like)
        )

    total = q.count()
    rows = (
        q.order_by(AssetTransfer.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total


def get_dashboard_counts(db: Session, client_id: str) -> dict:
    today = date.today()
    pending_statuses = ["Draft", "Submitted", "Approved"]
    in_transit_statuses = ["In Transit"]

    pending = (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id,
                AssetTransfer.status.in_(pending_statuses))
        .count()
    )
    in_transit = (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id,
                AssetTransfer.status.in_(in_transit_statuses))
        .count()
    )
    temporary = (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id,
                AssetTransfer.is_temporary.is_(True),
                AssetTransfer.status.notin_(["Cancelled", "Completed"]))
        .count()
    )
    completed_today = (
        db.query(AssetTransfer)
        .filter(AssetTransfer.client_id == client_id,
                AssetTransfer.status == "Completed",
                AssetTransfer.completed_at >= datetime.combine(today, datetime.min.time())
                if hasattr(datetime, 'combine') else True)
        .count()
    )
    return {
        "pending_transfers": pending,
        "in_transit": in_transit,
        "temporary_transfers": temporary,
        "completed_today": completed_today,
    }


# ── Acknowledgements ───────────────────────────────────────────────────────────

def get_acknowledgement(db: Session, transfer_id: str) -> Optional[AssetTransferAcknowledgement]:
    return (
        db.query(AssetTransferAcknowledgement)
        .filter(AssetTransferAcknowledgement.transfer_id == transfer_id)
        .first()
    )


def upsert_acknowledgement(db: Session, transfer_id: str, asset_id: str,
                            client_id: str, data: dict) -> AssetTransferAcknowledgement:
    obj = get_acknowledgement(db, transfer_id)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
    else:
        obj = AssetTransferAcknowledgement(
            client_id=client_id, transfer_id=transfer_id, asset_id=asset_id, **data
        )
        db.add(obj)
    db.flush()
    return obj


# ── Activities ─────────────────────────────────────────────────────────────────

def log_activity(db: Session, data: dict) -> AssetTransferActivity:
    obj = AssetTransferActivity(**data)
    db.add(obj)
    db.flush()
    return obj


def list_activities(db: Session, transfer_id: str) -> List[AssetTransferActivity]:
    return (
        db.query(AssetTransferActivity)
        .filter(AssetTransferActivity.transfer_id == transfer_id)
        .order_by(AssetTransferActivity.created_at.asc())
        .all()
    )
