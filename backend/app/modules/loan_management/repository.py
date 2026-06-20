"""Employee Loan Management — repository (CRUD helpers)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .models import (
    LoanActivity, LoanApplication, LoanApproval,
    LoanClosure, LoanDisbursement, LoanPayrollDeduction,
    LoanPolicy, LoanRepaymentSchedule, LoanType,
)


# ── Loan Types ───────────────────────────────────────────────────────────────────

def get_loan_types(db: Session, client_id: str, *, active_only: bool = False) -> List[LoanType]:
    q = db.query(LoanType).filter(LoanType.client_id == client_id, LoanType.is_deleted == False)
    if active_only:
        q = q.filter(LoanType.is_active == True)
    return q.order_by(LoanType.loan_type_name).all()


def get_loan_type(db: Session, client_id: str, type_id: str) -> Optional[LoanType]:
    return db.query(LoanType).filter(
        LoanType.id == type_id,
        LoanType.client_id == client_id,
        LoanType.is_deleted == False,
    ).first()


def get_loan_type_by_code(db: Session, client_id: str, code: str) -> Optional[LoanType]:
    return db.query(LoanType).filter(
        LoanType.loan_type_code == code,
        LoanType.client_id == client_id,
        LoanType.is_deleted == False,
    ).first()


def create_loan_type(db: Session, client_id: str, data: Dict, created_by: str) -> LoanType:
    obj = LoanType(client_id=client_id, created_by=created_by, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_loan_type(db: Session, obj: LoanType, data: Dict) -> LoanType:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def delete_loan_type(db: Session, obj: LoanType) -> None:
    obj.is_deleted = True
    obj.updated_at = datetime.utcnow()
    db.commit()


# ── Loan Policies ────────────────────────────────────────────────────────────────

def get_loan_policies(db: Session, client_id: str, loan_type_id: Optional[str] = None) -> List[LoanPolicy]:
    q = db.query(LoanPolicy).filter(LoanPolicy.client_id == client_id, LoanPolicy.is_deleted == False)
    if loan_type_id:
        q = q.filter(LoanPolicy.loan_type_id == loan_type_id)
    return q.order_by(LoanPolicy.policy_name).all()


def get_loan_policy(db: Session, client_id: str, policy_id: str) -> Optional[LoanPolicy]:
    return db.query(LoanPolicy).filter(
        LoanPolicy.id == policy_id,
        LoanPolicy.client_id == client_id,
        LoanPolicy.is_deleted == False,
    ).first()


def create_loan_policy(db: Session, client_id: str, data: Dict, created_by: str) -> LoanPolicy:
    obj = LoanPolicy(client_id=client_id, created_by=created_by, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_loan_policy(db: Session, obj: LoanPolicy, data: Dict) -> LoanPolicy:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def delete_loan_policy(db: Session, obj: LoanPolicy) -> None:
    obj.is_deleted = True
    obj.updated_at = datetime.utcnow()
    db.commit()


# ── Loan Applications ────────────────────────────────────────────────────────────

def get_loan_applications(
    db: Session, client_id: str, *,
    employee_id: Optional[str] = None,
    loan_type_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1, page_size: int = 20,
) -> Dict:
    q = db.query(LoanApplication).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.is_deleted == False,
    )
    if employee_id:
        q = q.filter(LoanApplication.employee_id == employee_id)
    if loan_type_id:
        q = q.filter(LoanApplication.loan_type_id == loan_type_id)
    if status:
        q = q.filter(LoanApplication.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(
            LoanApplication.employee_name.ilike(like) |
            LoanApplication.application_number.ilike(like) |
            LoanApplication.loan_type_name.ilike(like)
        )
    total = q.count()
    items = q.order_by(LoanApplication.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "items": items}


def get_loan_application(db: Session, client_id: str, app_id: str) -> Optional[LoanApplication]:
    return db.query(LoanApplication).filter(
        LoanApplication.id == app_id,
        LoanApplication.client_id == client_id,
        LoanApplication.is_deleted == False,
    ).first()


def create_loan_application(db: Session, client_id: str, data: Dict, created_by: str) -> LoanApplication:
    obj = LoanApplication(client_id=client_id, created_by=created_by, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_loan_application(db: Session, obj: LoanApplication, data: Dict) -> LoanApplication:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def count_active_loans(db: Session, client_id: str, employee_id: str, loan_type_id: str) -> int:
    active = {"Submitted", "Under Review", "Approved", "Disbursed"}
    return db.query(LoanApplication).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.employee_id == employee_id,
        LoanApplication.loan_type_id == loan_type_id,
        LoanApplication.status.in_(active),
        LoanApplication.is_deleted == False,
    ).count()


# ── Loan Approvals ───────────────────────────────────────────────────────────────

def get_approvals(db: Session, application_id: str) -> List[LoanApproval]:
    return db.query(LoanApproval).filter(
        LoanApproval.application_id == application_id,
    ).order_by(LoanApproval.step_number).all()


def create_approval(db: Session, client_id: str, application_id: str, data: Dict) -> LoanApproval:
    obj = LoanApproval(client_id=client_id, application_id=application_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_approval(db: Session, obj: LoanApproval, data: Dict) -> LoanApproval:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Loan Disbursements ───────────────────────────────────────────────────────────

def get_disbursement(db: Session, application_id: str) -> Optional[LoanDisbursement]:
    return db.query(LoanDisbursement).filter(
        LoanDisbursement.application_id == application_id,
    ).first()


def create_disbursement(db: Session, client_id: str, application_id: str, data: Dict, actor: str) -> LoanDisbursement:
    obj = LoanDisbursement(
        client_id=client_id,
        application_id=application_id,
        disbursed_by=actor,
        **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Repayment Schedules ──────────────────────────────────────────────────────────

def get_repayment_schedule(db: Session, application_id: str) -> List[LoanRepaymentSchedule]:
    return db.query(LoanRepaymentSchedule).filter(
        LoanRepaymentSchedule.application_id == application_id,
    ).order_by(LoanRepaymentSchedule.installment_number).all()


def get_installment(db: Session, application_id: str, installment_id: str) -> Optional[LoanRepaymentSchedule]:
    return db.query(LoanRepaymentSchedule).filter(
        LoanRepaymentSchedule.id == installment_id,
        LoanRepaymentSchedule.application_id == application_id,
    ).first()


def bulk_create_schedule(db: Session, rows: List[LoanRepaymentSchedule]) -> None:
    db.bulk_save_objects(rows)
    db.commit()


def update_installment(db: Session, obj: LoanRepaymentSchedule, data: Dict) -> LoanRepaymentSchedule:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def get_pending_installments(db: Session, client_id: str, employee_id: str) -> List[LoanRepaymentSchedule]:
    """Active pending installments for an employee (for payroll deduction)."""
    from datetime import date
    active_apps = db.query(LoanApplication.id).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.employee_id == employee_id,
        LoanApplication.status == "Disbursed",
        LoanApplication.is_deleted == False,
    ).subquery()
    return db.query(LoanRepaymentSchedule).filter(
        LoanRepaymentSchedule.application_id.in_(active_apps),
        LoanRepaymentSchedule.status == "Pending",
        LoanRepaymentSchedule.due_date <= date.today(),
    ).order_by(LoanRepaymentSchedule.due_date).all()


# ── Payroll Deductions ───────────────────────────────────────────────────────────

def check_deduction_exists(db: Session, schedule_id: str, payroll_run_id: str) -> bool:
    return db.query(LoanPayrollDeduction).filter(
        LoanPayrollDeduction.schedule_id == schedule_id,
        LoanPayrollDeduction.payroll_run_id == payroll_run_id,
        LoanPayrollDeduction.is_reversed == False,
    ).count() > 0


def create_deduction(db: Session, client_id: str, data: Dict) -> LoanPayrollDeduction:
    obj = LoanPayrollDeduction(client_id=client_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def get_deductions_for_application(db: Session, application_id: str) -> List[LoanPayrollDeduction]:
    return db.query(LoanPayrollDeduction).filter(
        LoanPayrollDeduction.application_id == application_id,
    ).order_by(LoanPayrollDeduction.created_at.desc()).all()


# ── Loan Closures ────────────────────────────────────────────────────────────────

def get_closure(db: Session, application_id: str) -> Optional[LoanClosure]:
    return db.query(LoanClosure).filter(
        LoanClosure.application_id == application_id,
    ).first()


def create_closure(db: Session, client_id: str, application_id: str, data: Dict, actor: str) -> LoanClosure:
    obj = LoanClosure(
        client_id=client_id,
        application_id=application_id,
        closed_by=actor,
        **data,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Activities ───────────────────────────────────────────────────────────────────

def log_activity(
    db: Session,
    client_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    obj = LoanActivity(
        client_id=client_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        old_value=old_value,
        new_value=new_value,
        notes=notes,
    )
    db.add(obj)
    db.commit()


def get_activities(db: Session, entity_type: str, entity_id: str) -> List[LoanActivity]:
    return db.query(LoanActivity).filter(
        LoanActivity.entity_type == entity_type,
        LoanActivity.entity_id == entity_id,
    ).order_by(LoanActivity.created_at.desc()).all()


# ── Dashboard counts ─────────────────────────────────────────────────────────────

def get_dashboard_counts(db: Session, client_id: str) -> Dict:
    from datetime import date as date_cls
    from sqlalchemy import func

    total_active = db.query(func.count(LoanApplication.id)).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.status == "Disbursed",
        LoanApplication.is_deleted == False,
    ).scalar() or 0

    pending_approvals = db.query(func.count(LoanApplication.id)).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.status.in_(["Submitted", "Under Review"]),
        LoanApplication.is_deleted == False,
    ).scalar() or 0

    total_outstanding = db.query(func.coalesce(func.sum(LoanApplication.principal_outstanding), 0.0)).filter(
        LoanApplication.client_id == client_id,
        LoanApplication.status == "Disbursed",
        LoanApplication.is_deleted == False,
    ).scalar() or 0.0

    emi_due_month = db.query(func.count(LoanRepaymentSchedule.id)).filter(
        LoanRepaymentSchedule.client_id == client_id,
        LoanRepaymentSchedule.status == "Pending",
        LoanRepaymentSchedule.due_date >= date_cls.today().replace(day=1),
    ).scalar() or 0

    return {
        "active_loans": total_active,
        "pending_approvals": pending_approvals,
        "total_outstanding": total_outstanding,
        "emi_due_this_month": emi_due_month,
    }
