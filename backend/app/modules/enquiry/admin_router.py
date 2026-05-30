"""
Router layer — superadmin Enquiry Inbox (superadmin only).

HTTP only: validates auth, maps requests to the service layer, wraps results in
the standard ApiResponse. No business logic lives here.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.enquiry import admin_service as service
from backend.app.modules.enquiry import constants as c
from backend.app.modules.enquiry.schemas import (
    EnquiryAssignRequest,
    EnquiryConvertRequest,
    EnquiryNoteCreateRequest,
    EnquirySpamRequest,
    EnquiryStatusUpdateRequest,
)
from backend.shared.response import ApiResponse

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


# ── Metadata / options ───────────────────────────────────────────────────────
@router.get("/meta/options", summary="Controlled vocabularies for the enquiry inbox")
def get_options(_admin: dict = Depends(_current_admin)):
    return ApiResponse.ok({
        "statuses": c.ENQUIRY_STATUSES,
        "all_statuses": c.ALL_ENQUIRY_STATUSES,
        "sortable_fields": c.SORTABLE_FIELDS,
    })


@router.get("/dashboard", summary="Enquiry inbox stats")
def dashboard(db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.dashboard(db))


# ── List & detail ────────────────────────────────────────────────────────────
@router.get("", summary="List enquiries (paginated/filterable/searchable)")
def list_enquiries(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(_current_admin),
    page: int = Query(c.DEFAULT_PAGE, ge=1),
    page_size: int = Query(c.DEFAULT_PAGE_SIZE, ge=1, le=c.MAX_PAGE_SIZE),
    sort_by: str = Query(c.DEFAULT_SORT_BY),
    sort_dir: str = Query(c.DEFAULT_SORT_DIR),
    status: Optional[str] = Query(None),
    is_spam: Optional[bool] = Query(None),
    assigned_to: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
):
    result = service.list_enquiries(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir,
        status=status, is_spam=is_spam, assigned_to=assigned_to, search=search,
    )
    return ApiResponse.paginated(
        items=result["items"], total=result["total"],
        page=result["page"], page_size=result["page_size"],
    )


@router.get("/{enquiry_id}", summary="Enquiry detail (decrypted PII + traceability)")
def get_detail(enquiry_id: int, db: Session = Depends(get_platform_db),
               _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_detail(db, enquiry_id))


# ── Status management ────────────────────────────────────────────────────────
@router.patch("/{enquiry_id}/status", summary="Update enquiry status")
def update_status(enquiry_id: int, payload: EnquiryStatusUpdateRequest,
                  db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    data = service.update_status(db, enquiry_id, payload.status,
                                 actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Status updated.")


# ── Assignment ───────────────────────────────────────────────────────────────
@router.patch("/{enquiry_id}/assign", summary="Assign / unassign an enquiry")
def assign(enquiry_id: int, payload: EnquiryAssignRequest,
           db: Session = Depends(get_platform_db),
           admin: dict = Depends(_current_admin)):
    data = service.assign(db, enquiry_id, payload.assigned_to,
                          actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Assignment updated.")


# ── Spam management ──────────────────────────────────────────────────────────
@router.patch("/{enquiry_id}/spam", summary="Mark / unmark an enquiry as spam")
def set_spam(enquiry_id: int, payload: EnquirySpamRequest,
             db: Session = Depends(get_platform_db),
             admin: dict = Depends(_current_admin)):
    data = service.set_spam(db, enquiry_id, payload.is_spam,
                            actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Spam flag updated.")


# ── Notes ────────────────────────────────────────────────────────────────────
@router.post("/{enquiry_id}/notes", status_code=status.HTTP_201_CREATED, summary="Add a note")
def add_note(enquiry_id: int, payload: EnquiryNoteCreateRequest,
             db: Session = Depends(get_platform_db),
             admin: dict = Depends(_current_admin)):
    data = service.add_note(db, enquiry_id, payload.note,
                            actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Note added.")


@router.delete("/{enquiry_id}/notes/{note_id}", summary="Delete a note")
def delete_note(enquiry_id: int, note_id: int,
                db: Session = Depends(get_platform_db),
                admin: dict = Depends(_current_admin)):
    service.delete_note(db, enquiry_id, note_id,
                        actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(message="Note deleted.")


# ── Activity timeline ─────────────────────────────────────────────────────────
@router.get("/{enquiry_id}/timeline", summary="Enquiry activity timeline")
def timeline(enquiry_id: int, db: Session = Depends(get_platform_db),
             _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_timeline(db, enquiry_id))


# ── Convert to Lead ──────────────────────────────────────────────────────────
@router.post("/{enquiry_id}/convert-to-lead", summary="Convert an enquiry into a lead")
def convert_to_lead(enquiry_id: int, payload: EnquiryConvertRequest,
                    db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    data = service.convert_to_lead(
        db, enquiry_id, lead_source=payload.lead_source, lead_owner_id=payload.lead_owner_id,
        actor_id=admin["user_id"], actor=admin["email"],
    )
    return ApiResponse.ok(data, message="Enquiry converted to lead.")
