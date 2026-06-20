"""Expense & Reimbursements — service layer (business logic)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import constants as C
from . import repository as repo
from .models import ExpenseCategory
from .schemas import (
    ClaimItemCreate, ExpenseCategoryCreate, ExpenseCategoryUpdate,
    ExpenseClaimApprove, ExpenseClaimCreate, ExpenseClaimReject,
    ExpenseClaimReturn, ExpenseClaimUpdate, ExpensePolicyCreate,
    ExpensePolicyUpdate, MileageClaimCreate, MileageClaimUpdate,
    ReimbursementCreate, ReimbursementUpdate,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_claim_number() -> str:
    today = datetime.utcnow().strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:8].upper()
    return f"EXP-{today}-{suffix}"


def _category_to_dict(obj: ExpenseCategory) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "code": obj.code,
        "name": obj.name,
        "description": obj.description,
        "is_active": obj.is_active,
        "receipt_required": obj.receipt_required,
        "approval_required": obj.approval_required,
        "max_amount": obj.max_amount,
        "daily_limit": obj.daily_limit,
        "monthly_limit": obj.monthly_limit,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
    }


def _item_to_dict(obj) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "claim_id": obj.claim_id,
        "category_id": obj.category_id,
        "category_name": obj.category.name if obj.category else None,
        "expense_date": obj.expense_date.isoformat() if obj.expense_date else None,
        "amount": obj.amount,
        "tax_amount": obj.tax_amount,
        "approved_amount": obj.approved_amount,
        "notes": obj.notes,
        "currency": obj.currency,
    }


def _approval_to_dict(obj) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "claim_id": obj.claim_id,
        "approval_level": obj.approval_level,
        "approver_id": obj.approver_id,
        "approver_name": obj.approver_name,
        "approver_role": obj.approver_role,
        "status": obj.status,
        "approved_amount": obj.approved_amount,
        "comments": obj.comments,
        "actioned_at": obj.actioned_at.isoformat() if obj.actioned_at else None,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }


def _receipt_to_dict(obj) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "claim_id": obj.claim_id,
        "item_id": obj.item_id,
        "file_name": obj.file_name,
        "file_size": obj.file_size,
        "mime_type": obj.mime_type,
        "ocr_status": obj.ocr_status,
        "uploaded_at": obj.uploaded_at.isoformat() if obj.uploaded_at else None,
    }


def _reimb_to_dict(obj) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "claim_id": obj.claim_id,
        "employee_id": obj.employee_id,
        "amount": obj.amount,
        "currency": obj.currency,
        "method": obj.method,
        "status": obj.status,
        "transaction_ref": obj.transaction_ref,
        "payroll_run_id": obj.payroll_run_id,
        "reimbursement_date": obj.reimbursement_date.isoformat() if obj.reimbursement_date else None,
        "notes": obj.notes,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }


def _claim_to_dict(obj, include_children: bool = False) -> Dict[str, Any]:
    d: Dict[str, Any] = {
        "id": obj.id,
        "claim_number": obj.claim_number,
        "employee_id": obj.employee_id,
        "category_id": obj.category_id,
        "category_name": obj.category.name if obj.category else None,
        "expense_date": obj.expense_date.isoformat() if obj.expense_date else None,
        "amount": obj.amount,
        "approved_amount": obj.approved_amount,
        "currency": obj.currency,
        "title": obj.title,
        "description": obj.description,
        "project": obj.project,
        "cost_center": obj.cost_center,
        "client_ref": obj.client_ref,
        "status": obj.status,
        "rejection_reason": obj.rejection_reason,
        "return_reason": obj.return_reason,
        "submitted_at": obj.submitted_at.isoformat() if obj.submitted_at else None,
        "approved_at": obj.approved_at.isoformat() if obj.approved_at else None,
        "reimbursed_at": obj.reimbursed_at.isoformat() if obj.reimbursed_at else None,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
        "updated_at": obj.updated_at.isoformat() if obj.updated_at else None,
    }
    if include_children:
        d["items"]    = [_item_to_dict(i) for i in obj.items]
        d["approvals"] = [_approval_to_dict(a) for a in obj.approvals]
        d["receipts"]  = [_receipt_to_dict(r) for r in obj.receipts if not r.is_deleted]
        reimbursement  = next(iter(obj.reimbursements), None)
        d["reimbursement"] = _reimb_to_dict(reimbursement) if reimbursement else None
        d["activities"] = [
            {
                "id": a.id,
                "activity": a.activity,
                "description": a.description,
                "actor_name": a.actor_name,
                "old_value": a.old_value,
                "new_value": a.new_value,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in obj.activities
        ]
    return d


def _mileage_to_dict(obj) -> Dict[str, Any]:
    return {
        "id": obj.id,
        "claim_id": obj.claim_id,
        "employee_id": obj.employee_id,
        "trip_date": obj.trip_date.isoformat() if obj.trip_date else None,
        "from_location": obj.from_location,
        "to_location": obj.to_location,
        "distance_km": obj.distance_km,
        "rate_per_km": obj.rate_per_km,
        "total_amount": obj.total_amount,
        "currency": obj.currency,
        "purpose": obj.purpose,
        "status": obj.status,
        "approved_amount": obj.approved_amount,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }


# ── Default seeds ─────────────────────────────────────────────────────────────

def seed_default_categories(db: Session) -> None:
    for cat in C.DEFAULT_CATEGORIES:
        if not repo.get_category_by_code(db, cat["code"]):
            repo.create_category(db, cat)


# ── Category service ──────────────────────────────────────────────────────────

def list_categories(db: Session, include_inactive: bool = False) -> List[Dict]:
    return [_category_to_dict(c) for c in repo.list_categories(db, include_inactive)]


def get_category(db: Session, category_id: str) -> Dict:
    obj = repo.get_category(db, category_id)
    if not obj:
        raise HTTPException(404, "Expense category not found")
    return _category_to_dict(obj)


def create_category(db: Session, payload: ExpenseCategoryCreate) -> Dict:
    if repo.get_category_by_code(db, payload.code):
        raise HTTPException(409, f"Category code '{payload.code}' already exists")
    data = payload.model_dump()
    obj = repo.create_category(db, data)
    return _category_to_dict(obj)


def update_category(db: Session, category_id: str, payload: ExpenseCategoryUpdate) -> Dict:
    obj = repo.get_category(db, category_id)
    if not obj:
        raise HTTPException(404, "Expense category not found")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    obj = repo.update_category(db, obj, data)
    return _category_to_dict(obj)


# ── Policy service ────────────────────────────────────────────────────────────

def list_policies(db: Session, include_inactive: bool = False) -> List[Dict]:
    rows = repo.list_policies(db, include_inactive)
    result = []
    for p in rows:
        result.append({
            "id": p.id, "name": p.name, "description": p.description,
            "is_active": p.is_active, "company_id": p.company_id,
            "branch_id": p.branch_id, "department_id": p.department_id,
            "designation_id": p.designation_id, "daily_limit": p.daily_limit,
            "monthly_limit": p.monthly_limit, "yearly_limit": p.yearly_limit,
            "approval_levels": p.approval_levels, "receipt_required": p.receipt_required,
            "eligible_categories": p.eligible_categories,
            "effective_from": p.effective_from.isoformat() if p.effective_from else None,
            "effective_to": p.effective_to.isoformat() if p.effective_to else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return result


def create_policy(db: Session, payload: ExpensePolicyCreate) -> Dict:
    data = payload.model_dump()
    obj = repo.create_policy(db, data)
    return list_policies(db)[0] if False else {
        "id": obj.id, "name": obj.name, "is_active": obj.is_active,
        "approval_levels": obj.approval_levels, "receipt_required": obj.receipt_required,
        "daily_limit": obj.daily_limit, "monthly_limit": obj.monthly_limit,
        "yearly_limit": obj.yearly_limit, "eligible_categories": obj.eligible_categories,
        "created_at": obj.created_at.isoformat() if obj.created_at else None,
    }


def update_policy(db: Session, policy_id: str, payload: ExpensePolicyUpdate) -> Dict:
    obj = repo.get_policy(db, policy_id)
    if not obj:
        raise HTTPException(404, "Expense policy not found")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    repo.update_policy(db, obj, data)
    rows = list_policies(db, include_inactive=True)
    return next((r for r in rows if r["id"] == policy_id), {})


def delete_policy(db: Session, policy_id: str) -> None:
    obj = repo.get_policy(db, policy_id)
    if not obj:
        raise HTTPException(404, "Expense policy not found")
    from sqlalchemy.orm import object_session
    db.delete(obj)
    db.commit()


# ── Claim service ─────────────────────────────────────────────────────────────

def list_claims(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict:
    result = repo.list_claims(db, employee_id, status, search, page, page_size)
    result["items"] = [_claim_to_dict(c) for c in result["items"]]
    return result


def get_claim(db: Session, claim_id: str) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    return _claim_to_dict(obj, include_children=True)


def create_claim(db: Session, payload: ExpenseClaimCreate) -> Dict:
    now = datetime.utcnow()
    data: Dict[str, Any] = {
        "claim_number": _generate_claim_number(),
        "employee_id": payload.employee_id,
        "category_id": payload.category_id,
        "expense_date": payload.expense_date,
        "currency": payload.currency,
        "title": payload.title,
        "description": payload.description,
        "project": payload.project,
        "cost_center": payload.cost_center,
        "client_ref": payload.client_ref,
        "status": C.STATUS_DRAFT,
    }

    # single-line amount or computed from items
    if payload.items:
        total = sum(i.amount for i in payload.items)
        data["amount"] = total
    else:
        data["amount"] = payload.amount

    obj = repo.create_claim(db, data)

    for item in payload.items:
        item_data = item.model_dump()
        item_data["claim_id"] = obj.id
        repo.create_claim_item(db, item_data)

    db.refresh(obj)
    repo.log_activity(db, obj.id, C.ACT_CREATED, f"Claim {obj.claim_number} created")
    return _claim_to_dict(obj, include_children=True)


def update_claim(db: Session, claim_id: str, payload: ExpenseClaimUpdate) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in C.EDITABLE_STATUSES:
        raise HTTPException(400, f"Claim in '{obj.status}' status cannot be edited")

    data = {k: v for k, v in payload.model_dump(exclude={"items"}).items() if v is not None}

    if payload.items is not None:
        # replace items
        for item in obj.items:
            db.delete(item)
        db.flush()
        total = 0.0
        for item in payload.items:
            item_data = item.model_dump()
            item_data["claim_id"] = claim_id
            repo.create_claim_item(db, item_data)
            total += item.amount
        data["amount"] = total

    repo.update_claim(db, obj, data)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


def delete_claim(db: Session, claim_id: str) -> None:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in {C.STATUS_DRAFT, C.STATUS_RETURNED, C.STATUS_CANCELLED}:
        raise HTTPException(400, "Only Draft/Returned/Cancelled claims can be deleted")
    repo.soft_delete_claim(db, obj)


def submit_claim(db: Session, claim_id: str, actor_name: Optional[str] = None) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in {C.STATUS_DRAFT, C.STATUS_RETURNED}:
        raise HTTPException(400, f"Cannot submit a claim in '{obj.status}' status")
    if obj.amount <= 0:
        raise HTTPException(400, "Claim amount must be greater than zero")

    now = datetime.utcnow()
    repo.update_claim(db, obj, {
        "status": C.STATUS_SUBMITTED,
        "submitted_at": now,
        "rejection_reason": None,
        "return_reason": None,
    })

    # create level-1 approval record
    repo.create_approval(db, {
        "claim_id": claim_id,
        "approval_level": C.APPROVAL_LEVEL_MANAGER,
        "status": C.APPROVAL_PENDING,
    })

    repo.log_activity(db, claim_id, C.ACT_SUBMITTED, "Claim submitted for approval", actor_name=actor_name)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


def approve_claim(db: Session, claim_id: str, payload: ExpenseClaimApprove, actor_id: Optional[str] = None) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in {C.STATUS_SUBMITTED, C.STATUS_UNDER_REVIEW}:
        raise HTTPException(400, f"Cannot approve a claim in '{obj.status}' status")

    pending = repo.get_pending_approval(db, claim_id)
    if not pending:
        raise HTTPException(400, "No pending approval step found")

    approved_amount = payload.approved_amount if payload.approved_amount is not None else obj.amount
    if approved_amount > obj.amount:
        raise HTTPException(400, "Approved amount cannot exceed claimed amount")

    repo.update_approval(db, pending, {
        "status": C.APPROVAL_APPROVED,
        "approved_amount": approved_amount,
        "comments": payload.comments,
        "approver_id": actor_id,
        "approver_name": payload.approver_name,
        "approver_role": payload.approver_role,
        "actioned_at": datetime.utcnow(),
    })

    # determine if there is a next approval level
    remaining_levels = _count_remaining_levels(db, claim_id, pending.approval_level)
    if remaining_levels > 0:
        repo.create_approval(db, {
            "claim_id": claim_id,
            "approval_level": pending.approval_level + 1,
            "status": C.APPROVAL_PENDING,
        })
        repo.update_claim(db, obj, {"status": C.STATUS_UNDER_REVIEW})
    else:
        new_status = C.STATUS_APPROVED if approved_amount == obj.amount else C.STATUS_PARTIALLY_APPROVED
        repo.update_claim(db, obj, {
            "status": new_status,
            "approved_amount": approved_amount,
            "approved_at": datetime.utcnow(),
        })

    act = C.ACT_APPROVED if approved_amount == obj.amount else C.ACT_PARTIALLY_APPROVED
    repo.log_activity(db, claim_id, act,
                      f"Approved by {payload.approver_name or 'approver'} — ₹{approved_amount:,.2f}",
                      actor_id=actor_id, actor_name=payload.approver_name)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


def _count_remaining_levels(db: Session, claim_id: str, current_level: int) -> int:
    """Return how many more approval levels are needed (simplified: max 2 levels)."""
    from . import repository as r
    claim = r.get_claim(db, claim_id)
    if not claim:
        return 0
    # Use category approval requirement to decide if finance level is needed
    if claim.category and claim.category.approval_required and current_level < C.APPROVAL_LEVEL_FINANCE:
        return 1
    return 0


def reject_claim(db: Session, claim_id: str, payload: ExpenseClaimReject, actor_id: Optional[str] = None) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in {C.STATUS_SUBMITTED, C.STATUS_UNDER_REVIEW}:
        raise HTTPException(400, f"Cannot reject a claim in '{obj.status}' status")

    pending = repo.get_pending_approval(db, claim_id)
    if pending:
        repo.update_approval(db, pending, {
            "status": C.APPROVAL_REJECTED,
            "comments": payload.reason,
            "approver_id": actor_id,
            "approver_name": payload.approver_name,
            "approver_role": payload.approver_role,
            "actioned_at": datetime.utcnow(),
        })

    repo.update_claim(db, obj, {"status": C.STATUS_REJECTED, "rejection_reason": payload.reason})
    repo.log_activity(db, claim_id, C.ACT_REJECTED,
                      f"Rejected: {payload.reason}", actor_id=actor_id, actor_name=payload.approver_name)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


def cancel_claim(db: Session, claim_id: str, reason: Optional[str] = None, actor_name: Optional[str] = None) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status in C.TERMINAL_STATUSES:
        raise HTTPException(400, f"Claim in '{obj.status}' status cannot be cancelled")

    repo.update_claim(db, obj, {"status": C.STATUS_CANCELLED})
    repo.log_activity(db, claim_id, C.ACT_CANCELLED,
                      f"Cancelled{f': {reason}' if reason else ''}", actor_name=actor_name)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


def return_claim(db: Session, claim_id: str, payload: ExpenseClaimReturn, actor_name: Optional[str] = None) -> Dict:
    obj = repo.get_claim(db, claim_id)
    if not obj:
        raise HTTPException(404, "Expense claim not found")
    if obj.status not in {C.STATUS_SUBMITTED, C.STATUS_UNDER_REVIEW}:
        raise HTTPException(400, f"Cannot return a claim in '{obj.status}' status")

    pending = repo.get_pending_approval(db, claim_id)
    if pending:
        repo.update_approval(db, pending, {
            "status": C.APPROVAL_SKIPPED,
            "comments": payload.reason,
            "actioned_at": datetime.utcnow(),
        })

    repo.update_claim(db, obj, {"status": C.STATUS_RETURNED, "return_reason": payload.reason})
    repo.log_activity(db, claim_id, C.ACT_RETURNED,
                      f"Returned for correction: {payload.reason}", actor_name=actor_name)
    db.refresh(obj)
    return _claim_to_dict(obj, include_children=True)


# ── Reimbursement service ─────────────────────────────────────────────────────

def list_reimbursements(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict:
    result = repo.list_reimbursements(db, employee_id, status, page, page_size)
    result["items"] = [_reimb_to_dict(r) for r in result["items"]]
    return result


def process_reimbursement(db: Session, payload: ReimbursementCreate, actor_id: Optional[str] = None) -> Dict:
    claim = repo.get_claim(db, payload.claim_id)
    if not claim:
        raise HTTPException(404, "Expense claim not found")
    if claim.status not in {C.STATUS_APPROVED, C.STATUS_PARTIALLY_APPROVED}:
        raise HTTPException(400, "Only Approved or Partially Approved claims can be reimbursed")

    existing = repo.get_reimbursement_by_claim(db, payload.claim_id)
    if existing and existing.status in {C.REIMB_STATUS_PAID, C.REIMB_STATUS_PROCESSING}:
        raise HTTPException(409, "Reimbursement already processed for this claim")

    amount = claim.approved_amount or claim.amount
    data = {
        "claim_id": payload.claim_id,
        "employee_id": claim.employee_id,
        "amount": amount,
        "currency": claim.currency,
        "method": payload.method,
        "status": C.REIMB_STATUS_PENDING,
        "notes": payload.notes,
        "reimbursement_date": payload.reimbursement_date,
        "transaction_ref": payload.transaction_ref,
        "processed_by": actor_id,
    }
    obj = repo.create_reimbursement(db, data)

    repo.update_claim(db, claim, {
        "status": C.STATUS_REIMBURSED,
        "reimbursed_at": datetime.utcnow(),
    })
    repo.log_activity(db, payload.claim_id, C.ACT_REIMBURSED,
                      f"Reimbursement of ₹{amount:,.2f} via {payload.method} initiated",
                      actor_id=actor_id)
    return _reimb_to_dict(obj)


def mark_reimbursement_paid(db: Session, reimb_id: str, payload: ReimbursementUpdate) -> Dict:
    obj = repo.get_reimbursement(db, reimb_id)
    if not obj:
        raise HTTPException(404, "Reimbursement not found")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    repo.update_reimbursement(db, obj, data)
    return _reimb_to_dict(obj)


def get_pending_reimbursements_for_payroll(db: Session, employee_id: str) -> List[Dict]:
    rows = repo.get_pending_reimbursements_for_payroll(db, employee_id)
    return [_reimb_to_dict(r) for r in rows]


# ── Mileage service ───────────────────────────────────────────────────────────

def list_mileage_claims(
    db: Session,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict:
    result = repo.list_mileage_claims(db, employee_id, status, page, page_size)
    result["items"] = [_mileage_to_dict(m) for m in result["items"]]
    return result


def create_mileage_claim(db: Session, payload: MileageClaimCreate) -> Dict:
    total = round(payload.distance_km * payload.rate_per_km, 2)
    data = payload.model_dump()
    data["total_amount"] = total
    data["status"] = C.STATUS_DRAFT
    obj = repo.create_mileage_claim(db, data)
    return _mileage_to_dict(obj)


def update_mileage_claim(db: Session, mileage_id: str, payload: MileageClaimUpdate) -> Dict:
    obj = repo.get_mileage_claim(db, mileage_id)
    if not obj:
        raise HTTPException(404, "Mileage claim not found")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "distance_km" in data or "rate_per_km" in data:
        dist = data.get("distance_km", obj.distance_km)
        rate = data.get("rate_per_km", obj.rate_per_km)
        data["total_amount"] = round(dist * rate, 2)
    repo.update_mileage_claim(db, obj, data)
    db.refresh(obj)
    return _mileage_to_dict(obj)


def delete_mileage_claim(db: Session, mileage_id: str) -> None:
    obj = repo.get_mileage_claim(db, mileage_id)
    if not obj:
        raise HTTPException(404, "Mileage claim not found")
    if obj.status not in {C.STATUS_DRAFT}:
        raise HTTPException(400, "Only Draft mileage claims can be deleted")
    obj.is_deleted = True
    obj.updated_at = datetime.utcnow()
    from sqlalchemy.orm import object_session
    db_ = object_session(obj)
    if db_:
        db_.commit()


# ── Dashboard ─────────────────────────────────────────────────────────────────

def get_dashboard(db: Session) -> Dict:
    counts = repo.get_dashboard_counts(db)
    recent = repo.list_claims(db, page=1, page_size=5)
    counts["recent_claims"] = [_claim_to_dict(c) for c in recent["items"]]
    return counts
