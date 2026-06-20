"""Exit Management — repository layer."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.exit_management.models import (
    ExitPolicy, ResignationRequest, NoticePeriod, ExitClearance,
    ExitClearanceTask, ExitInterview, ExitInterviewQuestion,
    ExitInterviewResponse, ExitAssetRecovery, FinalSettlement,
    ExitDocument, ExitActivity,
)
from backend.app.modules.exit_management.constants import (
    ACT_RESIGNATION_SUBMITTED, CLR_PENDING, INT_PENDING, SETTLE_DRAFT,
    DEFAULT_CLEARANCE_TEMPLATES, DEFAULT_QUESTIONS, NP_SERVING,
    ALL_CLEARANCE_DEPTS,
)


def _uid() -> str:
    return str(uuid.uuid4())


def _res_number(db: Session) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"RES-{today}-"
    count = db.query(ResignationRequest).filter(
        ResignationRequest.resignation_number.like(f"{prefix}%")
    ).count()
    return f"{prefix}{str(count + 1).zfill(4)}"


# ── Exit Policies ─────────────────────────────────────────────────────────────
def list_policies(db: Session, *, include_inactive: bool = False) -> list[ExitPolicy]:
    q = db.query(ExitPolicy)
    if not include_inactive:
        q = q.filter(ExitPolicy.is_active == True)
    return q.order_by(ExitPolicy.policy_name).all()


def get_policy(db: Session, policy_id: str) -> Optional[ExitPolicy]:
    return db.query(ExitPolicy).filter(ExitPolicy.id == policy_id).first()


def create_policy(db: Session, data: dict, actor: str) -> ExitPolicy:
    p = ExitPolicy(id=_uid(), **data, created_by=actor)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_policy(db: Session, p: ExitPolicy, data: dict) -> ExitPolicy:
    for k, v in data.items():
        if v is not None:
            setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


def delete_policy(db: Session, p: ExitPolicy) -> None:
    db.delete(p)
    db.commit()


# ── Resignation Requests ──────────────────────────────────────────────────────
def list_resignations(
    db: Session, *,
    status: Optional[str] = None,
    employee_id: Optional[str] = None,
    separation_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ResignationRequest], int]:
    q = db.query(ResignationRequest).filter(ResignationRequest.is_deleted == False)
    if status:
        q = q.filter(ResignationRequest.status == status)
    if employee_id:
        q = q.filter(ResignationRequest.employee_id == employee_id)
    if separation_type:
        q = q.filter(ResignationRequest.separation_type == separation_type)
    total = q.count()
    items = q.order_by(ResignationRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def get_resignation(db: Session, resignation_id: str) -> Optional[ResignationRequest]:
    return db.query(ResignationRequest).filter(
        ResignationRequest.id == resignation_id,
        ResignationRequest.is_deleted == False,
    ).first()


def get_resignation_by_employee(db: Session, employee_id: str) -> Optional[ResignationRequest]:
    """Get latest non-terminal resignation for employee."""
    from backend.app.modules.exit_management.constants import TERMINAL_RESIGNATION_STATUSES
    return db.query(ResignationRequest).filter(
        ResignationRequest.employee_id == employee_id,
        ResignationRequest.is_deleted == False,
        ~ResignationRequest.status.in_(TERMINAL_RESIGNATION_STATUSES),
    ).order_by(ResignationRequest.created_at.desc()).first()


def create_resignation(db: Session, data: dict, actor: str) -> ResignationRequest:
    r = ResignationRequest(
        id=_uid(),
        resignation_number=_res_number(db),
        created_by=actor,
        **data,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def update_resignation(db: Session, r: ResignationRequest, data: dict) -> ResignationRequest:
    for k, v in data.items():
        if v is not None:
            setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


# ── Notice Periods ────────────────────────────────────────────────────────────
def get_notice_period(db: Session, resignation_id: str) -> Optional[NoticePeriod]:
    return db.query(NoticePeriod).filter(NoticePeriod.resignation_id == resignation_id).first()


def create_notice_period(db: Session, resignation_id: str, employee_id: str,
                          start_date: date, notice_days: int) -> NoticePeriod:
    end_date = start_date + timedelta(days=notice_days)
    np = NoticePeriod(
        id=_uid(),
        resignation_id=resignation_id,
        employee_id=employee_id,
        required_notice_days=notice_days,
        notice_start_date=start_date,
        notice_end_date=end_date,
        status=NP_SERVING,
    )
    db.add(np)
    db.commit()
    db.refresh(np)
    return np


def update_notice_period(db: Session, np: NoticePeriod, data: dict) -> NoticePeriod:
    for k, v in data.items():
        if v is not None:
            setattr(np, k, v)
    db.commit()
    db.refresh(np)
    return np


# ── Clearances ────────────────────────────────────────────────────────────────
def get_clearances(db: Session, resignation_id: str) -> list[ExitClearance]:
    clearances = db.query(ExitClearance).filter(
        ExitClearance.resignation_id == resignation_id
    ).all()
    for c in clearances:
        c.tasks = db.query(ExitClearanceTask).filter(
            ExitClearanceTask.clearance_id == c.id
        ).order_by(ExitClearanceTask.display_order).all()
    return clearances


def get_clearance(db: Session, clearance_id: str) -> Optional[ExitClearance]:
    c = db.query(ExitClearance).filter(ExitClearance.id == clearance_id).first()
    if c:
        c.tasks = db.query(ExitClearanceTask).filter(
            ExitClearanceTask.clearance_id == clearance_id
        ).order_by(ExitClearanceTask.display_order).all()
    return c


def create_clearances_for_resignation(
    db: Session, resignation_id: str, employee_id: str,
    templates: list[dict] | None = None,
) -> list[ExitClearance]:
    if templates is None:
        templates = DEFAULT_CLEARANCE_TEMPLATES
    # Group by department
    depts: dict[str, list[dict]] = {}
    for t in templates:
        depts.setdefault(t["department"], []).append(t)

    clearances = []
    for dept, tasks in depts.items():
        c = ExitClearance(
            id=_uid(),
            resignation_id=resignation_id,
            employee_id=employee_id,
            department=dept,
            status=CLR_PENDING,
        )
        db.add(c)
        db.flush()
        for i, t in enumerate(tasks):
            task = ExitClearanceTask(
                id=_uid(),
                clearance_id=c.id,
                task_name=t["task_name"],
                description=t.get("description", ""),
                is_mandatory=t.get("is_mandatory", True),
                status=CLR_PENDING,
                display_order=i,
            )
            db.add(task)
        clearances.append(c)
    db.commit()
    return clearances


def get_clearance_task(db: Session, task_id: str) -> Optional[ExitClearanceTask]:
    return db.query(ExitClearanceTask).filter(ExitClearanceTask.id == task_id).first()


def update_clearance_task(db: Session, task: ExitClearanceTask, data: dict, actor: str) -> ExitClearanceTask:
    for k, v in data.items():
        if v is not None:
            setattr(task, k, v)
    if data.get("status") in ("Completed", "Waived"):
        task.completed_at = datetime.utcnow()
        task.completed_by = actor
    db.commit()
    db.refresh(task)
    # Re-evaluate parent clearance status
    _refresh_clearance_status(db, task.clearance_id)
    return task


def _refresh_clearance_status(db: Session, clearance_id: str) -> None:
    tasks = db.query(ExitClearanceTask).filter(ExitClearanceTask.clearance_id == clearance_id).all()
    if not tasks:
        return
    statuses = {t.status for t in tasks}
    if all(s in ("Completed", "Waived") for s in statuses):
        db.query(ExitClearance).filter(ExitClearance.id == clearance_id).update({
            "status": "Completed",
            "completed_at": datetime.utcnow(),
        })
    elif "In Progress" in statuses or "Completed" in statuses:
        db.query(ExitClearance).filter(ExitClearance.id == clearance_id).update({
            "status": "In Progress",
        })
    db.commit()


def all_clearances_done(db: Session, resignation_id: str) -> bool:
    clearances = db.query(ExitClearance).filter(
        ExitClearance.resignation_id == resignation_id
    ).all()
    return all(c.status in ("Completed", "Waived") for c in clearances)


# ── Exit Interview ────────────────────────────────────────────────────────────
def get_interview(db: Session, resignation_id: str) -> Optional[ExitInterview]:
    return db.query(ExitInterview).filter(
        ExitInterview.resignation_id == resignation_id
    ).first()


def create_interview(db: Session, resignation_id: str, employee_id: str) -> ExitInterview:
    i = ExitInterview(
        id=_uid(),
        resignation_id=resignation_id,
        employee_id=employee_id,
        status=INT_PENDING,
    )
    db.add(i)
    db.commit()
    db.refresh(i)
    return i


def update_interview(db: Session, interview: ExitInterview, data: dict, actor: str) -> ExitInterview:
    for k, v in data.items():
        if v is not None:
            setattr(interview, k, v)
    db.commit()
    db.refresh(interview)
    return interview


def list_interview_questions(db: Session) -> list[ExitInterviewQuestion]:
    return db.query(ExitInterviewQuestion).filter(
        ExitInterviewQuestion.is_active == True
    ).order_by(ExitInterviewQuestion.display_order).all()


def save_interview_responses(
    db: Session, interview_id: str, responses: list[dict]
) -> None:
    # Delete existing responses first
    db.query(ExitInterviewResponse).filter(
        ExitInterviewResponse.interview_id == interview_id
    ).delete()
    for r in responses:
        resp = ExitInterviewResponse(
            id=_uid(),
            interview_id=interview_id,
            question_id=r["question_id"],
            rating_value=r.get("rating_value"),
            text_value=r.get("text_value"),
        )
        db.add(resp)
    db.commit()


def seed_interview_questions(db: Session) -> None:
    """Seed default questionnaire if empty."""
    import json
    if db.query(ExitInterviewQuestion).count() > 0:
        return
    for q in DEFAULT_QUESTIONS:
        options = q.get("options", [])
        item = ExitInterviewQuestion(
            id=_uid(),
            question_text=q["question_text"],
            question_type=q["question_type"],
            topic=q.get("topic"),
            options_json=json.dumps(options) if options else None,
            is_required=True,
            is_active=True,
            display_order=q.get("display_order", 0),
        )
        db.add(item)
    db.commit()


# ── Asset Recovery ────────────────────────────────────────────────────────────
def list_asset_recoveries(db: Session, resignation_id: str) -> list[ExitAssetRecovery]:
    return db.query(ExitAssetRecovery).filter(
        ExitAssetRecovery.resignation_id == resignation_id
    ).all()


def get_asset_recovery(db: Session, recovery_id: str) -> Optional[ExitAssetRecovery]:
    return db.query(ExitAssetRecovery).filter(ExitAssetRecovery.id == recovery_id).first()


def create_asset_recovery(db: Session, resignation_id: str, employee_id: str, data: dict) -> ExitAssetRecovery:
    r = ExitAssetRecovery(id=_uid(), resignation_id=resignation_id, employee_id=employee_id, **data)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def update_asset_recovery(db: Session, r: ExitAssetRecovery, data: dict, actor: str) -> ExitAssetRecovery:
    for k, v in data.items():
        if v is not None:
            setattr(r, k, v)
    if data.get("action") in ("Returned", "Damaged", "Lost"):
        r.processed_by = actor
        r.processed_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return r


# ── Final Settlement ──────────────────────────────────────────────────────────
def get_settlement(db: Session, resignation_id: str) -> Optional[FinalSettlement]:
    return db.query(FinalSettlement).filter(
        FinalSettlement.resignation_id == resignation_id
    ).first()


def create_settlement(db: Session, resignation_id: str, employee_id: str) -> FinalSettlement:
    s = FinalSettlement(
        id=_uid(),
        resignation_id=resignation_id,
        employee_id=employee_id,
        status=SETTLE_DRAFT,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


def update_settlement(db: Session, s: FinalSettlement, data: dict) -> FinalSettlement:
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


# ── Exit Documents ────────────────────────────────────────────────────────────
def list_exit_documents(db: Session, resignation_id: str) -> list[ExitDocument]:
    return db.query(ExitDocument).filter(
        ExitDocument.resignation_id == resignation_id
    ).order_by(ExitDocument.created_at.desc()).all()


def create_exit_document(db: Session, resignation_id: str, employee_id: str,
                          doc_type: str, file_name: str, actor: str,
                          notes: str | None = None) -> ExitDocument:
    # Get next version
    existing = db.query(ExitDocument).filter(
        ExitDocument.resignation_id == resignation_id,
        ExitDocument.document_type == doc_type,
    ).count()
    d = ExitDocument(
        id=_uid(),
        resignation_id=resignation_id,
        employee_id=employee_id,
        document_type=doc_type,
        file_name=file_name,
        version=existing + 1,
        generated_at=datetime.utcnow(),
        generated_by=actor,
        notes=notes,
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


# ── Activities ────────────────────────────────────────────────────────────────
def log_activity(
    db: Session, *,
    resignation_id: str | None = None,
    employee_id: str | None = None,
    activity_type: str,
    title: str,
    description: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    performed_by: str | None = None,
) -> ExitActivity:
    a = ExitActivity(
        id=_uid(),
        resignation_id=resignation_id,
        employee_id=employee_id,
        activity_type=activity_type,
        title=title,
        description=description,
        old_value=old_value,
        new_value=new_value,
        performed_by=performed_by,
    )
    db.add(a)
    db.commit()
    return a


def list_activities(db: Session, resignation_id: str) -> list[ExitActivity]:
    return db.query(ExitActivity).filter(
        ExitActivity.resignation_id == resignation_id
    ).order_by(ExitActivity.created_at.desc()).all()


# ── Dashboard ─────────────────────────────────────────────────────────────────
def get_dashboard_counts(db: Session) -> dict:
    from backend.app.modules.exit_management.constants import (
        RES_SUBMITTED, RES_UNDER_REVIEW, RES_APPROVED, NP_SERVING,
        SETTLE_DRAFT, SETTLE_CALCULATED,
    )
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    pending_resignations = db.query(ResignationRequest).filter(
        ResignationRequest.status == RES_SUBMITTED,
        ResignationRequest.is_deleted == False,
    ).count()

    under_review = db.query(ResignationRequest).filter(
        ResignationRequest.status == RES_UNDER_REVIEW,
        ResignationRequest.is_deleted == False,
    ).count()

    serving_notice = db.query(NoticePeriod).filter(
        NoticePeriod.status == NP_SERVING,
    ).count()

    pending_clearances = db.query(ExitClearance).filter(
        ExitClearance.status.in_(["Pending", "In Progress"]),
    ).count()

    assets_pending = db.query(ExitAssetRecovery).filter(
        ExitAssetRecovery.return_date == None,
        ExitAssetRecovery.action == "Returned",
    ).count()

    settlements_pending = db.query(FinalSettlement).filter(
        FinalSettlement.status.in_([SETTLE_DRAFT, SETTLE_CALCULATED]),
    ).count()

    exited_this_month = db.query(ResignationRequest).filter(
        ResignationRequest.status.in_(["Approved"]),
        ResignationRequest.actual_last_working_day >= month_start.date(),
        ResignationRequest.is_deleted == False,
    ).count()

    recent = db.query(ResignationRequest).filter(
        ResignationRequest.is_deleted == False,
    ).order_by(ResignationRequest.created_at.desc()).limit(5).all()

    recent_list = []
    for r in recent:
        recent_list.append({
            "id": r.id,
            "resignation_number": r.resignation_number,
            "employee_id": r.employee_id,
            "separation_type": r.separation_type,
            "status": r.status,
            "resignation_date": r.resignation_date.isoformat() if r.resignation_date else None,
            "requested_last_working_day": r.requested_last_working_day.isoformat() if r.requested_last_working_day else None,
        })

    return {
        "pending_resignations": pending_resignations,
        "under_review": under_review,
        "serving_notice": serving_notice,
        "pending_clearances": pending_clearances,
        "assets_pending_return": assets_pending,
        "settlements_pending": settlements_pending,
        "exited_this_month": exited_this_month,
        "recent_resignations": recent_list,
    }
