"""Repository layer — Recruitment module. All raw DB access here."""
from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.modules.recruitment.models import (
    JobRequisition, JobOpening, Candidate, CandidateDocument, Offer, CandidateActivity,  # noqa: F401 – JobOpening used in get_global_timeline
)
from backend.app.modules.recruitment.constants import (
    REQUISITION_STATUSES, OPENING_STATUSES, CANDIDATE_STATUSES, OFFER_STATUSES,
)


def _uid() -> str:
    return str(uuid.uuid4())


def _seq_number(prefix: str, model_class, db: Session, client_id: str) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(model_class.id)).filter(
        model_class.client_id == client_id
    ).scalar() or 0
    return f"{prefix}-{today}-{count + 1:05d}"


# ── Job Requisitions ──────────────────────────────────────────────────────────

def create_requisition(db: Session, client_id: str, data: Dict[str, Any], actor: str) -> JobRequisition:
    req_number = _seq_number("REQ", JobRequisition, db, client_id)
    obj = JobRequisition(
        id=_uid(), client_id=client_id, requisition_number=req_number,
        status="Draft", created_by=actor, **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_requisition(db: Session, client_id: str, req_id: str) -> Optional[JobRequisition]:
    return db.query(JobRequisition).filter(
        JobRequisition.id == req_id,
        JobRequisition.client_id == client_id,
        JobRequisition.is_deleted.is_(False),
    ).first()


def list_requisitions(
    db: Session, client_id: str,
    page: int = 1, page_size: int = 20,
    search: str = "", status: str = "",
    department_id: str = "",
) -> Tuple[List[JobRequisition], int]:
    q = db.query(JobRequisition).filter(
        JobRequisition.client_id == client_id,
        JobRequisition.is_deleted.is_(False),
    )
    if status:
        q = q.filter(JobRequisition.status == status)
    if department_id:
        q = q.filter(JobRequisition.department_id == department_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            JobRequisition.requisition_number.ilike(like),
            JobRequisition.department_name.ilike(like),
            JobRequisition.designation_name.ilike(like),
            JobRequisition.hiring_manager.ilike(like),
        ))
    total = q.count()
    items = q.order_by(JobRequisition.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_requisition(db: Session, obj: JobRequisition, data: Dict[str, Any]) -> JobRequisition:
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def delete_requisition(db: Session, obj: JobRequisition) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.commit()


# ── Job Openings ──────────────────────────────────────────────────────────────

def create_opening(db: Session, client_id: str, data: Dict[str, Any], actor: str) -> JobOpening:
    opening_number = _seq_number("JOB", JobOpening, db, client_id)
    obj = JobOpening(
        id=_uid(), client_id=client_id, opening_number=opening_number,
        status="Open", created_by=actor, **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_opening(db: Session, client_id: str, opening_id: str) -> Optional[JobOpening]:
    return db.query(JobOpening).filter(
        JobOpening.id == opening_id,
        JobOpening.client_id == client_id,
        JobOpening.is_deleted.is_(False),
    ).first()


def get_opening_by_requisition(db: Session, client_id: str, requisition_id: str) -> Optional[JobOpening]:
    return db.query(JobOpening).filter(
        JobOpening.client_id == client_id,
        JobOpening.requisition_id == requisition_id,
        JobOpening.is_deleted.is_(False),
    ).first()


def list_openings(
    db: Session, client_id: str,
    page: int = 1, page_size: int = 20,
    search: str = "", status: str = "",
    department_id: str = "",
) -> Tuple[List[JobOpening], int]:
    q = db.query(JobOpening).filter(
        JobOpening.client_id == client_id,
        JobOpening.is_deleted.is_(False),
    )
    if status:
        q = q.filter(JobOpening.status == status)
    if department_id:
        q = q.filter(JobOpening.department_id == department_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            JobOpening.opening_number.ilike(like),
            JobOpening.job_title.ilike(like),
            JobOpening.department_name.ilike(like),
            JobOpening.location.ilike(like),
        ))
    total = q.count()
    items = q.order_by(JobOpening.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_opening(db: Session, obj: JobOpening, data: Dict[str, Any]) -> JobOpening:
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def delete_opening(db: Session, obj: JobOpening) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.commit()


# ── Candidates ────────────────────────────────────────────────────────────────

def create_candidate(db: Session, client_id: str, data: Dict[str, Any], actor: str) -> Candidate:
    cand_number = _seq_number("CAND", Candidate, db, client_id)
    obj = Candidate(
        id=_uid(), client_id=client_id, candidate_number=cand_number,
        status="Applied", created_by=actor, **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_candidate(db: Session, client_id: str, cand_id: str) -> Optional[Candidate]:
    return db.query(Candidate).filter(
        Candidate.id == cand_id,
        Candidate.client_id == client_id,
        Candidate.is_deleted.is_(False),
    ).first()


def list_candidates(
    db: Session, client_id: str,
    page: int = 1, page_size: int = 20,
    search: str = "", status: str = "",
    source: str = "", opening_id: str = "",
) -> Tuple[List[Candidate], int]:
    q = db.query(Candidate).filter(
        Candidate.client_id == client_id,
        Candidate.is_deleted.is_(False),
    )
    if status:
        q = q.filter(Candidate.status == status)
    if source:
        q = q.filter(Candidate.source == source)
    if opening_id:
        q = q.filter(Candidate.applied_position_id == opening_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            Candidate.first_name.ilike(like),
            Candidate.last_name.ilike(like),
            Candidate.email.ilike(like),
            Candidate.mobile_number.ilike(like),
            Candidate.candidate_number.ilike(like),
            Candidate.current_company.ilike(like),
        ))
    total = q.count()
    items = q.order_by(Candidate.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_candidate(db: Session, obj: Candidate, data: Dict[str, Any]) -> Candidate:
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


def delete_candidate(db: Session, obj: Candidate) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.commit()


def get_candidate_docs(db: Session, client_id: str, cand_id: str) -> List[CandidateDocument]:
    return db.query(CandidateDocument).filter(
        CandidateDocument.client_id == client_id,
        CandidateDocument.candidate_id == cand_id,
    ).order_by(CandidateDocument.created_at.desc()).all()


def add_candidate_doc(db: Session, client_id: str, cand_id: str, data: Dict[str, Any]) -> CandidateDocument:
    obj = CandidateDocument(id=_uid(), client_id=client_id, candidate_id=cand_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_candidate_doc(db: Session, doc_id: str, client_id: str, cand_id: str) -> bool:
    obj = db.query(CandidateDocument).filter(
        CandidateDocument.id == doc_id,
        CandidateDocument.client_id == client_id,
        CandidateDocument.candidate_id == cand_id,
    ).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def get_candidate_activities(db: Session, client_id: str, cand_id: str) -> List[CandidateActivity]:
    return db.query(CandidateActivity).filter(
        CandidateActivity.client_id == client_id,
        CandidateActivity.candidate_id == cand_id,
    ).order_by(CandidateActivity.created_at.desc()).all()


def get_global_timeline(db: Session, client_id: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Latest recruitment activities across all candidates, joined with candidate + opening info."""
    rows = (
        db.query(
            CandidateActivity,
            Candidate.first_name,
            Candidate.last_name,
            Candidate.applied_position,
            Candidate.applied_position_id,
        )
        .outerjoin(Candidate, CandidateActivity.candidate_id == Candidate.id)
        .filter(CandidateActivity.client_id == client_id)
        .order_by(CandidateActivity.created_at.desc())
        .limit(limit)
        .all()
    )

    opening_ids = list({pid for _, _, _, _, pid in rows if pid is not None})
    dept_map: Dict[str, str] = {}
    if opening_ids:
        openings = db.query(JobOpening).filter(
            JobOpening.id.in_(opening_ids),
            JobOpening.client_id == client_id,
        ).all()
        dept_map = {o.id: o.department_name for o in openings if o.department_name}

    result = []
    for act, fname, lname, position, pos_id in rows:
        candidate_name = f"{fname or ''} {lname or ''}".strip() or None
        result.append({
            "id": act.id,
            "candidate_id": act.candidate_id,
            "candidate_name": candidate_name,
            "applied_position": position,
            "department_name": dept_map.get(pos_id) if pos_id else None,
            "action": act.action,
            "actor": act.actor,
            "old_value": act.old_value,
            "new_value": act.new_value,
            "notes": act.notes,
            "created_at": act.created_at.isoformat() if act.created_at else None,
        })
    return result


def add_activity(
    db: Session, client_id: str, cand_id: str,
    action: str, actor: str,
    old_value: str = None, new_value: str = None, notes: str = None,
) -> CandidateActivity:
    obj = CandidateActivity(
        id=_uid(), client_id=client_id, candidate_id=cand_id,
        action=action, actor=actor,
        old_value=old_value, new_value=new_value, notes=notes,
    )
    db.add(obj)
    db.commit()
    return obj


# ── Offers ────────────────────────────────────────────────────────────────────

def create_offer(db: Session, client_id: str, data: Dict[str, Any], actor: str) -> Offer:
    offer_number = _seq_number("OFR", Offer, db, client_id)
    obj = Offer(
        id=_uid(), client_id=client_id, offer_number=offer_number,
        status="Draft", created_by=actor, **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_offer(db: Session, client_id: str, offer_id: str) -> Optional[Offer]:
    return db.query(Offer).filter(
        Offer.id == offer_id,
        Offer.client_id == client_id,
        Offer.is_deleted.is_(False),
    ).first()


def list_offers(
    db: Session, client_id: str,
    page: int = 1, page_size: int = 20,
    candidate_id: str = "", status: str = "",
) -> Tuple[List[Offer], int]:
    q = db.query(Offer).filter(
        Offer.client_id == client_id,
        Offer.is_deleted.is_(False),
    )
    if candidate_id:
        q = q.filter(Offer.candidate_id == candidate_id)
    if status:
        q = q.filter(Offer.status == status)
    total = q.count()
    items = q.order_by(Offer.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def update_offer(db: Session, obj: Offer, data: Dict[str, Any]) -> Offer:
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ── Dashboard ─────────────────────────────────────────────────────────────────

def dashboard_stats(db: Session, client_id: str) -> Dict[str, int]:
    open_positions = db.query(func.sum(JobOpening.number_of_vacancies)).filter(
        JobOpening.client_id == client_id,
        JobOpening.status == "Open",
        JobOpening.is_deleted.is_(False),
    ).scalar() or 0

    total_candidates = db.query(func.count(Candidate.id)).filter(
        Candidate.client_id == client_id,
        Candidate.is_deleted.is_(False),
    ).scalar() or 0

    interviews_scheduled = db.query(func.count(Candidate.id)).filter(
        Candidate.client_id == client_id,
        Candidate.status == "Interview Scheduled",
        Candidate.is_deleted.is_(False),
    ).scalar() or 0

    offers_sent = db.query(func.count(Offer.id)).filter(
        Offer.client_id == client_id,
        Offer.status.in_(["Sent", "Accepted"]),
        Offer.is_deleted.is_(False),
    ).scalar() or 0

    positions_filled = db.query(func.count(JobOpening.id)).filter(
        JobOpening.client_id == client_id,
        JobOpening.status == "Filled",
        JobOpening.is_deleted.is_(False),
    ).scalar() or 0

    return {
        "open_positions": int(open_positions),
        "total_candidates": int(total_candidates),
        "interviews_scheduled": int(interviews_scheduled),
        "offers_sent": int(offers_sent),
        "positions_filled": int(positions_filled),
    }
