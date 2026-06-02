"""
Service layer — business logic for Lead Management.

Responsibilities:
  - PII encryption (email/phone) + blind-index dedupe.
  - Lead numbering, scoring (Hot/Warm/Cold), stage transitions & metric anchoring.
  - CRUD for leads + child entities (activities, demos, follow-ups, notes,
    documents, proposals, negotiations).
  - Convert Enquiry→Lead (idempotent) and Lead→Client (Won only) — records an
    immutable lead_conversions row (no tenant/subscription created).
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
    Lead, LeadActivity, LeadSpokesperson, LeadDemo, LeadFollowup, LeadNote,
    LeadDocument, LeadProposal, LeadNegotiation, LeadConversion,
)
from backend.app.modules.lead_management.schemas import (
    LeadCreateRequest, LeadUpdateRequest, LeadLostRequest,
    ActivityCreateRequest, ActivityUpdateRequest,
    DemoCreateRequest, DemoUpdateRequest,
    FollowupCreateRequest, FollowupUpdateRequest,
    NoteCreateRequest, ProposalCreateRequest, ProposalUpdateRequest,
    NegotiationCreateRequest, ConvertEnquiryRequest, ConvertClientRequest,
    ScoreLabelRequest, SpokespersonCreateRequest, SpokespersonUpdateRequest,
)
from backend.shared.security.encryption import encrypt_value, decrypt_value, blind_index
from backend.shared.audit.audit_logger import record_audit, mask_email, mask_value
from backend.app.platform.superadmin.models import SuperAdmin


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
    """Recompute the numeric score; a manual label override (if set) wins for the label."""
    score, computed_label = compute_score(db, lead)
    lead.lead_score = score
    lead.lead_score_label = lead.score_label_override or computed_label


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
def lead_to_summary(lead: Lead, owner_name: Optional[str] = None) -> dict:
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
        "lead_owner_id": lead.lead_owner_id,
        "lead_owner_name": owner_name,
        "converted_to_client": lead.converted_to_client,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }


def lead_to_detail(lead: Lead, db: Optional[Session] = None) -> dict:
    owner_name = _owner_name(db, lead.lead_owner_id) if db is not None else None
    data = lead_to_summary(lead, owner_name)
    data.update(
        {
            "email": _safe_decrypt(lead.email_encrypted),
            "phone": _safe_decrypt(lead.phone_encrypted),
            "country_code": lead.country_code,
            "score_label_override": lead.score_label_override,
            "website": lead.website,
            "industry": lead.industry,
            "country": lead.country,
            "company_size": lead.company_size,
            "expected_user_count": lead.expected_user_count,
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
        "next_action": a.next_action,
        "next_action_date": a.next_action_date, "created_by": a.created_by,
        "created_at": a.created_at,
    }


def spokesperson_to_dict(s: LeadSpokesperson) -> dict:
    return {
        "id": s.id, "lead_id": s.lead_id, "name": s.name,
        "designation": s.designation,
        "email": _safe_decrypt(s.email_encrypted),
        "phone": _safe_decrypt(s.phone_encrypted),
        "country_code": s.country_code,
        "is_primary": s.is_primary,
        "created_by": s.created_by, "created_at": s.created_at,
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
        "client_uuid": cv.client_uuid,
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
# Primary contact ⇄ spokesperson synchronization
#
# A lead's contact_* columns hold the PRIMARY contact. We mirror them onto a
# single primary LeadSpokesperson row so the contacts list always includes the
# primary, and we keep the two in sync in both directions:
#   - legacy contact fields change  → _sync_primary_from_legacy
#   - primary spokesperson changes  → _sync_lead_contact_from_primary
# ════════════════════════════════════════════════════════════════════════════
def _spokesperson_from_input(lead_id: str, item, actor_id: Optional[int], *, is_primary: bool = False) -> LeadSpokesperson:
    return LeadSpokesperson(
        lead_id=lead_id,
        name=item.name,
        designation=item.designation,
        email_encrypted=encrypt_value(item.email) if item.email else None,
        phone_encrypted=encrypt_value(item.phone) if item.phone else None,
        country_code=item.country_code,
        is_primary=is_primary,
        created_by=actor_id,
    )


def _primary_mirror(lead: Lead, actor_id: Optional[int]) -> LeadSpokesperson:
    """Build a primary spokesperson mirroring the lead's legacy contact columns."""
    return LeadSpokesperson(
        lead_id=lead.id,
        name=lead.contact_name,
        designation=lead.designation,
        email_encrypted=lead.email_encrypted,
        phone_encrypted=lead.phone_encrypted,
        country_code=lead.country_code,
        is_primary=True,
        created_by=actor_id,
    )


def _sync_lead_contact_from_primary(lead: Lead, primary: Optional[LeadSpokesperson]) -> None:
    """Copy a primary spokesperson onto the lead's legacy contact columns (+ dedupe hash)."""
    if primary is None:
        return
    lead.contact_name = primary.name
    lead.designation = primary.designation
    lead.email_encrypted = primary.email_encrypted
    lead.phone_encrypted = primary.phone_encrypted
    lead.country_code = primary.country_code
    email = _safe_decrypt(primary.email_encrypted)
    lead.dedupe_hash = blind_index(email or "", lead.company_name) if email else None


def _sync_primary_from_legacy(db: Session, lead: Lead, actor_id: Optional[int]) -> None:
    """Update (or create) the primary spokesperson to mirror the lead's legacy contact columns."""
    primary = repo.get_primary_spokesperson(db, lead.id)
    if primary is None:
        repo.add(db, _primary_mirror(lead, actor_id))
        return
    primary.name = lead.contact_name
    primary.designation = lead.designation
    primary.email_encrypted = lead.email_encrypted
    primary.phone_encrypted = lead.phone_encrypted
    primary.country_code = lead.country_code


def _replace_additional_spokespersons(db: Session, lead: Lead, items, actor_id: Optional[int]) -> None:
    """Full-replace reconcile of the non-primary spokespersons from a lead payload.

    Existing additional rows matched by id are updated; new rows are inserted;
    additional rows absent from the payload are soft-deleted. The primary row is
    never touched here (it mirrors the lead's contact_* columns).
    """
    existing = {s.id: s for s in repo.list_spokespersons(db, lead.id) if not s.is_primary}
    incoming_ids: set[str] = set()
    for item in items:
        if item.id and item.id in existing:
            sp = existing[item.id]
            sp.name = item.name
            sp.designation = item.designation
            sp.email_encrypted = encrypt_value(item.email) if item.email else None
            sp.phone_encrypted = encrypt_value(item.phone) if item.phone else None
            sp.country_code = item.country_code
            incoming_ids.add(sp.id)
        else:
            repo.add(db, _spokesperson_from_input(lead.id, item, actor_id, is_primary=False))
    for sid, sp in existing.items():
        if sid not in incoming_ids:
            sp.is_deleted = True
            sp.deleted_at = datetime.utcnow()


# ════════════════════════════════════════════════════════════════════════════
# Lead CRUD
# ════════════════════════════════════════════════════════════════════════════
def _owner_name(db: Session, owner_id: Optional[int]) -> Optional[str]:
    if not owner_id:
        return None
    row = db.query(SuperAdmin.name, SuperAdmin.email).filter(SuperAdmin.id == owner_id).first()
    return (row.name or row.email) if row else None


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
        country_code=payload.country_code,
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

    # The primary contact (lead.contact_*) is mirrored onto a primary spokesperson;
    # any inline rows from the form are stored as additional (non-primary) contacts.
    repo.add(db, _primary_mirror(lead, actor_id))
    for item in (payload.spokespersons or []):
        repo.add(db, _spokesperson_from_input(lead.id, item, actor_id, is_primary=False))

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
    lead = _require_lead(db, lead_id)
    detail = lead_to_detail(lead, db)
    # Additional (non-primary) spokespersons for inline editing on the lead form.
    detail["spokespersons"] = [
        spokesperson_to_dict(s) for s in repo.list_spokespersons(db, lead_id) if not s.is_primary
    ]
    # Reverse traceability: surface the originating enquiry (Website Enquiry → Lead).
    detail["source_enquiry"] = _source_enquiry_info(db, lead)
    return detail


def _source_enquiry_info(db: Session, lead: Lead) -> Optional[dict]:
    """Resolve the enquiry a lead originated from, for the traceability panel."""
    if not lead.source_enquiry_id:
        return None
    from backend.app.modules.enquiry import repository as enquiry_repo

    enquiry = enquiry_repo.get_by_id(db, lead.source_enquiry_id)
    if not enquiry:
        return None
    return {
        "id": enquiry.id,
        "enquiry_number": enquiry.enquiry_number,
        "status": enquiry.status,
        "source": enquiry.source,
        "created_at": enquiry.created_at,
    }


def list_leads(db: Session, **kwargs) -> tuple[list[dict], int]:
    items, total = repo.list_leads(db, **kwargs)
    owner_ids = {x.lead_owner_id for x in items if x.lead_owner_id}
    owner_map: dict[int, str] = {}
    if owner_ids:
        rows = db.query(SuperAdmin.id, SuperAdmin.name, SuperAdmin.email).filter(SuperAdmin.id.in_(owner_ids)).all()
        owner_map = {r.id: (r.name or r.email) for r in rows}
    return [lead_to_summary(x, owner_map.get(x.lead_owner_id)) for x in items], total


def assign_lead(db: Session, lead_id: str, owner_id: Optional[int], *,
                actor: str, actor_id: Optional[int] = None) -> dict:
    lead = _require_lead(db, lead_id)
    old_owner = lead.lead_owner_id
    lead.lead_owner_id = owner_id
    db.commit()
    db.refresh(lead)
    record_audit(
        db, c.AUDIT_LEAD_UPDATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
        metadata={"action": "assign", "old_owner_id": old_owner, "new_owner_id": owner_id},
    )
    return lead_to_detail(lead, db)


def update_lead(db: Session, lead_id: str, payload: LeadUpdateRequest, *,
                actor: Optional[str], actor_id: Optional[int] = None) -> dict:
    lead = _require_lead(db, lead_id)
    data = payload.model_dump(exclude_unset=True)
    # Pop the dumped copy so it isn't applied via setattr; use the parsed Pydantic
    # objects from the payload for reconciliation (model_dump turns them into dicts).
    spokespersons_set = "spokespersons" in data
    data.pop("spokespersons", None)
    spokespersons = payload.spokespersons if spokespersons_set else None

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

    # Keep the primary spokesperson in sync with the (possibly updated) contact fields,
    # then reconcile any inline additional spokespersons from the form.
    _sync_primary_from_legacy(db, lead, actor_id)
    if spokespersons is not None:
        _replace_additional_spokespersons(db, lead, spokespersons, actor_id)

    _recompute_score(db, lead)
    audit_fields = list(data.keys())
    if spokespersons is not None:
        audit_fields.append("spokespersons")
    record_audit(db, c.AUDIT_LEAD_UPDATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"fields": audit_fields})
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


# ── Manual score label override ──────────────────────────────────────────────
def set_score_label(db: Session, lead_id: str, payload: ScoreLabelRequest, *, actor: Optional[str]) -> dict:
    """Set or clear the manual Hot/Warm/Cold override. ``label=None`` reverts to auto-scoring."""
    lead = _require_lead(db, lead_id)
    lead.score_label_override = payload.label
    _recompute_score(db, lead)
    record_audit(db, c.AUDIT_SCORE_OVERRIDE, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"override": payload.label})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


# ════════════════════════════════════════════════════════════════════════════
# Spokespersons (additional points of contact; PII encrypted at rest)
# ════════════════════════════════════════════════════════════════════════════
def list_spokespersons(db: Session, lead_id: str) -> list[dict]:
    _require_lead(db, lead_id)
    return [spokesperson_to_dict(s) for s in repo.list_spokespersons(db, lead_id)]


def add_spokesperson(db: Session, lead_id: str, payload: SpokespersonCreateRequest, *, actor_id, actor) -> dict:
    lead = _require_lead(db, lead_id)
    sp = LeadSpokesperson(
        lead_id=lead.id,
        name=payload.name,
        designation=payload.designation,
        email_encrypted=encrypt_value(payload.email) if payload.email else None,
        phone_encrypted=encrypt_value(payload.phone) if payload.phone else None,
        country_code=payload.country_code,
        is_primary=bool(payload.is_primary),
        created_by=actor_id,
    )
    repo.add(db, sp)
    if sp.is_primary:
        repo.clear_primary_spokesperson(db, lead.id, exclude_id=sp.id)
        _sync_lead_contact_from_primary(lead, sp)
    record_audit(db, c.AUDIT_SPOKESPERSON_ADDED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"name": sp.name, "email": mask_email(payload.email) if payload.email else None})
    db.commit()
    db.refresh(sp)
    return spokesperson_to_dict(sp)


def update_spokesperson(db: Session, lead_id: str, spokesperson_id: str,
                        payload: SpokespersonUpdateRequest, *, actor) -> dict:
    lead = _require_lead(db, lead_id)
    sp = repo.get_child(db, LeadSpokesperson, spokesperson_id, lead.id)
    if not sp:
        raise HTTPException(status_code=404, detail="Spokesperson not found.")
    was_primary = sp.is_primary
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        email = data.pop("email")
        sp.email_encrypted = encrypt_value(email) if email else None
    if "phone" in data:
        phone = data.pop("phone")
        sp.phone_encrypted = encrypt_value(phone) if phone else None
    for field, value in data.items():
        setattr(sp, field, value)

    if sp.is_primary:
        # Promoting (or editing) this row as primary → ensure it is the only one
        # and mirror it onto the lead's legacy contact columns.
        repo.clear_primary_spokesperson(db, lead.id, exclude_id=sp.id)
        _sync_lead_contact_from_primary(lead, sp)
    elif was_primary:
        # Demoting the current primary → promote another active contact (if any)
        # and re-sync legacy fields so exactly one primary mirror is maintained.
        remaining = [s for s in repo.list_spokespersons(db, lead.id) if s.id != sp.id]
        if remaining:
            new_primary = remaining[0]
            new_primary.is_primary = True
            _sync_lead_contact_from_primary(lead, new_primary)
        else:
            # No other contact to promote — keep this row as the primary mirror.
            sp.is_primary = True
            _sync_lead_contact_from_primary(lead, sp)
    record_audit(db, c.AUDIT_SPOKESPERSON_UPDATED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"spokesperson_id": sp.id, "fields": list(data.keys())})
    db.commit()
    db.refresh(sp)
    return spokesperson_to_dict(sp)


def delete_spokesperson(db: Session, lead_id: str, spokesperson_id: str, *, actor: Optional[str]) -> None:
    lead = _require_lead(db, lead_id)
    sp = repo.get_child(db, LeadSpokesperson, spokesperson_id, lead.id)
    if not sp:
        raise HTTPException(status_code=404, detail="Spokesperson not found.")
    was_primary = sp.is_primary
    sp.is_deleted = True
    sp.deleted_at = datetime.utcnow()
    # If the primary was removed, promote the next remaining contact and re-sync.
    if was_primary:
        remaining = [s for s in repo.list_spokespersons(db, lead.id) if s.id != sp.id]
        if remaining:
            new_primary = remaining[0]
            new_primary.is_primary = True
            _sync_lead_contact_from_primary(lead, new_primary)
    record_audit(db, c.AUDIT_SPOKESPERSON_DELETED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"spokesperson_id": sp.id})
    db.commit()


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
        next_action=payload.next_action,
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
        if lead.current_stage in c.EARLY_STAGES:
            lead.current_stage = c.STAGE_DEMO_SCHEDULED
    elif demo.status == c.DEMO_STATUS_COMPLETED:
        lead.demo_date = lead.demo_date or demo.demo_date or datetime.utcnow()
        if lead.current_stage in c.EARLY_STAGES + (c.STAGE_DEMO_SCHEDULED,):
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
        if lead.current_stage in c.EARLY_STAGES + (c.STAGE_DEMO_SCHEDULED, c.STAGE_DEMO_COMPLETED):
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
        if lead.current_stage in c.EARLY_STAGES + (c.STAGE_DEMO_SCHEDULED, c.STAGE_DEMO_COMPLETED):
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
        detail = a.remarks
        if a.next_action:
            next_txt = f"Next: {a.next_action}"
            if a.next_action_date:
                next_txt += f" (by {a.next_action_date.strftime('%Y-%m-%d')})"
            detail = f"{detail} · {next_txt}" if detail else next_txt
        events.append({"type": "activity", "title": f"Activity · {a.activity_type}",
                       "date": a.activity_date, "detail": detail,
                       "next_action": a.next_action, "next_action_date": a.next_action_date})
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
    from backend.app.modules.enquiry import repository as enquiry_repo

    enquiry = enquiry_repo.get_by_id(db, enquiry_id)
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
    # Stamp the reverse link here too so every conversion path (inbox or legacy
    # lead route) yields full bidirectional traceability: Enquiry → Lead → Client.
    enquiry.converted_lead_id = lead.id
    enquiry.converted_at = datetime.utcnow()

    record_audit(db, c.AUDIT_ENQUIRY_CONVERTED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"enquiry_number": enquiry.enquiry_number,
                           "email": mask_email(email) if email else None})
    db.commit()
    db.refresh(lead)
    return lead_to_detail(lead)


def convert_lead_to_client(db: Session, lead_id: str, payload: ConvertClientRequest, *,
                           actor_id, actor) -> dict:
    """Convert a Won lead into a client: records the conversion snapshot + metrics."""
    lead = _require_lead(db, lead_id)
    if lead.current_stage != c.STAGE_WON:
        raise HTTPException(status_code=400, detail="Lead can only be converted to a client when stage is 'Won'.")
    if lead.converted_to_client:
        raise HTTPException(status_code=409, detail="Lead has already been converted to a client.")

    now = datetime.utcnow()
    client_name = payload.client_name or lead.company_name

    # Create the full Client graph (Client IS the tenant). Imported here to avoid
    # a circular import between the lead and client modules. NO commit inside —
    # it participates in this transaction so the conversion is atomic.
    from backend.app.modules.client_management import service as client_service

    client = client_service.create_client_from_lead(
        db, lead, client_name=client_name, actor_id=actor_id, actor=actor,
    )

    # Lead state → converted (reverse link via UUID column; legacy INTEGER column unused)
    lead.conversion_date = now
    lead.converted_to_client = True
    lead.converted_client_uuid = client.id
    lead.status = c.STATUS_CONVERTED
    if not lead.won_date:
        lead.won_date = now

    metrics = compute_metrics(lead)
    conversion = LeadConversion(
        lead_id=lead.id, client_name=client_name, client_uuid=client.id,
        lead_age_days=metrics["lead_age_days"],
        sales_cycle_days=metrics["sales_cycle_days"],
        time_to_demo_days=metrics["time_to_demo_days"],
        time_to_proposal_days=metrics["time_to_proposal_days"],
        time_to_conversion_days=metrics["time_to_conversion_days"],
        converted_by=actor_id,
    )
    repo.add(db, conversion)

    record_audit(db, c.AUDIT_LEAD_CONVERTED, c.AUDIT_ENTITY, lead.lead_number, actor=actor,
                 metadata={"client_name": client_name, "client_code": client.client_code})
    db.commit()
    db.refresh(lead)
    result = {"lead": lead_to_detail(lead), "conversion": conversion_to_dict(conversion)}
    result["client"] = {"id": client.id, "client_code": client.client_code}
    return result


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

    # Notifications — due-today + overdue across follow-ups, demos, and activity next-actions.
    due_demos = repo.demos_due(db, start=today_start, end=today_end)
    overdue_demos = repo.demos_overdue(db, now=now)
    due_activities = repo.activities_due(db, start=today_start, end=today_end)
    overdue_activities = repo.activities_overdue(db, now=now)

    notifications = _build_notifications(
        db,
        followups_due=upcoming, followups_overdue=overdue,
        demos_due=due_demos, demos_overdue=overdue_demos,
        activities_due=due_activities, activities_overdue=overdue_activities,
    )

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
        "due_demos_count": len(due_demos),
        "overdue_demos_count": len(overdue_demos),
        "due_activities_count": len(due_activities),
        "overdue_activities_count": len(overdue_activities),
        "notifications_count": len(notifications),
        "notifications": notifications[:20],
    }


# ════════════════════════════════════════════════════════════════════════════
# Notifications & Calendar
# ════════════════════════════════════════════════════════════════════════════
def _lead_label(lead: Optional[Lead]) -> str:
    if not lead:
        return "Lead"
    return lead.company_name or lead.lead_number or "Lead"


def _build_notifications(db: Session, *, followups_due, followups_overdue,
                         demos_due, demos_overdue, activities_due, activities_overdue) -> list[dict]:
    """Flatten due/overdue items into a single, date-sorted notification feed."""
    lead_ids = (
        [f.lead_id for f in followups_due] + [f.lead_id for f in followups_overdue] +
        [d.lead_id for d in demos_due] + [d.lead_id for d in demos_overdue] +
        [a.lead_id for a in activities_due] + [a.lead_id for a in activities_overdue]
    )
    leads = repo.leads_by_ids(db, lead_ids)

    items: list[dict] = []

    def _add(kind, urgency, when, lead_id, title):
        items.append({
            "type": kind, "urgency": urgency, "date": when,
            "lead_id": lead_id, "lead_name": _lead_label(leads.get(lead_id)), "title": title,
        })

    for f in followups_overdue:
        _add("followup", "overdue", f.followup_date, f.lead_id, f"Overdue follow-up · {f.followup_type or 'Follow-up'}")
    for f in followups_due:
        _add("followup", "due", f.followup_date, f.lead_id, f"Follow-up due today · {f.followup_type or 'Follow-up'}")
    for d in demos_overdue:
        _add("demo", "overdue", d.demo_date, d.lead_id, f"Overdue demo · {d.demo_type or 'Demo'}")
    for d in demos_due:
        _add("demo", "due", d.demo_date, d.lead_id, f"Demo today · {d.demo_type or 'Demo'}")
    for a in activities_overdue:
        _add("activity", "overdue", a.next_action_date, a.lead_id, f"Overdue next action · {a.next_action or a.activity_type}")
    for a in activities_due:
        _add("activity", "due", a.next_action_date, a.lead_id, f"Next action today · {a.next_action or a.activity_type}")

    # Overdue first, then by soonest date.
    items.sort(key=lambda x: (0 if x["urgency"] == "overdue" else 1, x["date"] or datetime.max))
    return items


def calendar_events(db: Session, *, start: datetime, end: datetime) -> list[dict]:
    """Scheduled demos, follow-ups, and activity next-actions within [start, end) for the calendar."""
    demos = repo.demos_in_range(db, start=start, end=end)
    followups = repo.followups_in_range(db, start=start, end=end)
    activities = repo.activities_in_range(db, start=start, end=end)

    lead_ids = [d.lead_id for d in demos] + [f.lead_id for f in followups] + [a.lead_id for a in activities]
    leads = repo.leads_by_ids(db, lead_ids)

    events: list[dict] = []
    for d in demos:
        events.append({
            "id": d.id, "type": "demo", "date": d.demo_date,
            "lead_id": d.lead_id, "lead_name": _lead_label(leads.get(d.lead_id)),
            "title": f"Demo · {d.demo_type or 'Demo'}", "status": d.status,
        })
    for f in followups:
        events.append({
            "id": f.id, "type": "followup", "date": f.followup_date,
            "lead_id": f.lead_id, "lead_name": _lead_label(leads.get(f.lead_id)),
            "title": f"Follow-up · {f.followup_type or 'Follow-up'}", "status": _effective_followup_status(f),
        })
    for a in activities:
        events.append({
            "id": a.id, "type": "activity", "date": a.next_action_date,
            "lead_id": a.lead_id, "lead_name": _lead_label(leads.get(a.lead_id)),
            "title": f"Next action · {a.next_action or a.activity_type}", "status": None,
        })
    events.sort(key=lambda e: e["date"] or datetime.max)
    return events
