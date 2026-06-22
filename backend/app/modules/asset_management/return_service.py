"""Service layer — Asset Returns. Business logic and state transitions."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import return_repository as repo
from backend.app.modules.asset_management import assignment_repository as asgn_repo
from backend.app.modules.asset_management import inventory_repository as inv_repo
from backend.app.modules.asset_management.return_models import (
    AssetReturn, AssetReturnAssessment, AssetReturnRecovery, AssetReturnActivity,
)

RETURN_TYPES   = ["Full Return", "Partial Return", "Temporary Assignment Return", "Replacement Return"]
RETURN_SOURCES = ["Employee Exit", "Replacement Request", "Temporary Assignment Expiry", "Manual Return", "Transfer Request"]
RETURN_REASONS = ["Employee Exit", "Project Completed", "Asset Upgrade", "Temporary Assignment Ended",
                  "Replacement Requested", "Asset No Longer Required"]
RETURN_STATUSES = ["Draft", "Submitted", "Approved", "Rejected", "In Progress", "Returned", "Closed"]
CONDITIONS      = ["Excellent", "Good", "Fair", "Damaged", "Lost"]
RECOVERY_TYPES  = ["Full Recovery", "Partial Recovery", "Waived"]


# ── Serializers ────────────────────────────────────────────────────────────────

def _ret_dict(r: AssetReturn, assessment=None, recovery=None, activities=None) -> Dict[str, Any]:
    d = {
        "id": r.id,
        "client_id": r.client_id,
        "return_number": r.return_number,
        "assignment_id": r.assignment_id,
        "asset_id": r.asset_id,
        "asset_number": r.asset_number,
        "asset_name": r.asset_name,
        "category_name": r.category_name,
        "assignee_id": r.assignee_id,
        "assignee_name": r.assignee_name,
        "employee_id": r.employee_id,
        "employee_name": r.employee_name,
        "return_type": r.return_type,
        "return_source": r.return_source,
        "return_reason": r.return_reason,
        "exit_id": r.exit_id,
        "request_id": r.request_id,
        "requested_by_id": r.requested_by_id,
        "requested_by_name": r.requested_by_name,
        "requested_return_date": r.requested_return_date.isoformat() if r.requested_return_date else None,
        "remarks": r.remarks,
        "return_date": r.return_date.isoformat() if r.return_date else None,
        "received_by_id": r.received_by_id,
        "received_by_name": r.received_by_name,
        "receiving_location": r.receiving_location,
        "return_notes": r.return_notes,
        "approved_by_id": r.approved_by_id,
        "approved_by_name": r.approved_by_name,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "rejection_reason": r.rejection_reason,
        "is_acknowledged": r.is_acknowledged,
        "acknowledged_at": r.acknowledged_at.isoformat() if r.acknowledged_at else None,
        "acknowledged_by_name": r.acknowledged_by_name,
        "status": r.status,
        "closed_at": r.closed_at.isoformat() if r.closed_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
    if assessment is not None:
        d["assessment"] = _assess_dict(assessment) if assessment else None
    if recovery is not None:
        d["recovery"] = _recovery_dict(recovery) if recovery else None
    if activities is not None:
        d["activities"] = [_act_dict(a) for a in activities]
    return d


def _assess_dict(a: AssetReturnAssessment) -> Dict[str, Any]:
    return {
        "id": a.id,
        "return_id": a.return_id,
        "asset_id": a.asset_id,
        "physical_condition": a.physical_condition,
        "functional_condition": a.functional_condition,
        "accessories_returned": a.accessories_returned,
        "inspection_notes": a.inspection_notes,
        "assessed_by_id": a.assessed_by_id,
        "assessed_by_name": a.assessed_by_name,
        "assessed_at": a.assessed_at.isoformat() if a.assessed_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _recovery_dict(r: AssetReturnRecovery) -> Dict[str, Any]:
    return {
        "id": r.id,
        "return_id": r.return_id,
        "asset_id": r.asset_id,
        "recovery_type": r.recovery_type,
        "estimated_cost": float(r.estimated_cost) if r.estimated_cost is not None else None,
        "approved_recovery_amount": float(r.approved_recovery_amount) if r.approved_recovery_amount is not None else None,
        "currency": r.currency,
        "recovery_notes": r.recovery_notes,
        "approved_by_id": r.approved_by_id,
        "approved_by_name": r.approved_by_name,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _act_dict(a: AssetReturnActivity) -> Dict[str, Any]:
    return {
        "id": a.id,
        "return_id": a.return_id,
        "event": a.event,
        "description": a.description,
        "actor_id": a.actor_id,
        "actor_name": a.actor_name,
        "old_value": a.old_value,
        "new_value": a.new_value,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _log(db: Session, client_id: str, return_id: str, asset_id: str,
         event: str, description: str, actor_id=None, actor_name=None,
         old_value=None, new_value=None) -> None:
    repo.log_activity(db, {
        "client_id": client_id,
        "return_id": return_id,
        "asset_id": asset_id,
        "event": event,
        "description": description,
        "actor_id": str(actor_id) if actor_id else None,
        "actor_name": actor_name,
        "old_value": old_value,
        "new_value": new_value,
    })


# ── Meta ───────────────────────────────────────────────────────────────────────

def get_meta_options() -> Dict[str, Any]:
    return {
        "return_types": RETURN_TYPES,
        "return_sources": RETURN_SOURCES,
        "return_reasons": RETURN_REASONS,
        "return_statuses": RETURN_STATUSES,
        "conditions": CONDITIONS,
        "recovery_types": RECOVERY_TYPES,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    counts = repo.get_dashboard_counts(db, client_id)
    rows, _ = repo.list_returns(db, client_id, page=1, page_size=5,
                                 status=None, overdue_only=False)
    counts["recent_returns"] = [_ret_dict(r) for r in rows]
    return counts


# ── Create / Submit ────────────────────────────────────────────────────────────

def create_return(db: Session, client_id: str, payload: dict,
                  actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    assignment_id = payload.get("assignment_id")
    if not assignment_id:
        raise HTTPException(400, "assignment_id is required.")

    # Validate assignment
    asgn = asgn_repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    if asgn.status != "Active":
        raise HTTPException(400, f"Only Active assignments can be returned. Current status: {asgn.status}")

    # Prevent duplicate active return
    existing = repo.get_return_by_assignment(db, client_id, assignment_id, active_only=True)
    if existing:
        raise HTTPException(400, f"An active return request already exists for this assignment: {existing.return_number}")

    # Fetch asset details
    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)

    return_number = repo.next_return_number(db, client_id)
    data = {
        "client_id": client_id,
        "return_number": return_number,
        "assignment_id": assignment_id,
        "asset_id": asgn.asset_id,
        "asset_number": asset.asset_number if asset else None,
        "asset_name": asset.asset_name if asset else None,
        "category_name": asset.category_name if asset else None,
        "assignee_id": asgn.assignee_id,
        "assignee_name": asgn.assignee_name,
        "employee_id": asgn.employee_id,
        "employee_name": asgn.employee_name,
        "return_type": payload.get("return_type", "Full Return"),
        "return_source": payload.get("return_source", "Manual Return"),
        "return_reason": payload.get("return_reason"),
        "exit_id": payload.get("exit_id"),
        "request_id": payload.get("request_id"),
        "requested_by_id": str(actor_id) if actor_id else None,
        "requested_by_name": payload.get("requested_by_name") or actor_name,
        "requested_return_date": payload.get("requested_return_date"),
        "remarks": payload.get("remarks"),
        "status": "Draft",
    }
    obj = repo.create_return(db, data)
    _log(db, client_id, obj.id, obj.asset_id, "return_requested",
         f"Return request created for {obj.asset_name}",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Active", new_value="Draft")
    db.commit()
    return _ret_dict(obj)


def submit_return(db: Session, client_id: str, return_id: str,
                  actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    if obj.status != "Draft":
        raise HTTPException(400, "Only Draft returns can be submitted.")
    repo.update_return(db, obj, {"status": "Submitted"})
    _log(db, client_id, return_id, obj.asset_id, "return_submitted",
         "Return request submitted for approval.",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Draft", new_value="Submitted")
    db.commit()
    return _ret_dict(obj)


# ── Approval ───────────────────────────────────────────────────────────────────

def approve_return(db: Session, client_id: str, return_id: str,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    if obj.status not in ("Submitted", "Draft"):
        raise HTTPException(400, "Only Submitted or Draft returns can be approved.")
    repo.update_return(db, obj, {
        "status": "Approved",
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    _log(db, client_id, return_id, obj.asset_id, "return_approved",
         f"Return approved by {actor_name}.",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Approved")
    db.commit()
    return _ret_dict(obj)


def reject_return(db: Session, client_id: str, return_id: str, reason: str,
                  actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    if obj.status not in ("Submitted", "Approved", "Draft"):
        raise HTTPException(400, "This return cannot be rejected.")
    repo.update_return(db, obj, {
        "status": "Rejected",
        "rejection_reason": reason,
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    _log(db, client_id, return_id, obj.asset_id, "return_rejected",
         f"Return rejected: {reason}",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Rejected")
    db.commit()
    return _ret_dict(obj)


# ── Complete Return (physical handover + inventory update) ────────────────────

def complete_return(db: Session, client_id: str, return_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    if obj.status not in ("Approved", "Submitted", "Draft", "In Progress"):
        raise HTTPException(400, f"Cannot complete a return in '{obj.status}' status.")

    condition = payload.get("physical_condition", "Good")
    return_date = payload.get("return_date") or date.today()

    # Update return record
    repo.update_return(db, obj, {
        "status": "Returned",
        "return_date": return_date,
        "received_by_id": str(actor_id) if actor_id else None,
        "received_by_name": payload.get("received_by_name") or actor_name,
        "receiving_location": payload.get("receiving_location"),
        "return_notes": payload.get("return_notes"),
        "is_acknowledged": payload.get("is_acknowledged", False),
        "acknowledged_at": datetime.utcnow() if payload.get("is_acknowledged") else None,
        "acknowledged_by_name": actor_name if payload.get("is_acknowledged") else None,
    })

    # Upsert condition assessment
    assessment_data = {
        "physical_condition": condition,
        "functional_condition": payload.get("functional_condition", condition),
        "accessories_returned": payload.get("accessories_returned", True),
        "inspection_notes": payload.get("inspection_notes"),
        "assessed_by_id": str(actor_id) if actor_id else None,
        "assessed_by_name": actor_name,
        "assessed_at": datetime.utcnow(),
    }
    repo.upsert_assessment(db, return_id, obj.asset_id, client_id, assessment_data)

    # Update assignment status
    asgn = asgn_repo.get_assignment(db, client_id, obj.assignment_id)
    if asgn and asgn.status == "Active":
        asgn_repo.update_assignment(db, asgn, {
            "status": "Returned",
            "actual_return_date": return_date,
            "return_notes": payload.get("return_notes"),
            "condition_on_return": condition,
            "returned_by": actor_name,
        })

    # Update inventory status based on condition
    if condition == "Damaged":
        new_asset_status = "Under Maintenance"
    elif condition == "Lost":
        new_asset_status = "Lost"
    else:
        new_asset_status = "Available"

    asset = inv_repo.get_asset(db, client_id, obj.asset_id)
    if asset:
        inv_repo.update_asset(db, asset, {
            "status": new_asset_status,
            "assigned_employee_id": None,
            "assigned_employee_name": None,
            "assigned_date": None,
            "expected_return_date": None,
            "assignment_notes": None,
        })

    _log(db, client_id, return_id, obj.asset_id, "asset_returned",
         f"Asset returned. Condition: {condition}. New inventory status: {new_asset_status}.",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Assigned", new_value=new_asset_status)
    db.commit()
    assessment = repo.get_assessment(db, return_id)
    recovery = repo.get_recovery(db, return_id)
    activities = repo.list_activities(db, return_id)
    return _ret_dict(obj, assessment=assessment, recovery=recovery, activities=activities)


# ── Assessment ─────────────────────────────────────────────────────────────────

def save_assessment(db: Session, client_id: str, return_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")

    data = {
        "physical_condition": payload.get("physical_condition"),
        "functional_condition": payload.get("functional_condition"),
        "accessories_returned": payload.get("accessories_returned", True),
        "inspection_notes": payload.get("inspection_notes"),
        "assessed_by_id": str(actor_id) if actor_id else None,
        "assessed_by_name": actor_name,
        "assessed_at": datetime.utcnow(),
    }
    assessment = repo.upsert_assessment(db, return_id, obj.asset_id, client_id, data)
    _log(db, client_id, return_id, obj.asset_id, "assessment_saved",
         f"Condition assessment recorded: {payload.get('physical_condition')}",
         actor_id=actor_id, actor_name=actor_name)
    db.commit()
    return _assess_dict(assessment)


# ── Recovery ───────────────────────────────────────────────────────────────────

def save_recovery(db: Session, client_id: str, return_id: str, payload: dict,
                  actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")

    data = {
        "recovery_type": payload.get("recovery_type", "Full Recovery"),
        "estimated_cost": payload.get("estimated_cost"),
        "approved_recovery_amount": payload.get("approved_recovery_amount"),
        "currency": payload.get("currency", "INR"),
        "recovery_notes": payload.get("recovery_notes"),
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow() if payload.get("approved_recovery_amount") else None,
    }
    recovery = repo.upsert_recovery(db, return_id, obj.asset_id, client_id, data)
    _log(db, client_id, return_id, obj.asset_id, "recovery_created",
         f"Recovery recorded: {payload.get('recovery_type')} — ₹{payload.get('approved_recovery_amount', 0)}",
         actor_id=actor_id, actor_name=actor_name)
    db.commit()
    return _recovery_dict(recovery)


# ── Close ──────────────────────────────────────────────────────────────────────

def close_return(db: Session, client_id: str, return_id: str,
                 actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    if obj.status != "Returned":
        raise HTTPException(400, "Only Returned records can be closed.")
    repo.update_return(db, obj, {"status": "Closed", "closed_at": datetime.utcnow()})
    _log(db, client_id, return_id, obj.asset_id, "return_closed",
         "Return closed.", actor_id=actor_id, actor_name=actor_name,
         old_value="Returned", new_value="Closed")
    db.commit()
    return _ret_dict(obj)


# ── List / Get ─────────────────────────────────────────────────────────────────

def list_returns(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_returns(db, client_id, **kwargs)
    return {"items": [_ret_dict(r) for r in rows], "total": total}


def get_return(db: Session, client_id: str, return_id: str) -> Dict[str, Any]:
    obj = repo.get_return(db, client_id, return_id)
    if not obj:
        raise HTTPException(404, "Return not found.")
    assessment = repo.get_assessment(db, return_id)
    recovery = repo.get_recovery(db, return_id)
    activities = repo.list_activities(db, return_id)
    return _ret_dict(obj, assessment=assessment, recovery=recovery, activities=activities)
