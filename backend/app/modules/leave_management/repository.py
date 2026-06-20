"""Leave Management — repository layer (raw DB operations)."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_

from .models import (
    CompOff, Holiday, HolidayCalendar, LeaveActivity,
    LeaveApproval, LeaveBalance, LeaveEncashment, LeavePolicy,
    LeavePolicyRule, LeaveRequest, LeaveType, WeeklyOffRule,
)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Utilities ──────────────────────────────────────────────────────────────────

def log_activity(
    db: Session,
    client_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str = "system",
    employee_id: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    db.add(LeaveActivity(
        id=_uuid(), client_id=client_id, entity_type=entity_type,
        entity_id=entity_id, employee_id=employee_id,
        action=action, actor=actor,
        old_value=old_value, new_value=new_value, notes=notes,
    ))


def get_activities(db: Session, client_id: str, entity_type: str, entity_id: str) -> List[LeaveActivity]:
    return (
        db.query(LeaveActivity)
        .filter_by(client_id=client_id, entity_type=entity_type, entity_id=entity_id)
        .order_by(LeaveActivity.created_at.desc())
        .all()
    )


# ── Leave Types ────────────────────────────────────────────────────────────────

def create_leave_type(db: Session, client_id: str, data: Dict) -> LeaveType:
    lt = LeaveType(id=_uuid(), client_id=client_id, **data)
    db.add(lt)
    db.flush()
    return lt


def get_leave_type(db: Session, client_id: str, leave_type_id: str) -> Optional[LeaveType]:
    return db.query(LeaveType).filter_by(
        id=leave_type_id, client_id=client_id, is_deleted=False
    ).first()


def get_leave_type_by_code(db: Session, client_id: str, code: str) -> Optional[LeaveType]:
    return db.query(LeaveType).filter_by(
        client_id=client_id, leave_code=code, is_deleted=False
    ).first()


def list_leave_types(db: Session, client_id: str, active_only: bool = False) -> List[LeaveType]:
    q = db.query(LeaveType).filter_by(client_id=client_id, is_deleted=False)
    if active_only:
        q = q.filter_by(is_active=True)
    return q.order_by(LeaveType.leave_name).all()


def update_leave_type(db: Session, lt: LeaveType, data: Dict) -> LeaveType:
    for k, v in data.items():
        if v is not None or k in ("description",):
            setattr(lt, k, v)
    lt.updated_at = datetime.utcnow()
    db.flush()
    return lt


def delete_leave_type(db: Session, lt: LeaveType) -> None:
    lt.is_deleted = True
    lt.updated_at = datetime.utcnow()
    db.flush()


# ── Leave Policies ─────────────────────────────────────────────────────────────

def create_leave_policy(db: Session, client_id: str, data: Dict) -> LeavePolicy:
    rules = data.pop("rules", [])
    policy = LeavePolicy(id=_uuid(), client_id=client_id, **data)
    db.add(policy)
    db.flush()
    for r in rules:
        db.add(LeavePolicyRule(
            id=_uuid(), client_id=client_id, policy_id=policy.id, **r
        ))
    db.flush()
    return policy


def get_leave_policy(db: Session, client_id: str, policy_id: str) -> Optional[LeavePolicy]:
    return db.query(LeavePolicy).filter_by(
        id=policy_id, client_id=client_id, is_deleted=False
    ).first()


def list_leave_policies(db: Session, client_id: str) -> List[LeavePolicy]:
    return (
        db.query(LeavePolicy)
        .filter_by(client_id=client_id, is_deleted=False)
        .order_by(LeavePolicy.policy_name)
        .all()
    )


def get_policy_rules(db: Session, client_id: str, policy_id: str) -> List[LeavePolicyRule]:
    return (
        db.query(LeavePolicyRule)
        .filter_by(client_id=client_id, policy_id=policy_id, is_active=True)
        .all()
    )


def upsert_policy_rules(db: Session, client_id: str, policy_id: str, rules: List[Dict]) -> None:
    for r in rules:
        existing = db.query(LeavePolicyRule).filter_by(
            policy_id=policy_id, leave_type_id=r["leave_type_id"]
        ).first()
        if existing:
            for k, v in r.items():
                setattr(existing, k, v)
            existing.updated_at = datetime.utcnow()
        else:
            db.add(LeavePolicyRule(
                id=_uuid(), client_id=client_id, policy_id=policy_id, **r
            ))
    db.flush()


def update_leave_policy(db: Session, policy: LeavePolicy, data: Dict) -> LeavePolicy:
    rules = data.pop("rules", None)
    for k, v in data.items():
        if v is not None:
            setattr(policy, k, v)
    policy.updated_at = datetime.utcnow()
    db.flush()
    if rules is not None:
        upsert_policy_rules(db, policy.client_id, policy.id, rules)
    return policy


def delete_leave_policy(db: Session, policy: LeavePolicy) -> None:
    policy.is_deleted = True
    policy.updated_at = datetime.utcnow()
    db.flush()


# ── Holiday Calendars ──────────────────────────────────────────────────────────

def create_calendar(db: Session, client_id: str, data: Dict) -> HolidayCalendar:
    cal = HolidayCalendar(id=_uuid(), client_id=client_id, **data)
    db.add(cal)
    db.flush()
    return cal


def get_calendar(db: Session, client_id: str, calendar_id: str) -> Optional[HolidayCalendar]:
    return db.query(HolidayCalendar).filter_by(
        id=calendar_id, client_id=client_id, is_deleted=False
    ).first()


def list_calendars(db: Session, client_id: str) -> List[HolidayCalendar]:
    return (
        db.query(HolidayCalendar)
        .filter_by(client_id=client_id, is_deleted=False)
        .order_by(HolidayCalendar.calendar_name)
        .all()
    )


def update_calendar(db: Session, cal: HolidayCalendar, data: Dict) -> HolidayCalendar:
    for k, v in data.items():
        if v is not None:
            setattr(cal, k, v)
    cal.updated_at = datetime.utcnow()
    db.flush()
    return cal


def delete_calendar(db: Session, cal: HolidayCalendar) -> None:
    cal.is_deleted = True
    cal.updated_at = datetime.utcnow()
    db.flush()


def create_holiday(db: Session, client_id: str, calendar_id: str, data: Dict) -> Holiday:
    h = Holiday(id=_uuid(), client_id=client_id, calendar_id=calendar_id, **data)
    db.add(h)
    db.flush()
    return h


def get_holiday(db: Session, client_id: str, holiday_id: str) -> Optional[Holiday]:
    return db.query(Holiday).filter_by(id=holiday_id, client_id=client_id).first()


def list_holidays(
    db: Session, client_id: str, calendar_id: str,
    year: Optional[int] = None,
) -> List[Holiday]:
    q = db.query(Holiday).filter_by(client_id=client_id, calendar_id=calendar_id)
    if year:
        q = q.filter(func.extract("year", Holiday.holiday_date) == year)
    return q.order_by(Holiday.holiday_date).all()


def get_holidays_in_range(
    db: Session, client_id: str, start: date, end: date, calendar_id: Optional[str] = None
) -> List[date]:
    q = db.query(Holiday.holiday_date).filter(
        Holiday.client_id == client_id,
        Holiday.holiday_date >= start,
        Holiday.holiday_date <= end,
    )
    if calendar_id:
        q = q.filter(Holiday.calendar_id == calendar_id)
    return [r[0] for r in q.all()]


def delete_holiday(db: Session, holiday: Holiday) -> None:
    db.delete(holiday)
    db.flush()


# ── Weekly Off Rules ───────────────────────────────────────────────────────────

def create_weekly_off_rule(db: Session, client_id: str, data: Dict) -> WeeklyOffRule:
    r = WeeklyOffRule(id=_uuid(), client_id=client_id, **data)
    db.add(r)
    db.flush()
    return r


def get_weekly_off_rule(db: Session, client_id: str, rule_id: str) -> Optional[WeeklyOffRule]:
    return db.query(WeeklyOffRule).filter_by(
        id=rule_id, client_id=client_id, is_active=True
    ).first()


def list_weekly_off_rules(db: Session, client_id: str) -> List[WeeklyOffRule]:
    return (
        db.query(WeeklyOffRule)
        .filter_by(client_id=client_id, is_active=True)
        .order_by(WeeklyOffRule.rule_name)
        .all()
    )


def update_weekly_off_rule(db: Session, rule: WeeklyOffRule, data: Dict) -> WeeklyOffRule:
    for k, v in data.items():
        if v is not None:
            setattr(rule, k, v)
    rule.updated_at = datetime.utcnow()
    db.flush()
    return rule


# ── Leave Balances ─────────────────────────────────────────────────────────────

def get_balance(
    db: Session, client_id: str, employee_id: str, leave_type_id: str, year: int
) -> Optional[LeaveBalance]:
    return db.query(LeaveBalance).filter_by(
        client_id=client_id, employee_id=employee_id,
        leave_type_id=leave_type_id, year=year,
    ).first()


def get_or_create_balance(
    db: Session, client_id: str, employee_id: str, leave_type_id: str,
    year: int, emp_name: str = "", emp_code: str = "",
    lt_code: str = "", lt_name: str = "",
) -> LeaveBalance:
    bal = get_balance(db, client_id, employee_id, leave_type_id, year)
    if not bal:
        bal = LeaveBalance(
            id=_uuid(), client_id=client_id,
            employee_id=employee_id, employee_name=emp_name,
            employee_code=emp_code, leave_type_id=leave_type_id,
            leave_type_code=lt_code, leave_type_name=lt_name, year=year,
        )
        db.add(bal)
        db.flush()
    return bal


def list_balances_for_employee(
    db: Session, client_id: str, employee_id: str, year: int
) -> List[LeaveBalance]:
    return (
        db.query(LeaveBalance)
        .filter_by(client_id=client_id, employee_id=employee_id, year=year)
        .all()
    )


def list_balances_for_type(
    db: Session, client_id: str, leave_type_id: str, year: int
) -> List[LeaveBalance]:
    return (
        db.query(LeaveBalance)
        .filter_by(client_id=client_id, leave_type_id=leave_type_id, year=year)
        .all()
    )


def adjust_balance(db: Session, bal: LeaveBalance, delta: float) -> LeaveBalance:
    bal.adjusted = round(bal.adjusted + delta, 2)
    bal.updated_at = datetime.utcnow()
    db.flush()
    return bal


def debit_balance(db: Session, bal: LeaveBalance, days: float) -> LeaveBalance:
    bal.used = round(bal.used + days, 2)
    bal.updated_at = datetime.utcnow()
    db.flush()
    return bal


def credit_balance(db: Session, bal: LeaveBalance, days: float) -> LeaveBalance:
    bal.used = round(max(0, bal.used - days), 2)
    bal.updated_at = datetime.utcnow()
    db.flush()
    return bal


# ── Leave Requests ─────────────────────────────────────────────────────────────

def create_leave_request(db: Session, client_id: str, data: Dict) -> LeaveRequest:
    req = LeaveRequest(id=_uuid(), client_id=client_id, **data)
    db.add(req)
    db.flush()
    return req


def get_leave_request(db: Session, client_id: str, request_id: str) -> Optional[LeaveRequest]:
    return db.query(LeaveRequest).filter_by(
        id=request_id, client_id=client_id, is_deleted=False
    ).first()


def list_leave_requests(
    db: Session, client_id: str,
    employee_id: Optional[str] = None,
    department_id: Optional[str] = None,
    status: Optional[str] = None,
    leave_type_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    page: int = 1, page_size: int = 20,
) -> Dict:
    q = db.query(LeaveRequest).filter_by(client_id=client_id, is_deleted=False)
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if department_id:
        q = q.filter(LeaveRequest.department_id == department_id)
    if status:
        q = q.filter(LeaveRequest.status == status)
    if leave_type_id:
        q = q.filter(LeaveRequest.leave_type_id == leave_type_id)
    if start_date:
        q = q.filter(LeaveRequest.end_date >= start_date)
    if end_date:
        q = q.filter(LeaveRequest.start_date <= end_date)
    total = q.count()
    items = q.order_by(LeaveRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items, "page": page, "page_size": page_size}


def update_leave_request(db: Session, req: LeaveRequest, data: Dict) -> LeaveRequest:
    for k, v in data.items():
        setattr(req, k, v)
    req.updated_at = datetime.utcnow()
    db.flush()
    return req


def has_overlapping_approved_leave(
    db: Session, client_id: str, employee_id: str,
    start: date, end: date, exclude_id: Optional[str] = None,
) -> bool:
    q = db.query(LeaveRequest).filter(
        LeaveRequest.client_id == client_id,
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.status == "Approved",
        LeaveRequest.is_deleted == False,
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
    )
    if exclude_id:
        q = q.filter(LeaveRequest.id != exclude_id)
    return q.count() > 0


def get_approved_leaves_on_date(
    db: Session, client_id: str, target_date: date,
    department_id: Optional[str] = None,
) -> List[LeaveRequest]:
    q = db.query(LeaveRequest).filter(
        LeaveRequest.client_id == client_id,
        LeaveRequest.status == "Approved",
        LeaveRequest.is_deleted == False,
        LeaveRequest.start_date <= target_date,
        LeaveRequest.end_date >= target_date,
    )
    if department_id:
        q = q.filter(LeaveRequest.department_id == department_id)
    return q.all()


# ── Leave Approvals ────────────────────────────────────────────────────────────

def create_approval_step(
    db: Session, client_id: str, request_id: str, level: int, approver_role: str
) -> LeaveApproval:
    a = LeaveApproval(
        id=_uuid(), client_id=client_id, request_id=request_id,
        level=level, approver_role=approver_role, status="Pending",
    )
    db.add(a)
    db.flush()
    return a


def get_pending_approval(
    db: Session, client_id: str, request_id: str, level: int
) -> Optional[LeaveApproval]:
    return db.query(LeaveApproval).filter_by(
        client_id=client_id, request_id=request_id, level=level, status="Pending"
    ).first()


def list_approvals_for_request(
    db: Session, client_id: str, request_id: str
) -> List[LeaveApproval]:
    return (
        db.query(LeaveApproval)
        .filter_by(client_id=client_id, request_id=request_id)
        .order_by(LeaveApproval.level)
        .all()
    )


def update_approval(db: Session, approval: LeaveApproval, data: Dict) -> LeaveApproval:
    for k, v in data.items():
        setattr(approval, k, v)
    db.flush()
    return approval


# ── Comp Offs ──────────────────────────────────────────────────────────────────

def create_comp_off(db: Session, client_id: str, data: Dict) -> CompOff:
    co = CompOff(id=_uuid(), client_id=client_id, **data)
    db.add(co)
    db.flush()
    return co


def get_comp_off(db: Session, client_id: str, comp_off_id: str) -> Optional[CompOff]:
    return db.query(CompOff).filter_by(
        id=comp_off_id, client_id=client_id, is_deleted=False
    ).first()


def list_comp_offs(
    db: Session, client_id: str,
    employee_id: Optional[str] = None, status: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Dict:
    q = db.query(CompOff).filter_by(client_id=client_id, is_deleted=False)
    if employee_id:
        q = q.filter(CompOff.employee_id == employee_id)
    if status:
        q = q.filter(CompOff.status == status)
    total = q.count()
    items = q.order_by(CompOff.worked_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items, "page": page, "page_size": page_size}


def update_comp_off(db: Session, co: CompOff, data: Dict) -> CompOff:
    for k, v in data.items():
        setattr(co, k, v)
    co.updated_at = datetime.utcnow()
    db.flush()
    return co


def get_available_comp_off_days(db: Session, client_id: str, employee_id: str) -> float:
    rows = db.query(CompOff).filter(
        CompOff.client_id == client_id,
        CompOff.employee_id == employee_id,
        CompOff.status == "Approved",
        CompOff.is_deleted == False,
        or_(CompOff.expiry_date == None, CompOff.expiry_date >= date.today()),
    ).all()
    return sum(r.days_earned - r.days_used for r in rows)


# ── Leave Encashments ──────────────────────────────────────────────────────────

def create_encashment(db: Session, client_id: str, data: Dict) -> LeaveEncashment:
    enc = LeaveEncashment(id=_uuid(), client_id=client_id, **data)
    db.add(enc)
    db.flush()
    return enc


def get_encashment(db: Session, client_id: str, enc_id: str) -> Optional[LeaveEncashment]:
    return db.query(LeaveEncashment).filter_by(
        id=enc_id, client_id=client_id, is_deleted=False
    ).first()


def list_encashments(
    db: Session, client_id: str,
    employee_id: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Dict:
    q = db.query(LeaveEncashment).filter_by(client_id=client_id, is_deleted=False)
    if employee_id:
        q = q.filter(LeaveEncashment.employee_id == employee_id)
    total = q.count()
    items = q.order_by(LeaveEncashment.encashment_date.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items, "page": page, "page_size": page_size}


def update_encashment(db: Session, enc: LeaveEncashment, data: Dict) -> LeaveEncashment:
    for k, v in data.items():
        setattr(enc, k, v)
    enc.updated_at = datetime.utcnow()
    db.flush()
    return enc


# ── Dashboard counts ───────────────────────────────────────────────────────────

def count_on_leave_today(db: Session, client_id: str) -> int:
    today = date.today()
    return db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.client_id == client_id,
        LeaveRequest.status == "Approved",
        LeaveRequest.is_deleted == False,
        LeaveRequest.start_date <= today,
        LeaveRequest.end_date >= today,
    ).scalar() or 0


def count_pending_approvals(db: Session, client_id: str) -> int:
    return db.query(func.count(LeaveRequest.id)).filter(
        LeaveRequest.client_id == client_id,
        LeaveRequest.status == "Pending Approval",
        LeaveRequest.is_deleted == False,
    ).scalar() or 0


def count_comp_offs_expiring_soon(db: Session, client_id: str, days: int = 30) -> int:
    from datetime import timedelta
    cutoff = date.today() + timedelta(days=days)
    return db.query(func.count(CompOff.id)).filter(
        CompOff.client_id == client_id,
        CompOff.status == "Approved",
        CompOff.is_deleted == False,
        CompOff.expiry_date != None,
        CompOff.expiry_date <= cutoff,
        CompOff.expiry_date >= date.today(),
    ).scalar() or 0


def get_employees_on_leave_today(db: Session, client_id: str, limit: int = 10) -> List[LeaveRequest]:
    today = date.today()
    return (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.client_id == client_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.is_deleted == False,
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
        )
        .limit(limit)
        .all()
    )


def get_upcoming_holidays(db: Session, client_id: str, days: int = 30) -> List[Holiday]:
    from datetime import timedelta
    today = date.today()
    cutoff = today + timedelta(days=days)
    return (
        db.query(Holiday)
        .filter(
            Holiday.client_id == client_id,
            Holiday.holiday_date >= today,
            Holiday.holiday_date <= cutoff,
        )
        .order_by(Holiday.holiday_date)
        .limit(5)
        .all()
    )


def get_leave_calendar_events(
    db: Session, client_id: str, start: date, end: date,
    employee_id: Optional[str] = None,
    department_id: Optional[str] = None,
) -> List[LeaveRequest]:
    q = db.query(LeaveRequest).filter(
        LeaveRequest.client_id == client_id,
        LeaveRequest.status == "Approved",
        LeaveRequest.is_deleted == False,
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start,
    )
    if employee_id:
        q = q.filter(LeaveRequest.employee_id == employee_id)
    if department_id:
        q = q.filter(LeaveRequest.department_id == department_id)
    return q.order_by(LeaveRequest.start_date).all()
