"""Service layer — Interview Management."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.interview import repository as repo
from backend.app.modules.interview.constants import (
    INT_STATUS_SCHEDULED, INT_STATUS_RESCHEDULED, INT_STATUS_COMPLETED,
    INT_STATUS_CANCELLED, INT_STATUS_NO_SHOW, ACTIVE_STATUSES,
    ACT_SCHEDULED, ACT_RESCHEDULED, ACT_COMPLETED, ACT_CANCELLED,
    ACT_NO_SHOW, ACT_PANEL_ADDED, ACT_PANEL_REMOVED,
    ACT_FEEDBACK_SUBMITTED, ACT_SELECTED, ACT_REJECTED,
    ACT_PIPELINE_CREATED, ACT_PIPELINE_UPDATED,
    DEFAULT_SCORECARD_CRITERIA,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _num(db: Session, client_id: str) -> str:
    from backend.app.modules.interview.models import Interview
    today = datetime.utcnow().strftime("%Y%m%d")
    count = db.query(func.count(Interview.id)).filter(
        Interview.client_id == client_id
    ).scalar() or 0
    return f"INT-{today}-{str(count + 1).zfill(6)}"


def _pipeline_dict(p, stages: list = None) -> Dict:
    d = {
        "id": p.id, "client_id": p.client_id,
        "pipeline_name": p.pipeline_name, "description": p.description,
        "company_id": p.company_id, "company_name": p.company_name,
        "department_id": p.department_id, "department_name": p.department_name,
        "designation_id": p.designation_id, "designation_name": p.designation_name,
        "is_active": p.is_active, "is_default": p.is_default,
        "created_by": p.created_by,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }
    if stages is not None:
        d["stages"] = [_stage_dict(s) for s in stages]
    return d


def _stage_dict(s) -> Dict:
    return {
        "id": s.id, "pipeline_id": s.pipeline_id,
        "stage_name": s.stage_name, "round_type": s.round_type,
        "sequence": s.sequence, "is_mandatory": s.is_mandatory,
        "duration_minutes": s.duration_minutes, "instructions": s.instructions,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _interview_dict(iv, panel=None, feedback=None) -> Dict:
    d = {
        "id": iv.id, "client_id": iv.client_id,
        "interview_number": iv.interview_number,
        "candidate_id": iv.candidate_id, "candidate_name": iv.candidate_name,
        "opening_id": iv.opening_id, "opening_title": iv.opening_title,
        "pipeline_id": iv.pipeline_id, "pipeline_name": iv.pipeline_name,
        "pipeline_stage_id": iv.pipeline_stage_id,
        "round_number": iv.round_number, "round_name": iv.round_name,
        "round_type": iv.round_type,
        "interview_date": iv.interview_date,
        "start_time": iv.start_time, "end_time": iv.end_time,
        "timezone": iv.timezone, "duration_minutes": iv.duration_minutes,
        "mode": iv.mode, "location": iv.location,
        "meeting_url": iv.meeting_url, "instructions": iv.instructions,
        "status": iv.status, "result": iv.result,
        "reschedule_count": iv.reschedule_count,
        "reschedule_reason": iv.reschedule_reason,
        "original_date": iv.original_date,
        "created_by": iv.created_by,
        "created_at": iv.created_at.isoformat() if iv.created_at else None,
        "updated_at": iv.updated_at.isoformat() if iv.updated_at else None,
    }
    if panel is not None:
        d["panel"] = [_panel_dict(p) for p in panel]
    if feedback is not None:
        d["feedback"] = [_feedback_dict(f) for f in feedback]
    return d


def _panel_dict(p) -> Dict:
    return {
        "id": p.id, "interview_id": p.interview_id,
        "employee_id": p.employee_id, "employee_name": p.employee_name,
        "employee_email": p.employee_email,
        "role": p.role, "weightage": p.weightage, "is_confirmed": p.is_confirmed,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }


def _feedback_dict(f, scorecards=None) -> Dict:
    d = {
        "id": f.id, "interview_id": f.interview_id, "candidate_id": f.candidate_id,
        "evaluator_id": f.evaluator_id, "evaluator_name": f.evaluator_name,
        "recommendation": f.recommendation,
        "overall_score": float(f.overall_score) if f.overall_score else None,
        "strengths": f.strengths, "weaknesses": f.weaknesses,
        "comments": f.comments, "is_private": f.is_private,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }
    if scorecards is not None:
        d["scorecards"] = [_sc_dict(s) for s in scorecards]
    return d


def _sc_dict(s) -> Dict:
    return {
        "id": s.id, "feedback_id": s.feedback_id,
        "criteria": s.criteria, "score": s.score, "notes": s.notes,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _activity_dict(a) -> Dict:
    return {
        "id": a.id, "interview_id": a.interview_id, "candidate_id": a.candidate_id,
        "action": a.action, "actor": a.actor,
        "old_value": a.old_value, "new_value": a.new_value, "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _log(db, client_id, action, actor, **kwargs):
    repo.log_activity(db, {
        "client_id": client_id, "action": action, "actor": actor, **kwargs
    })


def _resolve_candidate(db, candidate_id):
    try:
        from backend.app.modules.recruitment.models import Candidate
        c = db.get(Candidate, candidate_id)
        if c:
            return f"{c.first_name} {c.last_name}".strip(), c.email
    except Exception:
        pass
    return None, None


def _resolve_opening(db, opening_id):
    try:
        from backend.app.modules.recruitment.models import JobOpening
        o = db.get(JobOpening, opening_id)
        return o.job_title if o else None
    except Exception:
        return None


# ── Pipeline service ──────────────────────────────────────────────────────────

def create_pipeline(db: Session, client_id: str, data, actor: str) -> Dict:
    # Resolve names from org tables
    company_name = department_name = designation_name = None
    try:
        if data.company_id:
            from backend.app.modules.organization_management.models import Company
            c = db.get(Company, data.company_id)
            if c:
                company_name = c.company_name
        if data.department_id:
            from backend.app.modules.organization_management.models import Department
            d = db.get(Department, data.department_id)
            if d:
                department_name = d.department_name
        if data.designation_id:
            from backend.app.modules.organization_management.models import Designation
            dg = db.get(Designation, data.designation_id)
            if dg:
                designation_name = dg.designation_name
    except Exception:
        pass

    pipeline = repo.create_pipeline(db, {
        "client_id": client_id,
        "pipeline_name": data.pipeline_name,
        "description": data.description,
        "company_id": data.company_id, "company_name": company_name,
        "department_id": data.department_id, "department_name": department_name,
        "designation_id": data.designation_id, "designation_name": designation_name,
        "is_default": data.is_default,
        "created_by": actor,
    })
    # Create stages
    for i, s in enumerate(data.stages):
        repo.create_stage(db, {
            "client_id": client_id,
            "pipeline_id": pipeline.id,
            "stage_name": s.stage_name,
            "round_type": s.round_type,
            "sequence": s.sequence if s.sequence else i + 1,
            "is_mandatory": s.is_mandatory,
            "duration_minutes": s.duration_minutes,
            "instructions": s.instructions,
        })
    _log(db, client_id, ACT_PIPELINE_CREATED, actor, notes=data.pipeline_name)
    db.commit()
    stages = repo.list_stages(db, pipeline.id)
    return _pipeline_dict(pipeline, stages)


def get_pipeline(db: Session, client_id: str, pipeline_id: str) -> Dict:
    p = repo.get_pipeline(db, pipeline_id, client_id)
    if not p:
        raise HTTPException(404, "Pipeline not found.")
    stages = repo.list_stages(db, pipeline_id)
    return _pipeline_dict(p, stages)


def list_pipelines(db: Session, client_id: str, active_only: bool = False) -> List[Dict]:
    pipelines = repo.list_pipelines(db, client_id, active_only=active_only)
    result = []
    for p in pipelines:
        stages = repo.list_stages(db, p.id)
        result.append(_pipeline_dict(p, stages))
    return result


def update_pipeline(db: Session, client_id: str, pipeline_id: str, data, actor: str) -> Dict:
    p = repo.get_pipeline(db, pipeline_id, client_id)
    if not p:
        raise HTTPException(404, "Pipeline not found.")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    repo.update_pipeline(db, p, updates)
    _log(db, client_id, ACT_PIPELINE_UPDATED, actor, interview_id=None)
    db.commit()
    stages = repo.list_stages(db, pipeline_id)
    return _pipeline_dict(p, stages)


def delete_pipeline(db: Session, client_id: str, pipeline_id: str) -> None:
    p = repo.get_pipeline(db, pipeline_id, client_id)
    if not p:
        raise HTTPException(404, "Pipeline not found.")
    repo.soft_delete_pipeline(db, p)
    db.commit()


def add_stage(db: Session, client_id: str, pipeline_id: str, data, actor: str) -> Dict:
    p = repo.get_pipeline(db, pipeline_id, client_id)
    if not p:
        raise HTTPException(404, "Pipeline not found.")
    stages = repo.list_stages(db, pipeline_id)
    seq = data.sequence if data.sequence else len(stages) + 1
    s = repo.create_stage(db, {
        "client_id": client_id, "pipeline_id": pipeline_id,
        "stage_name": data.stage_name, "round_type": data.round_type,
        "sequence": seq, "is_mandatory": data.is_mandatory,
        "duration_minutes": data.duration_minutes, "instructions": data.instructions,
    })
    db.commit()
    return _stage_dict(s)


def update_stage(db: Session, pipeline_id: str, stage_id: str, data, actor: str) -> Dict:
    s = repo.get_stage(db, stage_id, pipeline_id)
    if not s:
        raise HTTPException(404, "Stage not found.")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    repo.update_stage(db, s, updates)
    db.commit()
    return _stage_dict(s)


def delete_stage(db: Session, pipeline_id: str, stage_id: str) -> None:
    s = repo.get_stage(db, stage_id, pipeline_id)
    if not s:
        raise HTTPException(404, "Stage not found.")
    s.is_active = False
    db.commit()


def reorder_stages(db: Session, pipeline_id: str, stage_ids: List[str]) -> List[Dict]:
    for i, sid in enumerate(stage_ids):
        from backend.app.modules.interview.models import InterviewPipelineStage
        s = db.query(InterviewPipelineStage).filter(
            InterviewPipelineStage.id == sid,
            InterviewPipelineStage.pipeline_id == pipeline_id,
        ).first()
        if s:
            s.sequence = i + 1
    db.commit()
    return [_stage_dict(s) for s in repo.list_stages(db, pipeline_id)]


# ── Interview service ─────────────────────────────────────────────────────────

def schedule_interview(db: Session, client_id: str, data, actor: str) -> Dict:
    cand_name, _ = _resolve_candidate(db, data.candidate_id)
    opening_title = _resolve_opening(db, data.opening_id) if data.opening_id else None

    pipeline_name = None
    if data.pipeline_id:
        p = repo.get_pipeline(db, data.pipeline_id, client_id)
        if p:
            pipeline_name = p.pipeline_name

    iv = repo.create_interview(db, {
        "client_id": client_id,
        "interview_number": _num(db, client_id),
        "candidate_id": data.candidate_id, "candidate_name": cand_name,
        "opening_id": data.opening_id, "opening_title": opening_title,
        "pipeline_id": data.pipeline_id, "pipeline_name": pipeline_name,
        "pipeline_stage_id": data.pipeline_stage_id,
        "round_number": data.round_number,
        "round_name": data.round_name, "round_type": data.round_type,
        "interview_date": data.interview_date,
        "start_time": data.start_time, "end_time": data.end_time,
        "timezone": data.timezone or "Asia/Kolkata",
        "duration_minutes": data.duration_minutes,
        "mode": data.mode, "location": data.location,
        "meeting_url": data.meeting_url, "instructions": data.instructions,
        "status": INT_STATUS_SCHEDULED, "result": "Pending",
        "created_by": actor,
    })
    _log(db, client_id, ACT_SCHEDULED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id,
         new_value=iv.interview_date)
    db.commit()
    return _interview_dict(iv)


def get_interview(db: Session, client_id: str, interview_id: str, full: bool = False) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    panel = repo.list_panel(db, interview_id) if full else None
    feedbacks = repo.list_feedback(db, interview_id) if full else None
    if feedbacks:
        for f in feedbacks:
            f._scorecards = repo.list_scorecards(db, f.id)
    return _interview_dict(iv, panel=panel, feedback=feedbacks)


def list_interviews(db: Session, client_id: str, **kwargs) -> Dict:
    r = repo.list_interviews(db, client_id, **kwargs)
    return {"total": r["total"], "items": [_interview_dict(iv) for iv in r["items"]]}


def update_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    if iv.status in (INT_STATUS_COMPLETED, INT_STATUS_CANCELLED):
        raise HTTPException(400, f"Cannot edit a {iv.status} interview.")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    repo.update_interview(db, iv, updates)
    db.commit()
    return _interview_dict(iv)


def reschedule_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    if iv.status not in ACTIVE_STATUSES:
        raise HTTPException(400, "Only active interviews can be rescheduled.")
    old_date = iv.interview_date
    updates = {
        "status": INT_STATUS_RESCHEDULED,
        "reschedule_count": iv.reschedule_count + 1,
        "interview_date": data.interview_date,
        "reschedule_reason": data.reschedule_reason,
    }
    if not iv.original_date:
        updates["original_date"] = old_date
    for f in ("start_time", "end_time", "mode", "location", "meeting_url"):
        v = getattr(data, f, None)
        if v is not None:
            updates[f] = v
    repo.update_interview(db, iv, updates)
    _log(db, client_id, ACT_RESCHEDULED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id,
         old_value=old_date, new_value=data.interview_date)
    db.commit()
    return _interview_dict(iv)


def complete_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    if iv.status not in ACTIVE_STATUSES:
        raise HTTPException(400, "Only active interviews can be completed.")
    repo.update_interview(db, iv, {
        "status": INT_STATUS_COMPLETED, "result": data.result,
    })
    _log(db, client_id, ACT_COMPLETED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id, new_value=data.result)
    db.commit()
    return _interview_dict(iv)


def cancel_interview(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    if iv.status in (INT_STATUS_COMPLETED, INT_STATUS_CANCELLED):
        raise HTTPException(400, f"Interview is already {iv.status}.")
    updates: Dict = {"status": INT_STATUS_CANCELLED}
    if data.notes:
        updates["instructions"] = (iv.instructions or "") + f"\nCancelled: {data.notes}"
    repo.update_interview(db, iv, updates)
    _log(db, client_id, ACT_CANCELLED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id, notes=data.notes)
    db.commit()
    return _interview_dict(iv)


def mark_no_show(db: Session, client_id: str, interview_id: str, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    if iv.status not in ACTIVE_STATUSES:
        raise HTTPException(400, "Only active interviews can be marked no-show.")
    repo.update_interview(db, iv, {"status": INT_STATUS_NO_SHOW})
    _log(db, client_id, ACT_NO_SHOW, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id)
    db.commit()
    return _interview_dict(iv)


def delete_interview(db: Session, client_id: str, interview_id: str) -> None:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    repo.soft_delete_interview(db, iv)
    db.commit()


# ── Panel service ─────────────────────────────────────────────────────────────

def add_panel_member(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    p = repo.add_panel_member(db, {
        "client_id": client_id, "interview_id": interview_id,
        "employee_id": data.employee_id, "employee_name": data.employee_name,
        "employee_email": data.employee_email,
        "role": data.role, "weightage": data.weightage,
    })
    _log(db, client_id, ACT_PANEL_ADDED, actor,
         interview_id=interview_id, new_value=data.employee_name)
    db.commit()
    return _panel_dict(p)


def remove_panel_member(db: Session, client_id: str, interview_id: str, panel_id: str, actor: str) -> None:
    m = repo.get_panel_member(db, panel_id, interview_id)
    if not m:
        raise HTTPException(404, "Panel member not found.")
    name = m.employee_name
    repo.delete_panel_member(db, m)
    _log(db, client_id, ACT_PANEL_REMOVED, actor,
         interview_id=interview_id, old_value=name)
    db.commit()


def list_panel(db: Session, client_id: str, interview_id: str) -> List[Dict]:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    return [_panel_dict(p) for p in repo.list_panel(db, interview_id)]


# ── Feedback service ──────────────────────────────────────────────────────────

def submit_feedback(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    fb = repo.create_feedback(db, {
        "client_id": client_id, "interview_id": interview_id,
        "candidate_id": iv.candidate_id,
        "evaluator_name": actor,
        "recommendation": data.recommendation,
        "overall_score": data.overall_score,
        "strengths": data.strengths, "weaknesses": data.weaknesses,
        "comments": data.comments, "is_private": data.is_private,
    })
    for sc in data.scorecards:
        repo.create_scorecard(db, {
            "client_id": client_id, "feedback_id": fb.id,
            "interview_id": interview_id,
            "criteria": sc.criteria, "score": sc.score, "notes": sc.notes,
        })
    _log(db, client_id, ACT_FEEDBACK_SUBMITTED, actor,
         interview_id=interview_id, candidate_id=iv.candidate_id,
         new_value=data.recommendation)
    db.commit()
    scs = repo.list_scorecards(db, fb.id)
    return _feedback_dict(fb, scs)


def update_feedback(db: Session, client_id: str, interview_id: str, feedback_id: str, data, actor: str) -> Dict:
    fb = repo.get_feedback(db, feedback_id, interview_id)
    if not fb:
        raise HTTPException(404, "Feedback not found.")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items()
               if k != "scorecards" and v is not None}
    repo.update_feedback(db, fb, updates)
    if data.scorecards is not None:
        repo.delete_scorecards_for_feedback(db, feedback_id)
        for sc in data.scorecards:
            repo.create_scorecard(db, {
                "client_id": client_id, "feedback_id": feedback_id,
                "interview_id": interview_id,
                "criteria": sc.criteria, "score": sc.score, "notes": sc.notes,
            })
    db.commit()
    scs = repo.list_scorecards(db, feedback_id)
    return _feedback_dict(fb, scs)


def list_feedback(db: Session, client_id: str, interview_id: str) -> List[Dict]:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    feedbacks = repo.list_feedback(db, interview_id)
    result = []
    for f in feedbacks:
        scs = repo.list_scorecards(db, f.id)
        result.append(_feedback_dict(f, scs))
    return result


# ── Selection service ─────────────────────────────────────────────────────────

def select_candidate(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    repo.update_interview(db, iv, {"result": "Selected"})
    _log(db, client_id, ACT_SELECTED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id, notes=data.remarks)
    # Update candidate status in recruitment module if possible
    try:
        from backend.app.modules.recruitment.models import Candidate
        cand = db.get(Candidate, iv.candidate_id)
        if cand:
            cand.status = "Selected"
    except Exception:
        pass
    db.commit()
    return _interview_dict(iv)


def reject_candidate(db: Session, client_id: str, interview_id: str, data, actor: str) -> Dict:
    iv = repo.get_interview(db, interview_id, client_id)
    if not iv:
        raise HTTPException(404, "Interview not found.")
    repo.update_interview(db, iv, {"result": "Rejected"})
    _log(db, client_id, ACT_REJECTED, actor,
         interview_id=iv.id, candidate_id=iv.candidate_id, notes=data.remarks)
    try:
        from backend.app.modules.recruitment.models import Candidate
        cand = db.get(Candidate, iv.candidate_id)
        if cand:
            cand.status = "Rejected"
    except Exception:
        pass
    db.commit()
    return _interview_dict(iv)


# ── Dashboard ─────────────────────────────────────────────────────────────────

def dashboard(db: Session, client_id: str) -> Dict:
    stats = repo.dashboard_stats(db, client_id)
    upcoming = [_interview_dict(iv) for iv in repo.upcoming_interviews(db, client_id, limit=8)]
    selected = stats.get("Completed", 0)
    return {
        "scheduled": stats.get("Scheduled", 0),
        "rescheduled": stats.get("Rescheduled", 0),
        "completed": stats.get("Completed", 0),
        "cancelled": stats.get("Cancelled", 0),
        "no_show": stats.get("No Show", 0),
        "total": sum(stats.values()),
        "pipeline_count": len(repo.list_pipelines(db, client_id)),
        "upcoming": upcoming,
    }


# ── Calendar ──────────────────────────────────────────────────────────────────

def calendar_events(
    db: Session, client_id: str, start_date: str, end_date: str,
    *,
    statuses: Optional[List[str]] = None,
    round_types: Optional[List[str]] = None,
    modes: Optional[List[str]] = None,
    candidate_ids: Optional[List[str]] = None,
    opening_ids: Optional[List[str]] = None,
    interviewer_name: Optional[str] = None,
) -> List[Dict]:
    items = repo.calendar_events(
        db, client_id, start_date, end_date,
        statuses=statuses, round_types=round_types, modes=modes,
        candidate_ids=candidate_ids, opening_ids=opening_ids,
        interviewer_name=interviewer_name,
    )
    if not items:
        return []
    # Batch-load panel members for all interviews (avoids N+1)
    iv_ids = [iv.id for iv in items]
    panel_rows = repo.list_panel_for_interviews(db, client_id, iv_ids)
    panel_map: Dict[str, List] = {}
    for p in panel_rows:
        panel_map.setdefault(p.interview_id, []).append(p)
    return [_interview_dict(iv, panel=panel_map.get(iv.id, [])) for iv in items]


def calendar_filter_options(db: Session, client_id: str) -> Dict:
    return repo.calendar_filter_options(db, client_id)


# ── Activities ────────────────────────────────────────────────────────────────

def get_activities(
    db: Session, client_id: str, *,
    interview_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
) -> List[Dict]:
    acts = repo.list_activities(db, client_id,
                                 interview_id=interview_id, candidate_id=candidate_id)
    return [_activity_dict(a) for a in acts]
