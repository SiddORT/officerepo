"""Service layer for Organization Management.

DB split:
  client_db   — OrgCompany, OrgDepartment, OrgDesignation
  platform_db — ClientPortalActivityLog (via portal_user_management repo)

Activity logging reuses ClientPortalActivityLog in the client DB.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.organization_management import constants as c
from backend.app.modules.organization_management import repository as repo
from backend.app.modules.portal_user_management import repository as uum_repo


def _log(client_db: Session, client_id: str, action: str,
         actor_id: Optional[str], ip: Optional[str], extra: Optional[dict] = None) -> None:
    """Write an activity log entry via the portal_user_management repo (same client DB)."""
    try:
        import json
        uum_repo.log_activity(
            client_db, client_id, action,
            actor_id=actor_id, ip_address=ip,
            extra=json.dumps(extra) if extra else None,
        )
    except Exception:
        pass  # never break the main action


# ── Serializers ────────────────────────────────────────────────────────────────

def _company_dict(co) -> Dict[str, Any]:
    return {
        "id": co.id, "client_id": co.client_id,
        "company_code": co.company_code, "company_name": co.company_name,
        "legal_name": co.legal_name, "display_name": co.display_name,
        "registration_number": co.registration_number, "tax_number": co.tax_number,
        "email": co.email, "phone": co.phone, "website": co.website,
        "address_line_1": co.address_line_1, "address_line_2": co.address_line_2,
        "city": co.city, "state": co.state, "country": co.country, "postal_code": co.postal_code,
        "logo_url": co.logo_url,
        "is_active": co.is_active, "created_at": co.created_at, "updated_at": co.updated_at,
    }


def _dept_dict(d) -> Dict[str, Any]:
    return {
        "id": d.id, "client_id": d.client_id, "company_id": d.company_id,
        "department_code": d.department_code, "department_name": d.department_name,
        "parent_id": d.parent_id, "head_user_id": d.head_user_id,
        "description": d.description,
        "is_active": d.is_active, "created_at": d.created_at, "updated_at": d.updated_at,
    }


def _desig_dict(d) -> Dict[str, Any]:
    return {
        "id": d.id, "client_id": d.client_id, "company_id": d.company_id,
        "department_id": d.department_id,
        "designation_code": d.designation_code, "designation_name": d.designation_name,
        "level": d.level, "description": d.description,
        "is_active": d.is_active, "created_at": d.created_at, "updated_at": d.updated_at,
    }


# ── Companies ──────────────────────────────────────────────────────────────────

def list_companies(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_companies(client_db, client_id, **kwargs)
    return {"data": [_company_dict(r) for r in rows], "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 50)}


def get_company(client_db: Session, client_id: str, company_id: str) -> Dict:
    co = repo.get_company(client_db, client_id, company_id)
    if not co:
        raise HTTPException(404, "Company not found.")
    return _company_dict(co)


def create_company(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    if repo.get_company_by_code(client_db, client_id, payload.company_code):
        raise HTTPException(409, f"Company code '{payload.company_code}' already exists.")
    data = payload.model_dump()
    co = repo.create_company(client_db, client_id, data)
    _log(client_db, client_id, c.ACTION_COMPANY_CREATED, actor_id, ip,
         {"company_name": co.company_name})
    client_db.commit()
    return _company_dict(co)


def update_company(
    client_db: Session, client_id: str, company_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    co = repo.get_company(client_db, client_id, company_id)
    if not co:
        raise HTTPException(404, "Company not found.")
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    repo.update_company(client_db, co, data)
    _log(client_db, client_id, c.ACTION_COMPANY_UPDATED, actor_id, ip,
         {"company_name": co.company_name})
    client_db.commit()
    return _company_dict(co)


def set_company_status(
    client_db: Session, client_id: str, company_id: str, is_active: bool,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    co = repo.get_company(client_db, client_id, company_id)
    if not co:
        raise HTTPException(404, "Company not found.")
    if co.is_active == is_active:
        raise HTTPException(400, f"Company is already {'active' if is_active else 'inactive'}.")
    co.is_active = is_active
    co.updated_at = datetime.utcnow()
    action = c.ACTION_COMPANY_ACTIVATED if is_active else c.ACTION_COMPANY_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"company_name": co.company_name})
    client_db.commit()
    return _company_dict(co)


# ── Departments ────────────────────────────────────────────────────────────────

def list_departments(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_departments(client_db, client_id, **kwargs)
    return {"data": [_dept_dict(r) for r in rows], "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 200)}


def get_department(client_db: Session, client_id: str, dept_id: str) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    return _dept_dict(d)


def _build_tree(rows: list, parent_id=None) -> list:
    """Recursively build a department tree."""
    children = []
    for d in rows:
        if d["parent_id"] == parent_id:
            node = {**d, "children": _build_tree(rows, d["id"])}
            children.append(node)
    return children


def get_department_hierarchy(client_db: Session, client_id: str, company_id: str) -> list:
    rows, _ = repo.list_departments(client_db, client_id, company_id=company_id, page_size=1000)
    flat = [_dept_dict(r) for r in rows]
    return _build_tree(flat, parent_id=None)


def create_department(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    # Validate company exists
    if not repo.get_company(client_db, client_id, payload.company_id):
        raise HTTPException(404, "Company not found.")
    if repo.get_dept_by_code(client_db, client_id, payload.company_id, payload.department_code):
        raise HTTPException(409, f"Department code '{payload.department_code}' already exists in this company.")
    # No self-ref at create (no id yet)
    if payload.parent_id:
        parent = repo.get_department(client_db, client_id, payload.parent_id)
        if not parent:
            raise HTTPException(404, "Parent department not found.")
        if parent.company_id != payload.company_id:
            raise HTTPException(400, "Parent department must belong to the same company.")
    data = payload.model_dump()
    d = repo.create_department(client_db, client_id, data)
    _log(client_db, client_id, c.ACTION_DEPT_CREATED, actor_id, ip,
         {"department_name": d.department_name})
    client_db.commit()
    return _dept_dict(d)


def update_department(
    client_db: Session, client_id: str, dept_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    data = payload.model_dump(exclude_unset=True)
    if "parent_id" in data and data["parent_id"]:
        if data["parent_id"] == dept_id:
            raise HTTPException(400, "A department cannot be its own parent.")
        parent = repo.get_department(client_db, client_id, data["parent_id"])
        if not parent:
            raise HTTPException(404, "Parent department not found.")
        if parent.company_id != d.company_id:
            raise HTTPException(400, "Parent must belong to the same company.")
    repo.update_department(client_db, d, data)
    _log(client_db, client_id, c.ACTION_DEPT_UPDATED, actor_id, ip,
         {"department_name": d.department_name})
    client_db.commit()
    return _dept_dict(d)


def set_department_status(
    client_db: Session, client_id: str, dept_id: str, is_active: bool,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    if d.is_active == is_active:
        raise HTTPException(400, f"Department is already {'active' if is_active else 'inactive'}.")
    d.is_active = is_active
    d.updated_at = datetime.utcnow()
    action = c.ACTION_DEPT_ACTIVATED if is_active else c.ACTION_DEPT_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"department_name": d.department_name})
    client_db.commit()
    return _dept_dict(d)


# ── Designations ───────────────────────────────────────────────────────────────

def list_designations(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_designations(client_db, client_id, **kwargs)
    return {"data": [_desig_dict(r) for r in rows], "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 200)}


def get_designation(client_db: Session, client_id: str, desig_id: str) -> Dict:
    d = repo.get_designation(client_db, client_id, desig_id)
    if not d:
        raise HTTPException(404, "Designation not found.")
    return _desig_dict(d)


def create_designation(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    if not repo.get_company(client_db, client_id, payload.company_id):
        raise HTTPException(404, "Company not found.")
    if repo.get_desig_by_code(client_db, client_id, payload.company_id, payload.designation_code):
        raise HTTPException(409, f"Designation code '{payload.designation_code}' already exists in this company.")
    if payload.department_id:
        if not repo.get_department(client_db, client_id, payload.department_id):
            raise HTTPException(404, "Department not found.")
    data = payload.model_dump()
    desig = repo.create_designation(client_db, client_id, data)
    _log(client_db, client_id, c.ACTION_DESIG_CREATED, actor_id, ip,
         {"designation_name": desig.designation_name})
    client_db.commit()
    return _desig_dict(desig)


def update_designation(
    client_db: Session, client_id: str, desig_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    desig = repo.get_designation(client_db, client_id, desig_id)
    if not desig:
        raise HTTPException(404, "Designation not found.")
    data = payload.model_dump(exclude_unset=True)
    if "department_id" in data and data["department_id"]:
        if not repo.get_department(client_db, client_id, data["department_id"]):
            raise HTTPException(404, "Department not found.")
    repo.update_designation(client_db, desig, data)
    _log(client_db, client_id, c.ACTION_DESIG_UPDATED, actor_id, ip,
         {"designation_name": desig.designation_name})
    client_db.commit()
    return _desig_dict(desig)


def set_designation_status(
    client_db: Session, client_id: str, desig_id: str, is_active: bool,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    desig = repo.get_designation(client_db, client_id, desig_id)
    if not desig:
        raise HTTPException(404, "Designation not found.")
    if desig.is_active == is_active:
        raise HTTPException(400, f"Designation is already {'active' if is_active else 'inactive'}.")
    desig.is_active = is_active
    desig.updated_at = datetime.utcnow()
    action = c.ACTION_DESIG_ACTIVATED if is_active else c.ACTION_DESIG_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"designation_name": desig.designation_name})
    client_db.commit()
    return _desig_dict(desig)
