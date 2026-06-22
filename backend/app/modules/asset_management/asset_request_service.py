"""Service layer — Asset Requests."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import asset_request_repository as repo
from backend.app.modules.asset_management.inventory_models import AssetRequest

REQUEST_TYPES  = ["New Asset", "Replacement", "Repair", "Software", "Other"]
PRIORITIES     = ["Low", "Medium", "High", "Critical"]
STATUSES       = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Fulfilled", "Cancelled"]
TRANSITIONS = {
    "Draft":        ["Submitted", "Cancelled"],
    "Submitted":    ["Under Review", "Approved", "Rejected", "Cancelled"],
    "Under Review": ["Approved", "Rejected", "Cancelled"],
    "Approved":     ["Fulfilled", "Cancelled"],
    "Rejected":     [],
    "Fulfilled":    [],
    "Cancelled":    [],
}


def get_meta_options() -> Dict[str, Any]:
    return {
        "request_types": REQUEST_TYPES,
        "priorities": PRIORITIES,
        "statuses": STATUSES,
    }


def _to_dict(r: AssetRequest) -> Dict[str, Any]:
    return {
        "id": r.id,
        "client_id": r.client_id,
        "request_number": r.request_number,
        "request_type": r.request_type,
        "requested_by_id": r.requested_by_id,
        "requested_by_name": r.requested_by_name,
        "employee_id": r.employee_id,
        "employee_code": r.employee_code,
        "department_id": r.department_id,
        "department_name": r.department_name,
        "category_id": r.category_id,
        "category_name": r.category_name,
        "sub_category_id": r.sub_category_id,
        "sub_category_name": r.sub_category_name,
        "asset_master_id": r.asset_master_id,
        "asset_master_name": r.asset_master_name,
        "specific_asset_id": r.specific_asset_id,
        "specific_asset_name": r.specific_asset_name,
        "free_text_asset": r.free_text_asset,
        "quantity": r.quantity,
        "justification": r.justification,
        "priority": r.priority,
        "required_by": r.required_by.isoformat() if r.required_by else None,
        "notes": r.notes,
        "status": r.status,
        "approved_by_id": r.approved_by_id,
        "approved_by_name": r.approved_by_name,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "approval_notes": r.approval_notes,
        "rejected_by_id": r.rejected_by_id,
        "rejected_by_name": r.rejected_by_name,
        "rejected_at": r.rejected_at.isoformat() if r.rejected_at else None,
        "rejection_reason": r.rejection_reason,
        "fulfilled_by_id": r.fulfilled_by_id,
        "fulfilled_by_name": r.fulfilled_by_name,
        "fulfilled_at": r.fulfilled_at.isoformat() if r.fulfilled_at else None,
        "fulfillment_notes": r.fulfillment_notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _get_or_404(db: Session, client_id: str, request_id: str) -> AssetRequest:
    r = repo.get_request(db, client_id, request_id)
    if not r:
        raise HTTPException(404, "Asset request not found.")
    return r


def list_requests(
    db: Session,
    client_id: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    result = repo.list_requests(
        db, client_id,
        search=search, status=status, priority=priority,
        request_type=request_type, page=page, page_size=page_size,
    )
    return {**result, "items": [_to_dict(r) for r in result["items"]]}


def create_request(
    db: Session,
    client_id: str,
    payload: dict,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    data = dict(payload)
    data.setdefault("requested_by_id", actor_id)
    data.setdefault("requested_by_name", actor_name)
    data.setdefault("status", "Draft")
    r = repo.create_request(db, client_id, data)
    return _to_dict(r)


def get_request(db: Session, client_id: str, request_id: str) -> Dict[str, Any]:
    return _to_dict(_get_or_404(db, client_id, request_id))


def update_request(
    db: Session,
    client_id: str,
    request_id: str,
    payload: dict,
    actor_id: Optional[str] = None,
    actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    if r.status not in ("Draft",):
        raise HTTPException(400, f"Cannot edit a request in '{r.status}' status.")
    return _to_dict(repo.update_request(db, r, payload))


def _transition(
    db: Session, r: AssetRequest, new_status: str, updates: dict
) -> AssetRequest:
    allowed = TRANSITIONS.get(r.status, [])
    if new_status not in allowed:
        raise HTTPException(400, f"Cannot move from '{r.status}' to '{new_status}'.")
    r.status = new_status
    for k, v in updates.items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


def submit_request(
    db: Session, client_id: str, request_id: str,
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Submitted", {}))


def review_request(
    db: Session, client_id: str, request_id: str,
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Under Review", {}))


def approve_request(
    db: Session, client_id: str, request_id: str,
    notes: str = "",
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Approved", {
        "approved_by_id": actor_id,
        "approved_by_name": actor_name,
        "approved_at": datetime.utcnow(),
        "approval_notes": notes,
    }))


def reject_request(
    db: Session, client_id: str, request_id: str,
    reason: str = "",
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Rejected", {
        "rejected_by_id": actor_id,
        "rejected_by_name": actor_name,
        "rejected_at": datetime.utcnow(),
        "rejection_reason": reason,
    }))


def cancel_request(
    db: Session, client_id: str, request_id: str,
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Cancelled", {}))


def fulfil_request(
    db: Session, client_id: str, request_id: str,
    notes: str = "",
    actor_id: Optional[str] = None, actor_name: Optional[str] = None,
) -> Dict[str, Any]:
    r = _get_or_404(db, client_id, request_id)
    return _to_dict(_transition(db, r, "Fulfilled", {
        "fulfilled_by_id": actor_id,
        "fulfilled_by_name": actor_name,
        "fulfilled_at": datetime.utcnow(),
        "fulfillment_notes": notes,
    }))
