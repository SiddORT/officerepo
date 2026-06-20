"""Service layer — Employee Document Management. Business logic & file handling."""
from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.modules.employee_document_management import repository as repo
from backend.app.modules.employee_document_management.constants import (
    ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES,
    ACT_UPLOADED, ACT_UPDATED, ACT_REPLACED, ACT_VERIFIED, ACT_REJECTED,
    ACT_SUBMITTED, ACT_DELETED,
)
from backend.shared.storage.file_handler import save_upload, physical_path, Visibility


STORAGE_SCOPE = "platform"
STORAGE_MODULE = "employee_documents"


def _days_remaining(d: Optional[date]) -> Optional[int]:
    if not d:
        return None
    return (d - date.today()).days


def _doc_type_dict(t) -> Dict[str, Any]:
    return {
        "id": t.id, "client_id": t.client_id, "code": t.code, "name": t.name,
        "category": t.category, "expiry_tracking": t.expiry_tracking,
        "verification_required": t.verification_required,
        "mandatory_onboarding": t.mandatory_onboarding,
        "is_system": t.is_system, "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _doc_dict(d, include_versions: bool = False) -> Dict[str, Any]:
    out = {
        "id": d.id, "client_id": d.client_id,
        "employee_id": d.employee_id, "employee_code": d.employee_code,
        "employee_name": d.employee_name,
        "document_type_id": d.document_type_id,
        "document_type_code": d.document_type_code,
        "document_type_name": d.document_type_name,
        "category": d.category,
        "document_number": d.document_number,
        "issue_date": d.issue_date.isoformat() if d.issue_date else None,
        "expiry_date": d.expiry_date.isoformat() if d.expiry_date else None,
        "days_remaining": _days_remaining(d.expiry_date),
        "issuing_authority": d.issuing_authority,
        "remarks": d.remarks,
        "status": d.status,
        "version_number": d.version_number,
        "file_name": d.file_name,
        "file_size": d.file_size,
        "file_type": d.file_type,
        "has_file": bool(d.file_key),
        "verified_by": d.verified_by,
        "verified_by_name": d.verified_by_name,
        "verified_at": d.verified_at.isoformat() if d.verified_at else None,
        "rejection_reason": d.rejection_reason,
        "created_by": d.created_by,
        "created_at": d.created_at.isoformat() if d.created_at else None,
        "updated_at": d.updated_at.isoformat() if d.updated_at else None,
    }
    return out


def _version_dict(v) -> Dict[str, Any]:
    return {
        "id": v.id, "document_id": v.document_id,
        "version_number": v.version_number,
        "file_name": v.file_name, "file_size": v.file_size,
        "file_type": v.file_type, "change_notes": v.change_notes,
        "uploaded_by": v.uploaded_by,
        "uploaded_at": v.uploaded_at.isoformat() if v.uploaded_at else None,
    }


def _activity_dict(a) -> Dict[str, Any]:
    return {
        "id": a.id, "document_id": a.document_id,
        "employee_id": a.employee_id, "action": a.action,
        "actor": a.actor, "notes": a.notes,
        "old_value": a.old_value, "new_value": a.new_value,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _log(db: Session, doc_id: str, emp_id: str, action: str, actor: str,
         notes: str = None, old_value: str = None, new_value: str = None) -> None:
    repo.add_activity(db, {
        "document_id": doc_id, "employee_id": emp_id,
        "action": action, "actor": actor,
        "notes": notes, "old_value": old_value, "new_value": new_value,
    })


def _validate_file(file: UploadFile) -> None:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")


async def _save_file(file: UploadFile, client_id: str) -> Dict[str, Any]:
    _validate_file(file)
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(400, f"File too large. Max {MAX_FILE_SIZE_BYTES // (1024*1024)} MB allowed.")
    key = save_upload(content, file.filename, STORAGE_SCOPE, STORAGE_MODULE, Visibility.PRIVATE)
    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    return {"file_key": key, "file_name": file.filename, "file_size": len(content), "file_type": ext}


# ── Document Types ─────────────────────────────────────────────────────────────

def list_doc_types(db: Session, client_id: str, active_only: bool = False) -> list:
    repo.ensure_default_types(db, client_id)
    types = repo.list_doc_types(db, client_id, active_only)
    return [_doc_type_dict(t) for t in types]


def create_doc_type(db: Session, client_id: str, data: dict) -> dict:
    existing = db.query(__import__("backend.app.modules.employee_document_management.models", fromlist=["EmpDocumentType"]).EmpDocumentType).filter_by(client_id=client_id, code=data.get("code", "").upper()).first()
    if existing:
        raise HTTPException(409, "A document type with this code already exists.")
    data["code"] = data["code"].upper()
    obj = repo.create_doc_type(db, client_id, data)
    return _doc_type_dict(obj)


def update_doc_type(db: Session, client_id: str, type_id: str, data: dict) -> dict:
    obj = repo.get_doc_type(db, client_id, type_id)
    if not obj:
        raise HTTPException(404, "Document type not found.")
    updated = repo.update_doc_type(db, obj, {k: v for k, v in data.items() if v is not None})
    return _doc_type_dict(updated)


# ── Employee Documents ─────────────────────────────────────────────────────────

def list_documents(db: Session, client_id: str, **filters) -> dict:
    result = repo.list_documents(db, client_id, **filters)
    return {**result, "items": [_doc_dict(d) for d in result["items"]]}


def get_document(db: Session, client_id: str, doc_id: str) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    return _doc_dict(doc)


async def upload_document(
    db: Session, client_id: str, actor: str,
    employee_id: str, document_type_id: str,
    document_number: Optional[str], issue_date: Optional[str],
    expiry_date: Optional[str], issuing_authority: Optional[str],
    remarks: Optional[str], file: Optional[UploadFile],
    employee_code: str = None, employee_name: str = None,
) -> dict:
    from backend.app.modules.employee_document_management.models import EmpDocumentType
    dtype = db.query(EmpDocumentType).filter_by(client_id=client_id, id=document_type_id).first()
    if not dtype:
        raise HTTPException(404, "Document type not found.")

    file_info: Dict[str, Any] = {}
    version = 0
    status = "Pending Upload"

    if file and file.filename:
        file_info = await _save_file(file, client_id)
        version = 1
        status = "Uploaded"

    doc_data: Dict[str, Any] = {
        "client_id": client_id,
        "employee_id": employee_id,
        "employee_code": employee_code,
        "employee_name": employee_name,
        "document_type_id": document_type_id,
        "document_type_code": dtype.code,
        "document_type_name": dtype.name,
        "category": dtype.category,
        "document_number": document_number,
        "issuing_authority": issuing_authority,
        "remarks": remarks,
        "status": status,
        "version_number": version,
        "created_by": actor,
        **file_info,
    }
    if issue_date:
        from datetime import date as _date
        doc_data["issue_date"] = _date.fromisoformat(issue_date)
    if expiry_date:
        from datetime import date as _date
        doc_data["expiry_date"] = _date.fromisoformat(expiry_date)
        if doc_data.get("issue_date") and doc_data["expiry_date"] < doc_data["issue_date"]:
            raise HTTPException(400, "Expiry date must be on or after issue date.")

    doc = repo.create_document(db, doc_data)

    if file_info:
        repo.add_version(db, {
            "document_id": doc.id, "version_number": 1,
            "file_name": file_info["file_name"], "file_key": file_info["file_key"],
            "file_size": file_info["file_size"], "file_type": file_info["file_type"],
            "uploaded_by": actor,
        })

    _log(db, doc.id, employee_id, ACT_UPLOADED, actor,
         notes=f"{dtype.name}" + (f" v{version}" if version else ""))
    return _doc_dict(doc)


def update_document(db: Session, client_id: str, doc_id: str, data: dict, actor: str) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    old_status = doc.status
    update_data: Dict[str, Any] = {}
    for field in ["document_number", "issuing_authority", "remarks"]:
        if data.get(field) is not None:
            update_data[field] = data[field]
    for field in ["issue_date", "expiry_date"]:
        if data.get(field) is not None:
            from datetime import date as _date
            update_data[field] = _date.fromisoformat(data[field])
    if update_data.get("expiry_date") and update_data.get("issue_date"):
        if update_data["expiry_date"] < update_data["issue_date"]:
            raise HTTPException(400, "Expiry date must be on or after issue date.")
    updated = repo.update_document(db, doc, update_data)
    _log(db, doc.id, doc.employee_id, ACT_UPDATED, actor)
    return _doc_dict(updated)


async def replace_file(
    db: Session, client_id: str, doc_id: str,
    file: UploadFile, change_notes: Optional[str], actor: str,
) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    file_info = await _save_file(file, client_id)
    new_version = (doc.version_number or 0) + 1
    repo.add_version(db, {
        "document_id": doc.id, "version_number": new_version,
        "file_name": file_info["file_name"], "file_key": file_info["file_key"],
        "file_size": file_info["file_size"], "file_type": file_info["file_type"],
        "change_notes": change_notes, "uploaded_by": actor,
    })
    updated = repo.update_document(db, doc, {
        **file_info, "version_number": new_version, "status": "Uploaded",
        "verified_by": None, "verified_by_name": None, "verified_at": None, "rejection_reason": None,
    })
    _log(db, doc.id, doc.employee_id, ACT_REPLACED, actor, notes=f"v{new_version}", new_value=change_notes)
    return _doc_dict(updated)


def submit_for_review(db: Session, client_id: str, doc_id: str, actor: str) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    if not doc.file_key:
        raise HTTPException(400, "Cannot submit — no file uploaded yet.")
    if doc.status not in ("Uploaded", "Rejected"):
        raise HTTPException(400, f"Cannot submit document in '{doc.status}' status.")
    updated = repo.update_document(db, doc, {"status": "Under Review"})
    _log(db, doc.id, doc.employee_id, ACT_SUBMITTED, actor)
    return _doc_dict(updated)


def verify_document(db: Session, client_id: str, doc_id: str, actor_id: str, actor_name: str, notes: str = None) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    if doc.status != "Under Review":
        raise HTTPException(400, f"Document must be 'Under Review' to verify. Current: {doc.status}")
    updated = repo.update_document(db, doc, {
        "status": "Verified",
        "verified_by": actor_id, "verified_by_name": actor_name,
        "verified_at": datetime.utcnow(), "rejection_reason": None,
    })
    _log(db, doc.id, doc.employee_id, ACT_VERIFIED, actor_name, notes=notes)
    return _doc_dict(updated)


def reject_document(db: Session, client_id: str, doc_id: str, actor_name: str, rejection_reason: str) -> dict:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    if doc.status != "Under Review":
        raise HTTPException(400, f"Document must be 'Under Review' to reject. Current: {doc.status}")
    updated = repo.update_document(db, doc, {"status": "Rejected", "rejection_reason": rejection_reason})
    _log(db, doc.id, doc.employee_id, ACT_REJECTED, actor_name, notes=rejection_reason)
    return _doc_dict(updated)


def delete_document(db: Session, client_id: str, doc_id: str, actor: str) -> None:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    _log(db, doc.id, doc.employee_id, ACT_DELETED, actor)
    repo.soft_delete(db, doc)


def list_versions(db: Session, client_id: str, doc_id: str) -> list:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    versions = repo.list_versions(db, doc_id)
    return [_version_dict(v) for v in versions]


def list_activities(db: Session, client_id: str, doc_id: str) -> list:
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    acts = repo.list_activities(db, doc_id)
    return [_activity_dict(a) for a in acts]


def get_dashboard(db: Session, client_id: str) -> dict:
    return repo.dashboard_stats(db, client_id)


def get_file_path(db: Session, client_id: str, doc_id: str, version_number: Optional[int] = None) -> tuple:
    """Return (physical_path, filename) for download."""
    doc = repo.get_document(db, client_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    if version_number is not None:
        versions = repo.list_versions(db, doc_id)
        v = next((x for x in versions if x.version_number == version_number), None)
        if not v or not v.file_key:
            raise HTTPException(404, "Version not found.")
        return physical_path(v.file_key, Visibility.PRIVATE), v.file_name
    if not doc.file_key:
        raise HTTPException(404, "No file uploaded for this document.")
    return physical_path(doc.file_key, Visibility.PRIVATE), doc.file_name
