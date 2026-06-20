"""Repository layer — Interview Management."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.interview.models import (
    Interview, InterviewActivity, InterviewFeedback,
    InterviewPanel, InterviewPipeline, InterviewPipelineStage, InterviewScorecard,
)


# ── Pipeline ──────────────────────────────────────────────────────────────────

def create_pipeline(db: Session, data: Dict) -> InterviewPipeline:
    obj = InterviewPipeline(**data)
    db.add(obj)
    db.flush()
    return obj


def get_pipeline(db: Session, pipeline_id: str, client_id: str) -> Optional[InterviewPipeline]:
    return db.query(InterviewPipeline).filter(
        InterviewPipeline.id == pipeline_id,
        InterviewPipeline.client_id == client_id,
        InterviewPipeline.is_deleted.is_(False),
    ).first()


def list_pipelines(db: Session, client_id: str, *, active_only: bool = False) -> List[InterviewPipeline]:
    q = db.query(InterviewPipeline).filter(
        InterviewPipeline.client_id == client_id,
        InterviewPipeline.is_deleted.is_(False),
    )
    if active_only:
        q = q.filter(InterviewPipeline.is_active.is_(True))
    return q.order_by(InterviewPipeline.pipeline_name).all()


def update_pipeline(db: Session, obj: InterviewPipeline, updates: Dict) -> InterviewPipeline:
    for k, v in updates.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def soft_delete_pipeline(db: Session, obj: InterviewPipeline) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.flush()


# ── Pipeline Stages ───────────────────────────────────────────────────────────

def create_stage(db: Session, data: Dict) -> InterviewPipelineStage:
    obj = InterviewPipelineStage(**data)
    db.add(obj)
    db.flush()
    return obj


def get_stage(db: Session, stage_id: str, pipeline_id: str) -> Optional[InterviewPipelineStage]:
    return db.query(InterviewPipelineStage).filter(
        InterviewPipelineStage.id == stage_id,
        InterviewPipelineStage.pipeline_id == pipeline_id,
    ).first()


def list_stages(db: Session, pipeline_id: str) -> List[InterviewPipelineStage]:
    return (
        db.query(InterviewPipelineStage)
        .filter(
            InterviewPipelineStage.pipeline_id == pipeline_id,
            InterviewPipelineStage.is_active.is_(True),
        )
        .order_by(InterviewPipelineStage.sequence)
        .all()
    )


def update_stage(db: Session, obj: InterviewPipelineStage, updates: Dict) -> InterviewPipelineStage:
    for k, v in updates.items():
        setattr(obj, k, v)
    db.flush()
    return obj


# ── Interview ─────────────────────────────────────────────────────────────────

def create_interview(db: Session, data: Dict) -> Interview:
    obj = Interview(**data)
    db.add(obj)
    db.flush()
    return obj


def get_interview(db: Session, interview_id: str, client_id: str) -> Optional[Interview]:
    return db.query(Interview).filter(
        Interview.id == interview_id,
        Interview.client_id == client_id,
        Interview.is_deleted.is_(False),
    ).first()


def list_interviews(
    db: Session, client_id: str, *,
    page: int = 1, page_size: int = 20,
    search: str = "", status: str = "", result: str = "",
    candidate_id: str = "", opening_id: str = "", pipeline_id: str = "",
) -> Dict[str, Any]:
    q = db.query(Interview).filter(
        Interview.client_id == client_id,
        Interview.is_deleted.is_(False),
    )
    if search:
        pat = f"%{search}%"
        q = q.filter(
            Interview.interview_number.ilike(pat)
            | Interview.candidate_name.ilike(pat)
            | Interview.round_name.ilike(pat)
            | Interview.round_type.ilike(pat)
        )
    if status:
        q = q.filter(Interview.status == status)
    if result:
        q = q.filter(Interview.result == result)
    if candidate_id:
        q = q.filter(Interview.candidate_id == candidate_id)
    if opening_id:
        q = q.filter(Interview.opening_id == opening_id)
    if pipeline_id:
        q = q.filter(Interview.pipeline_id == pipeline_id)
    total = q.count()
    items = (
        q.order_by(Interview.interview_date.desc(), Interview.start_time.desc())
        .offset((page - 1) * page_size).limit(page_size).all()
    )
    return {"total": total, "items": items}


def update_interview(db: Session, obj: Interview, updates: Dict) -> Interview:
    for k, v in updates.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def soft_delete_interview(db: Session, obj: Interview) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.flush()


def calendar_events(
    db: Session, client_id: str, start_date: str, end_date: str,
    *,
    statuses: Optional[List[str]] = None,
    round_types: Optional[List[str]] = None,
    modes: Optional[List[str]] = None,
    candidate_ids: Optional[List[str]] = None,
    opening_ids: Optional[List[str]] = None,
    interviewer_name: Optional[str] = None,
) -> List[Interview]:
    q = (
        db.query(Interview)
        .filter(
            Interview.client_id == client_id,
            Interview.is_deleted.is_(False),
            Interview.interview_date >= start_date,
            Interview.interview_date <= end_date,
        )
    )
    if statuses:
        q = q.filter(Interview.status.in_(statuses))
    if round_types:
        q = q.filter(Interview.round_type.in_(round_types))
    if modes:
        q = q.filter(Interview.mode.in_(modes))
    if candidate_ids:
        q = q.filter(Interview.candidate_id.in_(candidate_ids))
    if opening_ids:
        q = q.filter(Interview.opening_id.in_(opening_ids))
    if interviewer_name:
        panel_ids = (
            db.query(InterviewPanel.interview_id)
            .filter(
                InterviewPanel.employee_name.ilike(f"%{interviewer_name}%"),
            )
            .subquery()
        )
        q = q.filter(Interview.id.in_(panel_ids))
    return q.order_by(Interview.interview_date, Interview.start_time).all()


def calendar_filter_options(db: Session, client_id: str) -> Dict:
    """Return distinct values used to populate calendar filter dropdowns."""
    from sqlalchemy import distinct
    candidates = (
        db.query(distinct(Interview.candidate_id), Interview.candidate_name)
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False),
                Interview.candidate_id.isnot(None))
        .limit(200).all()
    )
    openings = (
        db.query(distinct(Interview.opening_id), Interview.opening_title)
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False),
                Interview.opening_id.isnot(None))
        .limit(200).all()
    )
    round_types = (
        db.query(distinct(Interview.round_type))
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False),
                Interview.round_type.isnot(None))
        .all()
    )
    modes = (
        db.query(distinct(Interview.mode))
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False),
                Interview.mode.isnot(None))
        .all()
    )
    interviewers = (
        db.query(distinct(InterviewPanel.employee_name))
        .join(Interview, Interview.id == InterviewPanel.interview_id)
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False))
        .limit(200).all()
    )
    return {
        "candidates":   [{"id": r[0], "name": r[1]} for r in candidates if r[0]],
        "openings":     [{"id": r[0], "title": r[1]} for r in openings if r[0]],
        "round_types":  [r[0] for r in round_types if r[0]],
        "modes":        [r[0] for r in modes if r[0]],
        "interviewers": [r[0] for r in interviewers if r[0]],
    }


def dashboard_stats(db: Session, client_id: str) -> Dict[str, int]:
    rows = (
        db.query(Interview.status, func.count(Interview.id))
        .filter(Interview.client_id == client_id, Interview.is_deleted.is_(False))
        .group_by(Interview.status).all()
    )
    return {r[0]: r[1] for r in rows}


def upcoming_interviews(db: Session, client_id: str, limit: int = 5) -> List[Interview]:
    from datetime import date
    today = date.today().isoformat()
    return (
        db.query(Interview)
        .filter(
            Interview.client_id == client_id,
            Interview.is_deleted.is_(False),
            Interview.status.in_(["Scheduled", "Rescheduled"]),
            Interview.interview_date >= today,
        )
        .order_by(Interview.interview_date, Interview.start_time)
        .limit(limit).all()
    )


# ── Panel ─────────────────────────────────────────────────────────────────────

def add_panel_member(db: Session, data: Dict) -> InterviewPanel:
    obj = InterviewPanel(**data)
    db.add(obj)
    db.flush()
    return obj


def list_panel_for_interviews(
    db: Session, client_id: str, interview_ids: List[str]
) -> List[InterviewPanel]:
    """Batch-load panel members for multiple interviews (avoids N+1)."""
    if not interview_ids:
        return []
    return (
        db.query(InterviewPanel)
        .filter(InterviewPanel.interview_id.in_(interview_ids))
        .all()
    )


def list_panel(db: Session, interview_id: str) -> List[InterviewPanel]:
    return (
        db.query(InterviewPanel)
        .filter(InterviewPanel.interview_id == interview_id)
        .order_by(InterviewPanel.created_at)
        .all()
    )


def get_panel_member(db: Session, panel_id: str, interview_id: str) -> Optional[InterviewPanel]:
    return db.query(InterviewPanel).filter(
        InterviewPanel.id == panel_id,
        InterviewPanel.interview_id == interview_id,
    ).first()


def delete_panel_member(db: Session, obj: InterviewPanel) -> None:
    db.delete(obj)
    db.flush()


# ── Feedback ──────────────────────────────────────────────────────────────────

def create_feedback(db: Session, data: Dict) -> InterviewFeedback:
    obj = InterviewFeedback(**data)
    db.add(obj)
    db.flush()
    return obj


def get_feedback(db: Session, feedback_id: str, interview_id: str) -> Optional[InterviewFeedback]:
    return db.query(InterviewFeedback).filter(
        InterviewFeedback.id == feedback_id,
        InterviewFeedback.interview_id == interview_id,
    ).first()


def list_feedback(db: Session, interview_id: str) -> List[InterviewFeedback]:
    return (
        db.query(InterviewFeedback)
        .filter(InterviewFeedback.interview_id == interview_id)
        .order_by(InterviewFeedback.created_at)
        .all()
    )


def update_feedback(db: Session, obj: InterviewFeedback, updates: Dict) -> InterviewFeedback:
    for k, v in updates.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def create_scorecard(db: Session, data: Dict) -> InterviewScorecard:
    obj = InterviewScorecard(**data)
    db.add(obj)
    db.flush()
    return obj


def delete_scorecards_for_feedback(db: Session, feedback_id: str) -> None:
    db.query(InterviewScorecard).filter(
        InterviewScorecard.feedback_id == feedback_id
    ).delete(synchronize_session=False)
    db.flush()


def list_scorecards(db: Session, feedback_id: str) -> List[InterviewScorecard]:
    return (
        db.query(InterviewScorecard)
        .filter(InterviewScorecard.feedback_id == feedback_id)
        .order_by(InterviewScorecard.created_at)
        .all()
    )


# ── Activities ────────────────────────────────────────────────────────────────

def log_activity(db: Session, data: Dict) -> InterviewActivity:
    obj = InterviewActivity(**data)
    db.add(obj)
    db.flush()
    return obj


def list_activities(
    db: Session, client_id: str, *,
    interview_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
) -> List[InterviewActivity]:
    q = db.query(InterviewActivity).filter(
        InterviewActivity.client_id == client_id
    )
    if interview_id:
        q = q.filter(InterviewActivity.interview_id == interview_id)
    if candidate_id:
        q = q.filter(InterviewActivity.candidate_id == candidate_id)
    return q.order_by(InterviewActivity.created_at.desc()).all()
