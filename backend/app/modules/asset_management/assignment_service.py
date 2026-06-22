"""Service layer — Asset Assignments. Full lifecycle business logic."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import assignment_repository as repo
from backend.app.modules.asset_management import inventory_repository as inv_repo
from backend.app.modules.asset_management.inventory_models import (
    Asset, AssetAssignment, AssetAssignmentRequest, AssetAcknowledgement, AssetAssignmentHistory,
)

ASSIGNEE_TYPES  = ["Employee", "Department", "Branch", "Company"]
ASSIGNMENT_TYPES= ["Permanent", "Temporary", "Project"]
SOURCES         = ["Manual Assignment", "Employee Onboarding", "Replacement", "Transfer", "Temporary Assignment", "Project Assignment"]
PRIORITIES      = ["Low", "Medium", "High", "Critical"]
REQUEST_STATUSES= ["Draft", "Submitted", "Approved", "Rejected", "Fulfilled"]
ASSIGNMENT_STATUSES = ["Active", "Returned", "Transferred", "Lost", "Damaged"]
CONDITIONS_ON_ASSIGN = ["New", "Good", "Fair"]
CONDITIONS_ON_RETURN = ["Good", "Damaged", "Lost"]


def _req_dict(r: AssetAssignmentRequest) -> Dict[str, Any]:
    return {
        "id": r.id,
        "client_id": r.client_id,
        "request_number": r.request_number,
        "requested_by_id": r.requested_by_id,
        "requested_by_name": r.requested_by_name,
        "asset_category_id": r.asset_category_id,
        "asset_category_name": r.asset_category_name,
        "asset_id": r.asset_id,
        "asset_name": r.asset_name,
        "justification": r.justification,
        "priority": r.priority,
        "required_by": r.required_by.isoformat() if r.required_by else None,
        "status": r.status,
        "approved_by_id": r.approved_by_id,
        "approved_by_name": r.approved_by_name,
        "approved_at": r.approved_at,
        "rejection_reason": r.rejection_reason,
        "fulfilled_at": r.fulfilled_at,
        "assignment_id": r.assignment_id,
        "remarks": r.remarks,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


def _asgn_dict(a: AssetAssignment, asset: Optional[Asset] = None) -> Dict[str, Any]:
    d = {
        "id": a.id,
        "client_id": a.client_id,
        "asset_id": a.asset_id,
        "assignment_number": a.assignment_number,
        "assignee_type": a.assignee_type,
        "assignee_id": a.assignee_id,
        "assignee_name": a.assignee_name,
        "employee_id": a.employee_id,
        "employee_name": a.employee_name,
        "employee_code": a.employee_code,
        "assignment_type": a.assignment_type,
        "assignment_source": a.assignment_source,
        "source_reference_id": a.source_reference_id,
        "request_id": a.request_id,
        "assigned_date": a.assigned_date.isoformat() if a.assigned_date else None,
        "expected_return_date": a.expected_return_date.isoformat() if a.expected_return_date else None,
        "actual_return_date": a.actual_return_date.isoformat() if a.actual_return_date else None,
        "condition_on_assign": a.condition_on_assign,
        "assignment_notes": a.assignment_notes,
        "return_notes": a.return_notes,
        "condition_on_return": a.condition_on_return,
        "status": a.status,
        "is_acknowledged": a.is_acknowledged,
        "acknowledged_at": a.acknowledged_at,
        "transferred_to_id": a.transferred_to_id,
        "assigned_by": a.assigned_by,
        "assigned_by_id": a.assigned_by_id,
        "returned_by": a.returned_by,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }
    if asset:
        d["asset"] = {
            "id": asset.id,
            "asset_number": asset.asset_number,
            "asset_name": asset.asset_name,
            "category_name": asset.category_name,
            "brand": asset.brand,
            "model_number": asset.model_number,
            "serial_number": asset.serial_number,
            "status": asset.status,
        }
    return d


def _ack_dict(a: AssetAcknowledgement) -> Dict[str, Any]:
    return {
        "id": a.id,
        "assignment_id": a.assignment_id,
        "asset_id": a.asset_id,
        "acknowledged_by_id": a.acknowledged_by_id,
        "acknowledged_by_name": a.acknowledged_by_name,
        "acknowledged_at": a.acknowledged_at,
        "notes": a.notes,
        "is_confirmed": a.is_confirmed,
        "created_at": a.created_at,
    }


def _hist_dict(h: AssetAssignmentHistory) -> Dict[str, Any]:
    return {
        "id": h.id,
        "asset_id": h.asset_id,
        "assignment_id": h.assignment_id,
        "event": h.event,
        "description": h.description,
        "actor_id": h.actor_id,
        "actor_name": h.actor_name,
        "old_value": h.old_value,
        "new_value": h.new_value,
        "created_at": h.created_at,
    }


def _hist(db: Session, client_id: str, asset_id: str, assignment_id: Optional[str],
          event: str, description: str, actor_id=None, actor_name=None,
          old_value=None, new_value=None) -> None:
    repo.log_history(db, {
        "client_id": client_id,
        "asset_id": asset_id,
        "assignment_id": assignment_id,
        "event": event,
        "description": description,
        "actor_id": str(actor_id) if actor_id else None,
        "actor_name": actor_name,
        "old_value": old_value,
        "new_value": new_value,
    })


def get_meta_options() -> Dict[str, Any]:
    return {
        "assignee_types": ASSIGNEE_TYPES,
        "assignment_types": ASSIGNMENT_TYPES,
        "assignment_sources": SOURCES,
        "priorities": PRIORITIES,
        "request_statuses": REQUEST_STATUSES,
        "assignment_statuses": ASSIGNMENT_STATUSES,
        "conditions_on_assign": CONDITIONS_ON_ASSIGN,
        "conditions_on_return": CONDITIONS_ON_RETURN,
    }


def get_dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    counts = repo.get_dashboard_counts(db, client_id)
    # Recent active assignments
    rows, _ = repo.list_assignments_all(db, client_id, status="Active", page=1, page_size=5)
    recent = []
    for a in rows:
        asset = inv_repo.get_asset(db, client_id, a.asset_id)
        recent.append(_asgn_dict(a, asset))
    counts["recent_assignments"] = recent
    return counts


# ── Assignment Requests ────────────────────────────────────────────────────────

def create_request(db: Session, client_id: str, payload: dict,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req_number = repo.next_request_number(db, client_id)
    data = {**payload, "client_id": client_id, "request_number": req_number,
            "requested_by_id": str(actor_id) if actor_id else None,
            "requested_by_name": actor_name, "status": "Draft"}
    obj = repo.create_request(db, data)
    return _req_dict(obj)


def update_request(db: Session, client_id: str, request_id: str, payload: dict,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Request not found.")
    if req.status not in ("Draft",):
        raise HTTPException(400, "Only Draft requests can be edited.")
    data = {k: v for k, v in payload.items() if v is not None}
    obj = repo.update_request(db, req, data)
    return _req_dict(obj)


def submit_request(db: Session, client_id: str, request_id: str,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Request not found.")
    if req.status != "Draft":
        raise HTTPException(400, "Only Draft requests can be submitted.")
    obj = repo.update_request(db, req, {"status": "Submitted"})
    return _req_dict(obj)


def approve_request(db: Session, client_id: str, request_id: str,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Request not found.")
    if req.status != "Submitted":
        raise HTTPException(400, "Only Submitted requests can be approved.")
    obj = repo.update_request(db, req, {
        "status": "Approved",
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    return _req_dict(obj)


def reject_request(db: Session, client_id: str, request_id: str, reason: str,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Request not found.")
    if req.status not in ("Submitted", "Approved"):
        raise HTTPException(400, "Only Submitted/Approved requests can be rejected.")
    obj = repo.update_request(db, req, {
        "status": "Rejected",
        "rejection_reason": reason,
        "approved_by_id": str(actor_id) if actor_id else None,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
    })
    return _req_dict(obj)


def list_requests(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_requests(db, client_id, **kwargs)
    return {"items": [_req_dict(r) for r in rows], "total": total}


def get_request(db: Session, client_id: str, request_id: str) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Request not found.")
    return _req_dict(req)


# ── Asset Assignments ──────────────────────────────────────────────────────────

def assign_asset(db: Session, client_id: str, asset_id: str, payload: dict,
                 actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asset = inv_repo.get_asset(db, client_id, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found.")
    if asset.status not in ("Available", "Draft"):
        raise HTTPException(400, f"Asset must be Available to assign. Current: {asset.status}")

    # Prevent duplicate active assignments
    existing = repo.get_active_assignment(db, asset_id)
    if existing:
        raise HTTPException(400, "Asset already has an active assignment.")

    asgn_number = repo.next_assignment_number(db, client_id)

    # Normalize assignee: if Employee, mirror legacy fields
    assignee_type = payload.get("assignee_type", "Employee")
    assignee_id   = payload.get("assignee_id")
    assignee_name = payload.get("assignee_name")

    data = {
        "client_id": client_id,
        "asset_id": asset_id,
        "assignment_number": asgn_number,
        "assignee_type": assignee_type,
        "assignee_id": assignee_id,
        "assignee_name": assignee_name,
        "employee_id": assignee_id if assignee_type == "Employee" else None,
        "employee_name": assignee_name if assignee_type == "Employee" else None,
        "employee_code": payload.get("employee_code"),
        "assignment_type": payload.get("assignment_type", "Permanent"),
        "assignment_source": payload.get("assignment_source", "Manual Assignment"),
        "source_reference_id": payload.get("source_reference_id"),
        "request_id": payload.get("request_id"),
        "assigned_date": payload.get("assigned_date") or date.today(),
        "expected_return_date": payload.get("expected_return_date"),
        "condition_on_assign": payload.get("condition_on_assign", "Good"),
        "assignment_notes": payload.get("assignment_notes"),
        "status": "Active",
        "assigned_by": actor_name,
        "assigned_by_id": str(actor_id) if actor_id else None,
        "is_acknowledged": False,
    }
    asgn = repo.create_assignment(db, data)

    # Update inventory
    inv_repo.update_asset(db, asset, {
        "status": "Assigned",
        "assigned_employee_id": assignee_id if assignee_type == "Employee" else None,
        "assigned_employee_name": assignee_name if assignee_type == "Employee" else None,
        "assigned_date": data["assigned_date"],
        "expected_return_date": data["expected_return_date"],
        "assignment_notes": data["assignment_notes"],
    })

    # If fulfilled from a request, mark it
    if payload.get("request_id"):
        req = repo.get_request(db, client_id, payload["request_id"])
        if req:
            repo.update_request(db, req, {
                "status": "Fulfilled",
                "assignment_id": asgn.id,
                "fulfilled_at": datetime.utcnow(),
            })

    _hist(db, client_id, asset_id, asgn.id, "assigned",
          f"Assigned to {assignee_name} ({assignee_type}) as {data['assignment_type']}",
          actor_id=actor_id, actor_name=actor_name,
          old_value="Available", new_value=f"Assigned→{assignee_name}")

    return _asgn_dict(asgn, asset)


def return_asset(db: Session, client_id: str, assignment_id: str, payload: dict,
                 actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asgn = repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    if asgn.status != "Active":
        raise HTTPException(400, "Only active assignments can be returned.")

    condition = payload.get("condition_on_return", "Good")
    new_status = "Damaged" if condition == "Damaged" else \
                 "Lost"    if condition == "Lost"    else "Available"

    repo.update_assignment(db, asgn, {
        "status": "Returned",
        "actual_return_date": payload.get("return_date") or date.today(),
        "return_notes": payload.get("return_notes"),
        "condition_on_return": condition,
        "returned_by": actor_name,
    })

    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)
    if asset:
        inv_repo.update_asset(db, asset, {
            "status": new_status,
            "assigned_employee_id": None,
            "assigned_employee_name": None,
            "assigned_date": None,
            "expected_return_date": None,
            "assignment_notes": None,
        })

    _hist(db, client_id, asgn.asset_id, assignment_id, "returned",
          f"Returned by {asgn.assignee_name or asgn.employee_name} — condition: {condition}",
          actor_id=actor_id, actor_name=actor_name,
          old_value=f"Assigned→{asgn.assignee_name}", new_value=new_status)

    return _asgn_dict(asgn)


def transfer_asset(db: Session, client_id: str, assignment_id: str, payload: dict,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    old_asgn = repo.get_assignment(db, client_id, assignment_id)
    if not old_asgn:
        raise HTTPException(404, "Assignment not found.")
    if old_asgn.status != "Active":
        raise HTTPException(400, "Only active assignments can be transferred.")

    # Close old assignment
    repo.update_assignment(db, old_asgn, {
        "status": "Transferred",
        "actual_return_date": date.today(),
        "return_notes": payload.get("transfer_reason"),
    })

    # Create new assignment
    new_payload = {
        **payload,
        "assignment_source": "Transfer",
        "source_reference_id": assignment_id,
    }
    new_asgn = assign_asset(db, client_id, old_asgn.asset_id, new_payload,
                             actor_id=actor_id, actor_name=actor_name)

    # Link transfer
    repo.update_assignment(db, old_asgn, {"transferred_to_id": new_asgn["id"]})

    _hist(db, client_id, old_asgn.asset_id, assignment_id, "transferred",
          f"Transferred from {old_asgn.assignee_name} to {payload.get('assignee_name')}",
          actor_id=actor_id, actor_name=actor_name)

    return new_asgn


def report_damage(db: Session, client_id: str, assignment_id: str,
                  damage_notes: str, actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asgn = repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    repo.update_assignment(db, asgn, {"status": "Damaged"})
    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)
    if asset:
        inv_repo.update_asset(db, asset, {"status": "Under Maintenance"})
    _hist(db, client_id, asgn.asset_id, assignment_id, "damaged",
          f"Damage reported: {damage_notes}", actor_id=actor_id, actor_name=actor_name)
    return _asgn_dict(asgn)


def mark_lost(db: Session, client_id: str, assignment_id: str,
              notes: str, actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asgn = repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    repo.update_assignment(db, asgn, {"status": "Lost", "return_notes": notes})
    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)
    if asset:
        inv_repo.update_asset(db, asset, {"status": "Lost"})
    _hist(db, client_id, asgn.asset_id, assignment_id, "lost",
          f"Marked lost: {notes}", actor_id=actor_id, actor_name=actor_name)
    return _asgn_dict(asgn)


def acknowledge_assignment(db: Session, client_id: str, assignment_id: str,
                           notes: str, actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asgn = repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    if asgn.status != "Active":
        raise HTTPException(400, "Can only acknowledge active assignments.")

    now = datetime.utcnow()
    # Update or create acknowledgement record
    existing = repo.get_acknowledgement(db, assignment_id)
    if existing:
        repo.update_acknowledgement(db, existing, {
            "is_confirmed": True,
            "acknowledged_at": now,
            "acknowledged_by_id": str(actor_id) if actor_id else None,
            "acknowledged_by_name": actor_name,
            "notes": notes,
        })
        ack = existing
    else:
        ack = repo.create_acknowledgement(db, {
            "client_id": client_id,
            "assignment_id": assignment_id,
            "asset_id": asgn.asset_id,
            "acknowledged_by_id": str(actor_id) if actor_id else None,
            "acknowledged_by_name": actor_name,
            "acknowledged_at": now,
            "notes": notes,
            "is_confirmed": True,
        })

    repo.update_assignment(db, asgn, {
        "is_acknowledged": True,
        "acknowledged_at": now,
    })
    _hist(db, client_id, asgn.asset_id, assignment_id, "acknowledged",
          f"Acknowledged by {actor_name}", actor_id=actor_id, actor_name=actor_name)
    return _ack_dict(ack)


def list_assignments(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_assignments_all(db, client_id, **kwargs)
    result = []
    for a in rows:
        asset = inv_repo.get_asset(db, client_id, a.asset_id)
        result.append(_asgn_dict(a, asset))
    return {"items": result, "total": total}


def get_assignment(db: Session, client_id: str, assignment_id: str) -> Dict[str, Any]:
    asgn = repo.get_assignment(db, client_id, assignment_id)
    if not asgn:
        raise HTTPException(404, "Assignment not found.")
    asset = inv_repo.get_asset(db, client_id, asgn.asset_id)
    d = _asgn_dict(asgn, asset)
    ack = repo.get_acknowledgement(db, assignment_id)
    d["acknowledgement"] = _ack_dict(ack) if ack else None
    d["history"] = [_hist_dict(h) for h in repo.list_assignment_history(db, assignment_id)]
    return d


def get_employee_assets(db: Session, client_id: str, employee_id: str) -> List[Dict[str, Any]]:
    rows = repo.list_employee_assignments(db, client_id, employee_id)
    result = []
    for a in rows:
        asset = inv_repo.get_asset(db, client_id, a.asset_id)
        result.append(_asgn_dict(a, asset))
    return result
