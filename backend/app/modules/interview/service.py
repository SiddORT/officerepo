"""Service layer — Interview Management module."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.interview import repository as repo
from backend.app.modules.interview.constants import (
    INTERVIEW_STATUSES, INT_STATUS_SCHEDULED, INT_STATUS_COMPLETED,
    INT_STATUS_CANCELLED, INT_STATUS_NO_SHOW, RESULT_PENDING,
)


def _num(db: Session, client_id: str) -> str:
    from sqlalchemy import func
    from backend.app.modules.interview.models import InterviewRound
    today = datetime.utcnow().strftime("%Y%m%d")
    count = (
        db.query(func.count(InterviewRound.id))
        .filter(InterviewRound.client_id == client_id)
        .scalar()
        or 0
    )
    seq = str(count + 1).zfill(6)
    return f"INT-{today}-{seq}"


def _to_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id,
        "client_id": r.client_id,
        "interview_number": r.interview_number,
        "candidate_id": r.candidate_id,
        "candidate_name": r.candidate_name,
        "opening_id": r.opening_id,
        "opening_title": r.opening_title,
        "round_number": r.round_number,
        "round_type": r.round_type,
        "round_name": r.round_name,
        "interview_date": r.interview_date.isoformat() if r.interview_date else None,
        "interview_time": r.interview_time,
        "duration_minutes": r.duration_minutes,
        "mode": r.mode,
        "location": r.location,
        "meeting_link": r.meeting_link,
        "interviewers": r.interviewers,
        "status": r.status,
        "result": r.result,
        "feedback_rating": r.feedback_rating,
        "feedback": r.feedback,
        "notes": r.notes,
        "created_by": r.created_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    by_status = repo.count_by_status(db, client_id)
    upcoming  = [_to_dict(r) for r in repo.upcoming(db, client_id, limit=5)]
    return {
        "scheduled":  by_status.get("Scheduled",  0),
        "completed":  by_status.get("Completed",  0),
        "cancelled":  by_status.get("Cancelled",  0),
        "no_show":    by_status.get("No Show",     0),
        "total":      sum(by_status.values()),
        "upcoming":   upcoming,
    }


def list_interviews(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    result = repo.list_interviews(db, client_id, **kwargs)
    return {
        "total": result["total"],
        "items": [_to_dict(r) for r in result["items"]],
    }


def create_interview(db: Session, client_id: str, data, actor: str) -> Dict[str, Any]:
    # Resolve candidate name from candidates table if available
    candidate_name = None
    opening_title  = None
    try:
        from backend.app.modules.recruitment.models import Candidate, JobOpening
        cand = db.get(Candidate, data.candidate_id)
        if cand:
            candidate_name = f"{cand.first_name} {cand.last_name}".strip()
        if data.opening_id:
            op = db.get(JobOpening, data.opening_id)
            if op:
                opening_title = op.job_title
    except Exception:
        pass

    obj = repo.create(db, {
        "client_id":        client_id,
        "interview_number": _num(db, client_id),
        "candidate_id":     data.candidate_id,
        "candidate_name":   candidate_name,
        "opening_id":       data.opening_id,
        "opening_title":    opening_title,
        "round_number":     data.round_number,
        "round_type":       data.round_type,
        "round_name":       data.round_name,
        "interview_date":   data.interview_date,
        "interview_time":   data.interview_time,
        "duration_minutes": data.duration_minutes,
        "mode":             data.mode,
        "location":         data.location,
        "meeting_link":     data.meeting_link,
        "interviewers":     data.interviewers,
        "notes":            data.notes,
        "status":           INT_STATUS_SCHEDULED,
        "result":           RESULT_PENDING,
        "created_by":       actor,
    })
    db.commit()
    return _to_dict(obj)


def update_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict[str, Any]:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    if obj.status in (INT_STATUS_COMPLETED, INT_STATUS_CANCELLED):
        raise HTTPException(400, f"Cannot edit a {obj.status} interview.")

    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    repo.update(db, obj, updates)
    db.commit()
    return _to_dict(obj)


def complete_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict[str, Any]:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    if obj.status != INT_STATUS_SCHEDULED:
        raise HTTPException(400, "Only scheduled interviews can be marked as completed.")

    updates: Dict[str, Any] = {
        "status": INT_STATUS_COMPLETED,
        "result": data.result,
    }
    if data.feedback_rating is not None:
        updates["feedback_rating"] = data.feedback_rating
    if data.feedback is not None:
        updates["feedback"] = data.feedback
    if data.notes is not None:
        updates["notes"] = data.notes

    repo.update(db, obj, updates)
    db.commit()
    return _to_dict(obj)


def cancel_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict[str, Any]:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    if obj.status in (INT_STATUS_COMPLETED, INT_STATUS_CANCELLED):
        raise HTTPException(400, f"Interview is already {obj.status}.")

    updates: Dict[str, Any] = {"status": INT_STATUS_CANCELLED}
    if data.notes is not None:
        updates["notes"] = data.notes
    repo.update(db, obj, updates)
    db.commit()
    return _to_dict(obj)


def mark_no_show(db: Session, client_id: str, interview_id: str, actor: str) -> Dict[str, Any]:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    if obj.status != INT_STATUS_SCHEDULED:
        raise HTTPException(400, "Only scheduled interviews can be marked as no-show.")

    repo.update(db, obj, {"status": INT_STATUS_NO_SHOW})
    db.commit()
    return _to_dict(obj)


def delete_interview(db: Session, client_id: str, interview_id: str) -> None:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    repo.soft_delete(db, obj)
    db.commit()


def get_interview(db: Session, client_id: str, interview_id: str) -> Dict[str, Any]:
    obj = repo.get(db, interview_id, client_id)
    if not obj:
        raise HTTPException(404, "Interview not found.")
    return _to_dict(obj)
