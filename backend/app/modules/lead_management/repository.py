"""
Repository layer — pure DB queries for Lead Management. No business logic here.
All reads exclude soft-deleted rows unless explicitly noted.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.modules.lead_management.models import (
    Lead, LeadActivity, LeadDemo, LeadFollowup, LeadNote,
    LeadDocument, LeadProposal, LeadNegotiation, LeadConversion,
)


# ── Leads ────────────────────────────────────────────────────────────────────
def exists_by_lead_number(db: Session, lead_number: str) -> bool:
    return db.query(Lead.id).filter(Lead.lead_number == lead_number).first() is not None


def find_recent_duplicate(db: Session, dedupe_hash: Optional[str]) -> Optional[Lead]:
    if not dedupe_hash:
        return None
    return (
        db.query(Lead)
        .filter(Lead.dedupe_hash == dedupe_hash, Lead.is_deleted.is_(False))
        .order_by(Lead.created_at.desc())
        .first()
    )


def find_by_source_enquiry(db: Session, enquiry_id: int) -> Optional[Lead]:
    return (
        db.query(Lead)
        .filter(Lead.source_enquiry_id == enquiry_id, Lead.is_deleted.is_(False))
        .first()
    )


def find_any_by_source_enquiry(db: Session, enquiry_id: int) -> Optional[Lead]:
    """Includes soft-deleted leads — used as a durable idempotency guard so a
    deleted-then-reconverted enquiry cannot spawn a duplicate lead."""
    return (
        db.query(Lead)
        .filter(Lead.source_enquiry_id == enquiry_id)
        .first()
    )


def add(db: Session, instance) -> object:
    db.add(instance)
    db.flush()
    return instance


def get_lead(db: Session, lead_id: str) -> Optional[Lead]:
    return (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.is_deleted.is_(False))
        .first()
    )


def list_leads(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: Optional[str] = None,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    score_label: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> Tuple[List[Lead], int]:
    q = db.query(Lead).filter(Lead.is_deleted.is_(False))

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Lead.company_name.ilike(like),
                Lead.contact_name.ilike(like),
                Lead.lead_number.ilike(like),
            )
        )
    if stage:
        q = q.filter(Lead.current_stage == stage)
    if status:
        q = q.filter(Lead.status == status)
    if source:
        q = q.filter(Lead.lead_source == source)
    if score_label:
        q = q.filter(Lead.lead_score_label == score_label)

    total = q.count()

    sort_col = getattr(Lead, sort_by, Lead.created_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ── Generic child helpers ────────────────────────────────────────────────────
def _active(query, model):
    return query.filter(model.is_deleted.is_(False))


def get_child(db: Session, model, child_id: str, lead_id: str):
    return (
        db.query(model)
        .filter(model.id == child_id, model.lead_id == lead_id, model.is_deleted.is_(False))
        .first()
    )


def list_children(db: Session, model, lead_id: str, *, order_desc=True, order_col=None):
    col = order_col if order_col is not None else model.created_at
    q = _active(db.query(model).filter(model.lead_id == lead_id), model)
    q = q.order_by(col.desc() if order_desc else col.asc())
    return q.all()


# ── Activities ───────────────────────────────────────────────────────────────
def list_activities(db: Session, lead_id: str) -> List[LeadActivity]:
    return list_children(db, LeadActivity, lead_id, order_col=LeadActivity.activity_date)


# ── Demos ────────────────────────────────────────────────────────────────────
def list_demos(db: Session, lead_id: str) -> List[LeadDemo]:
    return list_children(db, LeadDemo, lead_id, order_col=LeadDemo.demo_date)


# ── Follow-ups ───────────────────────────────────────────────────────────────
def list_followups(db: Session, lead_id: str) -> List[LeadFollowup]:
    return list_children(db, LeadFollowup, lead_id, order_col=LeadFollowup.followup_date, order_desc=False)


def followups_due(db: Session, *, start: datetime, end: datetime) -> List[LeadFollowup]:
    """Pending follow-ups with followup_date within [start, end)."""
    return (
        db.query(LeadFollowup)
        .join(Lead, Lead.id == LeadFollowup.lead_id)
        .filter(
            LeadFollowup.is_deleted.is_(False),
            Lead.is_deleted.is_(False),
            LeadFollowup.status == "Pending",
            LeadFollowup.followup_date >= start,
            LeadFollowup.followup_date < end,
        )
        .order_by(LeadFollowup.followup_date.asc())
        .all()
    )


def followups_overdue(db: Session, *, now: datetime) -> List[LeadFollowup]:
    return (
        db.query(LeadFollowup)
        .join(Lead, Lead.id == LeadFollowup.lead_id)
        .filter(
            LeadFollowup.is_deleted.is_(False),
            Lead.is_deleted.is_(False),
            LeadFollowup.status.in_(["Pending", "Overdue"]),
            LeadFollowup.followup_date < now,
        )
        .order_by(LeadFollowup.followup_date.asc())
        .all()
    )


# ── Notes ────────────────────────────────────────────────────────────────────
def list_notes(db: Session, lead_id: str) -> List[LeadNote]:
    return list_children(db, LeadNote, lead_id, order_col=LeadNote.created_at)


# ── Documents ────────────────────────────────────────────────────────────────
def list_documents(db: Session, lead_id: str) -> List[LeadDocument]:
    return list_children(db, LeadDocument, lead_id, order_col=LeadDocument.created_at)


# ── Proposals ────────────────────────────────────────────────────────────────
def list_proposals(db: Session, lead_id: str) -> List[LeadProposal]:
    return list_children(db, LeadProposal, lead_id, order_col=LeadProposal.proposal_version)


def latest_proposal_version(db: Session, lead_id: str) -> int:
    val = (
        db.query(func.max(LeadProposal.proposal_version))
        .filter(LeadProposal.lead_id == lead_id, LeadProposal.is_deleted.is_(False))
        .scalar()
    )
    return int(val or 0)


# ── Negotiations ─────────────────────────────────────────────────────────────
def list_negotiations(db: Session, lead_id: str) -> List[LeadNegotiation]:
    return list_children(db, LeadNegotiation, lead_id, order_col=LeadNegotiation.discussion_date)


# ── Conversions ──────────────────────────────────────────────────────────────
def list_conversions(db: Session, lead_id: str) -> List[LeadConversion]:
    return (
        db.query(LeadConversion)
        .filter(LeadConversion.lead_id == lead_id)
        .order_by(LeadConversion.created_at.desc())
        .all()
    )


# ── Dashboard aggregates ─────────────────────────────────────────────────────
def stage_counts(db: Session) -> dict:
    rows = (
        db.query(Lead.current_stage, func.count(Lead.id))
        .filter(Lead.is_deleted.is_(False))
        .group_by(Lead.current_stage)
        .all()
    )
    return {stage: count for stage, count in rows}


def status_counts(db: Session) -> dict:
    rows = (
        db.query(Lead.status, func.count(Lead.id))
        .filter(Lead.is_deleted.is_(False))
        .group_by(Lead.status)
        .all()
    )
    return {status: count for status, count in rows}


def total_leads(db: Session) -> int:
    return db.query(func.count(Lead.id)).filter(Lead.is_deleted.is_(False)).scalar() or 0


def converted_count(db: Session) -> int:
    return (
        db.query(func.count(Lead.id))
        .filter(Lead.is_deleted.is_(False), Lead.converted_to_client.is_(True))
        .scalar()
        or 0
    )


def avg_conversion_days(db: Session) -> Optional[float]:
    return (
        db.query(func.avg(LeadConversion.time_to_conversion_days))
        .scalar()
    )
