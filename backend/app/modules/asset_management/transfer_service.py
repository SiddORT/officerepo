"""Service layer — Asset Transfers. Business logic and state transitions."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import transfer_repository as repo
from backend.app.modules.asset_management import assignment_repository as asgn_repo
from backend.app.modules.asset_management import inventory_repository as inv_repo
from backend.app.modules.asset_management.transfer_models import (
    AssetTransfer, AssetTransferAcknowledgement, AssetTransferActivity,
)

TRANSFER_TYPES = [
    "Employee Transfer",
    "Department Transfer",
    "Branch Transfer",
    "Company Transfer",
    "Temporary Transfer",
]

TRANSFER_REASONS = [
    "Employee Exit",
    "Role Change",
    "Department Change",
    "Branch Relocation",
    "Replacement",
    "Temporary Requirement",
]

TRANSFER_STATUSES = [
    "Draft",
    "Submitted",
    "Approved",
    "Rejected",
    "In Transit",
    "Completed",
    "Cancelled",
]

HANDOVER_CONDITIONS = ["Excellent", "Good", "Fair", "Damaged"]


# ── Serializers ────────────────────────────────────────────────────────────────

def _trf_dict(t: AssetTransfer, ack=None, activities=None) -> Dict[str, Any]:
    d = {
        "id": t.id,
        "client_id": t.client_id,
        "transfer_number": t.transfer_number,
        "asset_id": t.asset_id,
        "asset_number": t.asset_number,
        "asset_name": t.asset_name,
        "category_name": t.category_name,
        "from_assignment_id": t.from_assignment_id,
        "from_assignee_id": t.from_assignee_id,
        "from_assignee_name": t.from_assignee_name,
        "from_assignee_type": t.from_assignee_type,
        "from_employee_id": t.from_employee_id,
        "from_employee_name": t.from_employee_name,
        "from_branch_id": t.from_branch_id,
        "from_branch_name": t.from_branch_name,
        "from_department_id": t.from_department_id,
        "from_department_name": t.from_department_name,
        "to_assignee_id": t.to_assignee_id,
        "to_assignee_name": t.to_assignee_name,
        "to_assignee_type": t.to_assignee_type,
        "to_employee_id": t.to_employee_id,
        "to_employee_name": t.to_employee_name,
        "to_branch_id": t.to_branch_id,
        "to_branch_name": t.to_branch_name,
        "to_department_id": t.to_department_id,
        "to_department_name": t.to_department_name,
        "to_assignment_id": t.to_assignment_id,
        "transfer_type": t.transfer_type,
        "transfer_reason": t.transfer_reason,
        "is_temporary": t.is_temporary,
        "expected_return_date": t.expected_return_date.isoformat() if t.expected_return_date else None,
        "transfer_date": t.transfer_date.isoformat() if t.transfer_date else None,
        "remarks": t.remarks,
        "requested_by_id": t.requested_by_id,
        "requested_by_name": t.requested_by_name,
        "approved_by_id": t.approved_by_id,
        "approved_by_name": t.approved_by_name,
        "approved_at": t.approved_at.isoformat() if t.approved_at else None,
        "rejection_reason": t.rejection_reason,
        "status": t.status,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "cancelled_at": t.cancelled_at.isoformat() if t.cancelled_at else None,
        "cancel_reason": t.cancel_reason,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }
    if ack is not None:
        d["acknowledgement"] = _ack_dict(ack) if ack else None
    if activities is not None:
        d["activities"] = [_act_dict(a) for a in activities]
    return d


def _ack_dict(a: AssetTransferAcknowledgement) -> Dict[str, Any]:
    return {
        "id": a.id,
        "transfer_id": a.transfer_id,
        "asset_id": a.asset_id,
        "handover_date": a.handover_date.isoformat() if a.handover_date else None,
        "handed_over_by_id": a.handed_over_by_id,
        "handed_over_by_name": a.handed_over_by_name,
        "condition_at_handover": a.condition_at_handover,
        "handover_notes": a.handover_notes,
        "handover_confirmed": a.handover_confirmed,
        "received_date": a.received_date.isoformat() if a.received_date else None,
        "received_by_id": a.received_by_id,
        "received_by_name": a.received_by_name,
        "condition_at_receipt": a.condition_at_receipt,
        "receipt_notes": a.receipt_notes,
        "receipt_confirmed": a.receipt_confirmed,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _act_dict(a: AssetTransferActivity) -> Dict[str, Any]:
    return {
        "id": a.id,
        "transfer_id": a.transfer_id,
        "event": a.event,
        "description": a.description,
        "actor_id": a.actor_id,
        "actor_name": a.actor_name,
        "old_value": a.old_value,
        "new_value": a.new_value,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _log(db: Session, client_id: str, transfer_id: str, asset_id: str,
         event: str, description: str, actor_id=None, actor_name=None,
         old_value=None, new_value=None) -> None:
    repo.log_activity(db, {
        "client_id": client_id,
        "transfer_id": transfer_id,
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
        "transfer_types": TRANSFER_TYPES,
        "transfer_reasons": TRANSFER_REASONS,
        "transfer_statuses": TRANSFER_STATUSES,
        "handover_conditions": HANDOVER_CONDITIONS,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    counts = repo.get_dashboard_counts(db, client_id)
    rows, _ = repo.list_transfers(db, client_id, page=1, page_size=5)
    counts["recent_transfers"] = [_trf_dict(t) for t in rows]
    return counts


# ── Create ─────────────────────────────────────────────────────────────────────

def create_transfer(db: Session, client_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    assignment_id = payload.get("from_assignment_id")
    if not assignment_id:
        raise HTTPException(400, "from_assignment_id is required.")

    # Validate source assignment
    asgn = asgn_repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Source assignment not found.")
    if asgn.status != "Active":
        raise HTTPException(400, f"Only Active assignments can be transferred. Current status: {asgn.status}")

    # Asset status guard
    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)
    if asset:
        blocked_statuses = ["Under Maintenance", "Lost", "Disposed", "Reserved"]
        if asset.status in blocked_statuses:
            raise HTTPException(400, f"Asset cannot be transferred — current status: {asset.status}")

    # Prevent duplicate active transfer
    existing = repo.get_transfer_by_assignment(db, client_id, assignment_id, active_only=True)
    if existing:
        raise HTTPException(400, f"An active transfer already exists for this assignment: {existing.transfer_number}")

    # Validate same-person transfer
    to_assignee_id = payload.get("to_assignee_id")
    if to_assignee_id and to_assignee_id == asgn.assignee_id:
        raise HTTPException(400, "Target assignee cannot be the same as the current assignee.")

    # Temporary transfer end date validation
    is_temp = bool(payload.get("is_temporary", False))
    if is_temp and not payload.get("expected_return_date"):
        raise HTTPException(400, "expected_return_date is required for Temporary Transfers.")

    transfer_number = repo.next_transfer_number(db, client_id)
    data = {
        "client_id": client_id,
        "transfer_number": transfer_number,
        "asset_id": asgn.asset_id,
        "asset_number": asset.asset_number if asset else None,
        "asset_name": asset.asset_name if asset else None,
        "category_name": asset.category_name if asset else None,
        "from_assignment_id": assignment_id,
        "from_assignee_id": asgn.assignee_id,
        "from_assignee_name": asgn.assignee_name,
        "from_assignee_type": asgn.assignee_type,
        "from_employee_id": asgn.employee_id,
        "from_employee_name": asgn.employee_name,
        "from_branch_id": payload.get("from_branch_id") or getattr(asset, "branch_id", None),
        "from_branch_name": payload.get("from_branch_name"),
        "from_department_id": payload.get("from_department_id") or getattr(asset, "department_id", None),
        "from_department_name": payload.get("from_department_name"),
        "to_assignee_id": to_assignee_id,
        "to_assignee_name": payload.get("to_assignee_name"),
        "to_assignee_type": payload.get("to_assignee_type", "Employee"),
        "to_employee_id": payload.get("to_employee_id"),
        "to_employee_name": payload.get("to_employee_name"),
        "to_branch_id": payload.get("to_branch_id"),
        "to_branch_name": payload.get("to_branch_name"),
        "to_department_id": payload.get("to_department_id"),
        "to_department_name": payload.get("to_department_name"),
        "transfer_type": payload.get("transfer_type", "Employee Transfer"),
        "transfer_reason": payload.get("transfer_reason"),
        "is_temporary": is_temp,
        "expected_return_date": payload.get("expected_return_date"),
        "transfer_date": payload.get("transfer_date"),
        "remarks": payload.get("remarks"),
        "requested_by_id": str(actor_id) if actor_id else None,
        "requested_by_name": payload.get("requested_by_name") or actor_name,
        "status": "Draft",
    }
    obj = repo.create_transfer(db, data)
    _log(db, client_id, obj.id, obj.asset_id, "transfer_requested",
         f"Transfer request created: {obj.from_assignee_name} → {obj.to_assignee_name}",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Assigned", new_value="Draft")
    db.commit()
    return _trf_dict(obj)


# ── Submit ─────────────────────────────────────────────────────────────────────

def submit_transfer(db: Session, client_id: str, transfer_id: str,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status != "Draft":
        raise HTTPException(400, "Only Draft transfers can be submitted.")
    repo.update_transfer(db, obj, {"status": "Submitted"})
    _log(db, client_id, transfer_id, obj.asset_id, "transfer_submitted",
         "Transfer request submitted for approval.",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Draft", new_value="Submitted")
    db.commit()
    return _trf_dict(obj)


# ── Approve ────────────────────────────────────────────────────────────────────

def approve_transfer(db: Session, client_id: str, transfer_id: str,
                     actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status not in ("Submitted", "Draft"):
        raise HTTPException(400, "Only Submitted or Draft transfers can be approved.")
    repo.update_transfer(db, obj, {
        "status": "Approved",
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    _log(db, client_id, transfer_id, obj.asset_id, "transfer_approved",
         f"Transfer approved by {actor_name}.",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Approved")
    db.commit()
    return _trf_dict(obj)


# ── Reject ─────────────────────────────────────────────────────────────────────

def reject_transfer(db: Session, client_id: str, transfer_id: str, reason: str,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status not in ("Submitted", "Approved", "Draft"):
        raise HTTPException(400, "This transfer cannot be rejected.")
    repo.update_transfer(db, obj, {
        "status": "Rejected",
        "rejection_reason": reason,
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    _log(db, client_id, transfer_id, obj.asset_id, "transfer_rejected",
         f"Transfer rejected: {reason}",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Rejected")
    db.commit()
    return _trf_dict(obj)


# ── Cancel ─────────────────────────────────────────────────────────────────────

def cancel_transfer(db: Session, client_id: str, transfer_id: str, reason: str,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status in ("Completed", "Cancelled"):
        raise HTTPException(400, f"Cannot cancel a {obj.status} transfer.")
    repo.update_transfer(db, obj, {
        "status": "Cancelled",
        "cancelled_at": datetime.utcnow(),
        "cancel_reason": reason,
    })
    _log(db, client_id, transfer_id, obj.asset_id, "transfer_cancelled",
         f"Transfer cancelled: {reason}",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Cancelled")
    db.commit()
    return _trf_dict(obj)


# ── Record Handover (source hands over asset → status In Transit) ──────────────

def record_handover(db: Session, client_id: str, transfer_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status not in ("Approved", "Submitted", "Draft"):
        raise HTTPException(400, f"Cannot record handover for a transfer in '{obj.status}' status.")

    ack_data = {
        "handover_date": payload.get("handover_date") or date.today(),
        "handed_over_by_id": str(actor_id) if actor_id else None,
        "handed_over_by_name": payload.get("handed_over_by_name") or actor_name,
        "condition_at_handover": payload.get("condition_at_handover", "Good"),
        "handover_notes": payload.get("handover_notes"),
        "handover_confirmed": True,
    }
    repo.upsert_acknowledgement(db, transfer_id, obj.asset_id, client_id, ack_data)
    repo.update_transfer(db, obj, {"status": "In Transit"})

    _log(db, client_id, transfer_id, obj.asset_id, "asset_handed_over",
         f"Asset handed over by {ack_data['handed_over_by_name']}. Condition: {ack_data['condition_at_handover']}.",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Approved", new_value="In Transit")
    db.commit()
    ack = repo.get_acknowledgement(db, transfer_id)
    activities = repo.list_activities(db, transfer_id)
    return _trf_dict(obj, ack=ack, activities=activities)


# ── Complete Transfer (destination accepts + assignment swap) ──────────────────

def complete_transfer(db: Session, client_id: str, transfer_id: str, payload: dict,
                      actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    if obj.status not in ("In Transit", "Approved", "Submitted", "Draft"):
        raise HTTPException(400, f"Cannot complete a transfer in '{obj.status}' status.")

    received_date = payload.get("received_date") or date.today()
    condition = payload.get("condition_at_receipt", "Good")

    # Update or create acknowledgement with receipt info
    ack_data = {
        "received_date": received_date,
        "received_by_id": str(actor_id) if actor_id else None,
        "received_by_name": payload.get("received_by_name") or actor_name,
        "condition_at_receipt": condition,
        "receipt_notes": payload.get("receipt_notes"),
        "receipt_confirmed": True,
    }
    repo.upsert_acknowledgement(db, transfer_id, obj.asset_id, client_id, ack_data)

    # Close the old assignment
    old_asgn = asgn_repo.get_assignment(db, client_id, obj.from_assignment_id)
    if old_asgn and old_asgn.status == "Active":
        asgn_repo.update_assignment(db, old_asgn, {
            "status": "Transferred",
            "actual_return_date": received_date,
            "return_notes": f"Transferred to {obj.to_assignee_name}",
        })

    # Create a new assignment for the destination
    import uuid as _uuid_mod
    new_asgn_number = f"ASGN-{datetime.utcnow().strftime('%Y%m%d')}-{_uuid_mod.uuid4().hex[:8].upper()}"
    new_asgn_data = {
        "client_id": client_id,
        "asset_id": obj.asset_id,
        "assignment_number": new_asgn_number,
        "assignee_id": obj.to_assignee_id,
        "assignee_name": obj.to_assignee_name,
        "assignee_type": obj.to_assignee_type or "Employee",
        "employee_id": obj.to_employee_id,
        "employee_name": obj.to_employee_name,
        "assigned_date": received_date,
        "expected_return_date": obj.expected_return_date if obj.is_temporary else None,
        "status": "Active",
        "is_acknowledged": False,
        "assignment_notes": f"Transferred from {obj.from_assignee_name} via {obj.transfer_number}",
        "previous_assignment_id": obj.from_assignment_id,
    }
    new_asgn = asgn_repo.create_assignment(db, new_asgn_data)

    # Update inventory: keep status Assigned, update assignee + branch/dept
    asset = inv_repo.get_asset(db, client_id, obj.asset_id)
    if asset:
        inv_updates = {
            "status": "Assigned",
            "assigned_employee_id": obj.to_employee_id,
            "assigned_employee_name": obj.to_employee_name,
            "assigned_date": received_date,
        }
        if obj.to_branch_id:
            inv_updates["branch_id"] = obj.to_branch_id
        if obj.to_department_id:
            inv_updates["department_id"] = obj.to_department_id
        inv_repo.update_asset(db, asset, inv_updates)

    # Stamp the new assignment ID on the transfer record + complete it
    repo.update_transfer(db, obj, {
        "status": "Completed",
        "completed_at": datetime.utcnow(),
        "to_assignment_id": new_asgn.id,
        "transfer_date": received_date,
    })

    _log(db, client_id, transfer_id, obj.asset_id, "transfer_completed",
         f"Transfer completed. Asset received by {ack_data['received_by_name']}. New assignment created.",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.from_assignee_name, new_value=obj.to_assignee_name)
    db.commit()
    ack = repo.get_acknowledgement(db, transfer_id)
    activities = repo.list_activities(db, transfer_id)
    return _trf_dict(obj, ack=ack, activities=activities)


# ── List / Get ─────────────────────────────────────────────────────────────────

def list_transfers(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_transfers(db, client_id, **kwargs)
    return {"items": [_trf_dict(t) for t in rows], "total": total}


def get_transfer(db: Session, client_id: str, transfer_id: str) -> Dict[str, Any]:
    obj = repo.get_transfer(db, client_id, transfer_id)
    if not obj:
        raise HTTPException(404, "Transfer not found.")
    ack = repo.get_acknowledgement(db, transfer_id)
    activities = repo.list_activities(db, transfer_id)
    return _trf_dict(obj, ack=ack, activities=activities)
