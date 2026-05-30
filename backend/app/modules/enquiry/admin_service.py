"""
Service layer — superadmin Enquiry Inbox business logic.

Responsibilities:
  - List / detail with decrypted PII (decrypted only into responses, never logged).
  - Status management, assignment, spam flagging.
  - Notes + an activity timeline (every workflow event is journalled).
  - Convert-to-Lead (delegates to lead_management to avoid duplicating the
    conversion logic) and full traceability: Website Enquiry → Lead → Client,
    surfaced from both the enquiry and the lead.
"""
import logging
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.enquiry import constants as c
from backend.app.modules.enquiry import repository as repo
from backend.app.modules.enquiry.models import Enquiry
from backend.shared.audit.audit_logger import mask_email, mask_value, record_audit
from backend.shared.security.encryption import decrypt_value

logger = logging.getLogger(__name__)


# ── PII helpers ──────────────────────────────────────────────────────────────
def _safe_decrypt(token: Optional[str]) -> Optional[str]:
    """Decrypt a token, returning None (never raising) if it cannot be read.

    Keeps the inbox resilient to a key-rotation gap — a single un-decryptable
    row should not 500 the whole list/detail view.
    """
    if not token:
        return None
    try:
        return decrypt_value(token)
    except Exception:
        logger.warning("Failed to decrypt an enquiry PII value.")
        return None


def _require_enquiry(db: Session, enquiry_id: int) -> Enquiry:
    enquiry = repo.get_by_id(db, enquiry_id)
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found.")
    return enquiry


# ── Serializers ──────────────────────────────────────────────────────────────
def _list_item(enquiry: Enquiry) -> dict:
    return {
        "id": enquiry.id,
        "enquiry_number": enquiry.enquiry_number,
        "full_name": enquiry.full_name,
        "company_name": enquiry.company_name,
        "email": _safe_decrypt(enquiry.email_encrypted),
        "interested_module": enquiry.interested_module,
        "source": enquiry.source,
        "status": enquiry.status,
        "is_spam": enquiry.is_spam,
        "assigned_to": enquiry.assigned_to,
        "converted_lead_id": enquiry.converted_lead_id,
        "created_at": enquiry.created_at,
    }


def _lead_link(db: Session, enquiry: Enquiry) -> Optional[dict]:
    """Resolve the lead this enquiry was converted into (Enquiry → Lead → Client)."""
    lead_id = enquiry.converted_lead_id
    if not lead_id:
        return None
    from backend.app.modules.lead_management.models import Lead, LeadConversion

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        return None

    conversion = (
        db.query(LeadConversion)
        .filter(LeadConversion.lead_id == lead.id)
        .order_by(LeadConversion.created_at.desc())
        .first()
    )
    return {
        "lead_id": lead.id,
        "lead_number": lead.lead_number,
        "current_stage": lead.current_stage,
        "status": lead.status,
        "converted_to_client": lead.converted_to_client,
        "client_name": conversion.client_name if conversion else None,
        "client_converted_at": conversion.created_at if conversion else None,
    }


def _detail(db: Session, enquiry: Enquiry) -> dict:
    return {
        "id": enquiry.id,
        "enquiry_number": enquiry.enquiry_number,
        "full_name": enquiry.full_name,
        "company_name": enquiry.company_name,
        "email": _safe_decrypt(enquiry.email_encrypted),
        "phone": _safe_decrypt(enquiry.phone_encrypted),
        "message": _safe_decrypt(enquiry.message_encrypted),
        "interested_module": enquiry.interested_module,
        "source": enquiry.source,
        "status": enquiry.status,
        "is_spam": enquiry.is_spam,
        "spam_marked_at": enquiry.spam_marked_at,
        "assigned_to": enquiry.assigned_to,
        "assigned_at": enquiry.assigned_at,
        "converted_lead_id": enquiry.converted_lead_id,
        "converted_at": enquiry.converted_at,
        "closed_at": enquiry.closed_at,
        "consent_given": enquiry.consent_given,
        "consent_timestamp": enquiry.consent_timestamp,
        "marketing_consent": enquiry.marketing_consent,
        "privacy_policy_version": enquiry.privacy_policy_version,
        "ip_address": enquiry.ip_address,
        "referrer_url": enquiry.referrer_url,
        "created_at": enquiry.created_at,
        "updated_at": enquiry.updated_at,
        "lead": _lead_link(db, enquiry),
        "notes": [_note_to_dict(n) for n in repo.list_notes(db, enquiry.id)],
        "timeline": [_activity_to_dict(a) for a in repo.list_activities(db, enquiry.id)],
    }


def _note_to_dict(note) -> dict:
    return {
        "id": note.id,
        "note": note.note,
        "created_by": note.created_by,
        "created_at": note.created_at,
    }


def _activity_to_dict(act) -> dict:
    return {
        "id": act.id,
        "activity_type": act.activity_type,
        "description": act.description,
        "created_by": act.created_by,
        "created_at": act.created_at,
    }


# ── List & detail ────────────────────────────────────────────────────────────
def list_enquiries(
    db: Session,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_dir: str,
    status: Optional[str],
    is_spam: Optional[bool],
    assigned_to: Optional[int],
    search: Optional[str],
) -> dict:
    page = max(1, page)
    page_size = min(max(1, page_size), c.MAX_PAGE_SIZE)
    if sort_by not in c.SORTABLE_FIELDS:
        sort_by = c.DEFAULT_SORT_BY
    sort_dir = "asc" if sort_dir == "asc" else "desc"

    items, total = repo.list_enquiries(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir,
        status=status, is_spam=is_spam, assigned_to=assigned_to, search=search,
    )
    return {
        "items": [_list_item(e) for e in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_detail(db: Session, enquiry_id: int) -> dict:
    return _detail(db, _require_enquiry(db, enquiry_id))


def dashboard(db: Session) -> dict:
    statuses = repo.status_counts(db)
    return {
        "total": repo.total_count(db),
        "spam": repo.spam_count(db),
        "status_breakdown": statuses,
        "new": statuses.get(c.STATUS_NEW, 0),
        "in_review": statuses.get(c.STATUS_IN_REVIEW, 0),
        "assigned": statuses.get(c.STATUS_ASSIGNED, 0),
        "converted": statuses.get(c.STATUS_CONVERTED, 0),
        "closed": statuses.get(c.STATUS_CLOSED, 0),
    }


# ── Status management ────────────────────────────────────────────────────────
def update_status(db: Session, enquiry_id: int, new_status: str, *, actor_id, actor) -> dict:
    enquiry = _require_enquiry(db, enquiry_id)
    if enquiry.status in c.TERMINAL_STATUSES:
        raise HTTPException(
            status_code=409,
            detail=f"Enquiry is {enquiry.status} and its status can no longer be changed.",
        )
    old_status = enquiry.status
    if new_status == old_status:
        return _detail(db, enquiry)

    enquiry.status = new_status
    if new_status == c.STATUS_CLOSED:
        enquiry.closed_at = datetime.utcnow()
    elif old_status == c.STATUS_CLOSED:
        # Re-opening a closed enquiry — clear stale closure metadata.
        enquiry.closed_at = None

    repo.add_activity(
        db, enquiry.id, c.ACTIVITY_STATUS_CHANGED,
        f"Status changed from {old_status} to {new_status}.", actor_id,
    )
    record_audit(db, c.AUDIT_STATUS_CHANGED, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor,
                 metadata={"from": old_status, "to": new_status})
    db.commit()
    db.refresh(enquiry)
    return _detail(db, enquiry)


# ── Assignment ───────────────────────────────────────────────────────────────
def assign(db: Session, enquiry_id: int, assigned_to: Optional[int], *, actor_id, actor) -> dict:
    enquiry = _require_enquiry(db, enquiry_id)
    if enquiry.status in c.TERMINAL_STATUSES:
        raise HTTPException(status_code=409, detail=f"Enquiry is {enquiry.status} and cannot be reassigned.")

    enquiry.assigned_to = assigned_to
    if assigned_to:
        enquiry.assigned_at = datetime.utcnow()
        # Auto-advance a brand-new enquiry to "Assigned" on first assignment.
        if enquiry.status == c.STATUS_NEW:
            enquiry.status = c.STATUS_ASSIGNED
        repo.add_activity(db, enquiry.id, c.ACTIVITY_ASSIGNED,
                          f"Assigned to user #{assigned_to}.", actor_id)
    else:
        enquiry.assigned_at = None
        repo.add_activity(db, enquiry.id, c.ACTIVITY_UNASSIGNED, "Assignment cleared.", actor_id)

    record_audit(db, c.AUDIT_ASSIGNED, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor,
                 metadata={"assigned_to": assigned_to})
    db.commit()
    db.refresh(enquiry)
    return _detail(db, enquiry)


# ── Spam management ──────────────────────────────────────────────────────────
def set_spam(db: Session, enquiry_id: int, is_spam: bool, *, actor_id, actor) -> dict:
    enquiry = _require_enquiry(db, enquiry_id)
    if enquiry.is_spam == is_spam:
        return _detail(db, enquiry)

    enquiry.is_spam = is_spam
    enquiry.spam_marked_at = datetime.utcnow() if is_spam else None

    if is_spam:
        repo.add_activity(db, enquiry.id, c.ACTIVITY_MARKED_SPAM, "Marked as spam.", actor_id)
        record_audit(db, c.AUDIT_MARKED_SPAM, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor)
    else:
        repo.add_activity(db, enquiry.id, c.ACTIVITY_UNMARKED_SPAM, "Unmarked as spam.", actor_id)
        record_audit(db, c.AUDIT_UNMARKED_SPAM, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor)

    db.commit()
    db.refresh(enquiry)
    return _detail(db, enquiry)


# ── Notes ────────────────────────────────────────────────────────────────────
def add_note(db: Session, enquiry_id: int, note: str, *, actor_id, actor) -> dict:
    enquiry = _require_enquiry(db, enquiry_id)
    row = repo.add_note(db, enquiry.id, note, actor_id)
    repo.add_activity(db, enquiry.id, c.ACTIVITY_NOTE_ADDED, "Note added.", actor_id)
    record_audit(db, c.AUDIT_NOTE_ADDED, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor)
    db.commit()
    db.refresh(row)
    return _note_to_dict(row)


def delete_note(db: Session, enquiry_id: int, note_id: int, *, actor_id, actor) -> None:
    enquiry = _require_enquiry(db, enquiry_id)
    note = repo.get_note(db, enquiry.id, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    note.is_deleted = True
    note.deleted_at = datetime.utcnow()
    repo.add_activity(db, enquiry.id, c.ACTIVITY_NOTE_DELETED, "Note deleted.", actor_id)
    record_audit(db, c.AUDIT_NOTE_DELETED, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor,
                 metadata={"note_id": note_id})
    db.commit()


def list_timeline(db: Session, enquiry_id: int) -> list:
    _require_enquiry(db, enquiry_id)
    return [_activity_to_dict(a) for a in repo.list_activities(db, enquiry_id)]


# ── Convert to Lead ──────────────────────────────────────────────────────────
def convert_to_lead(db: Session, enquiry_id: int, *, lead_source: Optional[str],
                    lead_owner_id: Optional[int], actor_id, actor) -> dict:
    """Convert an enquiry into a lead and journal the link for full traceability.

    Delegates the actual lead creation to lead_management to avoid duplicating
    that logic, then stamps ``converted_lead_id`` / ``converted_at`` and writes an
    activity + audit entry so the conversion shows up in BOTH records.
    """
    from backend.app.modules.lead_management.schemas import ConvertEnquiryRequest
    from backend.app.modules.lead_management.service import convert_enquiry_to_lead

    enquiry = _require_enquiry(db, enquiry_id)
    if enquiry.is_spam:
        raise HTTPException(status_code=409, detail="Spam enquiries cannot be converted to a lead.")
    if enquiry.converted_lead_id:
        raise HTTPException(status_code=409, detail="This enquiry has already been converted to a lead.")

    req = ConvertEnquiryRequest(lead_source=lead_source or "Website", lead_owner_id=lead_owner_id)
    # This commits internally: creates the lead, sets enquiry.status="Converted".
    lead = convert_enquiry_to_lead(db, enquiry_id, req, actor_id=actor_id, actor=actor)

    # Stamp the reverse link + journal the event on the enquiry side.
    enquiry = _require_enquiry(db, enquiry_id)
    enquiry.converted_lead_id = lead.get("id")
    enquiry.converted_at = datetime.utcnow()
    repo.add_activity(
        db, enquiry.id, c.ACTIVITY_CONVERTED,
        f"Converted to lead {lead.get('lead_number')}.", actor_id,
    )
    record_audit(db, c.AUDIT_CONVERTED, c.AUDIT_ENTITY, enquiry.enquiry_number, actor=actor,
                 metadata={"lead_number": lead.get("lead_number")})
    db.commit()
    db.refresh(enquiry)
    return {"enquiry": _detail(db, enquiry), "lead": lead}
