"""Employee Loan Management — service layer (business logic)."""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from . import constants as C
from . import repository as repo
from .models import (
    LoanActivity, LoanApplication, LoanClosure,
    LoanDisbursement, LoanRepaymentSchedule, LoanType,
)


def _uuid() -> str:
    return str(uuid.uuid4())


def _app_number() -> str:
    ts = datetime.utcnow().strftime("%Y%m%d")
    short = str(uuid.uuid4()).replace("-", "").upper()[:8]
    return f"LOAN-{ts}-{short}"


# ── Serializers ──────────────────────────────────────────────────────────────────

def _type_dict(t: LoanType) -> Dict:
    return {
        "id": t.id, "loan_type_code": t.loan_type_code,
        "loan_type_name": t.loan_type_name, "description": t.description,
        "interest_applicable": t.interest_applicable,
        "is_system": t.is_system, "is_active": t.is_active,
        "created_at": t.created_at, "updated_at": t.updated_at,
    }


def _policy_dict(p) -> Dict:
    return {
        "id": p.id, "policy_name": p.policy_name,
        "loan_type_id": p.loan_type_id, "loan_type_name": p.loan_type_name,
        "company_id": p.company_id, "company_name": p.company_name,
        "branch_id": p.branch_id, "branch_name": p.branch_name,
        "department_id": p.department_id, "department_name": p.department_name,
        "employee_category": p.employee_category,
        "designation_id": p.designation_id, "designation_name": p.designation_name,
        "min_service_months": p.min_service_months,
        "max_active_loans": p.max_active_loans,
        "min_amount": p.min_amount, "max_amount": p.max_amount,
        "max_tenure_months": p.max_tenure_months,
        "interest_type": p.interest_type, "interest_rate": p.interest_rate,
        "processing_fee": p.processing_fee, "repayment_method": p.repayment_method,
        "require_guarantor": p.require_guarantor, "require_documents": p.require_documents,
        "effective_from": str(p.effective_from) if p.effective_from else None,
        "effective_to": str(p.effective_to) if p.effective_to else None,
        "is_active": p.is_active,
        "created_at": p.created_at, "updated_at": p.updated_at,
    }


def _app_dict(a: LoanApplication) -> Dict:
    return {
        "id": a.id, "application_number": a.application_number,
        "employee_id": a.employee_id, "employee_name": a.employee_name,
        "employee_code": a.employee_code, "department_name": a.department_name,
        "designation_name": a.designation_name,
        "loan_type_id": a.loan_type_id, "loan_type_name": a.loan_type_name,
        "loan_policy_id": a.loan_policy_id,
        "requested_amount": a.requested_amount, "requested_tenure": a.requested_tenure,
        "purpose": a.purpose, "emi_start_date": str(a.emi_start_date) if a.emi_start_date else None,
        "approved_amount": a.approved_amount, "approved_tenure": a.approved_tenure,
        "interest_type": a.interest_type, "interest_rate": a.interest_rate,
        "processing_fee": a.processing_fee, "repayment_method": a.repayment_method,
        "emi_amount": a.emi_amount,
        "principal_outstanding": a.principal_outstanding,
        "total_interest": a.total_interest, "total_paid": a.total_paid,
        "status": a.status,
        "rejection_reason": a.rejection_reason,
        "closure_type": a.closure_type,
        "notes": a.notes,
        "submitted_at": a.submitted_at, "approved_at": a.approved_at,
        "disbursed_at": a.disbursed_at, "closed_at": a.closed_at,
        "created_at": a.created_at, "updated_at": a.updated_at,
    }


def _schedule_dict(s: LoanRepaymentSchedule) -> Dict:
    return {
        "id": s.id, "application_id": s.application_id,
        "installment_number": s.installment_number,
        "due_date": str(s.due_date) if s.due_date else None,
        "principal_amount": s.principal_amount,
        "interest_amount": s.interest_amount,
        "emi_amount": s.emi_amount,
        "outstanding_balance": s.outstanding_balance,
        "status": s.status,
        "paid_amount": s.paid_amount,
        "paid_date": str(s.paid_date) if s.paid_date else None,
        "waiver_reason": s.waiver_reason,
        "deduction_ref": s.deduction_ref,
    }


def _disbursement_dict(d: LoanDisbursement) -> Dict:
    return {
        "id": d.id, "application_id": d.application_id,
        "disbursed_amount": d.disbursed_amount,
        "disbursement_date": str(d.disbursement_date) if d.disbursement_date else None,
        "payment_method": d.payment_method,
        "transaction_reference": d.transaction_reference,
        "bank_account": d.bank_account,
        "remarks": d.remarks, "disbursed_by": d.disbursed_by,
        "created_at": d.created_at,
    }


def _closure_dict(c: LoanClosure) -> Dict:
    return {
        "id": c.id, "application_id": c.application_id,
        "closure_type": c.closure_type,
        "closure_date": str(c.closure_date) if c.closure_date else None,
        "outstanding_at_closure": c.outstanding_at_closure,
        "amount_recovered": c.amount_recovered,
        "waived_amount": c.waived_amount,
        "closure_notes": c.closure_notes, "closed_by": c.closed_by,
        "created_at": c.created_at,
    }


def _activity_dict(a: LoanActivity) -> Dict:
    return {
        "id": a.id, "entity_type": a.entity_type, "entity_id": a.entity_id,
        "action": a.action, "actor": a.actor,
        "old_value": a.old_value, "new_value": a.new_value,
        "notes": a.notes, "created_at": a.created_at,
    }


# ── EMI Calculation ──────────────────────────────────────────────────────────────

def calculate_emi(principal: float, annual_rate: float, months: int, interest_type: str) -> float:
    """Compute monthly EMI amount."""
    if interest_type == C.INTEREST_FREE or not annual_rate or annual_rate == 0:
        return round(principal / months, 2)
    monthly_rate = annual_rate / 100 / 12
    if interest_type == C.INTEREST_FLAT:
        total_interest = principal * (annual_rate / 100) * (months / 12)
        return round((principal + total_interest) / months, 2)
    # Reducing Balance (standard EMI formula)
    emi = principal * monthly_rate * (1 + monthly_rate) ** months / ((1 + monthly_rate) ** months - 1)
    return round(emi, 2)


def _generate_schedule_rows(
    application_id: str,
    client_id: str,
    principal: float,
    annual_rate: float,
    months: int,
    interest_type: str,
    repayment_method: str,
    emi_start: date,
) -> List[LoanRepaymentSchedule]:
    rows = []
    balance = principal
    monthly_rate = (annual_rate or 0) / 100 / 12

    if repayment_method == C.REPAY_BULLET:
        total_interest = principal * monthly_rate * months if monthly_rate else 0
        row = LoanRepaymentSchedule(
            id=_uuid(),
            client_id=client_id,
            application_id=application_id,
            installment_number=1,
            due_date=_add_months(emi_start, months),
            principal_amount=round(principal, 2),
            interest_amount=round(total_interest, 2),
            emi_amount=round(principal + total_interest, 2),
            outstanding_balance=0.0,
            status=C.INST_PENDING,
        )
        rows.append(row)
        return rows

    emi = calculate_emi(principal, annual_rate or 0, months, interest_type)

    for i in range(1, months + 1):
        if interest_type == C.INTEREST_FREE or not annual_rate:
            interest = 0.0
            principal_part = round(principal / months, 2)
        elif interest_type == C.INTEREST_FLAT:
            interest = round(principal * (annual_rate / 100) * (1 / 12), 2)
            principal_part = round(principal / months, 2)
        else:
            interest = round(balance * monthly_rate, 2)
            principal_part = round(emi - interest, 2)

        if i == months:
            principal_part = round(balance, 2)
            if interest_type != C.INTEREST_FREE and annual_rate:
                interest = round(balance * monthly_rate, 2) if interest_type == C.INTEREST_REDUCING else interest
            emi_this = round(principal_part + interest, 2)
        else:
            emi_this = emi

        new_balance = max(0.0, round(balance - principal_part, 2))

        row = LoanRepaymentSchedule(
            id=_uuid(),
            client_id=client_id,
            application_id=application_id,
            installment_number=i,
            due_date=_add_months(emi_start, i),
            principal_amount=principal_part,
            interest_amount=interest,
            emi_amount=emi_this,
            outstanding_balance=new_balance,
            status=C.INST_PENDING,
        )
        rows.append(row)
        balance = new_balance

    return rows


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28,
                       31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return date(year, month, day)


# ── Seed default loan types ──────────────────────────────────────────────────────

def seed_defaults(db: Session, client_id: str) -> None:
    for lt in C.DEFAULT_LOAN_TYPES:
        existing = repo.get_loan_type_by_code(db, client_id, lt["code"])
        if not existing:
            repo.create_loan_type(db, client_id, {
                "loan_type_code": lt["code"],
                "loan_type_name": lt["name"],
                "description": lt["description"],
                "interest_applicable": lt["interest_applicable"],
                "is_system": True,
                "is_active": True,
            }, "system")


# ── Dashboard ────────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict:
    counts = repo.get_dashboard_counts(db, client_id)

    # Recent applications
    result = repo.get_loan_applications(db, client_id, page=1, page_size=5)
    recent = [_app_dict(a) for a in result["items"]]

    return {
        **counts,
        "recent_applications": recent,
    }


# ── Meta options ─────────────────────────────────────────────────────────────────

def get_meta_options(db: Session, client_id: str) -> Dict:
    loan_types = repo.get_loan_types(db, client_id, active_only=True)
    return {
        "application_statuses": C.APPLICATION_STATUSES,
        "approval_statuses":    C.APPROVAL_STATUSES,
        "installment_statuses": C.INSTALLMENT_STATUSES,
        "repayment_methods":    C.REPAYMENT_METHODS,
        "interest_types":       C.INTEREST_TYPES,
        "payment_methods":      C.PAYMENT_METHODS,
        "closure_types":        C.CLOSURE_TYPES,
        "employee_categories":  C.EMPLOYEE_CATEGORIES,
        "loan_types": [{"id": t.id, "code": t.loan_type_code, "name": t.loan_type_name} for t in loan_types],
    }


# ── Loan Types CRUD ──────────────────────────────────────────────────────────────

def list_loan_types(db: Session, client_id: str) -> List[Dict]:
    seed_defaults(db, client_id)
    return [_type_dict(t) for t in repo.get_loan_types(db, client_id)]


def create_loan_type(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    existing = repo.get_loan_type_by_code(db, client_id, data["loan_type_code"])
    if existing:
        from fastapi import HTTPException
        raise HTTPException(409, f"Loan type code '{data['loan_type_code']}' already exists.")
    obj = repo.create_loan_type(db, client_id, data, actor)
    repo.log_activity(db, client_id, "loan_type", obj.id, C.ACT_LOAN_TYPE_CREATED, actor, new_value=obj.loan_type_name)
    return _type_dict(obj)


def update_loan_type(db: Session, client_id: str, type_id: str, data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_type(db, client_id, type_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan type not found.")
    if obj.is_system and "loan_type_code" in data:
        from fastapi import HTTPException
        raise HTTPException(400, "Cannot change the code of a system loan type.")
    updated = repo.update_loan_type(db, obj, data)
    repo.log_activity(db, client_id, "loan_type", obj.id, C.ACT_LOAN_TYPE_UPDATED, actor)
    return _type_dict(updated)


def delete_loan_type(db: Session, client_id: str, type_id: str, actor: str) -> None:
    obj = repo.get_loan_type(db, client_id, type_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan type not found.")
    if obj.is_system:
        from fastapi import HTTPException
        raise HTTPException(400, "Cannot delete a system loan type.")
    repo.delete_loan_type(db, obj)


# ── Loan Policies CRUD ───────────────────────────────────────────────────────────

def list_loan_policies(db: Session, client_id: str, loan_type_id: Optional[str] = None) -> List[Dict]:
    return [_policy_dict(p) for p in repo.get_loan_policies(db, client_id, loan_type_id)]


def create_loan_policy(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    # Attach loan type name
    lt = repo.get_loan_type(db, client_id, data["loan_type_id"])
    if not lt:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan type not found.")
    data["loan_type_name"] = lt.loan_type_name
    obj = repo.create_loan_policy(db, client_id, data, actor)
    repo.log_activity(db, client_id, "loan_policy", obj.id, C.ACT_LOAN_POLICY_CREATED, actor, new_value=obj.policy_name)
    return _policy_dict(obj)


def update_loan_policy(db: Session, client_id: str, policy_id: str, data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_policy(db, client_id, policy_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan policy not found.")
    updated = repo.update_loan_policy(db, obj, data)
    repo.log_activity(db, client_id, "loan_policy", obj.id, C.ACT_LOAN_POLICY_UPDATED, actor)
    return _policy_dict(updated)


def delete_loan_policy(db: Session, client_id: str, policy_id: str, actor: str) -> None:
    obj = repo.get_loan_policy(db, client_id, policy_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan policy not found.")
    repo.delete_loan_policy(db, obj)


# ── Loan Applications ────────────────────────────────────────────────────────────

def list_applications(db: Session, client_id: str, **kwargs) -> Dict:
    result = repo.get_loan_applications(db, client_id, **kwargs)
    return {
        "total": result["total"],
        "items": [_app_dict(a) for a in result["items"]],
    }


def get_application_detail(db: Session, client_id: str, app_id: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    d = _app_dict(obj)
    d["approvals"]  = [_approval_dict(a) for a in repo.get_approvals(db, app_id)]
    d["schedule"]   = [_schedule_dict(s) for s in repo.get_repayment_schedule(db, app_id)]
    d["disbursement"] = _disbursement_dict(repo.get_disbursement(db, app_id)) if repo.get_disbursement(db, app_id) else None
    d["closure"]    = _closure_dict(repo.get_closure(db, app_id)) if repo.get_closure(db, app_id) else None
    d["activities"] = [_activity_dict(a) for a in repo.get_activities(db, "loan_application", app_id)]
    d["deductions"] = [_deduction_dict(x) for x in repo.get_deductions_for_application(db, app_id)]
    return d


def _approval_dict(a) -> Dict:
    return {
        "id": a.id, "step_number": a.step_number,
        "approver_role": a.approver_role, "approver_id": a.approver_id,
        "approver_name": a.approver_name, "status": a.status,
        "comments": a.comments, "actioned_at": a.actioned_at,
        "created_at": a.created_at,
    }


def _deduction_dict(d) -> Dict:
    return {
        "id": d.id, "application_id": d.application_id,
        "schedule_id": d.schedule_id, "payroll_run_id": d.payroll_run_id,
        "period_month": d.period_month, "period_year": d.period_year,
        "deduction_amount": d.deduction_amount,
        "deducted_at": d.deducted_at, "is_reversed": d.is_reversed,
        "created_at": d.created_at,
    }


def create_application(db: Session, client_id: str, data: Dict, actor: str) -> Dict:
    # Validate loan type
    lt = repo.get_loan_type(db, client_id, data["loan_type_id"])
    if not lt:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan type not found.")
    data["loan_type_name"] = lt.loan_type_name
    data["application_number"] = _app_number()
    data["status"] = C.APP_DRAFT

    obj = repo.create_loan_application(db, client_id, data, actor)
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_APPLIED, actor, new_value=obj.application_number)
    return _app_dict(obj)


def update_application(db: Session, client_id: str, app_id: str, data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status not in (C.APP_DRAFT, C.APP_SUBMITTED):
        from fastapi import HTTPException
        raise HTTPException(400, f"Cannot edit an application in '{obj.status}' status.")
    updated = repo.update_loan_application(db, obj, data)
    return _app_dict(updated)


def submit_application(db: Session, client_id: str, app_id: str, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status != C.APP_DRAFT:
        from fastapi import HTTPException
        raise HTTPException(400, "Only Draft applications can be submitted.")
    repo.update_loan_application(db, obj, {"status": C.APP_SUBMITTED, "submitted_at": datetime.utcnow()})
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_SUBMITTED, actor, old_value=C.APP_DRAFT, new_value=C.APP_SUBMITTED)
    return _app_dict(obj)


def approve_application(db: Session, client_id: str, app_id: str, approve_data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status not in (C.APP_SUBMITTED, C.APP_UNDER_REVIEW):
        from fastapi import HTTPException
        raise HTTPException(400, f"Cannot approve application in '{obj.status}' status.")

    approved_amount = approve_data["approved_amount"]
    approved_tenure = approve_data["approved_tenure"]
    interest_type = approve_data.get("interest_type") or C.INTEREST_FREE
    interest_rate  = approve_data.get("interest_rate") or 0.0
    repayment_method = approve_data.get("repayment_method") or C.REPAY_EMI
    emi = calculate_emi(approved_amount, interest_rate, approved_tenure, interest_type)

    total_interest = 0.0
    if interest_type != C.INTEREST_FREE and interest_rate:
        if interest_type == C.INTEREST_FLAT:
            total_interest = approved_amount * (interest_rate / 100) * (approved_tenure / 12)
        else:
            total_interest = round(emi * approved_tenure - approved_amount, 2)

    updates = {
        "status": C.APP_APPROVED,
        "approved_amount": approved_amount,
        "approved_tenure": approved_tenure,
        "interest_type": interest_type,
        "interest_rate": interest_rate,
        "processing_fee": approve_data.get("processing_fee"),
        "repayment_method": repayment_method,
        "emi_amount": emi,
        "principal_outstanding": approved_amount,
        "total_interest": round(total_interest, 2),
        "approved_at": datetime.utcnow(),
    }
    repo.update_loan_application(db, obj, updates)

    # Log approval step
    repo.create_approval(db, client_id, app_id, {
        "step_number": 1,
        "approver_role": "Admin",
        "approver_name": actor,
        "status": C.APPROVAL_APPROVED,
        "comments": approve_data.get("comments"),
        "actioned_at": datetime.utcnow(),
    })
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_APPROVED, actor, old_value=obj.status, new_value=C.APP_APPROVED)
    db.refresh(obj)
    return _app_dict(obj)


def reject_application(db: Session, client_id: str, app_id: str, reason: str, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status in C.TERMINAL_STATUSES:
        from fastapi import HTTPException
        raise HTTPException(400, f"Application is already in '{obj.status}' status.")
    repo.update_loan_application(db, obj, {"status": C.APP_REJECTED, "rejection_reason": reason})
    repo.create_approval(db, client_id, app_id, {
        "step_number": 1, "approver_role": "Admin", "approver_name": actor,
        "status": C.APPROVAL_REJECTED, "comments": reason, "actioned_at": datetime.utcnow(),
    })
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_REJECTED, actor, new_value=reason)
    db.refresh(obj)
    return _app_dict(obj)


def cancel_application(db: Session, client_id: str, app_id: str, reason: Optional[str], actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status in C.TERMINAL_STATUSES or obj.status == C.APP_DISBURSED:
        from fastapi import HTTPException
        raise HTTPException(400, f"Cannot cancel application in '{obj.status}' status.")
    repo.update_loan_application(db, obj, {
        "status": C.APP_CANCELLED,
        "cancelled_by": actor,
        "cancelled_at": datetime.utcnow(),
        "rejection_reason": reason,
    })
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_CANCELLED, actor, new_value=reason)
    db.refresh(obj)
    return _app_dict(obj)


def disburse_application(db: Session, client_id: str, app_id: str, disburse_data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status != C.APP_APPROVED:
        from fastapi import HTTPException
        raise HTTPException(400, "Only Approved applications can be disbursed.")
    if repo.get_disbursement(db, app_id):
        from fastapi import HTTPException
        raise HTTPException(409, "Loan has already been disbursed.")

    # Create disbursement record
    repo.create_disbursement(db, client_id, app_id, disburse_data, actor)

    # Generate repayment schedule
    emi_start = disburse_data.get("disbursement_date") or date.today()
    if isinstance(emi_start, str):
        emi_start = date.fromisoformat(emi_start)
    # EMI starts next month after disbursement
    emi_start_date = obj.emi_start_date or _add_months(emi_start, 1)

    rows = _generate_schedule_rows(
        application_id=app_id,
        client_id=client_id,
        principal=obj.approved_amount,
        annual_rate=obj.interest_rate or 0.0,
        months=obj.approved_tenure,
        interest_type=obj.interest_type or C.INTEREST_FREE,
        repayment_method=obj.repayment_method or C.REPAY_EMI,
        emi_start=emi_start_date,
    )
    repo.bulk_create_schedule(db, rows)

    repo.update_loan_application(db, obj, {
        "status": C.APP_DISBURSED,
        "disbursed_at": datetime.utcnow(),
    })
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_DISBURSED, actor, new_value=str(disburse_data.get("disbursed_amount")))
    db.refresh(obj)
    return _app_dict(obj)


# ── Repayment Schedule ───────────────────────────────────────────────────────────

def get_repayment_schedule(db: Session, client_id: str, app_id: str) -> List[Dict]:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    return [_schedule_dict(s) for s in repo.get_repayment_schedule(db, app_id)]


def update_installment(db: Session, client_id: str, app_id: str, installment_id: str, data: Dict, actor: str) -> Dict:
    inst = repo.get_installment(db, app_id, installment_id)
    if not inst:
        from fastapi import HTTPException
        raise HTTPException(404, "Installment not found.")
    old_status = inst.status
    updated = repo.update_installment(db, inst, data)

    # If paid / deducted, update loan outstanding
    if data.get("status") in (C.INST_PAID, C.INST_DEDUCTED):
        paid = data.get("paid_amount") or inst.emi_amount
        app = repo.get_loan_application(db, client_id, app_id)
        if app:
            new_outstanding = max(0.0, round((app.principal_outstanding or 0) - inst.principal_amount, 2))
            new_total_paid  = round((app.total_paid or 0) + paid, 2)
            repo.update_loan_application(db, app, {
                "principal_outstanding": new_outstanding,
                "total_paid": new_total_paid,
            })
        repo.log_activity(db, client_id, "loan_application", app_id, C.ACT_EMI_DEDUCTED, actor, old_value=old_status, new_value=data.get("status"))
    elif data.get("status") == C.INST_WAIVED:
        repo.log_activity(db, client_id, "loan_application", app_id, C.ACT_EMI_WAIVED, actor, notes=data.get("waiver_reason"))

    return _schedule_dict(updated)


# ── Payroll deduction integration ────────────────────────────────────────────────

def get_active_emi_for_employee(db: Session, client_id: str, employee_id: str) -> List[Dict]:
    """Return pending installments due (used during payroll processing)."""
    insts = repo.get_pending_installments(db, client_id, employee_id)
    return [_schedule_dict(s) for s in insts]


def record_payroll_deduction(
    db: Session, client_id: str, app_id: str, schedule_id: str,
    payroll_run_id: str, period_month: int, period_year: int,
    amount: float, actor: str,
) -> None:
    if repo.check_deduction_exists(db, schedule_id, payroll_run_id):
        from fastapi import HTTPException
        raise HTTPException(409, "Deduction already recorded for this payroll run.")
    repo.create_deduction(db, client_id, {
        "application_id": app_id,
        "schedule_id": schedule_id,
        "payroll_run_id": payroll_run_id,
        "period_month": period_month,
        "period_year": period_year,
        "deduction_amount": amount,
        "deducted_at": datetime.utcnow(),
        "deducted_by": actor,
    })
    # Mark installment as deducted
    inst = repo.get_installment(db, app_id, schedule_id)
    if inst:
        repo.update_installment(db, inst, {
            "status": C.INST_DEDUCTED,
            "paid_amount": amount,
            "paid_date": date.today(),
            "deduction_ref": payroll_run_id,
        })
        # Update loan outstanding
        app = repo.get_loan_application(db, client_id, app_id)
        if app:
            new_outstanding = max(0.0, round((app.principal_outstanding or 0) - inst.principal_amount, 2))
            new_total_paid  = round((app.total_paid or 0) + amount, 2)
            repo.update_loan_application(db, app, {
                "principal_outstanding": new_outstanding,
                "total_paid": new_total_paid,
            })


# ── Loan Closure ─────────────────────────────────────────────────────────────────

def close_loan(db: Session, client_id: str, app_id: str, data: Dict, actor: str) -> Dict:
    obj = repo.get_loan_application(db, client_id, app_id)
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(404, "Loan application not found.")
    if obj.status != C.APP_DISBURSED:
        from fastapi import HTTPException
        raise HTTPException(400, "Only Disbursed loans can be closed.")
    if repo.get_closure(db, app_id):
        from fastapi import HTTPException
        raise HTTPException(409, "Loan is already closed.")

    closure = repo.create_closure(db, client_id, app_id, data, actor)

    # Mark remaining pending installments as paid / waived
    schedule = repo.get_repayment_schedule(db, app_id)
    for inst in schedule:
        if inst.status == C.INST_PENDING:
            new_status = C.INST_WAIVED if data.get("closure_type") in (C.CLOSURE_WRITE_OFF, C.CLOSURE_SETTLEMENT) else C.INST_PAID
            repo.update_installment(db, inst, {"status": new_status, "waiver_reason": data.get("closure_notes")})

    repo.update_loan_application(db, obj, {
        "status": C.APP_CLOSED,
        "closure_type": data.get("closure_type"),
        "closed_at": datetime.utcnow(),
        "principal_outstanding": 0.0,
    })
    repo.log_activity(db, client_id, "loan_application", obj.id, C.ACT_LOAN_CLOSED, actor, new_value=data.get("closure_type"))
    return _closure_dict(closure)
