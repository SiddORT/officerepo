"""Leave Management — service layer (business logic)."""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from . import constants as C
from . import repository as repo
from .models import (
    CompOff, Holiday, HolidayCalendar, LeaveApproval, LeaveBalance,
    LeaveEncashment, LeavePolicy, LeaveRequest, LeaveType, WeeklyOffRule,
)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Helpers ────────────────────────────────────────────────────────────────────

def _lt_dict(lt: LeaveType) -> Dict:
    return {
        "id": lt.id, "leave_code": lt.leave_code, "leave_name": lt.leave_name,
        "description": lt.description, "color_code": lt.color_code,
        "is_paid": lt.is_paid, "requires_approval": lt.requires_approval,
        "requires_documents": lt.requires_documents, "allow_half_day": lt.allow_half_day,
        "allow_negative_balance": lt.allow_negative_balance,
        "encashment_allowed": lt.encashment_allowed,
        "carry_forward_allowed": lt.carry_forward_allowed,
        "is_active": lt.is_active, "created_at": lt.created_at,
    }


def _balance_dict(b: LeaveBalance) -> Dict:
    return {
        "id": b.id, "employee_id": b.employee_id, "employee_name": b.employee_name,
        "employee_code": b.employee_code, "leave_type_id": b.leave_type_id,
        "leave_type_code": b.leave_type_code, "leave_type_name": b.leave_type_name,
        "year": b.year, "opening_balance": b.opening_balance, "earned": b.earned,
        "used": b.used, "encashed": b.encashed, "carried_forward": b.carried_forward,
        "lapsed": b.lapsed, "adjusted": b.adjusted,
        "available_balance": b.available_balance,
        "updated_at": b.updated_at,
    }


def _request_dict(r: LeaveRequest) -> Dict:
    return {
        "id": r.id, "request_number": r.request_number,
        "employee_id": r.employee_id, "employee_name": r.employee_name,
        "employee_code": r.employee_code, "department_id": r.department_id,
        "department_name": r.department_name, "branch_id": r.branch_id,
        "branch_name": r.branch_name, "leave_type_id": r.leave_type_id,
        "leave_type_code": r.leave_type_code, "leave_type_name": r.leave_type_name,
        "start_date": str(r.start_date), "end_date": str(r.end_date),
        "is_half_day": r.is_half_day, "half_day_option": r.half_day_option,
        "leave_days": r.leave_days, "reason": r.reason,
        "attachment_name": r.attachment_name, "status": r.status,
        "applied_at": r.applied_at, "approved_at": r.approved_at,
        "rejected_at": r.rejected_at, "cancelled_at": r.cancelled_at,
        "cancel_reason": r.cancel_reason, "current_approver_level": r.current_approver_level,
        "total_approval_levels": r.total_approval_levels,
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _compoff_dict(c: CompOff) -> Dict:
    return {
        "id": c.id, "employee_id": c.employee_id, "employee_name": c.employee_name,
        "employee_code": c.employee_code, "worked_date": str(c.worked_date),
        "source": c.source, "reason": c.reason,
        "days_earned": c.days_earned, "days_used": c.days_used,
        "available": round(c.days_earned - c.days_used, 2),
        "expiry_date": str(c.expiry_date) if c.expiry_date else None,
        "status": c.status, "approved_by": c.approved_by,
        "approved_at": c.approved_at, "created_at": c.created_at,
    }


def _holiday_dict(h: Holiday) -> Dict:
    return {
        "id": h.id, "calendar_id": h.calendar_id,
        "holiday_name": h.holiday_name, "holiday_date": str(h.holiday_date),
        "holiday_type": h.holiday_type, "description": h.description,
        "is_recurring": h.is_recurring,
    }


def _calendar_dict(c: HolidayCalendar) -> Dict:
    return {
        "id": c.id, "calendar_name": c.calendar_name, "country": c.country,
        "state": c.state, "description": c.description, "scope": c.scope,
        "scope_id": c.scope_id, "scope_name": c.scope_name, "year": c.year,
        "is_active": c.is_active, "created_at": c.created_at,
    }


# ── Leave day calculation ──────────────────────────────────────────────────────

def calculate_leave_days(
    start: date, end: date, is_half_day: bool,
    holiday_dates: List[date], weekly_off_days: List[int],
) -> float:
    """Count working days between start and end (inclusive), excluding
    holidays and weekly-off days."""
    if is_half_day:
        return 0.5
    total = 0.0
    current = start
    while current <= end:
        if current.weekday() not in weekly_off_days and current not in holiday_dates:
            total += 1.0
        current += timedelta(days=1)
    return total


def get_weekly_off_days(db: Session, client_id: str) -> List[int]:
    """Return a flat list of weekday numbers (0=Mon…6=Sun) from active rules."""
    rules = repo.list_weekly_off_rules(db, client_id)
    days: set = set()
    for rule in rules:
        if rule.off_days:
            for d in rule.off_days.split(","):
                try:
                    days.add(int(d.strip()))
                except ValueError:
                    pass
        else:
            for d in C.WEEKOFF_DAYS_MAP.get(rule.pattern, []):
                days.add(d)
    return list(days)


# ── Seed default leave types ───────────────────────────────────────────────────

def seed_default_leave_types(db: Session, client_id: str) -> None:
    for lt in C.DEFAULT_LEAVE_TYPES:
        existing = repo.get_leave_type_by_code(db, client_id, lt["code"])
        if not existing:
            repo.create_leave_type(db, client_id, {
                "leave_code": lt["code"], "leave_name": lt["name"],
                "is_paid": lt["paid"], "requires_approval": lt["requires_approval"],
                "allow_half_day": lt["allow_half_day"],
                "carry_forward_allowed": lt["carry_forward"],
                "encashment_allowed": lt["encashment"],
                "color_code": lt["color"], "is_active": True,
            })
    db.commit()


# ── Leave Types ────────────────────────────────────────────────────────────────

def create_leave_type(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    if repo.get_leave_type_by_code(db, client_id, data["leave_code"]):
        raise ValueError(f"Leave code '{data['leave_code']}' already exists")
    lt = repo.create_leave_type(db, client_id, {**data, "created_by": actor})
    repo.log_activity(db, client_id, "leave_type", lt.id, C.ACT_TYPE_CREATED, actor)
    db.commit()
    return _lt_dict(lt)


def list_leave_types(db: Session, client_id: str, active_only: bool = False) -> List[Dict]:
    return [_lt_dict(lt) for lt in repo.list_leave_types(db, client_id, active_only)]


def update_leave_type(
    db: Session, client_id: str, leave_type_id: str, data: Dict, actor: str
) -> Dict:
    lt = repo.get_leave_type(db, client_id, leave_type_id)
    if not lt:
        raise LookupError("Leave type not found")
    lt = repo.update_leave_type(db, lt, data)
    db.commit()
    return _lt_dict(lt)


def delete_leave_type(db: Session, client_id: str, leave_type_id: str, actor: str) -> None:
    lt = repo.get_leave_type(db, client_id, leave_type_id)
    if not lt:
        raise LookupError("Leave type not found")
    repo.delete_leave_type(db, lt)
    db.commit()


# ── Leave Policies ─────────────────────────────────────────────────────────────

def create_leave_policy(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    rules = data.pop("rules", [])
    policy = repo.create_leave_policy(db, client_id, {**data, "created_by": actor, "rules": []})
    if rules:
        repo.upsert_policy_rules(db, client_id, policy.id, [r.model_dump() if hasattr(r, "model_dump") else r for r in rules])
    repo.log_activity(db, client_id, "policy", policy.id, C.ACT_POLICY_CREATED, actor)
    db.commit()
    return _policy_dict(db, policy)


def list_leave_policies(db: Session, client_id: str) -> List[Dict]:
    policies = repo.list_leave_policies(db, client_id)
    return [_policy_dict(db, p) for p in policies]


def get_leave_policy(db: Session, client_id: str, policy_id: str) -> Dict:
    policy = repo.get_leave_policy(db, client_id, policy_id)
    if not policy:
        raise LookupError("Policy not found")
    return _policy_dict(db, policy)


def _policy_dict(db: Session, p: LeavePolicy) -> Dict:
    rules = repo.get_policy_rules(db, p.client_id, p.id)
    return {
        "id": p.id, "policy_name": p.policy_name, "description": p.description,
        "scope": p.scope, "scope_id": p.scope_id, "scope_name": p.scope_name,
        "employee_category": p.employee_category,
        "effective_from": str(p.effective_from) if p.effective_from else None,
        "effective_to": str(p.effective_to) if p.effective_to else None,
        "approval_levels": p.approval_levels, "is_active": p.is_active,
        "created_at": p.created_at,
        "rules": [_rule_dict(r) for r in rules],
    }


def _rule_dict(r) -> Dict:
    return {
        "id": r.id, "leave_type_id": r.leave_type_id,
        "allocation_type": r.allocation_type, "days_per_year": r.days_per_year,
        "accrual_frequency": r.accrual_frequency, "accrual_days": r.accrual_days,
        "max_balance": r.max_balance, "max_consecutive_days": r.max_consecutive_days,
        "min_notice_period_days": r.min_notice_period_days,
        "max_applications_per_month": r.max_applications_per_month,
        "carry_forward_max_days": r.carry_forward_max_days,
        "carry_forward_expiry_month": r.carry_forward_expiry_month,
        "carry_forward_expiry_day": r.carry_forward_expiry_day,
        "probation_restricted": r.probation_restricted, "is_active": r.is_active,
    }


def update_leave_policy(
    db: Session, client_id: str, policy_id: str, data: Dict, actor: str
) -> Dict:
    policy = repo.get_leave_policy(db, client_id, policy_id)
    if not policy:
        raise LookupError("Policy not found")
    rules_raw = data.pop("rules", None)
    rules = [r.model_dump() if hasattr(r, "model_dump") else r for r in rules_raw] if rules_raw else None
    data["rules"] = rules
    policy = repo.update_leave_policy(db, policy, data)
    repo.log_activity(db, client_id, "policy", policy.id, C.ACT_POLICY_UPDATED, actor)
    db.commit()
    return _policy_dict(db, policy)


def delete_leave_policy(db: Session, client_id: str, policy_id: str, actor: str) -> None:
    policy = repo.get_leave_policy(db, client_id, policy_id)
    if not policy:
        raise LookupError("Policy not found")
    repo.delete_leave_policy(db, policy)
    db.commit()


# ── Holiday Calendars ──────────────────────────────────────────────────────────

def create_calendar(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    cal = repo.create_calendar(db, client_id, {**data, "created_by": actor})
    repo.log_activity(db, client_id, "calendar", cal.id, C.ACT_HOLIDAY_ADDED, actor)
    db.commit()
    return _calendar_dict(cal)


def list_calendars(db: Session, client_id: str) -> List[Dict]:
    return [_calendar_dict(c) for c in repo.list_calendars(db, client_id)]


def update_calendar(db: Session, client_id: str, calendar_id: str, data: Dict, actor: str) -> Dict:
    cal = repo.get_calendar(db, client_id, calendar_id)
    if not cal:
        raise LookupError("Calendar not found")
    cal = repo.update_calendar(db, cal, data)
    db.commit()
    return _calendar_dict(cal)


def delete_calendar(db: Session, client_id: str, calendar_id: str, actor: str) -> None:
    cal = repo.get_calendar(db, client_id, calendar_id)
    if not cal:
        raise LookupError("Calendar not found")
    repo.delete_calendar(db, cal)
    db.commit()


def add_holiday(db: Session, client_id: str, calendar_id: str, data: Dict, actor: str) -> Dict:
    cal = repo.get_calendar(db, client_id, calendar_id)
    if not cal:
        raise LookupError("Calendar not found")
    h = repo.create_holiday(db, client_id, calendar_id, data)
    repo.log_activity(db, client_id, "holiday", h.id, C.ACT_HOLIDAY_ADDED, actor)
    db.commit()
    return _holiday_dict(h)


def list_holidays(db: Session, client_id: str, calendar_id: str, year: Optional[int] = None) -> List[Dict]:
    return [_holiday_dict(h) for h in repo.list_holidays(db, client_id, calendar_id, year)]


def delete_holiday(db: Session, client_id: str, holiday_id: str, actor: str) -> None:
    h = repo.get_holiday(db, client_id, holiday_id)
    if not h:
        raise LookupError("Holiday not found")
    repo.delete_holiday(db, h)
    db.commit()


# ── Weekly Off Rules ───────────────────────────────────────────────────────────

def create_weekly_off_rule(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    rule = repo.create_weekly_off_rule(db, client_id, {**data, "created_by": actor})
    db.commit()
    return _weeklyoff_dict(rule)


def list_weekly_off_rules(db: Session, client_id: str) -> List[Dict]:
    return [_weeklyoff_dict(r) for r in repo.list_weekly_off_rules(db, client_id)]


def update_weekly_off_rule(db: Session, client_id: str, rule_id: str, data: Dict, actor: str) -> Dict:
    rule = repo.get_weekly_off_rule(db, client_id, rule_id)
    if not rule:
        raise LookupError("Rule not found")
    rule = repo.update_weekly_off_rule(db, rule, data)
    db.commit()
    return _weeklyoff_dict(rule)


def _weeklyoff_dict(r: WeeklyOffRule) -> Dict:
    return {
        "id": r.id, "rule_name": r.rule_name, "pattern": r.pattern,
        "off_days": r.off_days, "scope": r.scope, "scope_id": r.scope_id,
        "scope_name": r.scope_name, "is_active": r.is_active, "created_at": r.created_at,
    }


# ── Leave Balances ─────────────────────────────────────────────────────────────

def get_employee_balances(db: Session, client_id: str, employee_id: str, year: int) -> List[Dict]:
    balances = repo.list_balances_for_employee(db, client_id, employee_id, year)
    return [_balance_dict(b) for b in balances]


def initialize_balance(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    lt = repo.get_leave_type(db, client_id, data["leave_type_id"])
    if not lt:
        raise LookupError("Leave type not found")
    bal = repo.get_or_create_balance(
        db, client_id, data["employee_id"], data["leave_type_id"], data["year"],
        emp_name=data.get("employee_name", ""), emp_code=data.get("employee_code", ""),
        lt_code=lt.leave_code, lt_name=lt.leave_name,
    )
    if "opening_balance" in data:
        bal.opening_balance = data["opening_balance"]
        from sqlalchemy.orm import Session as S
        bal.updated_at = datetime.utcnow()
    db.commit()
    return _balance_dict(bal)


def adjust_balance(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    lt = repo.get_leave_type(db, client_id, data["leave_type_id"])
    if not lt:
        raise LookupError("Leave type not found")
    bal = repo.get_or_create_balance(
        db, client_id, data["employee_id"], data["leave_type_id"], data["year"],
        lt_code=lt.leave_code, lt_name=lt.leave_name,
    )
    old_val = bal.available_balance
    repo.adjust_balance(db, bal, data["adjustment"])
    repo.log_activity(
        db, client_id, "balance", bal.id, C.ACT_BALANCE_ADJUSTED, actor,
        employee_id=data["employee_id"],
        old_value=str(old_val), new_value=str(bal.available_balance),
        notes=data.get("reason"),
    )
    db.commit()
    return _balance_dict(bal)


# ── Leave Application ──────────────────────────────────────────────────────────

def apply_leave(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    lt = repo.get_leave_type(db, client_id, data["leave_type_id"])
    if not lt:
        raise LookupError("Leave type not found")

    start: date = data["start_date"]
    end: date   = data["end_date"]
    is_half = bool(data.get("is_half_day", False))

    # Half-day only for single-day leaves
    if is_half and start != end:
        raise ValueError("Half-day leave is only allowed for a single day")
    if not lt.allow_half_day and is_half:
        raise ValueError(f"{lt.leave_name} does not support half-day leave")

    # Calculate leave days
    holidays = repo.get_holidays_in_range(
        db, client_id, start, end, data.get("calendar_id")
    )
    weekly_offs = get_weekly_off_days(db, client_id)
    leave_days = calculate_leave_days(start, end, is_half, holidays, weekly_offs)
    if leave_days <= 0:
        raise ValueError("No working days in the selected date range")

    # Check for overlapping approved leave
    if repo.has_overlapping_approved_leave(db, client_id, data["employee_id"], start, end):
        raise ValueError("Leave dates overlap with an existing approved leave")

    # Balance check (if not allow_negative_balance)
    year = start.year
    bal = repo.get_or_create_balance(
        db, client_id, data["employee_id"], lt.id, year,
        emp_name=data.get("employee_name", ""),
        emp_code=data.get("employee_code", ""),
        lt_code=lt.leave_code, lt_name=lt.leave_name,
    )
    if not lt.allow_negative_balance and bal.available_balance < leave_days:
        raise ValueError(
            f"Insufficient balance. Available: {bal.available_balance}, Required: {leave_days}"
        )

    # Generate request number
    ts = datetime.utcnow().strftime("%Y%m%d")
    req_number = f"LR-{ts}-{_uuid()[:6].upper()}"

    # Determine status
    initial_status = C.STATUS_PENDING if lt.requires_approval else C.STATUS_APPROVED

    req = repo.create_leave_request(db, client_id, {
        "employee_id": data["employee_id"],
        "employee_name": data.get("employee_name"),
        "employee_code": data.get("employee_code"),
        "department_id": data.get("department_id"),
        "department_name": data.get("department_name"),
        "branch_id": data.get("branch_id"),
        "branch_name": data.get("branch_name"),
        "leave_type_id": lt.id,
        "leave_type_code": lt.leave_code,
        "leave_type_name": lt.leave_name,
        "start_date": start,
        "end_date": end,
        "is_half_day": is_half,
        "half_day_option": data.get("half_day_option"),
        "leave_days": leave_days,
        "reason": data.get("reason"),
        "attachment_key": data.get("attachment_key"),
        "attachment_name": data.get("attachment_name"),
        "status": initial_status,
        "request_number": req_number,
        "applied_at": datetime.utcnow(),
        "created_by": actor,
        "current_approver_level": 1 if lt.requires_approval else None,
        "total_approval_levels": 1,
    })

    # Debit balance immediately if auto-approved
    if initial_status == C.STATUS_APPROVED:
        repo.debit_balance(db, bal, leave_days)
        req.approved_at = datetime.utcnow()

    repo.log_activity(
        db, client_id, "leave_request", req.id, C.ACT_LEAVE_APPLIED, actor,
        employee_id=data["employee_id"],
        new_value=json.dumps({"days": leave_days, "type": lt.leave_name}),
    )
    db.commit()
    return _request_dict(req)


# ── Leave Approval / Rejection ─────────────────────────────────────────────────

def review_leave(
    db: Session, client_id: str, request_id: str,
    action: str, comments: Optional[str], reviewer: str,
) -> Dict:
    req = repo.get_leave_request(db, client_id, request_id)
    if not req:
        raise LookupError("Leave request not found")
    if req.status not in (C.STATUS_PENDING, C.STATUS_DRAFT):
        raise ValueError(f"Cannot review a request in '{req.status}' status")

    lt = repo.get_leave_type(db, client_id, req.leave_type_id)
    now = datetime.utcnow()

    if action == "approve":
        year = req.start_date.year
        bal = repo.get_or_create_balance(
            db, client_id, req.employee_id, req.leave_type_id, year,
            lt_code=req.leave_type_code or "", lt_name=req.leave_type_name or "",
        )
        if lt and not lt.allow_negative_balance and bal.available_balance < req.leave_days:
            raise ValueError(
                f"Insufficient balance. Available: {bal.available_balance}, Required: {req.leave_days}"
            )
        repo.debit_balance(db, bal, req.leave_days)
        repo.update_leave_request(db, req, {
            "status": C.STATUS_APPROVED,
            "approved_at": now,
            "current_approver_level": None,
        })
        repo.log_activity(db, client_id, "leave_request", req.id, C.ACT_LEAVE_APPROVED,
                          reviewer, employee_id=req.employee_id, notes=comments)

    elif action == "reject":
        repo.update_leave_request(db, req, {
            "status": C.STATUS_REJECTED,
            "rejected_at": now,
            "cancel_reason": comments,
        })
        repo.log_activity(db, client_id, "leave_request", req.id, C.ACT_LEAVE_REJECTED,
                          reviewer, employee_id=req.employee_id, notes=comments)

    db.commit()
    return _request_dict(req)


def cancel_leave(
    db: Session, client_id: str, request_id: str, reason: Optional[str], actor: str
) -> Dict:
    req = repo.get_leave_request(db, client_id, request_id)
    if not req:
        raise LookupError("Leave request not found")
    if req.status == C.STATUS_CANCELLED:
        raise ValueError("Request is already cancelled")
    if req.status not in (C.STATUS_PENDING, C.STATUS_APPROVED, C.STATUS_DRAFT):
        raise ValueError(f"Cannot cancel a request in '{req.status}' status")

    was_approved = req.status == C.STATUS_APPROVED
    repo.update_leave_request(db, req, {
        "status": C.STATUS_CANCELLED,
        "cancelled_at": datetime.utcnow(),
        "cancel_reason": reason,
    })

    # Credit back if was approved
    if was_approved:
        year = req.start_date.year
        bal = repo.get_balance(db, client_id, req.employee_id, req.leave_type_id, year)
        if bal:
            repo.credit_balance(db, bal, req.leave_days)

    repo.log_activity(db, client_id, "leave_request", req.id, C.ACT_LEAVE_CANCELLED,
                      actor, employee_id=req.employee_id, notes=reason)
    db.commit()
    return _request_dict(req)


def list_leave_requests(db: Session, client_id: str, params: Dict) -> Dict:
    result = repo.list_leave_requests(db, client_id, **params)
    result["items"] = [_request_dict(r) for r in result["items"]]
    return result


def get_leave_request(db: Session, client_id: str, request_id: str) -> Dict:
    req = repo.get_leave_request(db, client_id, request_id)
    if not req:
        raise LookupError("Leave request not found")
    d = _request_dict(req)
    d["approvals"] = [
        {
            "id": a.id, "level": a.level, "approver_role": a.approver_role,
            "approver_name": a.approver_name, "status": a.status,
            "comments": a.comments, "acted_at": a.acted_at,
        }
        for a in repo.list_approvals_for_request(db, client_id, request_id)
    ]
    d["activities"] = [
        {
            "id": ac.id, "action": ac.action, "actor": ac.actor,
            "notes": ac.notes, "created_at": ac.created_at,
        }
        for ac in repo.get_activities(db, client_id, "leave_request", request_id)
    ]
    return d


# ── Comp Off ───────────────────────────────────────────────────────────────────

def request_comp_off(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    co = repo.create_comp_off(db, client_id, {**data, "created_by": actor})
    repo.log_activity(db, client_id, "comp_off", co.id, C.ACT_COMPOFF_CREDITED,
                      actor, employee_id=data["employee_id"])
    db.commit()
    return _compoff_dict(co)


def review_comp_off(
    db: Session, client_id: str, comp_off_id: str,
    status: str, rejection_reason: Optional[str], reviewer: str,
) -> Dict:
    co = repo.get_comp_off(db, client_id, comp_off_id)
    if not co:
        raise LookupError("Comp off not found")
    if co.status not in (C.COMPOFF_PENDING,):
        raise ValueError("Comp off is not in a reviewable state")
    now = datetime.utcnow()
    updates: Dict[str, Any] = {"status": status}
    if status == C.COMPOFF_APPROVED:
        updates["approved_by"] = reviewer
        updates["approved_at"] = now
    else:
        updates["rejection_reason"] = rejection_reason
    repo.update_comp_off(db, co, updates)
    db.commit()
    return _compoff_dict(co)


def list_comp_offs(db: Session, client_id: str, params: Dict) -> Dict:
    result = repo.list_comp_offs(db, client_id, **params)
    result["items"] = [_compoff_dict(c) for c in result["items"]]
    return result


# ── Leave Encashments ──────────────────────────────────────────────────────────

def request_encashment(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    lt = repo.get_leave_type(db, client_id, data["leave_type_id"])
    if lt and not lt.encashment_allowed:
        raise ValueError(f"{lt.leave_name} does not allow encashment")
    year = data["encashment_date"].year if isinstance(data["encashment_date"], date) else date.today().year
    bal = repo.get_balance(db, client_id, data["employee_id"], data["leave_type_id"], year)
    if bal and bal.available_balance < data["days_encashed"]:
        raise ValueError(f"Insufficient balance for encashment. Available: {bal.available_balance}")
    enc = repo.create_encashment(db, client_id, {
        **data,
        "leave_type_name": lt.leave_name if lt else None,
        "created_by": actor,
    })
    repo.log_activity(db, client_id, "encashment", enc.id, C.ACT_ENCASH_REQUESTED,
                      actor, employee_id=data["employee_id"])
    db.commit()
    return _enc_dict(enc)


def review_encashment(
    db: Session, client_id: str, enc_id: str, status: str, notes: Optional[str], reviewer: str
) -> Dict:
    enc = repo.get_encashment(db, client_id, enc_id)
    if not enc:
        raise LookupError("Encashment not found")
    updates: Dict[str, Any] = {"status": status, "notes": notes}
    if status == C.ENCASH_APPROVED:
        updates["processed_by"] = reviewer
        updates["processed_at"] = datetime.utcnow()
        # Debit balance
        year = enc.encashment_date.year if enc.encashment_date else date.today().year
        bal = repo.get_balance(db, client_id, enc.employee_id, enc.leave_type_id, year)
        if bal:
            bal.encashed = round(bal.encashed + enc.days_encashed, 2)
    repo.update_encashment(db, enc, updates)
    db.commit()
    return _enc_dict(enc)


def list_encashments(db: Session, client_id: str, params: Dict) -> Dict:
    result = repo.list_encashments(db, client_id, **params)
    result["items"] = [_enc_dict(e) for e in result["items"]]
    return result


def _enc_dict(e: LeaveEncashment) -> Dict:
    return {
        "id": e.id, "employee_id": e.employee_id, "employee_name": e.employee_name,
        "employee_code": e.employee_code, "leave_type_id": e.leave_type_id,
        "leave_type_name": e.leave_type_name,
        "encashment_date": str(e.encashment_date),
        "days_encashed": e.days_encashed, "amount": e.amount, "status": e.status,
        "processed_by": e.processed_by, "processed_at": e.processed_at,
        "notes": e.notes, "created_at": e.created_at,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict:
    on_leave_today = repo.count_on_leave_today(db, client_id)
    pending = repo.count_pending_approvals(db, client_id)
    comp_offs_expiring = repo.count_comp_offs_expiring_soon(db, client_id)
    on_leave_list = repo.get_employees_on_leave_today(db, client_id)
    upcoming_holidays = repo.get_upcoming_holidays(db, client_id)
    return {
        "on_leave_today": on_leave_today,
        "pending_approvals": pending,
        "comp_offs_expiring_soon": comp_offs_expiring,
        "on_leave_employees": [
            {
                "id": r.id, "employee_id": r.employee_id,
                "employee_name": r.employee_name,
                "leave_type_name": r.leave_type_name,
                "start_date": str(r.start_date), "end_date": str(r.end_date),
            }
            for r in on_leave_list
        ],
        "upcoming_holidays": [_holiday_dict(h) for h in upcoming_holidays],
    }


# ── Calendar ───────────────────────────────────────────────────────────────────

def get_calendar_events(
    db: Session, client_id: str, start: date, end: date,
    employee_id: Optional[str] = None, department_id: Optional[str] = None,
    calendar_id: Optional[str] = None,
) -> Dict:
    leaves = repo.get_leave_calendar_events(db, client_id, start, end, employee_id, department_id)
    holidays = repo.get_holidays_in_range(db, client_id, start, end, calendar_id)
    holiday_rows = repo.list_holidays(
        db, client_id, calendar_id
    ) if calendar_id else []
    holiday_details = []
    for h in holiday_rows:
        if start <= h.holiday_date <= end:
            holiday_details.append(_holiday_dict(h))

    return {
        "leaves": [
            {
                "id": r.id, "type": "leave",
                "employee_id": r.employee_id, "employee_name": r.employee_name,
                "leave_type_name": r.leave_type_name,
                "leave_type_code": r.leave_type_code,
                "start_date": str(r.start_date), "end_date": str(r.end_date),
                "is_half_day": r.is_half_day, "leave_days": r.leave_days,
            }
            for r in leaves
        ],
        "holidays": holiday_details,
    }


# ── Payroll summary ────────────────────────────────────────────────────────────

def get_payroll_summary(db: Session, client_id: str, employee_id: str, year: int, month: int) -> Dict:
    start = date(year, month, 1)
    import calendar as cal_mod
    last_day = cal_mod.monthrange(year, month)[1]
    end = date(year, month, last_day)
    requests = repo.get_leave_calendar_events(db, client_id, start, end, employee_id)
    paid_days = sum(r.leave_days for r in requests if _is_paid_leave(db, client_id, r.leave_type_id))
    unpaid_days = sum(r.leave_days for r in requests if not _is_paid_leave(db, client_id, r.leave_type_id))
    lop_days = sum(
        r.leave_days for r in requests
        if r.leave_type_code and r.leave_type_code.upper() == "LOP"
    )
    return {
        "employee_id": employee_id, "year": year, "month": month,
        "paid_leave_days": paid_days, "unpaid_leave_days": unpaid_days,
        "loss_of_pay_days": lop_days,
        "total_leave_days": paid_days + unpaid_days,
    }


def _is_paid_leave(db: Session, client_id: str, leave_type_id: str) -> bool:
    lt = repo.get_leave_type(db, client_id, leave_type_id)
    return lt.is_paid if lt else False
