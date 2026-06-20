"""Expense & Reimbursements — repository (DB access layer)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from . import constants as C
from .models import (
    ExpenseActivity, ExpenseApproval, ExpenseCategory, ExpenseClaim,
    ExpenseClaimItem, ExpensePolicy, ExpenseReceipt, ExpenseReimbursement,
    MileageClaim,
)


# ── Categories ────────────────────────────────────────────────────────────────

def list_categories(db: Session, include_inactive: bool = False) -> List[ExpenseCategory]:
    q = db.query(ExpenseCategory)
    if not include_inactive:
        q = q.filter(ExpenseCategory.is_active == True)
    return q.order_by(ExpenseCategory.name).all()


def get_category(db: Session, category_id: str) -> Optional[ExpenseCategory]:
    return db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()


def get_category_by_code(db: Session, code: str) -> Optional[ExpenseCategory]:
    return db.query(ExpenseCategory).filter(ExpenseCategory.code == code).first()


def create_category(db: Session, data: Dict[str, Any]) -> ExpenseCategory:
    obj = ExpenseCategory(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_category(db: Session, obj: ExpenseCategory, data: Dict[str, Any]) -> ExpenseCategory:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Policies ──────────────────────────────────────────────────────────────────

def list_policies(db: Session, include_inactive: bool = False) -> List[ExpensePolicy]:
    q = db.query(ExpensePolicy)
    if not include_inactive:
        q = q.filter(ExpensePolicy.is_active == True)
    return q.order_by(ExpensePolicy.name).all()


def get_policy(db: Session, policy_id: str) -> Optional[ExpensePolicy]:
    return db.query(ExpensePolicy).filter(ExpensePolicy.id == policy_id).first()


def create_policy(db: Session, data: Dict[str, Any]) -> ExpensePolicy:
    obj = ExpensePolicy(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_policy(db: Session, obj: ExpensePolicy, data: Dict[str, Any]) -> ExpensePolicy:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Claims ────────────────────────────────────────────────────────────────────

def _claims_base(db: Session):
    return db.query(ExpenseClaim).filter(ExpenseClaim.is_deleted == False)


def list_claims(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    q = _claims_base(db)
    if employee_id:
        q = q.filter(ExpenseClaim.employee_id == employee_id)
    if status:
        q = q.filter(ExpenseClaim.status == status)
    if search:
        like = f"%{search}%"
        q = q.filter(ExpenseClaim.title.ilike(like) | ExpenseClaim.claim_number.ilike(like))
    total = q.count()
    items = q.order_by(ExpenseClaim.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def get_claim(db: Session, claim_id: str) -> Optional[ExpenseClaim]:
    return _claims_base(db).filter(ExpenseClaim.id == claim_id).first()


def create_claim(db: Session, data: Dict[str, Any]) -> ExpenseClaim:
    obj = ExpenseClaim(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_claim(db: Session, obj: ExpenseClaim, data: Dict[str, Any]) -> ExpenseClaim:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_claim(db: Session, obj: ExpenseClaim) -> None:
    obj.is_deleted = True
    obj.deleted_at = datetime.utcnow()
    obj.updated_at = datetime.utcnow()
    db.commit()


# ── Claim Items ───────────────────────────────────────────────────────────────

def list_claim_items(db: Session, claim_id: str) -> List[ExpenseClaimItem]:
    return db.query(ExpenseClaimItem).filter(ExpenseClaimItem.claim_id == claim_id).all()


def create_claim_item(db: Session, data: Dict[str, Any]) -> ExpenseClaimItem:
    obj = ExpenseClaimItem(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_claim_item(db: Session, item_id: str, claim_id: str) -> bool:
    obj = db.query(ExpenseClaimItem).filter(
        ExpenseClaimItem.id == item_id,
        ExpenseClaimItem.claim_id == claim_id
    ).first()
    if obj:
        db.delete(obj)
        db.commit()
        return True
    return False


# ── Approvals ─────────────────────────────────────────────────────────────────

def get_pending_approval(db: Session, claim_id: str) -> Optional[ExpenseApproval]:
    return db.query(ExpenseApproval).filter(
        ExpenseApproval.claim_id == claim_id,
        ExpenseApproval.status == C.APPROVAL_PENDING,
    ).order_by(ExpenseApproval.approval_level).first()


def create_approval(db: Session, data: Dict[str, Any]) -> ExpenseApproval:
    obj = ExpenseApproval(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_approval(db: Session, obj: ExpenseApproval, data: Dict[str, Any]) -> ExpenseApproval:
    for k, v in data.items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


# ── Receipts ──────────────────────────────────────────────────────────────────

def list_receipts(db: Session, claim_id: str) -> List[ExpenseReceipt]:
    return db.query(ExpenseReceipt).filter(
        ExpenseReceipt.claim_id == claim_id,
        ExpenseReceipt.is_deleted == False,
    ).order_by(ExpenseReceipt.uploaded_at).all()


def create_receipt(db: Session, data: Dict[str, Any]) -> ExpenseReceipt:
    obj = ExpenseReceipt(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def soft_delete_receipt(db: Session, receipt_id: str, claim_id: str) -> bool:
    obj = db.query(ExpenseReceipt).filter(
        ExpenseReceipt.id == receipt_id,
        ExpenseReceipt.claim_id == claim_id,
        ExpenseReceipt.is_deleted == False,
    ).first()
    if obj:
        obj.is_deleted = True
        obj.deleted_at = datetime.utcnow()
        db.commit()
        return True
    return False


# ── Reimbursements ────────────────────────────────────────────────────────────

def list_reimbursements(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    q = db.query(ExpenseReimbursement)
    if employee_id:
        q = q.filter(ExpenseReimbursement.employee_id == employee_id)
    if status:
        q = q.filter(ExpenseReimbursement.status == status)
    total = q.count()
    items = q.order_by(ExpenseReimbursement.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def get_reimbursement(db: Session, reimb_id: str) -> Optional[ExpenseReimbursement]:
    return db.query(ExpenseReimbursement).filter(ExpenseReimbursement.id == reimb_id).first()


def get_reimbursement_by_claim(db: Session, claim_id: str) -> Optional[ExpenseReimbursement]:
    return db.query(ExpenseReimbursement).filter(
        ExpenseReimbursement.claim_id == claim_id
    ).first()


def create_reimbursement(db: Session, data: Dict[str, Any]) -> ExpenseReimbursement:
    obj = ExpenseReimbursement(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_reimbursement(db: Session, obj: ExpenseReimbursement, data: Dict[str, Any]) -> ExpenseReimbursement:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


def get_pending_reimbursements_for_payroll(db: Session, employee_id: str) -> List[ExpenseReimbursement]:
    return db.query(ExpenseReimbursement).filter(
        ExpenseReimbursement.employee_id == employee_id,
        ExpenseReimbursement.method == C.REIMB_PAYROLL,
        ExpenseReimbursement.status == C.REIMB_STATUS_PENDING,
    ).all()


# ── Mileage Claims ────────────────────────────────────────────────────────────

def list_mileage_claims(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    q = db.query(MileageClaim).filter(MileageClaim.is_deleted == False)
    if employee_id:
        q = q.filter(MileageClaim.employee_id == employee_id)
    if status:
        q = q.filter(MileageClaim.status == status)
    total = q.count()
    items = q.order_by(MileageClaim.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def get_mileage_claim(db: Session, claim_id: str) -> Optional[MileageClaim]:
    return db.query(MileageClaim).filter(
        MileageClaim.id == claim_id,
        MileageClaim.is_deleted == False,
    ).first()


def create_mileage_claim(db: Session, data: Dict[str, Any]) -> MileageClaim:
    obj = MileageClaim(**data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_mileage_claim(db: Session, obj: MileageClaim, data: Dict[str, Any]) -> MileageClaim:
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(obj)
    return obj


# ── Activities ────────────────────────────────────────────────────────────────

def list_activities(db: Session, claim_id: str) -> List[ExpenseActivity]:
    return db.query(ExpenseActivity).filter(
        ExpenseActivity.claim_id == claim_id
    ).order_by(ExpenseActivity.created_at.desc()).all()


def log_activity(
    db: Session,
    claim_id: str,
    activity: str,
    description: str = "",
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> ExpenseActivity:
    obj = ExpenseActivity(
        claim_id=claim_id,
        activity=activity,
        description=description,
        actor_id=actor_id,
        actor_name=actor_name,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Dashboard ─────────────────────────────────────────────────────────────────

def get_dashboard_counts(db: Session) -> Dict[str, Any]:
    total_claims       = _claims_base(db).count()
    pending_approvals  = _claims_base(db).filter(
        ExpenseClaim.status.in_([C.STATUS_SUBMITTED, C.STATUS_UNDER_REVIEW])
    ).count()
    approved_unpaid    = _claims_base(db).filter(
        ExpenseClaim.status.in_([C.STATUS_APPROVED, C.STATUS_PARTIALLY_APPROVED])
    ).count()
    reimbursed_count   = _claims_base(db).filter(
        ExpenseClaim.status == C.STATUS_REIMBURSED
    ).count()

    # total amount pending reimbursement
    from sqlalchemy import func
    pending_rows = db.query(func.sum(ExpenseClaim.approved_amount)).filter(
        ExpenseClaim.is_deleted == False,
        ExpenseClaim.status.in_([C.STATUS_APPROVED, C.STATUS_PARTIALLY_APPROVED]),
    ).scalar()
    pending_amount = float(pending_rows or 0)

    # spend by status
    status_breakdown = {}
    for status in C.ALL_STATUSES:
        count = _claims_base(db).filter(ExpenseClaim.status == status).count()
        if count:
            status_breakdown[status] = count

    return {
        "total_claims":      total_claims,
        "pending_approvals": pending_approvals,
        "approved_unpaid":   approved_unpaid,
        "reimbursed_count":  reimbursed_count,
        "pending_amount":    pending_amount,
        "status_breakdown":  status_breakdown,
    }
