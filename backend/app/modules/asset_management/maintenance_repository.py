"""Repository — Asset Maintenance. Raw DB operations, no business logic."""
from __future__ import annotations

import random
import string
from datetime import date, datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.modules.asset_management.maintenance_models import (
    AssetMaintenanceRequest,
    AssetWorkOrder,
    AssetWarranty,
    AssetAmcContract,
    AssetMaintenanceActivity,
)


# ── Sequence helpers ───────────────────────────────────────────────────────────

def _rand(n: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=n))


def next_request_number(db: Session, client_id: str) -> str:
    stamp = date.today().strftime("%Y%m%d")
    prefix = f"MNT-{stamp}-"
    like = f"{prefix}%"
    count = (
        db.query(func.count(AssetMaintenanceRequest.id))
        .filter(
            AssetMaintenanceRequest.client_id == client_id,
            AssetMaintenanceRequest.request_number.ilike(like),
        )
        .scalar()
    )
    return f"{prefix}{count + 1:04d}"


def next_work_order_number(db: Session, client_id: str) -> str:
    stamp = date.today().strftime("%Y%m%d")
    prefix = f"WO-{stamp}-"
    like = f"{prefix}%"
    count = (
        db.query(func.count(AssetWorkOrder.id))
        .filter(
            AssetWorkOrder.client_id == client_id,
            AssetWorkOrder.work_order_number.ilike(like),
        )
        .scalar()
    )
    return f"{prefix}{count + 1:04d}"


# ── Maintenance Requests ───────────────────────────────────────────────────────

def create_request(db: Session, data: dict) -> AssetMaintenanceRequest:
    obj = AssetMaintenanceRequest(**data)
    db.add(obj)
    db.flush()
    return obj


def get_request(db: Session, client_id: str, request_id: str) -> Optional[AssetMaintenanceRequest]:
    return (
        db.query(AssetMaintenanceRequest)
        .filter(
            AssetMaintenanceRequest.client_id == client_id,
            AssetMaintenanceRequest.id == request_id,
        )
        .first()
    )


def update_request(db: Session, obj: AssetMaintenanceRequest, data: dict) -> AssetMaintenanceRequest:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_requests(
    db: Session,
    client_id: str,
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    maintenance_type: Optional[str] = None,
    asset_id: Optional[str] = None,
) -> Tuple[List[AssetMaintenanceRequest], int]:
    q = db.query(AssetMaintenanceRequest).filter(
        AssetMaintenanceRequest.client_id == client_id
    )
    if status:
        q = q.filter(AssetMaintenanceRequest.status == status)
    if priority:
        q = q.filter(AssetMaintenanceRequest.priority == priority)
    if maintenance_type:
        q = q.filter(AssetMaintenanceRequest.maintenance_type == maintenance_type)
    if asset_id:
        q = q.filter(AssetMaintenanceRequest.asset_id == asset_id)
    if search:
        like = f"%{search}%"
        q = q.filter(
            AssetMaintenanceRequest.request_number.ilike(like)
            | AssetMaintenanceRequest.asset_name.ilike(like)
            | AssetMaintenanceRequest.asset_number.ilike(like)
            | AssetMaintenanceRequest.reported_by_name.ilike(like)
            | AssetMaintenanceRequest.vendor_name.ilike(like)
        )
    total = q.count()
    rows = q.order_by(AssetMaintenanceRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_dashboard_counts(db: Session, client_id: str) -> dict:
    def cnt(status):
        return (
            db.query(func.count(AssetMaintenanceRequest.id))
            .filter(
                AssetMaintenanceRequest.client_id == client_id,
                AssetMaintenanceRequest.status == status,
            )
            .scalar()
        )

    open_count = cnt("Open")
    assigned = cnt("Assigned")
    under_repair = (
        db.query(func.count(AssetMaintenanceRequest.id))
        .filter(
            AssetMaintenanceRequest.client_id == client_id,
            AssetMaintenanceRequest.status.in_(["Under Inspection", "Under Repair"]),
        )
        .scalar()
    )
    waiting = cnt("Waiting For Parts")
    quality = cnt("Quality Check")
    completed_today = (
        db.query(func.count(AssetMaintenanceRequest.id))
        .filter(
            AssetMaintenanceRequest.client_id == client_id,
            AssetMaintenanceRequest.status == "Completed",
            func.date(AssetMaintenanceRequest.completed_at) == date.today(),
        )
        .scalar()
    )
    critical = (
        db.query(func.count(AssetMaintenanceRequest.id))
        .filter(
            AssetMaintenanceRequest.client_id == client_id,
            AssetMaintenanceRequest.priority == "Critical",
            AssetMaintenanceRequest.status.not_in(["Completed", "Closed", "Cancelled"]),
        )
        .scalar()
    )
    return {
        "open": open_count,
        "assigned": assigned,
        "under_repair": under_repair,
        "waiting_for_parts": waiting,
        "quality_check": quality,
        "completed_today": completed_today,
        "critical_open": critical,
    }


# ── Work Orders ────────────────────────────────────────────────────────────────

def create_work_order(db: Session, data: dict) -> AssetWorkOrder:
    obj = AssetWorkOrder(**data)
    db.add(obj)
    db.flush()
    return obj


def get_work_order(db: Session, client_id: str, wo_id: str) -> Optional[AssetWorkOrder]:
    return (
        db.query(AssetWorkOrder)
        .filter(AssetWorkOrder.client_id == client_id, AssetWorkOrder.id == wo_id)
        .first()
    )


def get_work_order_by_request(db: Session, client_id: str, request_id: str) -> Optional[AssetWorkOrder]:
    return (
        db.query(AssetWorkOrder)
        .filter(AssetWorkOrder.client_id == client_id, AssetWorkOrder.request_id == request_id)
        .order_by(AssetWorkOrder.created_at.desc())
        .first()
    )


def update_work_order(db: Session, obj: AssetWorkOrder, data: dict) -> AssetWorkOrder:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_work_orders(
    db: Session,
    client_id: str,
    request_id: Optional[str] = None,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[AssetWorkOrder], int]:
    q = db.query(AssetWorkOrder).filter(AssetWorkOrder.client_id == client_id)
    if request_id:
        q = q.filter(AssetWorkOrder.request_id == request_id)
    if asset_id:
        q = q.filter(AssetWorkOrder.asset_id == asset_id)
    if status:
        q = q.filter(AssetWorkOrder.status == status)
    total = q.count()
    rows = q.order_by(AssetWorkOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Warranties ─────────────────────────────────────────────────────────────────

def create_warranty(db: Session, data: dict) -> AssetWarranty:
    obj = AssetWarranty(**data)
    db.add(obj)
    db.flush()
    return obj


def get_warranty(db: Session, client_id: str, warranty_id: str) -> Optional[AssetWarranty]:
    return (
        db.query(AssetWarranty)
        .filter(AssetWarranty.client_id == client_id, AssetWarranty.id == warranty_id)
        .first()
    )


def get_warranty_by_asset(db: Session, client_id: str, asset_id: str) -> Optional[AssetWarranty]:
    return (
        db.query(AssetWarranty)
        .filter(
            AssetWarranty.client_id == client_id,
            AssetWarranty.asset_id == asset_id,
            AssetWarranty.status == "Active",
        )
        .order_by(AssetWarranty.warranty_end_date.desc())
        .first()
    )


def update_warranty(db: Session, obj: AssetWarranty, data: dict) -> AssetWarranty:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_warranties(
    db: Session,
    client_id: str,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[AssetWarranty], int]:
    q = db.query(AssetWarranty).filter(AssetWarranty.client_id == client_id)
    if asset_id:
        q = q.filter(AssetWarranty.asset_id == asset_id)
    if status:
        q = q.filter(AssetWarranty.status == status)
    total = q.count()
    rows = q.order_by(AssetWarranty.warranty_end_date.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── AMC Contracts ──────────────────────────────────────────────────────────────

def create_amc(db: Session, data: dict) -> AssetAmcContract:
    obj = AssetAmcContract(**data)
    db.add(obj)
    db.flush()
    return obj


def get_amc(db: Session, client_id: str, amc_id: str) -> Optional[AssetAmcContract]:
    return (
        db.query(AssetAmcContract)
        .filter(AssetAmcContract.client_id == client_id, AssetAmcContract.id == amc_id)
        .first()
    )


def get_amc_by_asset(db: Session, client_id: str, asset_id: str) -> Optional[AssetAmcContract]:
    return (
        db.query(AssetAmcContract)
        .filter(
            AssetAmcContract.client_id == client_id,
            AssetAmcContract.asset_id == asset_id,
            AssetAmcContract.status == "Active",
        )
        .order_by(AssetAmcContract.end_date.desc())
        .first()
    )


def update_amc(db: Session, obj: AssetAmcContract, data: dict) -> AssetAmcContract:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.flush()
    return obj


def list_amcs(
    db: Session,
    client_id: str,
    asset_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[AssetAmcContract], int]:
    q = db.query(AssetAmcContract).filter(AssetAmcContract.client_id == client_id)
    if asset_id:
        q = q.filter(AssetAmcContract.asset_id == asset_id)
    if status:
        q = q.filter(AssetAmcContract.status == status)
    total = q.count()
    rows = q.order_by(AssetAmcContract.end_date.asc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


# ── Activity Log ───────────────────────────────────────────────────────────────

def log_activity(db: Session, data: dict) -> AssetMaintenanceActivity:
    obj = AssetMaintenanceActivity(**data)
    db.add(obj)
    db.flush()
    return obj


def list_activities(
    db: Session, request_id: str
) -> List[AssetMaintenanceActivity]:
    return (
        db.query(AssetMaintenanceActivity)
        .filter(AssetMaintenanceActivity.request_id == request_id)
        .order_by(AssetMaintenanceActivity.created_at.desc())
        .all()
    )
