"""
Router layer — Lead Management & Sales Pipeline (superadmin only).

HTTP only: validates auth, maps requests to the service layer, wraps results in
the standard ApiResponse. No business logic lives here.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.lead_management import constants as c
from backend.app.modules.lead_management import service
from backend.app.modules.lead_management.schemas import (
    LeadCreateRequest, LeadUpdateRequest, StageUpdateRequest, LeadLostRequest,
    ActivityCreateRequest, ActivityUpdateRequest,
    DemoCreateRequest, DemoUpdateRequest,
    FollowupCreateRequest, FollowupUpdateRequest,
    NoteCreateRequest, ProposalCreateRequest, ProposalUpdateRequest,
    NegotiationCreateRequest, ConvertEnquiryRequest, ConvertClientRequest,
)
from backend.shared.response import ApiResponse
from backend.shared.storage.file_handler import (
    UPLOAD_ROOT, _tenant_folder, _unique_filename,
)

router = APIRouter()
_bearer = HTTPBearer()


def _current_admin(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Validate the superadmin JWT and return {user_id, email}."""
    try:
        payload = decode_access_token(creds.credentials)
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Superadmin role required.")
        request.state.token_kid = payload.get("_kid", "unknown")
        return {"user_id": payload.get("user_id"), "email": payload.get("email", "unknown")}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


def _save_document(file: UploadFile, module: str) -> tuple[str, str]:
    """Persist an uploaded file under uploads/platform/<module>/ with validation.

    Returns (relative_path, original_filename). Accepts document types (not just
    images) so it does not reuse the image-only storage helper.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in c.ALLOWED_DOCUMENT_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext or 'unknown'}'.")
    contents = file.file.read()
    if len(contents) > c.MAX_DOCUMENT_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large. Max {c.MAX_DOCUMENT_SIZE_MB} MB.")
    # Private root (not the public /uploads mount) — confidential CRM artifacts.
    folder = Path(c.LEAD_PRIVATE_STORAGE_ROOT) / c.LEAD_STORAGE_BUCKET / module
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / _unique_filename(file.filename or "upload.bin")
    with open(dest, "wb") as fh:
        fh.write(contents)
    return str(dest), (file.filename or os.path.basename(str(dest)))


# ── Metadata / options ───────────────────────────────────────────────────────
@router.get("/meta/options", summary="Controlled vocabularies for lead forms")
def get_options(_admin: dict = Depends(_current_admin)):
    return ApiResponse.ok({
        "stages": c.LEAD_STAGES,
        "statuses": c.LEAD_STATUSES,
        "sources": c.LEAD_SOURCES,
        "activity_types": c.ACTIVITY_TYPES,
        "demo_types": c.DEMO_TYPES,
        "demo_statuses": c.DEMO_STATUSES,
        "followup_types": c.FOLLOWUP_TYPES,
        "followup_priorities": c.FOLLOWUP_PRIORITIES,
        "followup_statuses": c.FOLLOWUP_STATUSES,
        "document_types": c.DOCUMENT_TYPES,
        "proposal_statuses": c.PROPOSAL_STATUSES,
        "negotiation_statuses": c.NEGOTIATION_STATUSES,
        "loss_reasons": c.LOSS_REASONS,
        "score_labels": [c.SCORE_LABEL_HOT, c.SCORE_LABEL_WARM, c.SCORE_LABEL_COLD],
    }).model_dump()


# ── Dashboard ────────────────────────────────────────────────────────────────
@router.get("/dashboard", summary="Lead pipeline dashboard widgets")
def dashboard(db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.dashboard(db)).model_dump()


# ── Lead CRUD ────────────────────────────────────────────────────────────────
@router.get("", summary="List leads (paginated, filterable, sortable)")
def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    stage: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    score_label: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(_current_admin),
):
    allowed_sort = {"created_at", "updated_at", "company_name", "lead_score", "expected_revenue", "current_stage"}
    sort_by = sort_by if sort_by in allowed_sort else "created_at"
    items, total = service.list_leads(
        db, page=page, page_size=page_size, search=search, stage=stage,
        status=status, source=source, score_label=score_label, sort_by=sort_by, sort_dir=sort_dir,
    )
    return ApiResponse.paginated(items, total, page, page_size).model_dump()


@router.post("", summary="Create a lead")
def create_lead(payload: LeadCreateRequest, db: Session = Depends(get_platform_db),
                admin: dict = Depends(_current_admin)):
    data = service.create_lead(db, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, "Lead created.").model_dump()


@router.get("/{lead_id}", summary="Get a lead's full detail")
def get_lead(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_lead_detail(db, lead_id)).model_dump()


@router.patch("/{lead_id}", summary="Update a lead")
def update_lead(lead_id: str, payload: LeadUpdateRequest, db: Session = Depends(get_platform_db),
                admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_lead(db, lead_id, payload, actor=admin["email"]), "Lead updated.").model_dump()


@router.delete("/{lead_id}", summary="Soft-delete a lead")
def delete_lead(lead_id: str, db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    service.delete_lead(db, lead_id, actor=admin["email"])
    return ApiResponse.ok(None, "Lead deleted.").model_dump()


@router.post("/{lead_id}/stage", summary="Move a lead to a new stage")
def update_stage(lead_id: str, payload: StageUpdateRequest, db: Session = Depends(get_platform_db),
                 admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_stage(db, lead_id, payload.stage, actor=admin["email"]),
                          "Stage updated.").model_dump()


@router.post("/{lead_id}/lost", summary="Mark a lead as lost (with analysis)")
def mark_lost(lead_id: str, payload: LeadLostRequest, db: Session = Depends(get_platform_db),
              admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.mark_lost(db, lead_id, payload, actor=admin["email"]),
                          "Lead marked as lost.").model_dump()


# ── Activities ───────────────────────────────────────────────────────────────
@router.get("/{lead_id}/activities")
def list_activities(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_activities(db, lead_id)).model_dump()


@router.post("/{lead_id}/activities")
def add_activity(lead_id: str, payload: ActivityCreateRequest, db: Session = Depends(get_platform_db),
                 admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_activity(db, lead_id, payload, actor_id=admin["user_id"], actor=admin["email"]),
                          "Activity added.").model_dump()


@router.patch("/{lead_id}/activities/{activity_id}")
def update_activity(lead_id: str, activity_id: str, payload: ActivityUpdateRequest,
                    db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_activity(db, lead_id, activity_id, payload, actor=admin["email"]),
                          "Activity updated.").model_dump()


@router.delete("/{lead_id}/activities/{activity_id}")
def delete_activity(lead_id: str, activity_id: str, db: Session = Depends(get_platform_db),
                    _admin: dict = Depends(_current_admin)):
    service.delete_activity(db, lead_id, activity_id)
    return ApiResponse.ok(None, "Activity deleted.").model_dump()


# ── Demos ────────────────────────────────────────────────────────────────────
@router.get("/{lead_id}/demos")
def list_demos(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_demos(db, lead_id)).model_dump()


@router.post("/{lead_id}/demos")
def add_demo(lead_id: str, payload: DemoCreateRequest, db: Session = Depends(get_platform_db),
             admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_demo(db, lead_id, payload, actor_id=admin["user_id"], actor=admin["email"]),
                          "Demo saved.").model_dump()


@router.patch("/{lead_id}/demos/{demo_id}")
def update_demo(lead_id: str, demo_id: str, payload: DemoUpdateRequest, db: Session = Depends(get_platform_db),
                admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_demo(db, lead_id, demo_id, payload, actor=admin["email"]),
                          "Demo updated.").model_dump()


@router.delete("/{lead_id}/demos/{demo_id}")
def delete_demo(lead_id: str, demo_id: str, db: Session = Depends(get_platform_db),
                _admin: dict = Depends(_current_admin)):
    service.delete_demo(db, lead_id, demo_id)
    return ApiResponse.ok(None, "Demo deleted.").model_dump()


# ── Follow-ups ───────────────────────────────────────────────────────────────
@router.get("/{lead_id}/followups")
def list_followups(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_followups(db, lead_id)).model_dump()


@router.post("/{lead_id}/followups")
def add_followup(lead_id: str, payload: FollowupCreateRequest, db: Session = Depends(get_platform_db),
                 admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_followup(db, lead_id, payload, actor_id=admin["user_id"]),
                          "Follow-up created.").model_dump()


@router.patch("/{lead_id}/followups/{followup_id}")
def update_followup(lead_id: str, followup_id: str, payload: FollowupUpdateRequest,
                    db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_followup(db, lead_id, followup_id, payload), "Follow-up updated.").model_dump()


@router.delete("/{lead_id}/followups/{followup_id}")
def delete_followup(lead_id: str, followup_id: str, db: Session = Depends(get_platform_db),
                    _admin: dict = Depends(_current_admin)):
    service.delete_followup(db, lead_id, followup_id)
    return ApiResponse.ok(None, "Follow-up deleted.").model_dump()


# ── Notes ────────────────────────────────────────────────────────────────────
@router.get("/{lead_id}/notes")
def list_notes(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_notes(db, lead_id)).model_dump()


@router.post("/{lead_id}/notes")
def add_note(lead_id: str, payload: NoteCreateRequest, db: Session = Depends(get_platform_db),
             admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_note(db, lead_id, payload, actor_id=admin["user_id"]), "Note added.").model_dump()


@router.delete("/{lead_id}/notes/{note_id}")
def delete_note(lead_id: str, note_id: str, db: Session = Depends(get_platform_db),
                _admin: dict = Depends(_current_admin)):
    service.delete_note(db, lead_id, note_id)
    return ApiResponse.ok(None, "Note deleted.").model_dump()


# ── Documents ────────────────────────────────────────────────────────────────
@router.get("/{lead_id}/documents")
def list_documents(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_documents(db, lead_id)).model_dump()


@router.post("/{lead_id}/documents")
def upload_document(
    lead_id: str,
    document_type: str = Form("Other"),
    file: UploadFile = File(...),
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(_current_admin),
):
    if document_type not in c.DOCUMENT_TYPES:
        raise HTTPException(status_code=422, detail="Invalid document_type.")
    path, original = _save_document(file, c.LEAD_DOCUMENTS_MODULE)
    data = service.add_document(db, lead_id, document_type=document_type, file_name=original,
                                file_path=path, actor_id=admin["user_id"])
    return ApiResponse.ok(data, "Document uploaded.").model_dump()


@router.get("/{lead_id}/documents/{document_id}/download")
def download_document(lead_id: str, document_id: str, db: Session = Depends(get_platform_db),
                     _admin: dict = Depends(_current_admin)):
    file_path, name = service.get_document_file(db, lead_id, document_id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File no longer available.")
    return FileResponse(file_path, filename=name)


@router.delete("/{lead_id}/documents/{document_id}")
def delete_document(lead_id: str, document_id: str, db: Session = Depends(get_platform_db),
                    _admin: dict = Depends(_current_admin)):
    from backend.shared.storage.file_handler import delete_file
    path = service.delete_document(db, lead_id, document_id)
    if path:
        delete_file(path)
    return ApiResponse.ok(None, "Document deleted.").model_dump()


# ── Proposals ────────────────────────────────────────────────────────────────
@router.get("/{lead_id}/proposals")
def list_proposals(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_proposals(db, lead_id)).model_dump()


@router.post("/{lead_id}/proposals")
def add_proposal(
    lead_id: str,
    proposal_date: Optional[str] = Form(None),
    quoted_amount: Optional[float] = Form(None),
    modules_included: Optional[str] = Form(None),
    status: str = Form(c.PROPOSAL_STATUS_DRAFT),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(_current_admin),
):
    payload = ProposalCreateRequest(
        proposal_date=proposal_date or None, quoted_amount=quoted_amount,
        modules_included=modules_included, status=status,
    )
    file_path = file_name = None
    if file is not None and (file.filename or ""):
        file_path, file_name = _save_document(file, c.LEAD_PROPOSALS_MODULE)
    data = service.add_proposal(db, lead_id, payload, file_name=file_name, file_path=file_path,
                                actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, "Proposal created.").model_dump()


@router.get("/{lead_id}/proposals/{proposal_id}/download")
def download_proposal(lead_id: str, proposal_id: str, db: Session = Depends(get_platform_db),
                     _admin: dict = Depends(_current_admin)):
    file_path, name = service.get_proposal_file(db, lead_id, proposal_id)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File no longer available.")
    return FileResponse(file_path, filename=name)


@router.patch("/{lead_id}/proposals/{proposal_id}")
def update_proposal(lead_id: str, proposal_id: str, payload: ProposalUpdateRequest,
                    db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_proposal(db, lead_id, proposal_id, payload, actor=admin["email"]),
                          "Proposal updated.").model_dump()


# ── Negotiations ─────────────────────────────────────────────────────────────
@router.get("/{lead_id}/negotiations")
def list_negotiations(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_negotiations(db, lead_id)).model_dump()


@router.post("/{lead_id}/negotiations")
def add_negotiation(lead_id: str, payload: NegotiationCreateRequest, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_negotiation(db, lead_id, payload, actor_id=admin["user_id"]),
                          "Negotiation recorded.").model_dump()


# ── Timeline / conversions ───────────────────────────────────────────────────
@router.get("/{lead_id}/timeline")
def get_timeline(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_timeline(db, lead_id)).model_dump()


@router.get("/{lead_id}/conversions")
def list_conversions(lead_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_conversions(db, lead_id)).model_dump()


@router.post("/{lead_id}/convert-to-client", summary="Convert a Won lead into a client")
def convert_to_client(lead_id: str, payload: ConvertClientRequest, db: Session = Depends(get_platform_db),
                      admin: dict = Depends(_current_admin)):
    data = service.convert_lead_to_client(db, lead_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, "Lead converted to client.").model_dump()


# ── Convert enquiry → lead (lives here for cohesion with the pipeline) ─────────
@router.post("/convert-enquiry/{enquiry_id}", summary="Convert an enquiry into a lead")
def convert_enquiry(enquiry_id: int, payload: ConvertEnquiryRequest, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    data = service.convert_enquiry_to_lead(db, enquiry_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, "Enquiry converted to lead.").model_dump()
