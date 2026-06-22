"""Service layer — Asset Maintenance. Business logic and state transitions."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import maintenance_repository as repo
from backend.app.modules.asset_management import inventory_repository as inv_repo
from backend.app.modules.asset_management.maintenance_models import (
    AssetMaintenanceRequest,
    AssetWorkOrder,
    AssetWarranty,
    AssetAmcContract,
)

MAINTENANCE_TYPES = [
    "Preventive Maintenance",
    "Corrective Maintenance",
    "Breakdown Maintenance",
    "Scheduled Service",
    "Calibration",
    "Warranty Repair",
    "AMC Service",
]

ISSUE_CATEGORIES = [
    "Hardware",
    "Software",
    "Electrical",
    "Mechanical",
    "Network",
    "Performance",
    "Calibration",
    "Physical Damage",
]

PRIORITIES = ["Low", "Medium", "High", "Critical"]

REQUEST_STATUSES = [
    "Open",
    "Assigned",
    "Under Inspection",
    "Under Repair",
    "Waiting For Parts",
    "Quality Check",
    "Completed",
    "Closed",
    "Cancelled",
]

WORK_ORDER_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"]
WARRANTY_STATUSES   = ["Active", "Expired", "Extended"]
AMC_STATUSES        = ["Active", "Expired", "Renewed"]


# ── Serializers ────────────────────────────────────────────────────────────────

def _req_dict(r: AssetMaintenanceRequest, work_order=None, activities=None) -> Dict[str, Any]:
    d = {
        "id": r.id,
        "client_id": r.client_id,
        "request_number": r.request_number,
        "asset_id": r.asset_id,
        "asset_number": r.asset_number,
        "asset_name": r.asset_name,
        "category_name": r.category_name,
        "reported_by_id": r.reported_by_id,
        "reported_by_name": r.reported_by_name,
        "maintenance_type": r.maintenance_type,
        "issue_category": r.issue_category,
        "issue_description": r.issue_description,
        "priority": r.priority,
        "reported_date": r.reported_date.isoformat() if r.reported_date else None,
        "estimated_downtime_hours": r.estimated_downtime_hours,
        "assigned_technician_id": r.assigned_technician_id,
        "assigned_technician_name": r.assigned_technician_name,
        "vendor_name": r.vendor_name,
        "vendor_contact": r.vendor_contact,
        "vendor_support_contract": r.vendor_support_contract,
        "warranty_id": r.warranty_id,
        "amc_id": r.amc_id,
        "work_order_id": r.work_order_id,
        "downtime_start": r.downtime_start.isoformat() if r.downtime_start else None,
        "downtime_end": r.downtime_end.isoformat() if r.downtime_end else None,
        "total_downtime_hours": r.total_downtime_hours,
        "resolution_notes": r.resolution_notes,
        "next_service_date": r.next_service_date.isoformat() if r.next_service_date else None,
        "status": r.status,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "closed_at": r.closed_at.isoformat() if r.closed_at else None,
        "cancelled_at": r.cancelled_at.isoformat() if r.cancelled_at else None,
        "cancel_reason": r.cancel_reason,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }
    if work_order is not None:
        d["work_order"] = _wo_dict(work_order) if work_order else None
    if activities is not None:
        d["activities"] = [_act_dict(a) for a in activities]
    return d


def _wo_dict(w: AssetWorkOrder) -> Dict[str, Any]:
    return {
        "id": w.id,
        "client_id": w.client_id,
        "work_order_number": w.work_order_number,
        "request_id": w.request_id,
        "asset_id": w.asset_id,
        "vendor_name": w.vendor_name,
        "vendor_contact": w.vendor_contact,
        "vendor_support_contract": w.vendor_support_contract,
        "service_sla": w.service_sla,
        "assigned_technician_name": w.assigned_technician_name,
        "planned_start_date": w.planned_start_date.isoformat() if w.planned_start_date else None,
        "planned_end_date": w.planned_end_date.isoformat() if w.planned_end_date else None,
        "actual_start_date": w.actual_start_date.isoformat() if w.actual_start_date else None,
        "actual_end_date": w.actual_end_date.isoformat() if w.actual_end_date else None,
        "parts_used": w.parts_used,
        "labor_hours": w.labor_hours,
        "resolution_notes": w.resolution_notes,
        "labor_cost": w.labor_cost,
        "parts_cost": w.parts_cost,
        "vendor_charges": w.vendor_charges,
        "transport_cost": w.transport_cost,
        "misc_cost": w.misc_cost,
        "total_cost": w.total_cost,
        "currency": w.currency,
        "status": w.status,
        "completed_at": w.completed_at.isoformat() if w.completed_at else None,
        "cancelled_at": w.cancelled_at.isoformat() if w.cancelled_at else None,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }


def _warranty_dict(w: AssetWarranty) -> Dict[str, Any]:
    return {
        "id": w.id,
        "client_id": w.client_id,
        "asset_id": w.asset_id,
        "asset_number": w.asset_number,
        "asset_name": w.asset_name,
        "warranty_provider": w.warranty_provider,
        "vendor_contact": w.vendor_contact,
        "warranty_start_date": w.warranty_start_date.isoformat() if w.warranty_start_date else None,
        "warranty_end_date": w.warranty_end_date.isoformat() if w.warranty_end_date else None,
        "coverage_details": w.coverage_details,
        "claim_process": w.claim_process,
        "status": w.status,
        "alert_sent_90": w.alert_sent_90,
        "alert_sent_60": w.alert_sent_60,
        "alert_sent_30": w.alert_sent_30,
        "notes": w.notes,
        "created_at": w.created_at.isoformat() if w.created_at else None,
        "updated_at": w.updated_at.isoformat() if w.updated_at else None,
    }


def _amc_dict(a: AssetAmcContract) -> Dict[str, Any]:
    return {
        "id": a.id,
        "client_id": a.client_id,
        "asset_id": a.asset_id,
        "asset_number": a.asset_number,
        "asset_name": a.asset_name,
        "amc_number": a.amc_number,
        "vendor_name": a.vendor_name,
        "vendor_contact": a.vendor_contact,
        "service_sla": a.service_sla,
        "contract_value": a.contract_value,
        "currency": a.currency,
        "coverage": a.coverage,
        "start_date": a.start_date.isoformat() if a.start_date else None,
        "end_date": a.end_date.isoformat() if a.end_date else None,
        "renewal_date": a.renewal_date.isoformat() if a.renewal_date else None,
        "status": a.status,
        "renewal_reminder_sent": a.renewal_reminder_sent,
        "notes": a.notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _act_dict(a) -> Dict[str, Any]:
    return {
        "id": a.id,
        "request_id": a.request_id,
        "event": a.event,
        "description": a.description,
        "actor_id": a.actor_id,
        "actor_name": a.actor_name,
        "old_value": a.old_value,
        "new_value": a.new_value,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _log(db: Session, client_id: str, request_id: str, asset_id: str,
         event: str, description: str, actor_id=None, actor_name=None,
         old_value=None, new_value=None) -> None:
    repo.log_activity(db, {
        "client_id": client_id,
        "request_id": request_id,
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
        "maintenance_types": MAINTENANCE_TYPES,
        "issue_categories": ISSUE_CATEGORIES,
        "priorities": PRIORITIES,
        "request_statuses": REQUEST_STATUSES,
        "work_order_statuses": WORK_ORDER_STATUSES,
        "warranty_statuses": WARRANTY_STATUSES,
        "amc_statuses": AMC_STATUSES,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

def get_dashboard(db: Session, client_id: str) -> Dict[str, Any]:
    counts = repo.get_dashboard_counts(db, client_id)
    rows, _ = repo.list_requests(db, client_id, page=1, page_size=5)
    counts["recent_requests"] = [_req_dict(r) for r in rows]
    return counts


# ── Create Request ─────────────────────────────────────────────────────────────

def create_request(db: Session, client_id: str, payload: dict,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asset_id = payload.get("asset_id")
    if not asset_id:
        raise HTTPException(400, "asset_id is required.")

    # Fetch asset info
    asset = inv_repo.get_asset(db, client_id, asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found.")
    if asset.status in ("Disposed", "Lost", "Reserved"):
        raise HTTPException(400, f"Cannot raise maintenance request for asset with status '{asset.status}'.")

    request_number = repo.next_request_number(db, client_id)
    now = datetime.utcnow()

    data = {
        "client_id": client_id,
        "request_number": request_number,
        "asset_id": asset_id,
        "asset_number": asset.asset_number,
        "asset_name": asset.asset_name,
        "category_name": asset.category_name,
        "reported_by_id": str(actor_id) if actor_id else None,
        "reported_by_name": payload.get("reported_by_name") or actor_name,
        "maintenance_type": payload.get("maintenance_type", "Corrective Maintenance"),
        "issue_category": payload.get("issue_category"),
        "issue_description": payload.get("issue_description"),
        "priority": payload.get("priority", "Medium"),
        "reported_date": payload.get("reported_date") or date.today().isoformat(),
        "estimated_downtime_hours": payload.get("estimated_downtime_hours"),
        "vendor_name": payload.get("vendor_name"),
        "vendor_contact": payload.get("vendor_contact"),
        "vendor_support_contract": payload.get("vendor_support_contract"),
        "warranty_id": payload.get("warranty_id"),
        "amc_id": payload.get("amc_id"),
        "status": "Open",
        "downtime_start": now,
    }
    obj = repo.create_request(db, data)

    # Update asset status to Under Maintenance
    inv_repo.update_asset(db, asset, {
        "status": "Under Maintenance",
        "last_maintenance_date": date.today(),
    })

    _log(db, client_id, obj.id, asset_id, "request_created",
         f"Maintenance request created for {asset.asset_name}. Asset set to Under Maintenance.",
         actor_id=actor_id, actor_name=actor_name,
         old_value=asset.status, new_value="Under Maintenance")
    db.commit()
    return _req_dict(obj)


# ── Status Transitions ─────────────────────────────────────────────────────────

def _transition(
    db: Session, client_id: str, request_id: str,
    allowed_from: list, new_status: str,
    extra_data: dict = None,
    actor_id=None, actor_name: str = None,
    event: str = "status_changed",
    description: str = "",
) -> AssetMaintenanceRequest:
    obj = repo.get_request(db, client_id, request_id)
    if not obj:
        raise HTTPException(404, "Maintenance request not found.")
    if obj.status not in allowed_from:
        raise HTTPException(400, f"Cannot transition from '{obj.status}' to '{new_status}'.")
    update = {"status": new_status}
    if extra_data:
        update.update(extra_data)
    repo.update_request(db, obj, update)
    _log(db, client_id, request_id, obj.asset_id, event, description,
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value=new_status)
    return obj


def assign_request(db: Session, client_id: str, request_id: str, payload: dict,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = _transition(
        db, client_id, request_id,
        allowed_from=["Open", "Waiting For Parts"],
        new_status="Assigned",
        extra_data={
            "assigned_technician_id": payload.get("assigned_technician_id"),
            "assigned_technician_name": payload.get("assigned_technician_name"),
            "vendor_name": payload.get("vendor_name"),
            "vendor_contact": payload.get("vendor_contact"),
            "vendor_support_contract": payload.get("vendor_support_contract"),
        },
        actor_id=actor_id, actor_name=actor_name,
        event="request_assigned",
        description=f"Assigned to {payload.get('assigned_technician_name') or payload.get('vendor_name', 'technician')}.",
    )
    db.commit()
    return _req_dict(obj)


def update_status(db: Session, client_id: str, request_id: str, new_status: str,
                  notes: str = None, actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    valid_transitions = {
        "Open":                ["Assigned", "Under Inspection", "Cancelled"],
        "Assigned":            ["Under Inspection", "Waiting For Parts", "Cancelled"],
        "Under Inspection":    ["Under Repair", "Waiting For Parts", "Quality Check", "Cancelled"],
        "Under Repair":        ["Quality Check", "Waiting For Parts", "Cancelled"],
        "Waiting For Parts":   ["Under Repair", "Under Inspection", "Cancelled"],
        "Quality Check":       ["Completed", "Under Repair"],
    }
    obj = repo.get_request(db, client_id, request_id)
    if not obj:
        raise HTTPException(404, "Maintenance request not found.")
    allowed = valid_transitions.get(obj.status, [])
    if new_status not in allowed:
        raise HTTPException(400, f"Cannot move from '{obj.status}' to '{new_status}'.")

    extra: dict = {}
    if notes:
        extra["resolution_notes"] = notes

    repo.update_request(db, obj, {"status": new_status, **extra})
    _log(db, client_id, request_id, obj.asset_id, "status_updated",
         f"Status updated to {new_status}." + (f" Notes: {notes}" if notes else ""),
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value=new_status)
    db.commit()
    return _req_dict(obj)


def complete_request(db: Session, client_id: str, request_id: str, payload: dict,
                     actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_request(db, client_id, request_id)
    if not obj:
        raise HTTPException(404, "Maintenance request not found.")
    if obj.status not in ("Quality Check", "Under Repair", "Assigned", "Under Inspection"):
        raise HTTPException(400, f"Cannot complete a request in '{obj.status}' status.")

    now = datetime.utcnow()
    downtime_hours: Optional[float] = None
    if obj.downtime_start:
        delta = now - obj.downtime_start
        downtime_hours = round(delta.total_seconds() / 3600, 2)

    repo.update_request(db, obj, {
        "status": "Completed",
        "completed_at": now,
        "downtime_end": now,
        "total_downtime_hours": downtime_hours,
        "resolution_notes": payload.get("resolution_notes") or obj.resolution_notes,
        "next_service_date": payload.get("next_service_date"),
    })

    # Update asset back to Available (or Assigned if it has an active assignment)
    asset = inv_repo.get_asset(db, client_id, obj.asset_id)
    if asset:
        # Determine target status: Assigned if there's still an assignee, else Available
        new_asset_status = "Assigned" if asset.assigned_employee_id else "Available"
        inv_update = {
            "status": new_asset_status,
            "last_maintenance_date": date.today(),
        }
        if payload.get("next_service_date"):
            inv_update["next_maintenance_date"] = payload["next_service_date"]
        inv_repo.update_asset(db, asset, inv_update)

    _log(db, client_id, request_id, obj.asset_id, "request_completed",
         f"Maintenance completed. Downtime: {downtime_hours} hrs. Asset status → {new_asset_status if asset else 'Available'}.",
         actor_id=actor_id, actor_name=actor_name,
         old_value="Under Maintenance", new_value="Completed")
    db.commit()
    wo = repo.get_work_order_by_request(db, client_id, request_id)
    activities = repo.list_activities(db, request_id)
    return _req_dict(obj, work_order=wo, activities=activities)


def close_request(db: Session, client_id: str, request_id: str,
                  actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = _transition(
        db, client_id, request_id,
        allowed_from=["Completed"],
        new_status="Closed",
        extra_data={"closed_at": datetime.utcnow()},
        actor_id=actor_id, actor_name=actor_name,
        event="request_closed",
        description="Maintenance request closed.",
    )
    db.commit()
    return _req_dict(obj)


def cancel_request(db: Session, client_id: str, request_id: str, reason: str,
                   actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_request(db, client_id, request_id)
    if not obj:
        raise HTTPException(404, "Maintenance request not found.")
    if obj.status in ("Completed", "Closed", "Cancelled"):
        raise HTTPException(400, f"Cannot cancel a '{obj.status}' request.")

    now = datetime.utcnow()
    repo.update_request(db, obj, {
        "status": "Cancelled",
        "cancelled_at": now,
        "cancel_reason": reason,
        "downtime_end": now,
        "total_downtime_hours": (
            round((now - obj.downtime_start).total_seconds() / 3600, 2)
            if obj.downtime_start else None
        ),
    })

    # Return asset to Available
    asset = inv_repo.get_asset(db, client_id, obj.asset_id)
    if asset and asset.status == "Under Maintenance":
        new_status = "Assigned" if asset.assigned_employee_id else "Available"
        inv_repo.update_asset(db, asset, {"status": new_status})

    _log(db, client_id, request_id, obj.asset_id, "request_cancelled",
         f"Request cancelled. Reason: {reason}",
         actor_id=actor_id, actor_name=actor_name,
         old_value=obj.status, new_value="Cancelled")
    db.commit()
    return _req_dict(obj)


# ── List / Get Requests ────────────────────────────────────────────────────────

def list_requests(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_requests(db, client_id, **kwargs)
    return {"items": [_req_dict(r) for r in rows], "total": total}


def get_request(db: Session, client_id: str, request_id: str) -> Dict[str, Any]:
    obj = repo.get_request(db, client_id, request_id)
    if not obj:
        raise HTTPException(404, "Maintenance request not found.")
    wo = repo.get_work_order_by_request(db, client_id, request_id)
    activities = repo.list_activities(db, request_id)
    return _req_dict(obj, work_order=wo, activities=activities)


# ── Work Orders ────────────────────────────────────────────────────────────────

def create_work_order(db: Session, client_id: str, request_id: str, payload: dict,
                      actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    req = repo.get_request(db, client_id, request_id)
    if not req:
        raise HTTPException(404, "Maintenance request not found.")
    if req.status in ("Completed", "Closed", "Cancelled"):
        raise HTTPException(400, "Cannot create a work order for a completed/closed/cancelled request.")

    wo_number = repo.next_work_order_number(db, client_id)
    costs = [
        payload.get("labor_cost") or 0,
        payload.get("parts_cost") or 0,
        payload.get("vendor_charges") or 0,
        payload.get("transport_cost") or 0,
        payload.get("misc_cost") or 0,
    ]
    total = sum(float(c) for c in costs)

    data = {
        "client_id": client_id,
        "work_order_number": wo_number,
        "request_id": request_id,
        "asset_id": req.asset_id,
        "vendor_name": payload.get("vendor_name"),
        "vendor_contact": payload.get("vendor_contact"),
        "vendor_support_contract": payload.get("vendor_support_contract"),
        "service_sla": payload.get("service_sla"),
        "assigned_technician_name": payload.get("assigned_technician_name"),
        "planned_start_date": payload.get("planned_start_date"),
        "planned_end_date": payload.get("planned_end_date"),
        "actual_start_date": payload.get("actual_start_date"),
        "actual_end_date": payload.get("actual_end_date"),
        "parts_used": payload.get("parts_used"),
        "labor_hours": payload.get("labor_hours"),
        "resolution_notes": payload.get("resolution_notes"),
        "labor_cost": payload.get("labor_cost"),
        "parts_cost": payload.get("parts_cost"),
        "vendor_charges": payload.get("vendor_charges"),
        "transport_cost": payload.get("transport_cost"),
        "misc_cost": payload.get("misc_cost"),
        "total_cost": total or None,
        "currency": payload.get("currency", "INR"),
        "status": "Pending",
    }
    wo = repo.create_work_order(db, data)
    repo.update_request(db, req, {"work_order_id": wo.id, "status": "Assigned"})

    _log(db, client_id, request_id, req.asset_id, "work_order_created",
         f"Work order {wo_number} created.",
         actor_id=actor_id, actor_name=actor_name,
         new_value=wo_number)
    db.commit()
    return _wo_dict(wo)


def update_work_order(db: Session, client_id: str, wo_id: str, payload: dict,
                      actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    wo = repo.get_work_order(db, client_id, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found.")

    costs = [
        payload.get("labor_cost", wo.labor_cost) or 0,
        payload.get("parts_cost", wo.parts_cost) or 0,
        payload.get("vendor_charges", wo.vendor_charges) or 0,
        payload.get("transport_cost", wo.transport_cost) or 0,
        payload.get("misc_cost", wo.misc_cost) or 0,
    ]
    payload["total_cost"] = sum(float(c) for c in costs) or None

    if payload.get("status") == "Completed" and wo.status != "Completed":
        payload["completed_at"] = datetime.utcnow()
    if payload.get("status") == "Cancelled" and wo.status != "Cancelled":
        payload["cancelled_at"] = datetime.utcnow()

    repo.update_work_order(db, wo, payload)
    _log(db, client_id, wo.request_id, wo.asset_id, "work_order_updated",
         f"Work order {wo.work_order_number} updated.",
         actor_id=actor_id, actor_name=actor_name)
    db.commit()
    return _wo_dict(wo)


def list_work_orders(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_work_orders(db, client_id, **kwargs)
    return {"items": [_wo_dict(w) for w in rows], "total": total}


def get_work_order(db: Session, client_id: str, wo_id: str) -> Dict[str, Any]:
    wo = repo.get_work_order(db, client_id, wo_id)
    if not wo:
        raise HTTPException(404, "Work order not found.")
    return _wo_dict(wo)


# ── Warranties ─────────────────────────────────────────────────────────────────

def create_warranty(db: Session, client_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asset_id = payload.get("asset_id")
    if not asset_id:
        raise HTTPException(400, "asset_id is required.")
    asset = inv_repo.get_asset(db, client_id, asset_id)
    data = {
        "client_id": client_id,
        "asset_id": asset_id,
        "asset_number": asset.asset_number if asset else None,
        "asset_name": asset.asset_name if asset else payload.get("asset_name"),
        "warranty_provider": payload.get("warranty_provider"),
        "vendor_contact": payload.get("vendor_contact"),
        "warranty_start_date": payload.get("warranty_start_date"),
        "warranty_end_date": payload.get("warranty_end_date"),
        "coverage_details": payload.get("coverage_details"),
        "claim_process": payload.get("claim_process"),
        "status": "Active",
        "notes": payload.get("notes"),
    }
    obj = repo.create_warranty(db, data)
    db.commit()
    return _warranty_dict(obj)


def update_warranty(db: Session, client_id: str, warranty_id: str, payload: dict,
                    actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_warranty(db, client_id, warranty_id)
    if not obj:
        raise HTTPException(404, "Warranty not found.")
    repo.update_warranty(db, obj, {k: v for k, v in payload.items()
                                    if k not in ("id", "client_id", "asset_id")})
    db.commit()
    return _warranty_dict(obj)


def list_warranties(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_warranties(db, client_id, **kwargs)
    return {"items": [_warranty_dict(w) for w in rows], "total": total}


def get_warranty(db: Session, client_id: str, warranty_id: str) -> Dict[str, Any]:
    obj = repo.get_warranty(db, client_id, warranty_id)
    if not obj:
        raise HTTPException(404, "Warranty not found.")
    return _warranty_dict(obj)


# ── AMC Contracts ──────────────────────────────────────────────────────────────

def create_amc(db: Session, client_id: str, payload: dict,
               actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    asset_id = payload.get("asset_id")
    if not asset_id:
        raise HTTPException(400, "asset_id is required.")
    asset = inv_repo.get_asset(db, client_id, asset_id)
    data = {
        "client_id": client_id,
        "asset_id": asset_id,
        "asset_number": asset.asset_number if asset else None,
        "asset_name": asset.asset_name if asset else payload.get("asset_name"),
        "amc_number": payload.get("amc_number"),
        "vendor_name": payload.get("vendor_name"),
        "vendor_contact": payload.get("vendor_contact"),
        "service_sla": payload.get("service_sla"),
        "contract_value": payload.get("contract_value"),
        "currency": payload.get("currency", "INR"),
        "coverage": payload.get("coverage"),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "renewal_date": payload.get("renewal_date"),
        "status": "Active",
        "notes": payload.get("notes"),
    }
    obj = repo.create_amc(db, data)
    db.commit()
    return _amc_dict(obj)


def update_amc(db: Session, client_id: str, amc_id: str, payload: dict,
               actor_id=None, actor_name: str = None) -> Dict[str, Any]:
    obj = repo.get_amc(db, client_id, amc_id)
    if not obj:
        raise HTTPException(404, "AMC contract not found.")
    repo.update_amc(db, obj, {k: v for k, v in payload.items()
                               if k not in ("id", "client_id", "asset_id")})
    db.commit()
    return _amc_dict(obj)


def list_amcs(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_amcs(db, client_id, **kwargs)
    return {"items": [_amc_dict(a) for a in rows], "total": total}


def get_amc(db: Session, client_id: str, amc_id: str) -> Dict[str, Any]:
    obj = repo.get_amc(db, client_id, amc_id)
    if not obj:
        raise HTTPException(404, "AMC contract not found.")
    return _amc_dict(obj)
