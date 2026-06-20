"""Repository layer — Employee Document Management. Raw DB operations."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.modules.employee_document_management.models import (
    EmpDocumentType, EmployeeDocument, EmployeeDocumentVersion, EmployeeDocumentActivity,
)
from backend.app.modules.employee_document_management.constants import DEFAULT_DOCUMENT_TYPES


# ── Document Types ─────────────────────────────────────────────────────────────

def ensure_default_types(db: Session, client_id: str) -> None:
    """Seed default document types if none exist for this client."""
    existing = db.query(EmpDocumentType).filter_by(client_id=client_id).count()
    if existing:
        return
    for t in DEFAULT_DOCUMENT_TYPES:
        db.add(EmpDocumentType(
            client_id=client_id,
            code=t["code"],
            name=t["name"],
            category=t["category"],
            expiry_tracking=t["expiry_tracking"],
            verification_required=t["verification_required"],
            mandatory_onboarding=t["mandatory_onboarding"],
            is_system=True,
            is_active=True,
        ))
    db.commit()


def list_doc_types(db: Session, client_id: str, active_only: bool = False) -> List[EmpDocumentType]:
    q = db.query(EmpDocumentType).filter_by(client_id=client_id)
    if active_only:
        q = q.filter_by(is_active=True)
    return q.order_by(EmpDocumentType.category, EmpDocumentType.name).all()


def get_doc_type(db: Session, client_id: str, type_id: str) -> Optional[EmpDocumentType]:
    return db.query(EmpDocumentType).filter_by(client_id=client_id, id=type_id).first()


def create_doc_type(db: Session, client_id: str, data: Dict[str, Any]) -> EmpDocumentType:
    obj = EmpDocumentType(client_id=client_id, is_system=False, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_doc_type(db: Session, obj: EmpDocumentType, data: Dict[str, Any]) -> EmpDocumentType:
    for k, v in data.items():
        if v is not None:
            setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Employee Documents ─────────────────────────────────────────────────────────

def list_documents(
    db: Session, client_id: str,
    employee_id: Optional[str] = None,
    document_type_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Dict[str, Any]:
    q = db.query(EmployeeDocument).filter_by(client_id=client_id, is_deleted=False)
    if employee_id:
        q = q.filter(EmployeeDocument.employee_id == employee_id)
    if document_type_id:
        q = q.filter(EmployeeDocument.document_type_id == document_type_id)
    if status:
        q = q.filter(EmployeeDocument.status == status)
    if category:
        q = q.filter(EmployeeDocument.category == category)
    if search:
        s = f"%{search}%"
        q = q.filter(
            EmployeeDocument.employee_name.ilike(s) |
            EmployeeDocument.employee_code.ilike(s) |
            EmployeeDocument.document_number.ilike(s) |
            EmployeeDocument.document_type_name.ilike(s)
        )
    total = q.count()
    items = q.order_by(EmployeeDocument.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_document(db: Session, client_id: str, doc_id: str) -> Optional[EmployeeDocument]:
    return db.query(EmployeeDocument).filter_by(client_id=client_id, id=doc_id, is_deleted=False).first()


def create_document(db: Session, data: Dict[str, Any]) -> EmployeeDocument:
    obj = EmployeeDocument(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_document(db: Session, obj: EmployeeDocument, data: Dict[str, Any]) -> EmployeeDocument:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete(db: Session, obj: EmployeeDocument) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.commit()


# ── Versions ───────────────────────────────────────────────────────────────────

def list_versions(db: Session, doc_id: str) -> List[EmployeeDocumentVersion]:
    return (db.query(EmployeeDocumentVersion)
              .filter_by(document_id=doc_id)
              .order_by(EmployeeDocumentVersion.version_number.desc())
              .all())


def add_version(db: Session, data: Dict[str, Any]) -> EmployeeDocumentVersion:
    obj = EmployeeDocumentVersion(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Activities ─────────────────────────────────────────────────────────────────

def list_activities(db: Session, doc_id: str) -> List[EmployeeDocumentActivity]:
    return (db.query(EmployeeDocumentActivity)
              .filter_by(document_id=doc_id)
              .order_by(EmployeeDocumentActivity.created_at.desc())
              .all())


def add_activity(db: Session, data: Dict[str, Any]) -> EmployeeDocumentActivity:
    obj = EmployeeDocumentActivity(**data)
    db.add(obj)
    db.commit()
    return obj


# ── Dashboard stats ────────────────────────────────────────────────────────────

def dashboard_stats(db: Session, client_id: str) -> Dict[str, Any]:
    from datetime import date, timedelta
    base = db.query(EmployeeDocument).filter_by(client_id=client_id, is_deleted=False)
    total      = base.count()
    pending    = base.filter(EmployeeDocument.status.in_(["Pending Upload", "Uploaded", "Under Review"])).count()
    verified   = base.filter(EmployeeDocument.status == "Verified").count()
    rejected   = base.filter(EmployeeDocument.status == "Rejected").count()
    expired    = base.filter(EmployeeDocument.status == "Expired").count()
    soon_date  = date.today() + timedelta(days=30)
    expiring_soon = base.filter(
        EmployeeDocument.expiry_date != None,
        EmployeeDocument.expiry_date <= soon_date,
        EmployeeDocument.expiry_date >= date.today(),
        EmployeeDocument.status != "Expired",
    ).count()
    return {
        "total": total,
        "pending_verification": base.filter(EmployeeDocument.status == "Under Review").count(),
        "expiring_soon": expiring_soon,
        "expired": expired,
        "verified": verified,
        "rejected": rejected,
    }
