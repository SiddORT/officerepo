"""Repository — Asset Inventory. Pure DB queries."""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from backend.app.modules.asset_management.inventory_models import (
    Asset, AssetAssignment, AssetDocument, AssetActivity,
)


# ── Number series ─────────────────────────────────────────────────────────────

def next_asset_number(db: Session, client_id: str) -> str:
    row = db.query(func.count(Asset.id)).filter(Asset.client_id == client_id).scalar() or 0
    return f"AST-{row + 1:06d}"


# ── Asset CRUD ─────────────────────────────────────────────────────────────────

def list_assets(
    db: Session, client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    sub_category_id: Optional[str] = None,
    company_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Tuple[List[Asset], int]:
    q = db.query(Asset).filter(Asset.client_id == client_id, Asset.is_deleted.is_(False))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            Asset.asset_number.ilike(like),
            Asset.asset_name.ilike(like),
            Asset.serial_number.ilike(like),
            Asset.brand.ilike(like),
        ))
    if status:
        q = q.filter(Asset.status == status)
    if category_id:
        q = q.filter(Asset.category_id == category_id)
    if sub_category_id:
        q = q.filter(Asset.sub_category_id == sub_category_id)
    if company_id:
        q = q.filter(Asset.company_id == company_id)
    if branch_id:
        q = q.filter(Asset.branch_id == branch_id)
    total = q.count()
    rows = q.order_by(Asset.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_asset(db: Session, client_id: str, asset_id: str) -> Optional[Asset]:
    return db.query(Asset).filter(
        Asset.id == asset_id, Asset.client_id == client_id, Asset.is_deleted.is_(False)
    ).first()


def get_asset_by_uuid(db: Session, asset_uuid: str) -> Optional[Asset]:
    return db.query(Asset).filter(Asset.asset_uuid == asset_uuid, Asset.is_deleted.is_(False)).first()


def create_asset(db: Session, data: dict) -> Asset:
    obj = Asset(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_asset(db: Session, asset: Asset, data: dict) -> Asset:
    for k, v in data.items():
        setattr(asset, k, v)
    db.commit()
    db.refresh(asset)
    return asset


def soft_delete_asset(db: Session, asset: Asset) -> Asset:
    from datetime import datetime
    asset.is_deleted = True
    asset.deleted_at = datetime.utcnow()
    db.commit()
    return asset


def check_serial_unique(
    db: Session, client_id: str, serial: str, exclude_id: Optional[str] = None
) -> bool:
    q = db.query(Asset).filter(
        Asset.client_id == client_id,
        func.lower(Asset.serial_number) == serial.lower(),
        Asset.is_deleted.is_(False),
    )
    if exclude_id:
        q = q.filter(Asset.id != exclude_id)
    return q.first() is None


# ── Assignments ────────────────────────────────────────────────────────────────

def get_active_assignment(db: Session, asset_id: str) -> Optional[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id,
        AssetAssignment.status == "Active",
    ).first()


def create_assignment(db: Session, data: dict) -> AssetAssignment:
    obj = AssetAssignment(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_assignments(db: Session, asset_id: str) -> List[AssetAssignment]:
    return db.query(AssetAssignment).filter(
        AssetAssignment.asset_id == asset_id
    ).order_by(AssetAssignment.created_at.desc()).all()


# ── Documents ─────────────────────────────────────────────────────────────────

def list_documents(db: Session, asset_id: str) -> List[AssetDocument]:
    return db.query(AssetDocument).filter(
        AssetDocument.asset_id == asset_id,
        AssetDocument.is_deleted.is_(False),
    ).order_by(AssetDocument.uploaded_at.desc()).all()


def get_document(db: Session, doc_id: str, asset_id: str) -> Optional[AssetDocument]:
    return db.query(AssetDocument).filter(
        AssetDocument.id == doc_id,
        AssetDocument.asset_id == asset_id,
        AssetDocument.is_deleted.is_(False),
    ).first()


def create_document(db: Session, data: dict) -> AssetDocument:
    obj = AssetDocument(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_document(db: Session, doc: AssetDocument) -> None:
    from datetime import datetime
    doc.is_deleted = True
    doc.deleted_at = datetime.utcnow()
    db.commit()


# ── Activities ────────────────────────────────────────────────────────────────

def log_activity(db: Session, data: dict) -> AssetActivity:
    obj = AssetActivity(**data)
    db.add(obj)
    db.commit()
    return obj


def list_activities(db: Session, asset_id: str, limit: int = 100) -> List[AssetActivity]:
    return db.query(AssetActivity).filter(
        AssetActivity.asset_id == asset_id
    ).order_by(AssetActivity.created_at.desc()).limit(limit).all()
