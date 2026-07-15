"""Service layer — Recruitment module. Business logic and file handling."""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.app.modules.recruitment import repository as repo
from backend.app.modules.recruitment.constants import (
    ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES, STORAGE_SCOPE, STORAGE_MODULE,
    ACT_CANDIDATE_ADDED, ACT_STATUS_CHANGED, ACT_OFFER_SENT, ACT_OFFER_ACCEPTED,
    ACT_OFFER_REJECTED, ACT_EMPLOYEE_CREATED, ACT_DOC_UPLOADED,
    REQ_STATUS_SUBMITTED, REQ_STATUS_APPROVED, REQ_STATUS_REJECTED,
)
from backend.shared.storage.file_handler import save_upload_sync, physical_path, Visibility


def _req_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id, "client_id": r.client_id,
        "requisition_number": r.requisition_number,
        "company_id": r.company_id, "company_name": r.company_name,
        "branch_id": r.branch_id, "branch_name": r.branch_name,
        "department_id": r.department_id, "department_name": r.department_name,
        "designation_id": r.designation_id, "designation_name": r.designation_name,
        "hiring_manager": r.hiring_manager,
        "number_of_positions": r.number_of_positions,
        "employment_type": r.employment_type,
        "employee_category": r.employee_category,
        "reason_for_hiring": r.reason_for_hiring,
        "budget_min": float(r.budget_min) if r.budget_min else None,
        "budget_max": float(r.budget_max) if r.budget_max else None,
        "target_joining_date": r.target_joining_date.isoformat() if r.target_joining_date else None,
        "job_description": r.job_description,
        "skills_required": r.skills_required,
        "status": r.status,
        "rejection_reason": r.rejection_reason,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _opening_dict(o) -> Dict[str, Any]:
    return {
        "id": o.id, "client_id": o.client_id,
        "opening_number": o.opening_number,
        "requisition_id": o.requisition_id,
        "job_title": o.job_title,
        "company_id": o.company_id, "company_name": o.company_name,
        "branch_id": o.branch_id, "branch_name": o.branch_name,
        "department_id": o.department_id, "department_name": o.department_name,
        "designation_id": o.designation_id, "designation_name": o.designation_name,
        "number_of_vacancies": o.number_of_vacancies,
        "employment_type": o.employment_type,
        "employee_category": o.employee_category,
        "hiring_manager": o.hiring_manager,
        "experience_required": o.experience_required,
        "salary_min": float(o.salary_min) if o.salary_min else None,
        "salary_max": float(o.salary_max) if o.salary_max else None,
        "application_deadline": o.application_deadline.isoformat() if o.application_deadline else None,
        "expected_joining_date": o.expected_joining_date.isoformat() if o.expected_joining_date else None,
        "status": o.status,
        "created_by": o.created_by,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _cand_dict(c) -> Dict[str, Any]:
    return {
        "id": c.id, "client_id": c.client_id,
        "candidate_number": c.candidate_number,
        "first_name": c.first_name, "last_name": c.last_name,
        "full_name": f"{c.first_name} {c.last_name}".strip(),
        "email": c.email, "mobile_number": c.mobile_number,
        "date_of_birth": c.date_of_birth.isoformat() if c.date_of_birth else None,
        "gender": c.gender,
        "total_experience": c.total_experience,
        "relevant_experience": c.relevant_experience,
        "current_company": c.current_company,
        "current_designation": c.current_designation,
        "current_salary": float(c.current_salary) if c.current_salary else None,
        "expected_salary": float(c.expected_salary) if c.expected_salary else None,
        "notice_period": c.notice_period,
        "source": c.source,
        "applied_position_id": c.applied_position_id,
        "applied_position": c.applied_position,
        "assigned_recruiter": c.assigned_recruiter,
        "status": c.status,
        "has_resume": bool(c.resume_file_key),
        "resume_file_name": c.resume_file_name,
        "resume_file_size": c.resume_file_size,
        "resume_file_type": c.resume_file_type,
        "employee_id": c.employee_id,
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


def _offer_dict(o) -> Dict[str, Any]:
    return {
        "id": o.id, "client_id": o.client_id,
        "offer_number": o.offer_number,
        "candidate_id": o.candidate_id, "candidate_name": o.candidate_name,
        "opening_id": o.opening_id,
        "offered_designation_id": o.offered_designation_id,
        "offered_designation_name": o.offered_designation_name,
        "offered_department_id": o.offered_department_id,
        "offered_department_name": o.offered_department_name,
        "offered_branch_id": o.offered_branch_id,
        "offered_branch_name": o.offered_branch_name,
        "joining_date": o.joining_date.isoformat() if o.joining_date else None,
        "offered_salary": float(o.offered_salary) if o.offered_salary else None,
        "offer_expiry_date": o.offer_expiry_date.isoformat() if o.offer_expiry_date else None,
        "status": o.status,
        "rejection_reason": o.rejection_reason,
        "employee_id": o.employee_id,
        "created_by": o.created_by,
        "created_at": o.created_at.isoformat() if o.created_at else None,
        "updated_at": o.updated_at.isoformat() if o.updated_at else None,
    }


def _doc_dict(d) -> Dict[str, Any]:
    return {
        "id": d.id, "candidate_id": d.candidate_id,
        "document_type": d.document_type,
        "file_name": d.file_name,
        "file_size": d.file_size,
        "file_type": d.file_type,
        "verification_status": d.verification_status,
        "verified_by": d.verified_by,
        "verified_at": d.verified_at.isoformat() if d.verified_at else None,
        "uploaded_by": d.uploaded_by,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    }


def _activity_dict(a) -> Dict[str, Any]:
    return {
        "id": a.id, "candidate_id": a.candidate_id,
        "action": a.action, "actor": a.actor,
        "old_value": a.old_value, "new_value": a.new_value,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ── Requisition service ───────────────────────────────────────────────────────

def _resolve_org_names(db_client: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Try to denormalize company/department/designation names from client DB tables."""
    try:
        if data.get("department_id"):
            from backend.app.modules.organization_management.models import OrgDepartment
            dept = db_client.query(OrgDepartment).filter(OrgDepartment.id == data["department_id"]).first()
            if dept:
                data["department_name"] = dept.department_name
    except Exception:
        pass
    try:
        if data.get("designation_id"):
            from backend.app.modules.organization_management.models import OrgDesignation
            desig = db_client.query(OrgDesignation).filter(OrgDesignation.id == data["designation_id"]).first()
            if desig:
                data["designation_name"] = desig.designation_name
    except Exception:
        pass
    try:
        if data.get("company_id"):
            from backend.app.modules.organization_management.models import OrgCompany
            co = db_client.query(OrgCompany).filter(OrgCompany.id == data["company_id"]).first()
            if co:
                data["company_name"] = co.company_name
    except Exception:
        pass
    try:
        if data.get("branch_id"):
            from backend.app.modules.organization_management.models import OrgBranch
            br = db_client.query(OrgBranch).filter(OrgBranch.id == data["branch_id"]).first()
            if br:
                data["branch_name"] = br.branch_name
    except Exception:
        pass
    return data


def create_requisition(db: Session, client_id: str, raw: Dict[str, Any], actor: str) -> Dict[str, Any]:
    data = _resolve_org_names(db, raw)
    obj = repo.create_requisition(db, client_id, data, actor)
    return _req_dict(obj)


def get_requisition(db: Session, client_id: str, req_id: str) -> Dict[str, Any]:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    return _req_dict(obj)


def list_requisitions(db: Session, client_id: str, **kw) -> Dict[str, Any]:
    items, total = repo.list_requisitions(db, client_id, **kw)
    return {"items": [_req_dict(r) for r in items], "total": total}


def update_requisition(db: Session, client_id: str, req_id: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    if obj.status not in ("Draft", "Rejected"):
        raise HTTPException(400, "Only Draft or Rejected requisitions can be edited.")
    data = _resolve_org_names(db, raw)
    obj = repo.update_requisition(db, obj, data)
    return _req_dict(obj)


def submit_requisition(db: Session, client_id: str, req_id: str) -> Dict[str, Any]:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    if obj.status != "Draft":
        raise HTTPException(400, "Only Draft requisitions can be submitted.")
    obj = repo.update_requisition(db, obj, {"status": REQ_STATUS_SUBMITTED})
    return _req_dict(obj)


def approve_requisition(db: Session, client_id: str, req_id: str) -> Dict[str, Any]:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    if obj.status != REQ_STATUS_SUBMITTED:
        raise HTTPException(400, "Only Submitted requisitions can be approved.")
    obj = repo.update_requisition(db, obj, {"status": REQ_STATUS_APPROVED})
    return _req_dict(obj)


def reject_requisition(db: Session, client_id: str, req_id: str, reason: Optional[str]) -> Dict[str, Any]:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    if obj.status not in (REQ_STATUS_SUBMITTED, REQ_STATUS_APPROVED):
        raise HTTPException(400, "Only Submitted or Approved requisitions can be rejected.")
    obj = repo.update_requisition(db, obj, {"status": REQ_STATUS_REJECTED, "rejection_reason": reason})
    return _req_dict(obj)


def delete_requisition(db: Session, client_id: str, req_id: str) -> None:
    obj = repo.get_requisition(db, client_id, req_id)
    if not obj:
        raise HTTPException(404, "Requisition not found.")
    repo.delete_requisition(db, obj)


# ── Opening service ───────────────────────────────────────────────────────────

def create_opening(db: Session, client_id: str, raw: Dict[str, Any], actor: str) -> Dict[str, Any]:
    data = _resolve_org_names(db, raw)
    if data.get("requisition_id"):
        req = repo.get_requisition(db, client_id, data["requisition_id"])
        if req and req.status != REQ_STATUS_APPROVED:
            raise HTTPException(400, "Job opening can only be created from an Approved requisition.")
        existing = repo.get_opening_by_requisition(db, client_id, data["requisition_id"])
        if existing:
            raise HTTPException(400, f"A job opening ({existing.opening_number}) already exists for this requisition.")
    obj = repo.create_opening(db, client_id, data, actor)
    return _opening_dict(obj)


def get_opening(db: Session, client_id: str, opening_id: str) -> Dict[str, Any]:
    obj = repo.get_opening(db, client_id, opening_id)
    if not obj:
        raise HTTPException(404, "Job opening not found.")
    return _opening_dict(obj)


def list_openings(db: Session, client_id: str, **kw) -> Dict[str, Any]:
    items, total = repo.list_openings(db, client_id, **kw)
    return {"items": [_opening_dict(o) for o in items], "total": total}


def update_opening(db: Session, client_id: str, opening_id: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    obj = repo.get_opening(db, client_id, opening_id)
    if not obj:
        raise HTTPException(404, "Job opening not found.")
    data = _resolve_org_names(db, raw)
    obj = repo.update_opening(db, obj, data)
    return _opening_dict(obj)


def delete_opening(db: Session, client_id: str, opening_id: str) -> None:
    obj = repo.get_opening(db, client_id, opening_id)
    if not obj:
        raise HTTPException(404, "Job opening not found.")
    repo.delete_opening(db, obj)


# ── Candidate service ─────────────────────────────────────────────────────────

def create_candidate(db: Session, client_id: str, raw: Dict[str, Any], actor: str) -> Dict[str, Any]:
    if raw.get("applied_position_id"):
        opening = repo.get_opening(db, client_id, raw["applied_position_id"])
        if opening:
            raw["applied_position"] = opening.job_title
    obj = repo.create_candidate(db, client_id, raw, actor)
    repo.add_activity(db, client_id, obj.id, ACT_CANDIDATE_ADDED, actor)
    return _cand_dict(obj)


def get_candidate(db: Session, client_id: str, cand_id: str) -> Dict[str, Any]:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    return _cand_dict(obj)


def list_candidates(db: Session, client_id: str, **kw) -> Dict[str, Any]:
    items, total = repo.list_candidates(db, client_id, **kw)
    return {"items": [_cand_dict(c) for c in items], "total": total}


def update_candidate(db: Session, client_id: str, cand_id: str, raw: Dict[str, Any], actor: str) -> Dict[str, Any]:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    repo.update_candidate(db, obj, raw)
    return _cand_dict(obj)


def change_status(db: Session, client_id: str, cand_id: str, new_status: str, notes: str, actor: str) -> Dict[str, Any]:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    old_status = obj.status
    repo.update_candidate(db, obj, {"status": new_status})
    repo.add_activity(db, client_id, cand_id, ACT_STATUS_CHANGED, actor,
                      old_value=old_status, new_value=new_status, notes=notes)
    return _cand_dict(obj)


def delete_candidate(db: Session, client_id: str, cand_id: str) -> None:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    repo.delete_candidate(db, obj)


def upload_resume(db: Session, client_id: str, cand_id: str, file: UploadFile, actor: str) -> Dict[str, Any]:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".pdf", ".doc", ".docx"}:
        raise HTTPException(400, "Resume must be PDF, DOC, or DOCX.")
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(400, "File too large. Max 20 MB.")
    file.file.seek(0)
    file_key = save_upload_sync(file, scope=STORAGE_SCOPE, module=STORAGE_MODULE, visibility=Visibility.PRIVATE)
    repo.update_candidate(db, obj, {
        "resume_file_name": file.filename,
        "resume_file_key": file_key,
        "resume_file_size": len(content),
        "resume_file_type": ext.lstrip("."),
    })
    repo.add_activity(db, client_id, cand_id, "Resume Uploaded", actor)
    return _cand_dict(obj)


def upload_doc(
    db: Session, client_id: str, cand_id: str,
    file: UploadFile, document_type: str, actor: str,
) -> Dict[str, Any]:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj:
        raise HTTPException(404, "Candidate not found.")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported file type.")
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(400, "File too large. Max 20 MB.")
    file.file.seek(0)
    file_key = save_upload_sync(file, scope=STORAGE_SCOPE, module=STORAGE_MODULE, visibility=Visibility.PRIVATE)
    doc = repo.add_candidate_doc(db, client_id, cand_id, {
        "document_type": document_type,
        "file_name": file.filename,
        "file_key": file_key,
        "file_size": len(content),
        "file_type": ext.lstrip("."),
        "verification_status": "Pending",
        "uploaded_by": actor,
    })
    repo.add_activity(db, client_id, cand_id, ACT_DOC_UPLOADED, actor, notes=document_type)
    return _doc_dict(doc)


def list_docs(db: Session, client_id: str, cand_id: str) -> List[Dict[str, Any]]:
    docs = repo.get_candidate_docs(db, client_id, cand_id)
    return [_doc_dict(d) for d in docs]


def delete_doc(db: Session, client_id: str, cand_id: str, doc_id: str) -> None:
    if not repo.delete_candidate_doc(db, doc_id, client_id, cand_id):
        raise HTTPException(404, "Document not found.")


def get_resume_path(db: Session, client_id: str, cand_id: str) -> str:
    obj = repo.get_candidate(db, client_id, cand_id)
    if not obj or not obj.resume_file_key:
        raise HTTPException(404, "No resume on file.")
    path = physical_path(obj.resume_file_key, Visibility.PRIVATE)
    if not os.path.exists(path):
        raise HTTPException(404, "Resume file not found on disk.")
    return path, obj.resume_file_name or "resume"


def get_doc_path(db: Session, client_id: str, cand_id: str, doc_id: str):
    docs = repo.get_candidate_docs(db, client_id, cand_id)
    doc = next((d for d in docs if d.id == doc_id), None)
    if not doc:
        raise HTTPException(404, "Document not found.")
    path = physical_path(doc.file_key, Visibility.PRIVATE)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found on disk.")
    return path, doc.file_name or "document"


def list_activities(db: Session, client_id: str, cand_id: str) -> List[Dict[str, Any]]:
    acts = repo.get_candidate_activities(db, client_id, cand_id)
    return [_activity_dict(a) for a in acts]


# ── Offer service ─────────────────────────────────────────────────────────────

def create_offer(db: Session, client_id: str, raw: Dict[str, Any], actor: str) -> Dict[str, Any]:
    cand = repo.get_candidate(db, client_id, raw.get("candidate_id", ""))
    if not cand:
        raise HTTPException(404, "Candidate not found.")
    raw["candidate_name"] = f"{cand.first_name} {cand.last_name}".strip()
    _resolve_org_names(db, raw)
    obj = repo.create_offer(db, client_id, raw, actor)
    return _offer_dict(obj)


def get_offer(db: Session, client_id: str, offer_id: str) -> Dict[str, Any]:
    obj = repo.get_offer(db, client_id, offer_id)
    if not obj:
        raise HTTPException(404, "Offer not found.")
    return _offer_dict(obj)


def list_offers(db: Session, client_id: str, **kw) -> Dict[str, Any]:
    items, total = repo.list_offers(db, client_id, **kw)
    return {"items": [_offer_dict(o) for o in items], "total": total}


def update_offer(db: Session, client_id: str, offer_id: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    obj = repo.get_offer(db, client_id, offer_id)
    if not obj:
        raise HTTPException(404, "Offer not found.")
    if obj.status not in ("Draft",):
        raise HTTPException(400, "Only Draft offers can be edited.")
    _resolve_org_names(db, raw)
    obj = repo.update_offer(db, obj, raw)
    return _offer_dict(obj)


def send_offer(db: Session, client_id: str, offer_id: str, actor: str) -> Dict[str, Any]:
    obj = repo.get_offer(db, client_id, offer_id)
    if not obj:
        raise HTTPException(404, "Offer not found.")
    if obj.status != "Draft":
        raise HTTPException(400, "Only Draft offers can be sent.")
    obj = repo.update_offer(db, obj, {"status": "Sent"})
    repo.update_candidate(db, repo.get_candidate(db, client_id, obj.candidate_id), {"status": "Offered"})
    repo.add_activity(db, client_id, obj.candidate_id, ACT_OFFER_SENT, actor)
    return _offer_dict(obj)


def accept_offer(db: Session, client_id: str, offer_id: str, actor: str) -> Dict[str, Any]:
    obj = repo.get_offer(db, client_id, offer_id)
    if not obj:
        raise HTTPException(404, "Offer not found.")
    if obj.status != "Sent":
        raise HTTPException(400, "Only Sent offers can be accepted.")
    obj = repo.update_offer(db, obj, {"status": "Accepted"})
    cand = repo.get_candidate(db, client_id, obj.candidate_id)
    if cand:
        repo.update_candidate(db, cand, {"status": "Joined"})
    repo.add_activity(db, client_id, obj.candidate_id, ACT_OFFER_ACCEPTED, actor)
    return _offer_dict(obj)


def reject_offer(db: Session, client_id: str, offer_id: str, reason: Optional[str], actor: str) -> Dict[str, Any]:
    obj = repo.get_offer(db, client_id, offer_id)
    if not obj:
        raise HTTPException(404, "Offer not found.")
    if obj.status not in ("Sent", "Draft"):
        raise HTTPException(400, "Only Sent or Draft offers can be rejected.")
    obj = repo.update_offer(db, obj, {"status": "Rejected", "rejection_reason": reason})
    cand = repo.get_candidate(db, client_id, obj.candidate_id)
    if cand:
        repo.update_candidate(db, cand, {"status": "Rejected"})
    repo.add_activity(db, client_id, obj.candidate_id, ACT_OFFER_REJECTED, actor, notes=reason)
    return _offer_dict(obj)


def dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    return repo.dashboard_stats(db, client_id)
