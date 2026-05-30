"""
Service layer — business logic for Lead Management.

Responsibilities:
  - PII encryption (email/phone) + blind-index dedupe.
  - Lead numbering, scoring (Hot/Warm/Cold), stage transitions & metric anchoring.
  - CRUD for leads + child entities (activities, demos, follow-ups, notes,
    documents, proposals, negotiations).
  - Convert Enquiry→Lead (idempotent) and Lead→Client (Won only) with placeholder
    tenant + subscription + immutable conversion record.
  - Audit logging with masked PII; standardized DTOs (PII decrypted only here).
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.lead_management import constants as c
from backend.app.modules.lead_management import repository as repo
from backend.app.modules.lead_management.models import (
    Lead, LeadActivity, LeadDemo, LeadFollowup, LeadNote,
    LeadDocument, LeadProposal, LeadNegotiation, LeadConversion,
)
from backend.app.modules.lead_management.schemas import (
    LeadCreateRequest, LeadUpdateRequest, LeadLostRequest,
    ActivityCreateRequest, ActivityUpdateRequest,
    DemoCreateRequest, DemoUpdateRequest,
    FollowupCreateRequest, FollowupUpdateRequest,
    NoteCreateRequest, ProposalCreateRequest, ProposalUpdateRequest,
    NegotiationCreateRequest, ConvertEnquiryRequest, ConvertClientRequest,
)
from backend.shared.security.encryption import encrypt_value, decrypt_value, blind_index
from backend.shared.audit.audit_logger import record_audit, mask_email, mask_value


# ════════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════════
def _generate_lead_number(db: Session) -> str:
    date_part = datetime.utcnow().strftime("%Y%m%d")
    for _ in range(5):
        suffix = uuid.uuid4().hex[:8].upper()
        candidate = f"{c.LEAD_NUMBER_PREFIX}-{date_part}-{suffix}"
        if not repo.exists_by_lead_number(db, candidate):
            return candidate
    return f"{c.LEAD_NUMBER_PREFIX}-{date_part}-{uuid.uuid4().hex.upper()}"


def _safe_decrypt(token: Optional[str]) -> Optional[str]:
    """Decrypt without ever raising into a response (corrupt token → None)."""
    if not token:
        return None
    try:
        return decrypt_value(token)
    except Exception:
        return None


def _company_size_points(size: Optional[str]) -> int:
    if not size:
        return 0
    nums = re.findall(r"\d+", size)
    n = int(nums[-1]) if nums else 0
    if n >= 1000:
        return 15
    if n >= 250:
        return 12
    if n >= 50:
        return 8
    if n >= 10:
        return 4
    return 2


def _users_points(users: Optional[int]) -> int:
    if not users:
        return 0
    if users >= 500:
        return 15
    if users >= 100:
        return 10
    if users >= 25:
        return 6
    return 3


def _revenue_points(revenue: Optional[float]) -> int:
    if not revenue or revenue <= 0:
        return 0
    if revenue >= 100_000:
        return 25
    if revenue >= 50_000:
        return 18
    if revenue >= 10_000:
        return 12
    return 6


def compute_score(db: Session, lead: Lead) -> tuple[int, str]:
    """Score a lead from demo/proposal progress, revenue, company size & users."""
    score = 0

    demos = repo.list_demos(db, lead.id)
    if any(d.status == c.DEMO_STATUS_COMPLETED for d in demos):
        score += 30
    elif demos:
        score += 10  # demo scheduled but not yet completed

    proposals = repo.list_proposals(db, lead.id)
    if any(p.status in (c.PROPOSAL_STATUS_SENT, c.PROPOSAL_STATUS_ACCEPTED) for p in proposals):
        score += 25
    elif proposals:
        score += 8

    score += _revenue_points(lead.expected_revenue)
    score += _company_size_points(lead.company_size)
    score += _users_points(lead.expected_user_count)

    score = max(0, min(100, score))
    if score >= c.SCORE_HOT_THRESHOLD:
        label = c.SCORE_LABEL_HOT
    elif score >= c.SCORE_WARM_THRESHOLD:
        label = c.SCORE_LABEL_WARM
    else:
        label = c.SCORE_LABEL_COLD
    return score, label


def _recompute_score(db: Session, lead: Lead) -> None:
    lead.lead_score, lead.lead_score_label = compute_score(db, lead)


def _days_between(later: Optional[datetime], earlier: Optional[datetime]) -> Optional[int]:
    if not later or not earlier:
        return None
    return max(0, (later - earlier).days)


def compute_metrics(lead: Lead) -> dict:
    now = datetime.utcnow()
    end = lead.conversion_date or lead.won_date or now
    return {
        "lead_age_days": _days_between(now, lead.created_at),
        "sales_cycle_days": _days_between(lead.won_date or lead.conversion_date, lead.created_at),
        "time_to_demo_days": _days_between(lead.demo_date, lead.created_at),
        "time_to_proposal_days": _days_between(lead.proposal_date, lead.created_at),
        "time_to_conversion_days": _days_between(lead.conversion_date, lead.created_at),
    }


# ════════════════════════════════════════════════════════════════════════════
# DTO builders
# ════════════════════════════════════════════════════════════════════════════
def lead_to_summary(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "lead_number": lead.lead_number,
        "company_name": lead.company_name,
        "contact_name": lead.contact_name,
        "designation": lead.designation,
        "lead_source": lead.lead_source,
        "current_stage": lead.current_stage,
        "status": lead.status,
        "expected_revenue": lead.expected_revenue,
        "lead_score": lead.lead_score,
        "lead_score_label": lead.lead_score_label,
        "converted_to_client": lead.converted_to_client,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }


def lead_to_detail(lead: Lead) -> dict:
    data = lead_to_summary(lead)
    data.update(
        {
            "email": _safe_decrypt(lead.email_encrypted),
            "phone": _safe_decrypt(lead.phone_encrypted),
            "website": lead.website,
            "industry": lead.industry,
            "country": lead.country,
            "company_size": lead.company_size,
            "expected_user_count": lead.expected_user_count,
            "lead_owner_id": lead.lead_owner_id,
            "expected_go_live_date": lead.expected_go_live_date,
            "interested_modules": lead.interested_modules,
            "converted_client_id": lead.converted_client_id,
            "source_enquiry_id": lead.source_enquiry_id,
            "loss_reason": lead.loss_reason,
            "competitor_name": lead.competitor_name,
            "loss_remarks": lead.loss_remarks,
            "first_contact_date": lead.first_contact_date,
            "demo_date": lead.demo_date,
            "proposal_date": lead.proposal_date,
            "won_date": lead.won_date,
            "conversion_date": lead.conversion_date,
            "created_by": lead.created_by,
            "metrics": compute_metrics(lead),
        }
    )
    return data


def activity_to_dict(a: LeadActivity) -> dict:
    return {
        "id": a.id, "lead_id": a.lead_id, "activity_type": a.activity_type,
        "activity_date": a.activity_date, "remarks": a.remarks,
        "next_action_date": a.next_action_date, "created_by": a.created_by,
        "created_at": a.created_at,
    }


def demo_to_dict(d: LeadDemo) -> dict:
    return {
        "id": d.id, "lead_id": d.lead_id, "demo_date": d.demo_date,
        "demo_type": d.demo_type, "conducted_by": d.conducted_by, "status": d.status,
        "feedback": d.feedback, "interested_modules": d.interested_modules,
        "expected_users": d.expected_users, "next_steps": d.next_steps,
        "created_at": d.created_at,
    }


def followup_to_dict(f: LeadFollowup) -> dict:
    return {
        "id": f.id, "lead_id": f.lead_id, "followup_date": f.followup_date,
        "followup_type": f.followup_type, "priority": f.priority,
        "remarks": f.remarks, "status": _effective_followup_status(f),
        "created_at": f.created_at,
    }


def note_to_dict(n: LeadNote) -> dict:
    return {
        "id": n.id, "lead_id": n.lead_id, "note": n.note,
        "created_by": n.created_by, "created_at": n.created_at,
    }


def document_to_dict(d: LeadDocument) -> dict:
    return {
        "id": d.id, "lead_id": d.lead_id, "document_type": d.document_type,
        "file_name": d.file_name,
        "uploaded_by": d.uploaded_by, "created_at": d.created_at,
        "has_file": bool(d.file_path),
        "url": f"/api/v1/superadmin/leads/{d.lead_id}/documents/{d.id}/download" if d.file_path else None,
    }


def proposal_to_dict(p: LeadProposal) -> dict:
    return {
        "id": p.id, "lead_id": p.lead_id, "proposal_version": p.proposal_version,
        "proposal_date": p.proposal_date, "quoted_amount": p.quoted_amount,
        "modules_included": p.modules_included,
        "has_file": bool(p.proposal_document_path),
        "url": f"/api/v1/superadmin/leads/{p.lead_id}/proposals/{p.id}/download" if p.proposal_document_path else None,
        "status": p.status, "created_at": p.created_at,
    }


def negotiation_to_dict(n: LeadNegotiation) -> dict:
    return {
        "id": n.id, "lead_id": n.lead_id, "discussion_date": n.discussion_date,
        "discussion_notes": n.discussion_notes,
        "expected_closure_date": n.expected_closure_date, "status": n.status,
        "created_at": n.created_at,
    }


def conversion_to_dict(cv: LeadConversion) -> dict:
    return {
        "id": cv.id, "lead_id": cv.lead_id, "client_id": cv.client_id,
        "client_name": cv.client_name, "subscription_id": cv.subscription_id,
        "lead_age_days": cv.lead_age_days, "sales_cycle_days": cv.sales_cycle_days,
        "time_to_demo_days": cv.time_to_demo_days,
        "time_to_proposal_days": cv.time_to_proposal_days,
        "time_to_conversion_days": cv.time_to_conversion_days,
        "converted_by": cv.converted_by, "created_at": cv.created_at,
    }


def _effective_followup_status(f: LeadFollowup) -> str:
    """Pending follow-ups whose date has passed are surfaced as Overdue."""
    if f.status == c.FOLLOWUP_STATUS_PENDING and f.followup_date and f.followup_date < datetime.utcnow():
        return c.FOLLOWUP_STATUS_OVERDUE
    return f.status


# ════════════════════════════════════════════════════════════════════════════
# Lead CRUD
# ════════════════════════════════════════════════════════════════════════════
def _require_lead(db: Session, lead_id: str) -> Lead:
    lead = repo.get_lead(db, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead


def create_lead(db: Session, payload: LeadCreateRequest, *, actor_id: Optional[int], actor: Optional[str]) -> dict:
    dedupe = blind_index(payload.email or "", payload.company_name) if payload.email else None
    lead = Lead(
        lead_number=_generate_lead_number(db),
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        email_encrypted=encrypt_value(payload.email) if payload.email else None,
        phone_encrypted=encrypt_value(payload.phone) if payload.phone else None,
        dedupe_hash=dedupe,
        designation=payload.designation,
        website=payload.website,
        industry=payload.industry,
        country=payload.country,
        company_size=payload.company_size,
        expected_user_count=payload.expected_user_count,
        lead_source=payload.lead_source,
        lead_owner_id=payload.lead_owner_id,
        current_stage=payload.current_stage or c.STAGE_NEW,
        status=c.STATUS_OPEN,
        expected_revenue=payload.expected_revenue,
        expected_go_live_date=payload.expected_go_live_date,
        interested_modules=payload.interested_modules,
        created_by=actor_id,
    )
    if lead.current_stage in (c.STAGE_CONTACTED, c.STAGE_QUALIFIED) and not lead.first_contact_date:
        lead.first_contact_date = datetime.utcnow()
    repo.add(db, lead)
    _recompute_score(db, lead)

    record_audit(
        db, c.AUDIT_LEAD_CREATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
        metadata={"lead_number": lead.lead_number, "company": lead.company_name,
                  "email": mask_email(payload.email) if payload.email else None},
    )
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


def get_lead_detail(db: Session, lead_id: str) -> dict:
    return lead_to_detail(_require_lead(db, lead_id))


def list_leads(db: Session, **kwargs) -> tuple[list[dict], int]:
    items, total = repo.list_leads(db, **kwargs)
    return [lead_to_summary(x) for x in items], total


def update_lead(db: Session, lead_id: str, payload: LeadUpdateRequest, *, actor: Optional[str]) -> dict:
    lead = _require_lead(db, lead_id)
    data = payload.model_dump(exclude_unset=True)

    if "email" in data:
        email = data.pop("email")
        lead.email_encrypted = encrypt_value(email) if email else None
        lead.dedupe_hash = blind_index(email or "", lead.company_name) if email else None
    if "phone" in data:
        phone = data.pop("phone")
        lead.phone_encrypted = encrypt_value(phone) if phone else None

    for field, value in data.items():
        setattr(lead, field, value)

    # company_name change must keep dedupe_hash consistent with current email
    if "company_name" in data and lead.email_encrypted:
        current_email = _safe_decrypt(lead.email_encrypted)
        lead.dedupe_hash = blind_index(current_email or "", lead.company_name)

    _recompute_score(db, lead)
    record_audit(db, c.AUDIT_LEAD_UPDATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"fields": list(data.keys())})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


def delete_lead(db: Session, lead_id: str, *, actor: Optional[str]) -> None:
    lead = _require_lead(db, lead_id)
    lead.is_deleted = True
    lead.deleted_at = datetime.utcnow()
    record_audit(db, c.AUDIT_LEAD_UPDATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"action": "soft_delete"})
    db.commit()


# ── Stage transitions ────────────────────────────────────────────────────────
def update_stage(db: Session, lead_id: str, stage: str, *, actor: Optional[str]) -> dict:
    lead = _require_lead(db, lead_id)
    now = datetime.utcnow()
    lead.current_stage = stage

    if stage in (c.STAGE_CONTACTED, c.STAGE_QUALIFIED) and not lead.first_contact_date:
        lead.first_contact_date = now
    if stage == c.STAGE_DEMO_COMPLETED and not lead.demo_date:
        lead.demo_date = now
    if stage == c.STAGE_PROPOSAL_SENT and not lead.proposal_date:
        lead.proposal_date = now
    if stage == c.STAGE_WON:
        lead.status = c.STATUS_WON
        lead.won_date = lead.won_date or now
    elif stage == c.STAGE_LOST:
        lead.status = c.STATUS_LOST
    elif lead.status in (c.STATUS_WON, c.STATUS_LOST) and stage not in (c.STAGE_WON, c.STAGE_LOST):
        lead.status = c.STATUS_OPEN
        lead.won_date = None

    _recompute_score(db, lead)
    action = c.AUDIT_LEAD_WON if stage == c.STAGE_WON else (
        c.AUDIT_LEAD_LOST if stage == c.STAGE_LOST else c.AUDIT_LEAD_UPDATED)
    record_audit(db, action, c.AUDIT_ENTITY, lead.lead_number, actor=actor, metadata={"stage": stage})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


def mark_lost(db: Session, lead_id: str, payload: LeadLostRequest, *, actor: Optional[str]) -> dict:
    lead = _require_lead(db, lead_id)
    lead.current_stage = c.STAGE_LOST
    lead.status = c.STATUS_LOST
    lead.loss_reason = payload.loss_reason
    lead.competitor_name = payload.competitor_name
    lead.loss_remarks = payload.remarks
    _recompute_score(db, lead)
    record_audit(db, c.AUDIT_LEAD_LOST, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"loss_reason": payload.loss_reason, "competitor": payload.competitor_name})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


# ════════════════════════════════════════════════════════════════════════════
# Activities
# ════════════════════════════════════════════════════════════════════════════
def add_activity(db: Session, lead_id: str, payload: ActivityCreateRequest, *, actor_id, actor) -> dict:
    lead = _require_lead(db, lead_id)
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=payload.activity_type,
        activity_date=payload.activity_date or datetime.utcnow(),
        remarks=payload.remarks,
        next_action_date=payload.next_action_date,
        created_by=actor_id,
    )
    repo.add(db, activity)
    if not lead.first_contact_date and payload.activity_type in ("Call", "Email", "WhatsApp", "Meeting"):
        lead.first_contact_date = activity.activity_date
    record_audit(db, c.AUDIT_ACTIVITY_ADDED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"activity_type": payload.activity_type})
    db.commit()
    db.refresh(activity)
    return activity_to_dict(activity)


def update_activity(db: Session, lead_id: str, activity_id: str, payload: ActivityUpdateRequest, *, actor) -> dict:
    lead = _require_lead(db, lead_id)
    activity = repo.get_child(db, LeadActivity, activity_id, lead.id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(activity, field, value)
    db.commit()
    db.refresh(activity)
    return activity_to_dict(activity)


def delete_activity(db: Session, lead_id: str, activity_id: str) -> None:
    lead = _require_lead(db, lead_id)
    activity = repo.get_child(db, LeadActivity, activity_id, lead.id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")
    activity.is_deleted = True
    activity.deleted_at = datetime.utcnow()
    db.commit()


def list_activities(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [activity_to_dict(a) for a in repo.list_activities(db, lead_id)]


# ════════════════════════════════════════════════════════════════════════════
# Demos
# ════════════════════════════════════════════════════════════════════════════
def add_demo(db: Session, lead_id: str, payload: DemoCreateRequest, *, actor_id, actor) -> dict:
    lead = _require_lead(db, lead_id)
    demo = LeadDemo(
        lead_id=lead.id, demo_date=payload.demo_date, demo_type=payload.demo_type,
        conducted_by=payload.conducted_by, status=payload.status or c.DEMO_STATUS_SCHEDULED,
        feedback=payload.feedback, interested_modules=payload.interested_modules,
        expected_users=payload.expected_users, next_steps=payload.next_steps, created_by=actor_id,
    )
    repo.add(db, demo)
    _apply_demo_side_effects(db, lead, demo)
    _recompute_score(db, lead)
    action = c.AUDIT_DEMO_COMPLETED if demo.status == c.DEMO_STATUS_COMPLETED else c.AUDIT_DEMO_SCHEDULED
    record_audit(db, action, c.AUDIT_ENTITY, lead.lead_number, actor=actor, metadata={"status": demo.status})
    db.commit()
    db.refresh(demo)
    return demo_to_dict(demo)


def update_demo(db: Session, lead_id: str, demo_id: str, payload: DemoUpdateRequest, *, actor) -> dict:
    lead = _require_lead(db, lead_id)
    demo = repo.get_child(db, LeadDemo, demo_id, lead.id)
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found.")
    prev_status = demo.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(demo, field, value)
    _apply_demo_side_effects(db, lead, demo)
    _recompute_score(db, lead)
    if demo.status == c.DEMO_STATUS_COMPLETED and prev_status != c.DEMO_STATUS_COMPLETED:
        record_audit(db, c.AUDIT_DEMO_COMPLETED, c.AUDIT_ENTITY, lead.lead_number, actor=actor)
    db.commit()
    db.refresh(demo)
    return demo_to_dict(demo)


def _apply_demo_side_effects(db: Session, lead: Lead, demo: LeadDemo) -> None:
    """Advance stage / anchor metric dates based on demo status."""
    if demo.status == c.DEMO_STATUS_SCHEDULED:
        if lead.current_stage in (c.STAGE_NEW, c.STAGE_CONTACTED, c.STAGE_QUALIFIED):
            lead.current_stage = c.STAGE_DEMO_SCHEDULED
    elif demo.status == c.DEMO_STATUS_COMPLETED:
        lead.demo_date = lead.demo_date or demo.demo_date or datetime.utcnow()
        if lead.current_stage in (c.STAGE_NEW, c.STAGE_CONTACTED, c.STAGE_QUALIFIED, c.STAGE_DEMO_SCHEDULED):
            lead.current_stage = c.STAGE_DEMO_COMPLETED


def delete_demo(db: Session, lead_id: str, demo_id: str) -> None:
    lead = _require_lead(db, lead_id)
    demo = repo.get_child(db, LeadDemo, demo_id, lead.id)
    if not demo:
        raise HTTPException(status_code=404, detail="Demo not found.")
    demo.is_deleted = True
    demo.deleted_at = datetime.utcnow()
    db.commit()


def list_demos(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [demo_to_dict(d) for d in repo.list_demos(db, lead_id)]


# ════════════════════════════════════════════════════════════════════════════
# Follow-ups
# ════════════════════════════════════════════════════════════════════════════
def add_followup(db: Session, lead_id: str, payload: FollowupCreateRequest, *, actor_id) -> dict:
    lead = _require_lead(db, lead_id)
    fu = LeadFollowup(
        lead_id=lead.id, followup_date=payload.followup_date, followup_type=payload.followup_type,
        priority=payload.priority or "Medium", remarks=payload.remarks,
        status=payload.status or c.FOLLOWUP_STATUS_PENDING, created_by=actor_id,
    )
    repo.add(db, fu)
    db.commit()
    db.refresh(fu)
    return followup_to_dict(fu)


def update_followup(db: Session, lead_id: str, followup_id: str, payload: FollowupUpdateRequest) -> dict:
    lead = _require_lead(db, lead_id)
    fu = repo.get_child(db, LeadFollowup, followup_id, lead.id)
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(fu, field, value)
    db.commit()
    db.refresh(fu)
    return followup_to_dict(fu)


def delete_followup(db: Session, lead_id: str, followup_id: str) -> None:
    lead = _require_lead(db, lead_id)
    fu = repo.get_child(db, LeadFollowup, followup_id, lead.id)
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found.")
    fu.is_deleted = True
    fu.deleted_at = datetime.utcnow()
    db.commit()


def list_followups(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [followup_to_dict(f) for f in repo.list_followups(db, lead_id)]


# ════════════════════════════════════════════════════════════════════════════
# Notes
# ════════════════════════════════════════════════════════════════════════════
def add_note(db: Session, lead_id: str, payload: NoteCreateRequest, *, actor_id) -> dict:
    lead = _require_lead(db, lead_id)
    note = LeadNote(lead_id=lead.id, note=payload.note, created_by=actor_id)
    repo.add(db, note)
    db.commit()
    db.refresh(note)
    return note_to_dict(note)


def delete_note(db: Session, lead_id: str, note_id: str) -> None:
    lead = _require_lead(db, lead_id)
    note = repo.get_child(db, LeadNote, note_id, lead.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    note.is_deleted = True
    note.deleted_at = datetime.utcnow()
    db.commit()


def list_notes(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [note_to_dict(n) for n in repo.list_notes(db, lead_id)]


# ════════════════════════════════════════════════════════════════════════════
# Documents (file persistence handled in the router via storage helper)
# ════════════════════════════════════════════════════════════════════════════
def add_document(db: Session, lead_id: str, *, document_type: str, file_name: str,
                 file_path: str, actor_id) -> dict:
    lead = _require_lead(db, lead_id)
    doc = LeadDocument(
        lead_id=lead.id, document_type=document_type, file_name=file_name,
        file_path=file_path, uploaded_by=actor_id,
    )
    repo.add(db, doc)
    db.commit()
    db.refresh(doc)
    return document_to_dict(doc)


def delete_document(db: Session, lead_id: str, document_id: str) -> Optional[str]:
    lead = _require_lead(db, lead_id)
    doc = repo.get_child(db, LeadDocument, document_id, lead.id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    doc.is_deleted = True
    doc.deleted_at = datetime.utcnow()
    db.commit()
    return doc.file_path


def list_documents(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [document_to_dict(d) for d in repo.list_documents(db, lead_id)]


def get_document_file(db: Session, lead_id: str, document_id: str) -> tuple[str, str]:
    """Return (file_path, download_filename) for an authenticated download, 404 if absent."""
    lead = _require_lead(db, lead_id)
    doc = repo.get_child(db, LeadDocument, document_id, lead.id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc.file_path, doc.file_name or "document"


def get_proposal_file(db: Session, lead_id: str, proposal_id: str) -> tuple[str, str]:
    """Return (file_path, download_filename) for a proposal document, 404 if absent."""
    lead = _require_lead(db, lead_id)
    p = repo.get_child(db, LeadProposal, proposal_id, lead.id)
    if not p or not p.proposal_document_path:
        raise HTTPException(status_code=404, detail="Proposal document not found.")
    import os
    return p.proposal_document_path, os.path.basename(p.proposal_document_path)


# ════════════════════════════════════════════════════════════════════════════
# Proposals
# ════════════════════════════════════════════════════════════════════════════
def add_proposal(db: Session, lead_id: str, payload: ProposalCreateRequest, *,
                 file_name: Optional[str], file_path: Optional[str], actor_id, actor) -> dict:
    lead = _require_lead(db, lead_id)
    version = repo.latest_proposal_version(db, lead.id) + 1
    proposal = LeadProposal(
        lead_id=lead.id, proposal_version=version,
        proposal_date=payload.proposal_date or datetime.utcnow(),
        quoted_amount=payload.quoted_amount, modules_included=payload.modules_included,
        proposal_document_path=file_path, status=payload.status or c.PROPOSAL_STATUS_DRAFT,
        created_by=actor_id,
    )
    repo.add(db, proposal)
    if proposal.status in (c.PROPOSAL_STATUS_SENT, c.PROPOSAL_STATUS_ACCEPTED):
        lead.proposal_date = lead.proposal_date or proposal.proposal_date
        if lead.current_stage in (c.STAGE_NEW, c.STAGE_CONTACTED, c.STAGE_QUALIFIED,
                                   c.STAGE_DEMO_SCHEDULED, c.STAGE_DEMO_COMPLETED):
            lead.current_stage = c.STAGE_PROPOSAL_SENT
        record_audit(db, c.AUDIT_PROPOSAL_SENT, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                     metadata={"version": version, "amount": proposal.quoted_amount})
    _recompute_score(db, lead)
    db.commit()
    db.refresh(proposal)
    return proposal_to_dict(proposal)


def update_proposal(db: Session, lead_id: str, proposal_id: str, payload: ProposalUpdateRequest, *, actor) -> dict:
    lead = _require_lead(db, lead_id)
    proposal = repo.get_child(db, LeadProposal, proposal_id, lead.id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found.")
    prev_status = proposal.status
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(proposal, field, value)
    if proposal.status in (c.PROPOSAL_STATUS_SENT, c.PROPOSAL_STATUS_ACCEPTED) and \
            prev_status not in (c.PROPOSAL_STATUS_SENT, c.PROPOSAL_STATUS_ACCEPTED):
        lead.proposal_date = lead.proposal_date or proposal.proposal_date
        if lead.current_stage in (c.STAGE_NEW, c.STAGE_CONTACTED, c.STAGE_QUALIFIED,
                                   c.STAGE_DEMO_SCHEDULED, c.STAGE_DEMO_COMPLETED):
            lead.current_stage = c.STAGE_PROPOSAL_SENT
        record_audit(db, c.AUDIT_PROPOSAL_SENT, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                     metadata={"version": proposal.proposal_version})
    _recompute_score(db, lead)
    db.commit()
    db.refresh(proposal)
    return proposal_to_dict(proposal)


def list_proposals(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [proposal_to_dict(p) for p in repo.list_proposals(db, lead_id)]


# ════════════════════════════════════════════════════════════════════════════
# Negotiations
# ════════════════════════════════════════════════════════════════════════════
def add_negotiation(db: Session, lead_id: str, payload: NegotiationCreateRequest, *, actor_id) -> dict:
    lead = _require_lead(db, lead_id)
    neg = LeadNegotiation(
        lead_id=lead.id, discussion_date=payload.discussion_date or datetime.utcnow(),
        discussion_notes=payload.discussion_notes, expected_closure_date=payload.expected_closure_date,
        status=payload.status or "Ongoing", created_by=actor_id,
    )
    repo.add(db, neg)
    if lead.current_stage in (c.STAGE_PROPOSAL_SENT, c.STAGE_DEMO_COMPLETED):
        lead.current_stage = c.STAGE_NEGOTIATION
    db.commit()
    db.refresh(neg)
    return negotiation_to_dict(neg)


def list_negotiations(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [negotiation_to_dict(n) for n in repo.list_negotiations(db, lead_id)]


def list_conversions(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [conversion_to_dict(cv) for cv in repo.list_conversions(db, lead_id)]


def get_timeline(db: Session, lead_id: str) -> list[dict]:
    """Unified chronological timeline across all child entities."""
    lead = _require_lead(db, lead_id)
    events: list[dict] = [{
        "type": "lead", "title": "Lead created", "date": lead.created_at,
        "detail": f"{lead.lead_number} · {lead.lead_source}",
    }]
    for a in repo.list_activities(db, lead_id):
        events.append({"type": "activity", "title": f"Activity · {a.activity_type}",
                       "date": a.activity_date, "detail": a.remarks})
    for d in repo.list_demos(db, lead_id):
        events.append({"type": "demo", "title": f"Demo · {d.status}", "date": d.demo_date,
                       "detail": d.feedback or d.next_steps})
    for f in repo.list_followups(db, lead_id):
        events.append({"type": "followup", "title": f"Follow-up · {_effective_followup_status(f)}",
                       "date": f.followup_date, "detail": f.remarks})
    for p in repo.list_proposals(db, lead_id):
        events.append({"type": "proposal", "title": f"Proposal v{p.proposal_version} · {p.status}",
                       "date": p.proposal_date, "detail": p.modules_included})
    for n in repo.list_negotiations(db, lead_id):
        events.append({"type": "negotiation", "title": f"Negotiation · {n.status}",
                       "date": n.discussion_date, "detail": n.discussion_notes})
    for cv in repo.list_conversions(db, lead_id):
        events.append({"type": "conversion", "title": "Converted to client",
                       "date": cv.created_at, "detail": cv.client_name})
    events.sort(key=lambda e: e["date"] or datetime.min, reverse=True)
    return events


# ════════════════════════════════════════════════════════════════════════════
# Conversions
# ════════════════════════════════════════════════════════════════════════════
def convert_enquiry_to_lead(db: Session, enquiry_id: int, payload: ConvertEnquiryRequest, *,
                            actor_id, actor) -> dict:
    """Create a Lead from an existing enquiry. Idempotent — duplicates blocked."""
    from backend.app.modules.enquiry.models import Enquiry

    enquiry = db.query(Enquiry).filter(Enquiry.id == enquiry_id, Enquiry.is_deleted.is_(False)).first()
    if not enquiry:
        raise HTTPException(status_code=404, detail="Enquiry not found.")

    # Durable idempotency guard: block if a lead was ever created from this enquiry,
    # even one since soft-deleted — otherwise the same enquiry could spawn duplicates.
    existing = repo.find_any_by_source_enquiry(db, enquiry_id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Enquiry already converted to lead {existing.lead_number}.")

    email = _safe_decrypt(enquiry.email_encrypted)
    dedupe = blind_index(email or "", enquiry.company_name) if email else None

    lead = Lead(
        lead_number=_generate_lead_number(db),
        company_name=enquiry.company_name,
        contact_name=enquiry.full_name,
        email_encrypted=enquiry.email_encrypted,   # already encrypted — copy as-is
        phone_encrypted=enquiry.phone_encrypted,
        dedupe_hash=dedupe,
        interested_modules=enquiry.interested_module,
        lead_source=payload.lead_source or "Website",
        lead_owner_id=payload.lead_owner_id,
        current_stage=c.STAGE_NEW,
        status=c.STATUS_OPEN,
        source_enquiry_id=enquiry.id,
        created_by=actor_id,
    )
    repo.add(db, lead)
    _recompute_score(db, lead)

    # Carry the enquiry message across as the first internal note.
    message = _safe_decrypt(enquiry.message_encrypted)
    if message:
        repo.add(db, LeadNote(lead_id=lead.id, note=f"[From enquiry {enquiry.enquiry_number}] {message}",
                              created_by=actor_id))

    repo.add(db, LeadActivity(
        lead_id=lead.id, activity_type="Internal Note", activity_date=datetime.utcnow(),
        remarks=f"Converted from enquiry {enquiry.enquiry_number}.", created_by=actor_id,
    ))

    enquiry.status = "Converted"

    record_audit(db, c.AUDIT_ENQUIRY_CONVERTED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"enquiry_number": enquiry.enquiry_number,
                           "email": mask_email(email) if email else None})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


def _slugify(value: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return base or f"client-{uuid.uuid4().hex[:8]}"


def convert_lead_to_client(db: Session, lead_id: str, payload: ConvertClientRequest, *,
                           actor_id, actor) -> dict:
    """Convert a Won lead into a client: placeholder Tenant + Subscription + record."""
    from backend.app.platform.tenants.models import Tenant
    from backend.app.platform.subscriptions.models import Subscription, Plan

    lead = _require_lead(db, lead_id)
    if lead.current_stage != c.STAGE_WON:
        raise HTTPException(status_code=400, detail="Lead can only be converted to a client when stage is 'Won'.")
    if lead.converted_to_client:
        raise HTTPException(status_code=409, detail="Lead has already been converted to a client.")

    # Unique slug
    slug = _slugify(payload.slug or lead.company_name)
    if db.query(Tenant).filter(Tenant.slug == slug).first():
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    now = datetime.utcnow()
    client = Tenant(
        name=lead.company_name,
        slug=slug,
        is_active=False,          # provisioning placeholder — not live yet
        is_suspended=False,
        company_email=_safe_decrypt(lead.email_encrypted),
        contact_number=_safe_decrypt(lead.phone_encrypted),
        company_website=lead.website,
        region=lead.country,
        created_by=actor_id,
    )
    repo.add(db, client)

    # Subscription placeholder (trial) — optionally tied to a chosen plan.
    plan = None
    if payload.plan_id:
        plan = db.query(Plan).filter(Plan.id == payload.plan_id).first()
    if not plan:
        plan = db.query(Plan).filter(Plan.is_active.is_(True)).order_by(Plan.id.asc()).first()

    subscription = None
    if plan:
        subscription = Subscription(
            tenant_id=client.id, plan_id=plan.id, status="trial", billing_cycle="monthly",
            starts_at=now, plan_name=plan.name,
            trial_start=now, trial_end=now + timedelta(days=14),
            user_limit=lead.expected_user_count or plan.max_users or 10,
        )
        repo.add(db, subscription)

    # Lead state → converted
    lead.conversion_date = now
    lead.converted_to_client = True
    lead.converted_client_id = client.id
    lead.status = c.STATUS_CONVERTED
    if not lead.won_date:
        lead.won_date = now

    metrics = compute_metrics(lead)
    conversion = LeadConversion(
        lead_id=lead.id, client_id=client.id, client_name=client.name,
        subscription_id=subscription.id if subscription else None,
        lead_age_days=metrics["lead_age_days"],
        sales_cycle_days=metrics["sales_cycle_days"],
        time_to_demo_days=metrics["time_to_demo_days"],
        time_to_proposal_days=metrics["time_to_proposal_days"],
        time_to_conversion_days=metrics["time_to_conversion_days"],
        converted_by=actor_id,
    )
    repo.add(db, conversion)

    record_audit(db, c.AUDIT_LEAD_CONVERTED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"client_id": client.id, "client_slug": slug,
                           "subscription_id": subscription.id if subscription else None})
    db.commit()
    db.refresh(lead)
    return {"lead": lead_to_detail(lead), "conversion": conversion_to_dict(conversion)}


# ════════════════════════════════════════════════════════════════════════════
# Dashboard
# ════════════════════════════════════════════════════════════════════════════
def dashboard(db: Session) -> dict:
    stages = repo.stage_counts(db)
    statuses = repo.status_counts(db)
    total = repo.total_leads(db)
    won = stages.get(c.STAGE_WON, 0) + statuses.get(c.STATUS_CONVERTED, 0)
    lost = stages.get(c.STAGE_LOST, 0)
    converted = repo.converted_count(db)
    conversion_rate = round((converted / total) * 100, 1) if total else 0.0
    avg_days = repo.avg_conversion_days(db)

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    upcoming = repo.followups_due(db, start=today_start, end=today_end)
    overdue = repo.followups_overdue(db, now=now)

    return {
        "total_leads": total,
        "qualified_leads": stages.get(c.STAGE_QUALIFIED, 0),
        "demo_scheduled": stages.get(c.STAGE_DEMO_SCHEDULED, 0),
        "won_leads": won,
        "lost_leads": lost,
        "converted_leads": converted,
        "conversion_rate": conversion_rate,
        "average_conversion_days": round(avg_days, 1) if avg_days is not None else None,
        "stage_breakdown": stages,
        "upcoming_followups_count": len(upcoming),
        "overdue_followups_count": len(overdue),
        "upcoming_followups": [followup_to_dict(f) for f in upcoming[:10]],
        "overdue_followups": [followup_to_dict(f) for f in overdue[:10]],
    }
