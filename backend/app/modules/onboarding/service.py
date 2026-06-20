"""Service layer — Employee Onboarding."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.onboarding import repository as repo
from backend.app.modules.onboarding.constants import (
    OB_STATUS_PREBOARDING, OB_STATUS_IN_PROGRESS, OB_STATUS_READY,
    OB_STATUS_COMPLETED, OB_STATUS_CANCELLED, ACTIVE_OB_STATUSES,
    TASK_STATUS_COMPLETED, TASK_STATUS_SKIPPED,
    ACT_STARTED, ACT_TASK_UPDATED, ACT_ASSET_ASSIGNED,
    ACT_ACCOUNT_ADDED, ACT_TRAINING_ADDED, ACT_STATUS_CHANGED,
    ACT_ACTIVATED, ACT_CANCELLED,
    DEFAULT_TEMPLATE_TASKS,
)


# ── Dict helpers ──────────────────────────────────────────────────────────────

def _template_dict(t, tasks=None) -> Dict:
    d = {
        "id": t.id, "client_id": t.client_id,
        "template_name": t.template_name,
        "employee_category": t.employee_category,
        "description": t.description,
        "department_id": t.department_id, "department_name": t.department_name,
        "designation_id": t.designation_id, "designation_name": t.designation_name,
        "is_active": t.is_active, "is_default": t.is_default,
        "created_by": t.created_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }
    if tasks is not None:
        d["tasks"] = [_ttask_dict(tk) for tk in tasks]
    return d


def _ttask_dict(t) -> Dict:
    return {
        "id": t.id, "template_id": t.template_id,
        "task_name": t.task_name, "category": t.category,
        "owner_team": t.owner_team, "description": t.description,
        "due_offset_days": t.due_offset_days, "sequence": t.sequence,
        "is_mandatory": t.is_mandatory, "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _ob_dict(ob, tasks=None, accounts=None, training=None, activities=None) -> Dict:
    d = {
        "id": ob.id, "client_id": ob.client_id,
        "onboarding_number": ob.onboarding_number,
        "employee_id": ob.employee_id, "employee_name": ob.employee_name,
        "employee_code": ob.employee_code,
        "candidate_id": ob.candidate_id, "offer_id": ob.offer_id,
        "template_id": ob.template_id, "template_name": ob.template_name,
        "joining_date": ob.joining_date.isoformat() if ob.joining_date else None,
        "employee_category": ob.employee_category,
        "department_name": ob.department_name,
        "designation_name": ob.designation_name,
        "status": ob.status, "progress_percent": ob.progress_percent,
        "notes": ob.notes,
        "started_at":   ob.started_at.isoformat()   if ob.started_at   else None,
        "completed_at": ob.completed_at.isoformat() if ob.completed_at else None,
        "activated_at": ob.activated_at.isoformat() if ob.activated_at else None,
        "activated_by": ob.activated_by,
        "created_by": ob.created_by,
        "created_at": ob.created_at.isoformat() if ob.created_at else None,
        "updated_at": ob.updated_at.isoformat() if ob.updated_at else None,
    }
    if tasks is not None:
        d["tasks"] = [_task_dict(t) for t in tasks]
    if accounts is not None:
        d["accounts"] = [_acct_dict(a) for a in accounts]
    if training is not None:
        d["training"] = [_training_dict(tr) for tr in training]
    if activities is not None:
        d["activities"] = [_activity_dict(a) for a in activities]
    return d


def _task_dict(t) -> Dict:
    return {
        "id": t.id, "onboarding_id": t.onboarding_id,
        "template_task_id": t.template_task_id,
        "task_name": t.task_name, "category": t.category,
        "owner_team": t.owner_team, "description": t.description,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "sequence": t.sequence, "is_mandatory": t.is_mandatory,
        "status": t.status, "notes": t.notes,
        "completed_by": t.completed_by,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _acct_dict(a) -> Dict:
    return {
        "id": a.id, "onboarding_id": a.onboarding_id, "employee_id": a.employee_id,
        "account_type": a.account_type, "username": a.username,
        "notes": a.notes, "status": a.status,
        "created_date": a.created_date.isoformat() if a.created_date else None,
        "created_by": a.created_by,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _training_dict(t) -> Dict:
    return {
        "id": t.id, "onboarding_id": t.onboarding_id, "employee_id": t.employee_id,
        "course_name": t.course_name, "course_type": t.course_type,
        "provider": t.provider, "description": t.description,
        "is_mandatory": t.is_mandatory,
        "assigned_date":  t.assigned_date.isoformat()  if t.assigned_date  else None,
        "due_date":       t.due_date.isoformat()        if t.due_date       else None,
        "completed_date": t.completed_date.isoformat()  if t.completed_date else None,
        "status": t.status, "assigned_by": t.assigned_by,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _activity_dict(a) -> Dict:
    return {
        "id": a.id, "onboarding_id": a.onboarding_id, "employee_id": a.employee_id,
        "action": a.action, "actor": a.actor,
        "old_value": a.old_value, "new_value": a.new_value, "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ── Templates ─────────────────────────────────────────────────────────────────

def list_templates(db: Session, client_id: str, active_only: bool = False) -> List[Dict]:
    templates = repo.list_templates(db, client_id, active_only=active_only)
    result = []
    for t in templates:
        tasks = repo.list_template_tasks(db, t.id, client_id)
        result.append(_template_dict(t, tasks=tasks))
    return result


def create_template(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    data["client_id"] = client_id
    data["created_by"] = actor
    t = repo.create_template(db, data)
    # Seed default tasks if matching category
    cat = data.get("employee_category", "")
    defaults = DEFAULT_TEMPLATE_TASKS.get(cat, [])
    for td in defaults:
        repo.create_template_task(db, {**td, "client_id": client_id, "template_id": t.id})
    db.commit()
    tasks = repo.list_template_tasks(db, t.id, client_id)
    return _template_dict(t, tasks=tasks)


def get_template(db: Session, template_id: str, client_id: str) -> Dict:
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    tasks = repo.list_template_tasks(db, t.id, client_id)
    return _template_dict(t, tasks=tasks)


def update_template(db: Session, template_id: str, client_id: str, data: Dict) -> Dict:
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    repo.update_template(db, t, {k: v for k, v in data.items() if v is not None})
    db.commit()
    tasks = repo.list_template_tasks(db, t.id, client_id)
    return _template_dict(t, tasks=tasks)


def delete_template(db: Session, template_id: str, client_id: str):
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    repo.delete_template(db, t)
    db.commit()


def create_template_task(db: Session, template_id: str, client_id: str, data: Dict) -> Dict:
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    data["client_id"] = client_id
    data["template_id"] = template_id
    task = repo.create_template_task(db, data)
    db.commit()
    return _ttask_dict(task)


def update_template_task(db: Session, template_id: str, task_id: str, client_id: str, data: Dict) -> Dict:
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    task = repo.get_template_task(db, task_id, client_id)
    if not task or task.template_id != template_id:
        raise HTTPException(404, "Task not found.")
    repo.update_template_task(db, task, {k: v for k, v in data.items() if v is not None})
    db.commit()
    return _ttask_dict(task)


def delete_template_task(db: Session, template_id: str, task_id: str, client_id: str):
    t = repo.get_template(db, template_id, client_id)
    if not t:
        raise HTTPException(404, "Template not found.")
    repo.delete_template_task(db, task_id, client_id)
    db.commit()


# ── Onboarding ────────────────────────────────────────────────────────────────

def start_onboarding(db: Session, client_id: str, data: Dict, actor: str = "") -> Dict:
    employee_id = data["employee_id"]

    # Guard: no duplicate active onboarding
    existing = repo.get_active_onboarding_for_employee(db, employee_id, client_id)
    if existing:
        raise HTTPException(409, f"Employee already has an active onboarding record ({existing.onboarding_number}).")

    # Resolve employee info
    emp_name = emp_code = emp_cat = dept_name = desig_name = joining_date_val = None
    try:
        from backend.app.modules.employee_management.models import Employee
        emp = db.query(Employee).filter(Employee.id == employee_id, Employee.client_id == client_id).first()
        if emp:
            emp_name  = f"{emp.first_name} {emp.last_name}".strip()
            emp_code  = emp.employee_code
            emp_cat   = emp.employee_category
            joining_date_val = emp.joining_date
    except Exception:
        pass

    # Resolve offer info
    offer_id    = data.get("offer_id")
    candidate_id = data.get("candidate_id")
    if offer_id:
        try:
            from backend.app.modules.recruitment.models import Offer, Candidate
            offer = db.query(Offer).filter(Offer.id == offer_id, Offer.client_id == client_id).first()
            if offer:
                joining_date_val = joining_date_val or offer.joining_date
                dept_name  = offer.offered_department_name
                desig_name = offer.offered_designation_name
                candidate_id = candidate_id or offer.candidate_id
        except Exception:
            pass

    # Pick best template
    template_id   = data.get("template_id")
    template_name = None
    if not template_id:
        cat = data.get("employee_category") or emp_cat or ""
        templates = repo.list_templates(db, client_id, active_only=True)
        for t in templates:
            if t.is_default or (t.employee_category and t.employee_category == cat):
                template_id = t.id
                template_name = t.template_name
                break
    else:
        tmpl = repo.get_template(db, template_id, client_id)
        if tmpl:
            template_name = tmpl.template_name

    # Create onboarding record
    ob = repo.create_onboarding(db, {
        "client_id":         client_id,
        "onboarding_number": repo._next_number(db, client_id),
        "employee_id":       employee_id,
        "employee_name":     emp_name or data.get("employee_name", ""),
        "employee_code":     emp_code or "",
        "candidate_id":      candidate_id,
        "offer_id":          offer_id,
        "template_id":       template_id,
        "template_name":     template_name,
        "joining_date":      data.get("joining_date") or joining_date_val,
        "employee_category": data.get("employee_category") or emp_cat or "",
        "department_name":   dept_name or "",
        "designation_name":  desig_name or "",
        "status":            OB_STATUS_PREBOARDING,
        "progress_percent":  0,
        "notes":             data.get("notes"),
        "started_at":        datetime.utcnow(),
        "created_by":        actor,
    })

    # Copy template tasks → onboarding task instances
    if template_id:
        tmpl_tasks = repo.list_template_tasks(db, template_id, client_id)
        jd = ob.joining_date
        for tt in tmpl_tasks:
            dd = None
            if jd and isinstance(jd, date):
                from datetime import timedelta
                dd = jd + timedelta(days=tt.due_offset_days)
            repo.create_task(db, {
                "client_id":       client_id,
                "onboarding_id":   ob.id,
                "template_task_id": tt.id,
                "task_name":       tt.task_name,
                "category":        tt.category,
                "owner_team":      tt.owner_team,
                "description":     tt.description,
                "due_date":        dd,
                "sequence":        tt.sequence,
                "is_mandatory":    tt.is_mandatory,
                "status":          "Pending",
            })

    repo.log_activity(db, client_id, ob.id,
                      action=ACT_STARTED, actor=actor,
                      employee_id=employee_id,
                      new_value=ob.onboarding_number)
    db.commit()
    return _ob_dict(ob)


def get_onboarding_detail(db: Session, onboarding_id: str, client_id: str) -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding record not found.")
    tasks     = repo.list_tasks(db, ob.id, client_id)
    accounts  = repo.list_accounts(db, ob.id, client_id)
    training  = repo.list_training(db, ob.id, client_id)
    activities = repo.list_activities(db, ob.id, client_id)

    # Attach document + asset summaries
    result = _ob_dict(ob, tasks=tasks, accounts=accounts, training=training, activities=activities)
    result["doc_summary"]   = _document_summary(db, ob.employee_id, client_id)
    result["asset_summary"] = _asset_summary(db, ob.employee_id, client_id)
    return result


def list_onboarding(db: Session, client_id: str, **kwargs) -> Dict:
    r = repo.list_onboarding(db, client_id, **kwargs)
    r["items"] = [_ob_dict(ob) for ob in r["items"]]
    return r


def update_onboarding_status(db: Session, onboarding_id: str, client_id: str, new_status: str, actor: str = "", notes: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding record not found.")
    old = ob.status
    upd: Dict = {"status": new_status}
    if new_status == OB_STATUS_CANCELLED:
        upd["completed_at"] = datetime.utcnow()
        upd["completed_by"] = actor
    repo.update_onboarding(db, ob, upd)
    repo.log_activity(db, client_id, ob.id, action=ACT_STATUS_CHANGED, actor=actor,
                      employee_id=ob.employee_id, old_value=old, new_value=new_status, notes=notes)
    db.commit()
    return _ob_dict(ob)


# ── Activation readiness ──────────────────────────────────────────────────────

def get_readiness(db: Session, onboarding_id: str, client_id: str) -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding record not found.")

    blockers = []
    checks   = []

    # Mandatory tasks
    tasks = repo.list_tasks(db, ob.id, client_id)
    total_mand = [t for t in tasks if t.is_mandatory]
    done_mand  = [t for t in total_mand if t.status in (TASK_STATUS_COMPLETED, TASK_STATUS_SKIPPED)]
    task_ok    = len(done_mand) == len(total_mand)
    checks.append({"label": "Mandatory Tasks", "done": len(done_mand), "total": len(total_mand), "ok": task_ok})
    for t in total_mand:
        if t.status not in (TASK_STATUS_COMPLETED, TASK_STATUS_SKIPPED):
            blockers.append(f"Task pending: {t.task_name}")

    # Mandatory documents
    doc_s = _document_summary(db, ob.employee_id, client_id)
    doc_ok = doc_s.get("all_mandatory_verified", True)
    checks.append({"label": "Mandatory Documents", "done": doc_s.get("verified", 0), "total": doc_s.get("mandatory_total", 0), "ok": doc_ok})
    for nm in doc_s.get("pending_mandatory", []):
        blockers.append(f"Document pending: {nm}")

    # Assets
    asset_s = _asset_summary(db, ob.employee_id, client_id)
    checks.append({"label": "Assets Assigned", "done": asset_s.get("assigned", 0), "total": asset_s.get("assigned", 0), "ok": True})

    # Accounts
    accounts = repo.list_accounts(db, ob.id, client_id)
    pending_accts = [a for a in accounts if a.status == "Pending"]
    acct_ok = len(pending_accts) == 0
    checks.append({"label": "Accounts Provisioned", "done": len(accounts) - len(pending_accts), "total": len(accounts), "ok": acct_ok})

    # Training
    training_list = repo.list_training(db, ob.id, client_id)
    mand_tr = [t for t in training_list if t.is_mandatory]
    done_tr = [t for t in mand_tr if t.status == "Completed"]
    tr_ok   = (len(mand_tr) == 0) or (len(done_tr) == len(mand_tr))
    checks.append({"label": "Mandatory Training", "done": len(done_tr), "total": len(mand_tr), "ok": tr_ok})

    # Score
    ok_count = sum(1 for c in checks if c["ok"])
    score = int((ok_count / len(checks)) * 100) if checks else 0

    return {
        "onboarding_id": ob.id,
        "employee_name": ob.employee_name,
        "status": ob.status,
        "readiness_score": score,
        "can_activate": len(blockers) == 0,
        "blockers": blockers,
        "checks": checks,
    }


# ── Employee Activation ────────────────────────────────────────────────────────

def activate_employee(db: Session, onboarding_id: str, client_id: str, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding record not found.")

    if ob.status == OB_STATUS_COMPLETED:
        raise HTTPException(409, "Employee is already activated.")

    readiness = get_readiness(db, onboarding_id, client_id)
    if not readiness["can_activate"]:
        raise HTTPException(422, {
            "message": "Cannot activate — blockers must be resolved first.",
            "blockers": readiness["blockers"],
        })

    # Activate employee record
    try:
        from backend.app.modules.employee_management.models import Employee
        emp = db.query(Employee).filter(Employee.id == ob.employee_id, Employee.client_id == client_id).first()
        if emp:
            emp.employment_status = "Active"
            emp.is_active = True
    except Exception:
        pass

    now = datetime.utcnow()
    repo.update_onboarding(db, ob, {
        "status":       OB_STATUS_COMPLETED,
        "activated_at": now,
        "activated_by": actor,
        "completed_at": now,
        "completed_by": actor,
        "progress_percent": 100,
    })
    repo.log_activity(db, client_id, ob.id,
                      action=ACT_ACTIVATED, actor=actor, employee_id=ob.employee_id,
                      old_value=OB_STATUS_IN_PROGRESS, new_value=OB_STATUS_COMPLETED)
    db.commit()
    return _ob_dict(ob)


# ── Tasks ─────────────────────────────────────────────────────────────────────

def list_tasks(db: Session, onboarding_id: str, client_id: str) -> List[Dict]:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    return [_task_dict(t) for t in repo.list_tasks(db, onboarding_id, client_id)]


def add_task(db: Session, onboarding_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    data["client_id"]    = client_id
    data["onboarding_id"] = onboarding_id
    task = repo.create_task(db, data)
    _recalc_progress(db, ob, client_id, actor)
    db.commit()
    return _task_dict(task)


def update_task_status(db: Session, onboarding_id: str, task_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    task = repo.get_task(db, task_id, onboarding_id, client_id)
    if not task:
        raise HTTPException(404, "Task not found.")

    old_status = task.status
    upd = {"status": data["status"], "notes": data.get("notes")}
    if data["status"] == TASK_STATUS_COMPLETED:
        upd["completed_by"] = actor
        upd["completed_at"] = datetime.utcnow()
    repo.update_task(db, task, upd)
    repo.log_activity(db, client_id, onboarding_id, action=ACT_TASK_UPDATED, actor=actor,
                      employee_id=ob.employee_id,
                      old_value=old_status, new_value=data["status"],
                      notes=f"Task: {task.task_name}")
    _recalc_progress(db, ob, client_id, actor)
    db.commit()
    return _task_dict(task)


def _recalc_progress(db: Session, ob, client_id: str, actor: str = ""):
    """Recompute progress_percent and auto-advance status to Ready if all mandatory done."""
    pct = repo.compute_progress(db, ob.id, client_id)
    ob.progress_percent = pct
    # Auto-advance to Ready For Activation when all mandatory tasks done
    if ob.status == OB_STATUS_IN_PROGRESS:
        tasks = repo.list_tasks(db, ob.id, client_id)
        mandatory = [t for t in tasks if t.is_mandatory]
        all_done  = all(t.status in (TASK_STATUS_COMPLETED, TASK_STATUS_SKIPPED) for t in mandatory)
        if all_done and mandatory:
            ob.status = OB_STATUS_READY
            repo.log_activity(db, client_id, ob.id, action=ACT_STATUS_CHANGED, actor=actor,
                              employee_id=ob.employee_id,
                              old_value=OB_STATUS_IN_PROGRESS, new_value=OB_STATUS_READY)
    elif ob.status == OB_STATUS_PREBOARDING and pct > 0:
        ob.status = OB_STATUS_IN_PROGRESS
        repo.log_activity(db, client_id, ob.id, action=ACT_STATUS_CHANGED, actor=actor,
                          employee_id=ob.employee_id,
                          old_value=OB_STATUS_PREBOARDING, new_value=OB_STATUS_IN_PROGRESS)
    db.flush()


# ── Accounts ──────────────────────────────────────────────────────────────────

def list_accounts(db: Session, onboarding_id: str, client_id: str) -> List[Dict]:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    return [_acct_dict(a) for a in repo.list_accounts(db, onboarding_id, client_id)]


def create_account(db: Session, onboarding_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    data["client_id"]    = client_id
    data["onboarding_id"] = onboarding_id
    data["employee_id"]  = ob.employee_id
    data["created_by"]   = actor
    acct = repo.create_account(db, data)
    repo.log_activity(db, client_id, onboarding_id, action=ACT_ACCOUNT_ADDED, actor=actor,
                      employee_id=ob.employee_id, new_value=data.get("account_type"))
    db.commit()
    return _acct_dict(acct)


def update_account(db: Session, onboarding_id: str, account_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    acct = repo.get_account(db, account_id, onboarding_id, client_id)
    if not acct:
        raise HTTPException(404, "Account not found.")
    repo.update_account(db, acct, {k: v for k, v in data.items() if v is not None})
    db.commit()
    return _acct_dict(acct)


def delete_account(db: Session, onboarding_id: str, account_id: str, client_id: str):
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    acct = repo.get_account(db, account_id, onboarding_id, client_id)
    if not acct:
        raise HTTPException(404, "Account not found.")
    repo.delete_account(db, acct)
    db.commit()


# ── Training ──────────────────────────────────────────────────────────────────

def list_training(db: Session, onboarding_id: str, client_id: str) -> List[Dict]:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    return [_training_dict(t) for t in repo.list_training(db, onboarding_id, client_id)]


def create_training(db: Session, onboarding_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    data["client_id"]    = client_id
    data["onboarding_id"] = onboarding_id
    data["employee_id"]  = ob.employee_id
    data["assigned_by"]  = actor
    tr = repo.create_training(db, data)
    repo.log_activity(db, client_id, onboarding_id, action=ACT_TRAINING_ADDED, actor=actor,
                      employee_id=ob.employee_id, new_value=data.get("course_name"))
    db.commit()
    return _training_dict(tr)


def update_training(db: Session, onboarding_id: str, training_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    tr = repo.get_training(db, training_id, onboarding_id, client_id)
    if not tr:
        raise HTTPException(404, "Training assignment not found.")
    repo.update_training(db, tr, {k: v for k, v in data.items() if v is not None})
    db.commit()
    return _training_dict(tr)


def delete_training(db: Session, onboarding_id: str, training_id: str, client_id: str):
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    tr = repo.get_training(db, training_id, onboarding_id, client_id)
    if not tr:
        raise HTTPException(404, "Training assignment not found.")
    repo.delete_training(db, tr)
    db.commit()


# ── Asset proxy ───────────────────────────────────────────────────────────────

def assign_asset(db: Session, onboarding_id: str, client_id: str, data: Dict, actor: str = "") -> Dict:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")

    try:
        from backend.app.modules.asset_management import inventory_service as asset_svc
        from backend.app.modules.asset_management.inventory_schemas import AssetAssignSchema
        payload = AssetAssignSchema(
            employee_id=ob.employee_id,
            employee_name=ob.employee_name or "",
            employee_code=ob.employee_code or "",
            assigned_date=data.get("assigned_date"),
            expected_return_date=data.get("expected_return_date"),
            assignment_notes=data.get("assignment_notes") or f"Assigned during onboarding {ob.onboarding_number}",
        )
        result = asset_svc.assign_asset(db, client_id, data["asset_id"], payload, actor_name=actor)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Asset assignment failed: {e}")

    repo.log_activity(db, client_id, onboarding_id, action=ACT_ASSET_ASSIGNED, actor=actor,
                      employee_id=ob.employee_id, new_value=data.get("asset_id"))
    db.commit()
    return result


def get_assets(db: Session, onboarding_id: str, client_id: str) -> List[Dict]:
    ob = repo.get_onboarding(db, onboarding_id, client_id)
    if not ob:
        raise HTTPException(404, "Onboarding not found.")
    return _asset_summary(db, ob.employee_id, client_id).get("assignments", [])


# ── Dashboard ─────────────────────────────────────────────────────────────────

def dashboard(db: Session, client_id: str) -> Dict:
    counts = repo.dashboard_counts(db, client_id)
    recent = repo.recent_onboarding(db, client_id, limit=8)
    counts["recent"] = [_ob_dict(ob) for ob in recent]
    return counts


# ── Private helpers ───────────────────────────────────────────────────────────

def _document_summary(db: Session, employee_id: str, client_id: str) -> Dict:
    try:
        from backend.app.modules.employee_document_management.models import EmployeeDocument, EmpDocumentType
        docs  = db.query(EmployeeDocument).filter(
            EmployeeDocument.employee_id == employee_id,
            EmployeeDocument.client_id == client_id,
        ).all()
        types = db.query(EmpDocumentType).filter(
            EmpDocumentType.client_id == client_id,
            EmpDocumentType.mandatory_onboarding.is_(True),
            EmpDocumentType.is_active.is_(True),
        ).all()
        mand_names   = {t.name for t in types}
        uploaded_names = {d.document_type_name for d in docs}
        verified_names = {d.document_type_name for d in docs if d.verification_status == "Verified"}
        pending_mand   = [n for n in mand_names if n not in verified_names]
        return {
            "total": len(docs),
            "verified": len(verified_names),
            "mandatory_total": len(mand_names),
            "all_mandatory_verified": len(pending_mand) == 0,
            "pending_mandatory": pending_mand,
            "completion_percent": int((len(verified_names) / len(mand_names)) * 100) if mand_names else 100,
        }
    except Exception:
        return {"total": 0, "verified": 0, "mandatory_total": 0, "all_mandatory_verified": True, "pending_mandatory": [], "completion_percent": 100}


def _asset_summary(db: Session, employee_id: str, client_id: str) -> Dict:
    try:
        from backend.app.modules.asset_management.inventory_models import AssetAssignment
        from backend.app.modules.asset_management.inventory_models import Asset
        assignments = db.query(AssetAssignment).filter(
            AssetAssignment.employee_id == employee_id,
            AssetAssignment.status == "Active",
        ).all()
        result = []
        for aa in assignments:
            asset = db.query(Asset).filter(Asset.id == aa.asset_id).first()
            result.append({
                "assignment_id": aa.id,
                "asset_id": aa.asset_id,
                "asset_name": asset.asset_name if asset else "",
                "asset_code": asset.asset_code if asset else "",
                "category":   asset.category_name if asset else "",
                "assigned_date": aa.assigned_date.isoformat() if aa.assigned_date else None,
                "status": aa.status,
            })
        return {"assigned": len(assignments), "assignments": result}
    except Exception:
        return {"assigned": 0, "assignments": []}
