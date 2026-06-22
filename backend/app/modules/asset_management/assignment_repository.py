"""Repository — Asset Assignments. Pure DB queries for the assignment workflow."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.modules.asset_management.inventory_models import (
    Asset,
    AssetAssignment,
    AssetAssignmentHistory,
    AssetAssignmentRequest,
    AssetAcknowledgement,
)


# ── Number series ──────────────────────────────────────────────────────────────

def next_request_number(db: Session, client_id: str) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(AssetAssignmentRequest.id)).filter(
        AssetAssignmentRequest.client_id == client_id
    ).scalar() or 0
    import uuid
    tail = uuid.uuid4().hex[:8].upper()
    return f"REQ-{today}-{tail}"


def next_assignment_number(db: Session, client_id: str) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(AssetAssignment.id)).filter(
        AssetAssignment.client_id == client_id
    ).scalar() or 0
    import uuid
    tail = uuid.uuid4().hex[:8].upper()
    return f"ASGN-{today}-{tail}"


# ── Assignment Requests ────────────────────────────────────────────────────────

def create_request(db: Session, data: dict) -> AssetAssignmentRequest:
    obj = AssetAssignmentRequest(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_request(db: Session, client_id: str, request_id: str) -> Optional[AssetAssignmentRequest]:
    return db.query(AssetAssignmentRequest).filter(
        AssetAssignmentRequest.id == request_id,
        AssetAssignmentRequest.client_id == client_id,
    ).first()


def update_request(db: Session, req: AssetAssignmentRequest, data: dict) -> AssetAssignmentRequest:
    for k, v in data.items():
        setattr(req, k, v)
    db.commit()
    db.refresh(req)
    return req


def list_requests(
    db: Session, client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Tuple[List[AssetAssignmentRequest], int]:
    q = db.query(AssetAssignmentRequest).filter(AssetAssignmentRequest.client_id == client_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AssetAssignmentRequest.request_number.ilike(like),
            AssetAssignmentRequest.requested_by_name.ilike(like),
            AssetAssignmentRequest.asset_name.ilike(like),
            AssetAssignmentRequest.asset_category_name.ilike(like),
        ))
    if status:
        q = q.filter(AssetAssignmentRequest.status == status)
    if priority:
        q = q.filter(AssetAssignmentRequest.priority == priority)
    total = q.count()
    rows = q.order_by(AssetAssignmentRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Assignments ────────────────────────────────────────────────────────────────

def create_assignment(db: Session, data: dict) -> AssetAssignment:
    obj = AssetAssignment(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_assignment(db: Session, client_id: str, assignment_id: str) -> Optional[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.id == assignment_id,
        AssetAssignment.client_id == client_id,
    ).first()


def get_active_assignment(db: Session, asset_id: str) -> Optional[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id,
        AssetAssignment.status == "Active",
    ).first()


def update_assignment(db: Session, asgn: AssetAssignment, data: dict) -> AssetAssignment:
    for k, v in data.items():
        setattr(asgn, k, v)
    db.commit()
    db.refresh(asgn)
    return asgn


def list_assignments_all(
    db: Session, client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    assignee_type: Optional[str] = None,
    assignee_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    overdue_only: bool = False,
    page: int = 1, page_size: int = 20,
) -> Tuple[List[AssetAssignment], int]:
    q = db.query(AssetAssignment).filter(AssetAssignment.client_id == client_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AssetAssignment.assignment_number.ilike(like),
            AssetAssignment.assignee_name.ilike(like),
            AssetAssignment.employee_name.ilike(like),
        ))
    if status:
        q = q.filter(AssetAssignment.status == status)
    if assignee_type:
        q = q.filter(AssetAssignment.assignee_type == assignee_type)
    if assignee_id:
        q = q.filter(AssetAssignment.assignee_id == assignee_id)
    if asset_id:
        q = q.filter(AssetAssignment.asset_id == asset_id)
    if overdue_only:
        today = date.today()
        q = q.filter(
            AssetAssignment.status == "Active",
            AssetAssignment.expected_return_date < today,
        )
    total = q.count()
    rows = q.order_by(AssetAssignment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def list_employee_assignments(db: Session, client_id: str, employee_id: str) -> List[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.client_id == client_id,
        AssetAssignment.employee_id == employee_id,
        AssetAssignment.status == "Active",
    ).all()


def list_asset_assignments(db: Session, asset_id: str) -> List[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id,
    ).order_by(AssetAssignment.created_at.desc()).all()


# ── Acknowledgements ───────────────────────────────────────────────────────────

def create_acknowledgement(db: Session, data: dict) -> AssetAcknowledgement:
    obj = AssetAcknowledgement(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_acknowledgement(db: Session, assignment_id: str) -> Optional[AssetAcknowledgement]:
    return db.query(AssetAcknowledgement).filter(
        AssetAcknowledgement.assignment_id == assignment_id
    ).first()


def update_acknowledgement(db: Session, ack: AssetAcknowledgement, data: dict) -> AssetAcknowledgement:
    for k, v in data.items():
        setattr(ack, k, v)
    db.commit()
    db.refresh(ack)
    return ack


# ── History ────────────────────────────────────────────────────────────────────

def log_history(db: Session, data: dict) -> AssetAssignmentHistory:
    obj = AssetAssignmentHistory(**data)
    db.add(obj)
    db.commit()
    return obj


def list_history(db: Session, asset_id: str) -> List[AssetAssignmentHistory]:
    return db.query(AssetAssignmentHistory).filter(
        AssetAssignmentHistory.asset_id == asset_id
    ).order_by(AssetAssignmentHistory.created_at.desc()).all()


def list_assignment_history(db: Session, assignment_id: str) -> List[AssetAssignmentHistory]:
    return db.query(AssetAssignmentHistory).filter(
        AssetAssignmentHistory.assignment_id == assignment_id
    ).order_by(AssetAssignmentHistory.created_at.desc()).all()


# ── Dashboard Counts ───────────────────────────────────────────────────────────

def get_dashboard_counts(db: Session, client_id: str) -> dict:
    today = date.today()

    total_assets = db.query(func.count(Asset.id)).filter(
        Asset.client_id == client_id, Asset.is_deleted.is_(False)
    ).scalar() or 0

    assigned = db.query(func.count(Asset.id)).filter(
        Asset.client_id == client_id, Asset.is_deleted.is_(False),
        Asset.status == "Assigned",
    ).scalar() or 0

    available = db.query(func.count(Asset.id)).filter(
        Asset.client_id == client_id, Asset.is_deleted.is_(False),
        Asset.status == "Available",
    ).scalar() or 0

    maintenance = db.query(func.count(Asset.id)).filter(
        Asset.client_id == client_id, Asset.is_deleted.is_(False),
        Asset.status == "Under Maintenance",
    ).scalar() or 0

    due_soon = db.query(func.count(AssetAssignment.id)).filter(
        AssetAssignment.client_id == client_id,
        AssetAssignment.status == "Active",
        AssetAssignment.expected_return_date != None,
        AssetAssignment.expected_return_date >= today,
    ).scalar() or 0

    overdue = db.query(func.count(AssetAssignment.id)).filter(
        AssetAssignment.client_id == client_id,
        AssetAssignment.status == "Active",
        AssetAssignment.expected_return_date != None,
        AssetAssignment.expected_return_date < today,
    ).scalar() or 0

    pending_requests = db.query(func.count(AssetAssignmentRequest.id)).filter(
        AssetAssignmentRequest.client_id == client_id,
        AssetAssignmentRequest.status == "Submitted",
    ).scalar() or 0

    pending_ack = db.query(func.count(AssetAssignment.id)).filter(
        AssetAssignment.client_id == client_id,
        AssetAssignment.status == "Active",
        AssetAssignment.is_acknowledged.is_(False),
    ).scalar() or 0

    return {
        "total_assets": total_assets,
        "assigned": assigned,
        "available": available,
        "under_maintenance": maintenance,
        "due_soon": due_soon,
        "overdue": overdue,
        "pending_requests": pending_requests,
        "pending_acknowledgements": pending_ack,
    }
