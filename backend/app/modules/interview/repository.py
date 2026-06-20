"""Repository layer for Interview Management — raw DB operations."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.modules.interview.models import InterviewRound


def create(db: Session, data: Dict[str, Any]) -> InterviewRound:
    obj = InterviewRound(**data)
    db.add(obj)
    db.flush()
    return obj


def get(db: Session, interview_id: str, client_id: str) -> Optional[InterviewRound]:
    return (
        db.query(InterviewRound)
        .filter(
            InterviewRound.id == interview_id,
            InterviewRound.client_id == client_id,
            InterviewRound.is_deleted.is_(False),
        )
        .first()
    )


def list_interviews(
    db: Session,
    client_id: str,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    status: str = "",
    result: str = "",
    candidate_id: str = "",
    opening_id: str = "",
) -> Dict[str, Any]:
    q = db.query(InterviewRound).filter(
        InterviewRound.client_id == client_id,
        InterviewRound.is_deleted.is_(False),
    )
    if search:
        pat = f"%{search}%"
        q = q.filter(
            InterviewRound.interview_number.ilike(pat)
            | InterviewRound.candidate_name.ilike(pat)
            | InterviewRound.round_type.ilike(pat)
            | InterviewRound.round_name.ilike(pat)
            | InterviewRound.interviewers.ilike(pat)
        )
    if status:
        q = q.filter(InterviewRound.status == status)
    if result:
        q = q.filter(InterviewRound.result == result)
    if candidate_id:
        q = q.filter(InterviewRound.candidate_id == candidate_id)
    if opening_id:
        q = q.filter(InterviewRound.opening_id == opening_id)

    total = q.count()
    items = (
        q.order_by(InterviewRound.interview_date.desc(), InterviewRound.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {"total": total, "items": items}


def update(db: Session, obj: InterviewRound, updates: Dict[str, Any]) -> InterviewRound:
    for k, v in updates.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def soft_delete(db: Session, obj: InterviewRound) -> None:
    from datetime import datetime
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.flush()


def count_by_status(db: Session, client_id: str) -> Dict[str, int]:
    from sqlalchemy import func
    rows = (
        db.query(InterviewRound.status, func.count(InterviewRound.id))
        .filter(InterviewRound.client_id == client_id, InterviewRound.is_deleted.is_(False))
        .group_by(InterviewRound.status)
        .all()
    )
    return {r[0]: r[1] for r in rows}


def upcoming(db: Session, client_id: str, limit: int = 5) -> List[InterviewRound]:
    from datetime import date
    return (
        db.query(InterviewRound)
        .filter(
            InterviewRound.client_id == client_id,
            InterviewRound.is_deleted.is_(False),
            InterviewRound.status == "Scheduled",
            InterviewRound.interview_date >= date.today(),
        )
        .order_by(InterviewRound.interview_date, InterviewRound.interview_time)
        .limit(limit)
        .all()
    )
