"""Service layer — Asset Inventory. Business logic and validation."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import inventory_repository as repo
from backend.app.modules.asset_management.inventory_models import Asset, AssetAssignment, AssetDocument, AssetActivity
from backend.app.modules.asset_management.inventory_schemas import AssetCreate, AssetUpdate, AssetAssignSchema, AssetReturnSchema

ASSET_STATUSES = ["Draft", "Available", "Assigned", "Under Maintenance", "Lost", "Damaged", "Retired", "Disposed"]
WORK_LOCATION_TYPES = ["Office", "Remote", "Hybrid", "Shared Workspace"]
MAINTENANCE_FREQUENCIES = ["Monthly", "Quarterly", "Half Yearly", "Yearly"]
DOCUMENT_TYPES = ["Purchase Invoice", "Warranty Card", "User Manual", "Insurance Policy", "AMC Agreement", "Calibration Certificate", "Asset Photo", "Other"]
RETURN_CONDITIONS = ["Good", "Damaged", "Lost"]


def _days_remaining(end: Optional[date]) -> Optional[int]:
    if not end:
        return None
    return (end - date.today()).days


def _asset_dict(a: Asset, include_relations: bool = False) -> Dict[str, Any]:
    d = {
        "id": a.id,
        "client_id": a.client_id,
        "asset_number": a.asset_number,
        "asset_uuid": a.asset_uuid,
        "asset_name": a.asset_name,
        "category_id": a.category_id,
        "category_name": a.category_name,
        "sub_category_id": a.sub_category_id,
        "sub_category_name": a.sub_category_name,
        "asset_master_id": a.asset_master_id,
        "status": a.status,
        "brand": a.brand,
        "manufacturer": a.manufacturer,
        "model_number": a.model_number,
        "part_number": a.part_number,
        "serial_number": a.serial_number,
        "barcode_number": a.barcode_number,
        "company_id": a.company_id,
        "company_name": a.company_name,
        "branch_id": a.branch_id,
        "branch_name": a.branch_name,
        "department_id": a.department_id,
        "department_name": a.department_name,
        "assigned_employee_id": a.assigned_employee_id,
        "assigned_employee_name": a.assigned_employee_name,
        "assigned_date": a.assigned_date.isoformat() if a.assigned_date else None,
        "expected_return_date": a.expected_return_date.isoformat() if a.expected_return_date else None,
        "assignment_notes": a.assignment_notes,
        "work_location_type": a.work_location_type,
        "purchase_date": a.purchase_date.isoformat() if a.purchase_date else None,
        "purchase_cost": float(a.purchase_cost) if a.purchase_cost is not None else None,
        "currency": a.currency,
        "vendor_name": a.vendor_name,
        "vendor_contact": a.vendor_contact,
        "invoice_number": a.invoice_number,
        "purchase_order_number": a.purchase_order_number,
        "warranty_available": a.warranty_available,
        "warranty_start_date": a.warranty_start_date.isoformat() if a.warranty_start_date else None,
        "warranty_end_date": a.warranty_end_date.isoformat() if a.warranty_end_date else None,
        "warranty_provider": a.warranty_provider,
        "warranty_reference_number": a.warranty_reference_number,
        "warranty_days_remaining": _days_remaining(a.warranty_end_date),
        "amc_applicable": a.amc_applicable,
        "amc_start_date": a.amc_start_date.isoformat() if a.amc_start_date else None,
        "amc_end_date": a.amc_end_date.isoformat() if a.amc_end_date else None,
        "amc_vendor": a.amc_vendor,
        "amc_cost": float(a.amc_cost) if a.amc_cost is not None else None,
        "amc_days_remaining": _days_remaining(a.amc_end_date),
        "insurance_available": a.insurance_available,
        "insurance_provider": a.insurance_provider,
        "policy_number": a.policy_number,
        "coverage_amount": float(a.coverage_amount) if a.coverage_amount is not None else None,
        "insurance_start_date": a.insurance_start_date.isoformat() if a.insurance_start_date else None,
        "insurance_end_date": a.insurance_end_date.isoformat() if a.insurance_end_date else None,
        "insurance_days_remaining": _days_remaining(a.insurance_end_date),
        "maintenance_required": a.maintenance_required,
        "last_maintenance_date": a.last_maintenance_date.isoformat() if a.last_maintenance_date else None,
        "next_maintenance_date": a.next_maintenance_date.isoformat() if a.next_maintenance_date else None,
        "maintenance_frequency": a.maintenance_frequency,
        "created_by": a.created_by,
        "created_by_name": a.created_by_name,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }
    return d


def _assignment_dict(a: AssetAssignment) -> Dict[str, Any]:
    return {
        "id": a.id,
        "asset_id": a.asset_id,
        "employee_id": a.employee_id,
        "employee_name": a.employee_name,
        "employee_code": a.employee_code,
        "assigned_date": a.assigned_date.isoformat() if a.assigned_date else None,
        "expected_return_date": a.expected_return_date.isoformat() if a.expected_return_date else None,
        "actual_return_date": a.actual_return_date.isoformat() if a.actual_return_date else None,
        "assignment_notes": a.assignment_notes,
        "return_notes": a.return_notes,
        "condition_on_return": a.condition_on_return,
        "status": a.status,
        "assigned_by": a.assigned_by,
        "returned_by": a.returned_by,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


def _doc_dict(d: AssetDocument) -> Dict[str, Any]:
    return {
        "id": d.id,
        "asset_id": d.asset_id,
        "document_type": d.document_type,
        "original_filename": d.original_filename,
        "has_file": bool(d.file_key),
        "remarks": d.remarks,
        "uploaded_by": d.uploaded_by,
        "uploaded_at": d.uploaded_at,
    }


def _activity_dict(a: AssetActivity) -> Dict[str, Any]:
    return {
        "id": a.id,
        "asset_id": a.asset_id,
        "action": a.action,
        "description": a.description,
        "actor_id": a.actor_id,
        "actor_name": a.actor_name,
        "old_value": a.old_value,
        "new_value": a.new_value,
        "created_at": a.created_at,
    }


def _log(db: Session, client_id: str, asset_id: str, action: str,
         description: str, actor_id: str = None, actor_name: str = None) -> None:
    repo.log_activity(db, {
        "client_id": client_id, "asset_id": asset_id,
        "action": action, "description": description,
        "actor_id": actor_id, "actor_name": actor_name,
    })


def get_meta_options() -> Dict[str, Any]:
    return {
        "statuses": ASSET_STATUSES,
        "work_location_types": WORK_LOCATION_TYPES,
        "maintenance_frequencies": MAINTENANCE_FREQUENCIES,
        "document_types": DOCUMENT_TYPES,
        "return_conditions": RETURN_CONDITIONS,
        "currencies": ["INR", "USD", "EUR", "GBP", "AED", "SGD"],
    }


def list_assets(db: Session, client_id: str, **kwargs) -> Dict[str, Any]:
    rows, total = repo.list_assets(db, client_id, **kwargs)
    return {"items": [_asset_dict(r) for r in rows], "total": total}


def get_asset(db: Session, client_id: str, asset_id: str) -> Dict[str, Any]:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")
    d = _asset_dict(a)
    d["assignments"] = [_assignment_dict(x) for x in repo.list_assignments(db, asset_id)]
    d["documents"] = [_doc_dict(x) for x in repo.list_documents(db, asset_id)]
    return d


def create_asset(db: Session, payload: AssetCreate, client_id: str,
                 actor_id: str = None, actor_name: str = None) -> Dict[str, Any]:
    if payload.serial_number and not repo.check_serial_unique(db, client_id, payload.serial_number):
        raise HTTPException(400, "Serial number already exists for another asset.")

    if payload.status not in ASSET_STATUSES:
        raise HTTPException(400, f"Invalid status. Choose from: {ASSET_STATUSES}")

    asset_number = repo.next_asset_number(db, client_id)
    data = payload.model_dump()
    data["client_id"] = client_id
    data["asset_number"] = asset_number
    data["created_by"] = str(actor_id) if actor_id else None
    data["created_by_name"] = actor_name

    a = repo.create_asset(db, data)
    _log(db, client_id, a.id, "asset.created",
         f"Asset {asset_number} '{payload.asset_name}' created",
         actor_id=str(actor_id) if actor_id else None, actor_name=actor_name)
    return _asset_dict(a)


def update_asset(db: Session, client_id: str, asset_id: str,
                 payload: AssetUpdate, actor_id: str = None, actor_name: str = None) -> Dict[str, Any]:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")

    data = {k: v for k, v in payload.model_dump().items() if v is not None}

    if "serial_number" in data and data["serial_number"]:
        if not repo.check_serial_unique(db, client_id, data["serial_number"], exclude_id=asset_id):
            raise HTTPException(400, "Serial number already exists for another asset.")

    if "status" in data and data["status"] not in ASSET_STATUSES:
        raise HTTPException(400, f"Invalid status.")

    a = repo.update_asset(db, a, data)
    _log(db, client_id, a.id, "asset.updated", f"Asset {a.asset_number} updated",
         actor_id=str(actor_id) if actor_id else None, actor_name=actor_name)
    return _asset_dict(a)


def delete_asset(db: Session, client_id: str, asset_id: str,
                 actor_id: str = None, actor_name: str = None) -> None:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")
    repo.soft_delete_asset(db, a)
    _log(db, client_id, a.id, "asset.deleted", f"Asset {a.asset_number} deleted",
         actor_id=str(actor_id) if actor_id else None, actor_name=actor_name)


def assign_asset(db: Session, client_id: str, asset_id: str,
                 payload: AssetAssignSchema, actor_id: str = None, actor_name: str = None) -> Dict[str, Any]:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")
    if a.status not in ("Available", "Draft"):
        raise HTTPException(400, f"Only Available assets can be assigned. Current status: {a.status}")

    asgn = repo.create_assignment(db, {
        "client_id": client_id,
        "asset_id": asset_id,
        "employee_id": payload.employee_id,
        "employee_name": payload.employee_name,
        "employee_code": payload.employee_code,
        "assigned_date": payload.assigned_date,
        "expected_return_date": payload.expected_return_date,
        "assignment_notes": payload.assignment_notes,
        "status": "Active",
        "assigned_by": actor_name,
    })

    repo.update_asset(db, a, {
        "status": "Assigned",
        "assigned_employee_id": payload.employee_id,
        "assigned_employee_name": payload.employee_name,
        "assigned_date": payload.assigned_date,
        "expected_return_date": payload.expected_return_date,
        "assignment_notes": payload.assignment_notes,
    })

    _log(db, client_id, a.id, "asset.assigned",
         f"Assigned to {payload.employee_name or 'employee'}",
         actor_id=str(actor_id) if actor_id else None, actor_name=actor_name)
    return _assignment_dict(asgn)


def return_asset(db: Session, client_id: str, asset_id: str,
                 payload: AssetReturnSchema, actor_id: str = None, actor_name: str = None) -> Dict[str, Any]:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")
    if a.status != "Assigned":
        raise HTTPException(400, "Asset is not currently assigned.")

    asgn = repo.get_active_assignment(db, asset_id)
    if asgn:
        asgn.status = "Returned"
        asgn.actual_return_date = payload.return_date
        asgn.return_notes = payload.return_notes
        asgn.condition_on_return = payload.condition_on_return
        asgn.returned_by = actor_name
        db.commit()

    new_status = "Damaged" if payload.condition_on_return == "Damaged" else \
                 "Lost" if payload.condition_on_return == "Lost" else "Available"

    repo.update_asset(db, a, {
        "status": new_status,
        "assigned_employee_id": None,
        "assigned_employee_name": None,
        "assigned_date": None,
        "expected_return_date": None,
        "assignment_notes": None,
    })

    _log(db, client_id, a.id, "asset.returned",
         f"Returned by {asgn.employee_name if asgn else ''} — condition: {payload.condition_on_return or 'Good'}",
         actor_id=str(actor_id) if actor_id else None, actor_name=actor_name)
    return _asset_dict(a)


def add_document(db: Session, client_id: str, asset_id: str,
                 doc_type: str, filename: str, file_key: str = None,
                 remarks: str = None, actor_name: str = None) -> Dict[str, Any]:
    a = repo.get_asset(db, client_id, asset_id)
    if not a:
        raise HTTPException(404, "Asset not found.")
    doc = repo.create_document(db, {
        "client_id": client_id, "asset_id": asset_id,
        "document_type": doc_type, "file_key": file_key,
        "original_filename": filename, "remarks": remarks,
        "uploaded_by": actor_name,
    })
    _log(db, client_id, asset_id, "document.uploaded",
         f"Document '{filename}' ({doc_type}) uploaded", actor_name=actor_name)
    return _doc_dict(doc)


def delete_document(db: Session, client_id: str, asset_id: str,
                    doc_id: str, actor_name: str = None) -> None:
    doc = repo.get_document(db, doc_id, asset_id)
    if not doc or doc.client_id != client_id:
        raise HTTPException(404, "Document not found.")
    repo.soft_delete_document(db, doc)
    _log(db, client_id, asset_id, "document.deleted",
         f"Document '{doc.original_filename}' deleted", actor_name=actor_name)


def list_activities(db: Session, client_id: str, asset_id: str) -> List[Dict[str, Any]]:
    rows = repo.list_activities(db, asset_id)
    return [_activity_dict(r) for r in rows]
