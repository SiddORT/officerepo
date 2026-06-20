"""Repository layer — Employee Onboarding."""
from __future__ import annotations

from datetime import datetime, date
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.onboarding.models import (
    OnboardingTemplate, OnboardingTemplateTask,
    EmployeeOnboarding, EmployeeOnboardingTask,
    EmployeeAccount, EmployeeTrainingAssignment, OnboardingActivity,
)


def _uuid():
    import uuid; return str(uuid.uuid4())


# ── Templates ──────────────────────────────────────────────────────────────────

def create_template(db: Session, data: Dict) -> OnboardingTemplate:
    obj = OnboardingTemplate(**data)
    db.add(obj); db.flush(); return obj


def get_template(db: Session, template_id: str, client_id: str) -> Optional[OnboardingTemplate]:
    return db.query(OnboardingTemplate).filter(
        OnboardingTemplate.id == template_id,
        OnboardingTemplate.client_id == client_id,
        OnboardingTemplate.is_deleted.is_(False),
    ).first()


def list_templates(db: Session, client_id: str, active_only: bool = False) -> List[OnboardingTemplate]:
    q = db.query(OnboardingTemplate).filter(
        OnboardingTemplate.client_id == client_id,
        OnboardingTemplate.is_deleted.is_(False),
    )
    if active_only:
        q = q.filter(OnboardingTemplate.is_active.is_(True))
    return q.order_by(OnboardingTemplate.template_name).all()


def update_template(db: Session, obj: OnboardingTemplate, data: Dict) -> OnboardingTemplate:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def delete_template(db: Session, obj: OnboardingTemplate):
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.flush()


# ── Template Tasks ─────────────────────────────────────────────────────────────

def create_template_task(db: Session, data: Dict) -> OnboardingTemplateTask:
    obj = OnboardingTemplateTask(**data)
    db.add(obj); db.flush(); return obj


def get_template_task(db: Session, task_id: str, client_id: str) -> Optional[OnboardingTemplateTask]:
    return db.query(OnboardingTemplateTask).filter(
        OnboardingTemplateTask.id == task_id,
        OnboardingTemplateTask.client_id == client_id,
    ).first()


def list_template_tasks(db: Session, template_id: str, client_id: str) -> List[OnboardingTemplateTask]:
    return db.query(OnboardingTemplateTask).filter(
        OnboardingTemplateTask.template_id == template_id,
        OnboardingTemplateTask.client_id == client_id,
        OnboardingTemplateTask.is_active.is_(True),
    ).order_by(OnboardingTemplateTask.sequence).all()


def update_template_task(db: Session, obj: OnboardingTemplateTask, data: Dict) -> OnboardingTemplateTask:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def delete_template_task(db: Session, task_id: str, client_id: str):
    obj = get_template_task(db, task_id, client_id)
    if obj:
        obj.is_active = False
        db.flush()


# ── Onboarding Records ─────────────────────────────────────────────────────────

def _next_number(db: Session, client_id: str) -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    prefix = f"OB-{today}-"
    cnt = db.query(func.count(EmployeeOnboarding.id)).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.onboarding_number.like(f"{prefix}%"),
    ).scalar() or 0
    return f"{prefix}{str(cnt + 1).zfill(4)}"


def create_onboarding(db: Session, data: Dict) -> EmployeeOnboarding:
    obj = EmployeeOnboarding(**data)
    db.add(obj); db.flush(); return obj


def get_onboarding(db: Session, onboarding_id: str, client_id: str) -> Optional[EmployeeOnboarding]:
    return db.query(EmployeeOnboarding).filter(
        EmployeeOnboarding.id == onboarding_id,
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
    ).first()


def get_active_onboarding_for_employee(db: Session, employee_id: str, client_id: str) -> Optional[EmployeeOnboarding]:
    from backend.app.modules.onboarding.constants import ACTIVE_OB_STATUSES
    return db.query(EmployeeOnboarding).filter(
        EmployeeOnboarding.employee_id == employee_id,
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.status.in_(ACTIVE_OB_STATUSES),
        EmployeeOnboarding.is_deleted.is_(False),
    ).first()


def list_onboarding(
    db: Session, client_id: str, *,
    page: int = 1, page_size: int = 20,
    search: str = "", status: str = "",
) -> Dict:
    q = db.query(EmployeeOnboarding).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
    )
    if search:
        like = f"%{search}%"
        q = q.filter(
            EmployeeOnboarding.employee_name.ilike(like) |
            EmployeeOnboarding.employee_code.ilike(like) |
            EmployeeOnboarding.onboarding_number.ilike(like)
        )
    if status:
        q = q.filter(EmployeeOnboarding.status == status)
    total = q.count()
    items = q.order_by(EmployeeOnboarding.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def update_onboarding(db: Session, obj: EmployeeOnboarding, data: Dict) -> EmployeeOnboarding:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def delete_onboarding(db: Session, obj: EmployeeOnboarding):
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    db.flush()


# ── Onboarding Tasks ───────────────────────────────────────────────────────────

def create_task(db: Session, data: Dict) -> EmployeeOnboardingTask:
    obj = EmployeeOnboardingTask(**data)
    db.add(obj); db.flush(); return obj


def get_task(db: Session, task_id: str, onboarding_id: str, client_id: str) -> Optional[EmployeeOnboardingTask]:
    return db.query(EmployeeOnboardingTask).filter(
        EmployeeOnboardingTask.id == task_id,
        EmployeeOnboardingTask.onboarding_id == onboarding_id,
        EmployeeOnboardingTask.client_id == client_id,
    ).first()


def list_tasks(db: Session, onboarding_id: str, client_id: str) -> List[EmployeeOnboardingTask]:
    return db.query(EmployeeOnboardingTask).filter(
        EmployeeOnboardingTask.onboarding_id == onboarding_id,
        EmployeeOnboardingTask.client_id == client_id,
    ).order_by(EmployeeOnboardingTask.sequence).all()


def update_task(db: Session, obj: EmployeeOnboardingTask, data: Dict) -> EmployeeOnboardingTask:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def compute_progress(db: Session, onboarding_id: str, client_id: str) -> int:
    """Recompute task completion % for the onboarding record."""
    tasks = list_tasks(db, onboarding_id, client_id)
    if not tasks:
        return 0
    done = sum(1 for t in tasks if t.status == "Completed" or t.status == "Skipped")
    return int((done / len(tasks)) * 100)


# ── Accounts ───────────────────────────────────────────────────────────────────

def create_account(db: Session, data: Dict) -> EmployeeAccount:
    obj = EmployeeAccount(**data)
    db.add(obj); db.flush(); return obj


def get_account(db: Session, account_id: str, onboarding_id: str, client_id: str) -> Optional[EmployeeAccount]:
    return db.query(EmployeeAccount).filter(
        EmployeeAccount.id == account_id,
        EmployeeAccount.onboarding_id == onboarding_id,
        EmployeeAccount.client_id == client_id,
    ).first()


def list_accounts(db: Session, onboarding_id: str, client_id: str) -> List[EmployeeAccount]:
    return db.query(EmployeeAccount).filter(
        EmployeeAccount.onboarding_id == onboarding_id,
        EmployeeAccount.client_id == client_id,
    ).order_by(EmployeeAccount.created_at).all()


def update_account(db: Session, obj: EmployeeAccount, data: Dict) -> EmployeeAccount:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def delete_account(db: Session, obj: EmployeeAccount):
    db.delete(obj); db.flush()


# ── Training ───────────────────────────────────────────────────────────────────

def create_training(db: Session, data: Dict) -> EmployeeTrainingAssignment:
    obj = EmployeeTrainingAssignment(**data)
    db.add(obj); db.flush(); return obj


def get_training(db: Session, training_id: str, onboarding_id: str, client_id: str) -> Optional[EmployeeTrainingAssignment]:
    return db.query(EmployeeTrainingAssignment).filter(
        EmployeeTrainingAssignment.id == training_id,
        EmployeeTrainingAssignment.onboarding_id == onboarding_id,
        EmployeeTrainingAssignment.client_id == client_id,
    ).first()


def list_training(db: Session, onboarding_id: str, client_id: str) -> List[EmployeeTrainingAssignment]:
    return db.query(EmployeeTrainingAssignment).filter(
        EmployeeTrainingAssignment.onboarding_id == onboarding_id,
        EmployeeTrainingAssignment.client_id == client_id,
    ).order_by(EmployeeTrainingAssignment.created_at).all()


def update_training(db: Session, obj: EmployeeTrainingAssignment, data: Dict) -> EmployeeTrainingAssignment:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush(); return obj


def delete_training(db: Session, obj: EmployeeTrainingAssignment):
    db.delete(obj); db.flush()


# ── Activities ─────────────────────────────────────────────────────────────────

def log_activity(
    db: Session, client_id: str, onboarding_id: str, *,
    action: str, actor: str = "",
    employee_id: str = None,
    old_value: str = None, new_value: str = None, notes: str = None,
) -> OnboardingActivity:
    obj = OnboardingActivity(
        client_id=client_id, onboarding_id=onboarding_id, employee_id=employee_id,
        action=action, actor=actor, old_value=old_value, new_value=new_value, notes=notes,
    )
    db.add(obj); db.flush(); return obj


def list_activities(db: Session, onboarding_id: str, client_id: str) -> List[OnboardingActivity]:
    return db.query(OnboardingActivity).filter(
        OnboardingActivity.onboarding_id == onboarding_id,
        OnboardingActivity.client_id == client_id,
    ).order_by(OnboardingActivity.created_at.desc()).all()


# ── Dashboard ──────────────────────────────────────────────────────────────────

def dashboard_counts(db: Session, client_id: str) -> Dict:
    from backend.app.modules.onboarding.constants import ACTIVE_OB_STATUSES, OB_STATUS_READY
    today = date.today()

    active = db.query(func.count(EmployeeOnboarding.id)).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
        EmployeeOnboarding.status.in_(ACTIVE_OB_STATUSES),
    ).scalar() or 0

    ready = db.query(func.count(EmployeeOnboarding.id)).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
        EmployeeOnboarding.status == OB_STATUS_READY,
    ).scalar() or 0

    overdue_tasks = db.query(func.count(EmployeeOnboardingTask.id)).join(
        EmployeeOnboarding, EmployeeOnboarding.id == EmployeeOnboardingTask.onboarding_id
    ).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
        EmployeeOnboarding.status.in_(ACTIVE_OB_STATUSES),
        EmployeeOnboardingTask.status == "Pending",
        EmployeeOnboardingTask.due_date < today,
    ).scalar() or 0

    pending_accounts = db.query(func.count(EmployeeAccount.id)).join(
        EmployeeOnboarding, EmployeeOnboarding.id == EmployeeAccount.onboarding_id
    ).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
        EmployeeOnboarding.status.in_(ACTIVE_OB_STATUSES),
        EmployeeAccount.status == "Pending",
    ).scalar() or 0

    return {
        "active_onboarding":   active,
        "ready_for_activation": ready,
        "overdue_tasks":        overdue_tasks,
        "pending_accounts":     pending_accounts,
    }


def recent_onboarding(db: Session, client_id: str, limit: int = 10) -> List[EmployeeOnboarding]:
    return db.query(EmployeeOnboarding).filter(
        EmployeeOnboarding.client_id == client_id,
        EmployeeOnboarding.is_deleted.is_(False),
    ).order_by(EmployeeOnboarding.created_at.desc()).limit(limit).all()
