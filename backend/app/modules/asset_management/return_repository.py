"""Repository layer — Asset Returns. Raw SQLAlchemy queries only."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.modules.asset_management.return_models import (
    AssetReturn, AssetReturnAssessment, AssetReturnRecovery, AssetReturnActivity,
)


# ── Sequence number ────────────────────────────────────────────────────────────

def next_return_number(db: Session, client_id: str) -> str:
    prefix = f"RET-{datetime.utcnow().strftime('%Y%m%d')}-"
    count = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id,
                AssetReturn.return_number.like(f"{prefix}%"))
        .count()
    )
    return f"{prefix}{(count + 1):08d}"


# ── Asset Returns ──────────────────────────────────────────────────────────────

def create_return(db: Session, data: dict) -> AssetReturn:
    obj = AssetReturn(**data)
    db.add(obj)
    db.flush()
    return obj


def get_return(db: Session, client_id: str, return_id: str) -> Optional[AssetReturn]:
    return (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id, AssetReturn.id == return_id)
        .first()
    )


def get_return_by_assignment(db: Session, client_id: str, assignment_id: str,
                              active_only: bool = True) -> Optional[AssetReturn]:
    q = db.query(AssetReturn).filter(
        AssetReturn.client_id == client_id,
        AssetReturn.assignment_id == assignment_id,
    )
    if active_only:
        q = q.filter(AssetReturn.status.notin_(["Rejected", "Closed"]))
    return q.first()


def update_return(db: Session, obj: AssetReturn, data: dict) -> AssetReturn:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_returns(
    db: Session, client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    asset_id: Optional[str] = None,
    employee_id: Optional[str] = None,
    overdue_only: bool = False,
    page: int = 1, page_size: int = 20,
) -> Tuple[List[AssetReturn], int]:
    q = db.query(AssetReturn).filter(AssetReturn.client_id == client_id)

    if status:
        q = q.filter(AssetReturn.status == status)
    if asset_id:
        q = q.filter(AssetReturn.asset_id == asset_id)
    if employee_id:
        q = q.filter(AssetReturn.employee_id == employee_id)
    if overdue_only:
        today = date.today()
        q = q.filter(
            AssetReturn.requested_return_date < today,
            AssetReturn.status.notin_(["Returned", "Closed", "Rejected"]),
        )
    if search:
        like = f"%{search}%"
        q = q.filter(
            AssetReturn.return_number.ilike(like) |
            AssetReturn.asset_name.ilike(like) |
            AssetReturn.assignee_name.ilike(like) |
            AssetReturn.employee_name.ilike(like)
        )

    total = q.count()
    rows = (
        q.order_by(AssetReturn.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return rows, total


def get_dashboard_counts(db: Session, client_id: str) -> dict:
    today = date.today()
    active_statuses = ["Draft", "Submitted", "Approved", "In Progress"]

    total_active = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id,
                AssetReturn.status.in_(active_statuses))
        .count()
    )
    overdue = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id,
                AssetReturn.requested_return_date < today,
                AssetReturn.status.in_(active_statuses))
        .count()
    )
    returned_today = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id,
                AssetReturn.return_date == today,
                AssetReturn.status.in_(["Returned", "Closed"]))
        .count()
    )
    damaged = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id)
        .join(AssetReturnAssessment,
              AssetReturnAssessment.return_id == AssetReturn.id, isouter=True)
        .filter(AssetReturnAssessment.physical_condition == "Damaged")
        .count()
    )
    lost = (
        db.query(AssetReturn)
        .filter(AssetReturn.client_id == client_id)
        .join(AssetReturnAssessment,
              AssetReturnAssessment.return_id == AssetReturn.id, isouter=True)
        .filter(AssetReturnAssessment.physical_condition == "Lost")
        .count()
    )
    return {
        "total_active": total_active,
        "overdue": overdue,
        "returned_today": returned_today,
        "damaged_returns": damaged,
        "lost_assets": lost,
    }


# ── Assessments ────────────────────────────────────────────────────────────────

def get_assessment(db: Session, return_id: str) -> Optional[AssetReturnAssessment]:
    return (
        db.query(AssetReturnAssessment)
        .filter(AssetReturnAssessment.return_id == return_id)
        .first()
    )


def upsert_assessment(db: Session, return_id: str, asset_id: str,
                      client_id: str, data: dict) -> AssetReturnAssessment:
    obj = get_assessment(db, return_id)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
    else:
        obj = AssetReturnAssessment(
            client_id=client_id, return_id=return_id, asset_id=asset_id, **data
        )
        db.add(obj)
    db.flush()
    return obj


# ── Recoveries ─────────────────────────────────────────────────────────────────

def get_recovery(db: Session, return_id: str) -> Optional[AssetReturnRecovery]:
    return (
        db.query(AssetReturnRecovery)
        .filter(AssetReturnRecovery.return_id == return_id)
        .first()
    )


def upsert_recovery(db: Session, return_id: str, asset_id: str,
                    client_id: str, data: dict) -> AssetReturnRecovery:
    obj = get_recovery(db, return_id)
    if obj:
        for k, v in data.items():
            setattr(obj, k, v)
        obj.updated_at = datetime.utcnow()
    else:
        obj = AssetReturnRecovery(
            client_id=client_id, return_id=return_id, asset_id=asset_id, **data
        )
        db.add(obj)
    db.flush()
    return obj


# ── Activities ─────────────────────────────────────────────────────────────────

def log_activity(db: Session, data: dict) -> AssetReturnActivity:
    obj = AssetReturnActivity(**data)
    db.add(obj)
    db.flush()
    return obj


def list_activities(db: Session, return_id: str) -> List[AssetReturnActivity]:
    return (
        db.query(AssetReturnActivity)
        .filter(AssetReturnActivity.return_id == return_id)
        .order_by(AssetReturnActivity.created_at.asc())
        .all()
    )
