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
from backend.app.modules.organization_management.models import OrgCompany
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
        "email": co.email, "phone": co.phone,
        "phone_country_code": co.phone_country_code,
        "website": co.website,
        "address_line_1": co.address_line_1, "address_line_2": co.address_line_2,
        "city": co.city, "district": getattr(co, "district", None),
        "state": co.state, "country": co.country, "postal_code": co.postal_code,
        "industry": co.industry,
        "logo_url": co.logo_url,
        "company_type": getattr(co, "company_type", None),
        "date_of_incorporation": getattr(co, "date_of_incorporation", None),
        "company_description": getattr(co, "company_description", None),
        "status": getattr(co, "status", None),
        "cin_number": getattr(co, "cin_number", None),
        "pan_number": getattr(co, "pan_number", None),
        "tan_number": getattr(co, "tan_number", None),
        "msme_registered": getattr(co, "msme_registered", None),
        "msme_number": getattr(co, "msme_number", None),
        "gst_registered": getattr(co, "gst_registered", None),
        "gst_registration_date": getattr(co, "gst_registration_date", None),
        "tax_identification_number": getattr(co, "tax_identification_number", None),
        "primary_contact_person": getattr(co, "primary_contact_person", None),
        "support_email": getattr(co, "support_email", None),
        "hr_email": getattr(co, "hr_email", None),
        "accounts_email": getattr(co, "accounts_email", None),
        "office_same": getattr(co, "office_same", None),
        "off_address_line_1": getattr(co, "off_address_line_1", None),
        "off_address_line_2": getattr(co, "off_address_line_2", None),
        "off_city": getattr(co, "off_city", None),
        "off_district": getattr(co, "off_district", None),
        "off_state": getattr(co, "off_state", None),
        "off_country": getattr(co, "off_country", None),
        "off_postal_code": getattr(co, "off_postal_code", None),
        "is_active": co.is_active, "created_at": co.created_at, "updated_at": co.updated_at,
    }


def _emp_mini(emp) -> Optional[Dict[str, Any]]:
    """Return a minimal employee dict for embedding (head info, list rows)."""
    if emp is None:
        return None
    return {
        "id": emp.id,
        "employee_code": emp.employee_code,
        "full_name": f"{emp.first_name} {emp.last_name}".strip(),
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "designation_id": getattr(emp, "designation_id", None),
        "employment_status": getattr(emp, "employment_status", None),
        "is_active": emp.is_active,
    }


def _dept_dict(d, head_emp=None) -> Dict[str, Any]:
    return {
        "id": d.id, "client_id": d.client_id, "company_id": d.company_id,
        "department_code": d.department_code, "department_name": d.department_name,
        "parent_id": d.parent_id,
        "head_user_id": d.head_user_id,
        "head_employee_id": getattr(d, "head_employee_id", None),
        "head_effective_from": getattr(d, "head_effective_from", None),
        "head_effective_to": getattr(d, "head_effective_to", None),
        "head_employee": _emp_mini(head_emp) if head_emp is not None else None,
        "description": d.description,
        "is_active": d.is_active, "created_at": d.created_at, "updated_at": d.updated_at,
    }


def _desig_dict(d, total_employees: int = 0) -> Dict[str, Any]:
    return {
        "id": d.id, "client_id": d.client_id, "company_id": d.company_id,
        "department_id": d.department_id,
        "designation_code": d.designation_code, "designation_name": d.designation_name,
        "level": d.level, "description": d.description,
        "is_active": d.is_active,
        "total_employees": total_employees,
        "created_at": d.created_at, "updated_at": d.updated_at,
    }


def _activity_dict(a) -> Dict[str, Any]:
    import json as _json
    extra = None
    try:
        extra = _json.loads(a.extra) if a.extra else None
    except Exception:
        extra = a.extra
    return {
        "id": a.id,
        "action": a.action,
        "actor_id": getattr(a, "actor_id", None),
        "ip_address": getattr(a, "ip_address", None),
        "extra": extra,
        "created_at": a.created_at,
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


_OFFICE_ADDR_MAP = [
    ("address_line_1", "off_address_line_1"),
    ("address_line_2", "off_address_line_2"),
    ("city", "off_city"),
    ("district", "off_district"),
    ("state", "off_state"),
    ("country", "off_country"),
    ("postal_code", "off_postal_code"),
]


def _apply_office_sync(data: Dict[str, Any], existing: Optional["OrgCompany"] = None) -> None:
    """When office_same is True, mirror the registered address onto the off_* (operating
    office) fields server-side, so the two never silently drift apart regardless of what
    the client sends for the off_* fields."""
    office_same = data.get("office_same", getattr(existing, "office_same", False) if existing else False)
    if not office_same:
        return
    for src, dst in _OFFICE_ADDR_MAP:
        if src in data:
            data[dst] = data[src]
        elif existing is not None:
            data[dst] = getattr(existing, src, None)


def create_company(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    if repo.get_company_by_code(client_db, client_id, payload.company_code):
        raise HTTPException(409, f"Company code '{payload.company_code}' already exists.")
    data = payload.model_dump()
    _apply_office_sync(data)
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
    _apply_office_sync(data, existing=co)
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
    if not is_active:
        # Cascade: deactivating a company also deactivates its branches, departments
        # and designations, so the UI never shows "active" children under an inactive company.
        repo.bulk_deactivate_branches_by_company(client_db, client_id, company_id)
        dept_ids = repo.get_department_ids_by_company(client_db, client_id, company_id)
        repo.bulk_deactivate_departments_by_ids(client_db, client_id, dept_ids)
        repo.bulk_deactivate_designations_by_company(client_db, client_id, company_id)
    action = c.ACTION_COMPANY_ACTIVATED if is_active else c.ACTION_COMPANY_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"company_name": co.company_name})
    client_db.commit()
    return _company_dict(co)


def delete_company(
    client_db: Session, client_id: str, company_id: str,
    actor_id: Optional[str], ip: Optional[str],
) -> None:
    co = repo.get_company(client_db, client_id, company_id)
    if not co:
        raise HTTPException(404, "Company not found.")
    if co.is_active:
        raise HTTPException(400, "Deactivate the company before deleting it.")
    if repo.company_has_children(client_db, client_id, company_id):
        raise HTTPException(409, "Cannot delete a company that still has branches, departments, or designations. Remove them first.")
    repo.soft_delete_company(client_db, co)
    _log(client_db, client_id, c.ACTION_COMPANY_DELETED, actor_id, ip, {"company_name": co.company_name})
    client_db.commit()


# ── Branches ───────────────────────────────────────────────────────────────────

def _branch_dict(b, company_name: Optional[str] = None, total_employees: int = 0, active_employees: int = 0) -> Dict[str, Any]:
    return {
        "id": b.id, "client_id": b.client_id, "company_id": b.company_id,
        "company_name": company_name,
        "branch_code": b.branch_code, "branch_name": b.branch_name,
        "branch_type": b.branch_type,
        "email": b.email, "phone": b.phone, "phone_country_code": getattr(b, "phone_country_code", None),
        "address_line_1": b.address_line_1, "address_line_2": b.address_line_2,
        "city": b.city, "district": getattr(b, "district", None),
        "state": b.state, "country": b.country, "postal_code": b.postal_code,
        "description": getattr(b, "description", None),
        "is_active": b.is_active,
        "total_employees": total_employees, "active_employees": active_employees,
        "created_at": b.created_at, "updated_at": b.updated_at,
    }


def _branch_company_names(client_db: Session, rows) -> Dict[str, str]:
    """Batch-fetch company names for a list of branch rows."""
    company_ids = {b.company_id for b in rows if b.company_id}
    if not company_ids:
        return {}
    cos = client_db.query(OrgCompany).filter(OrgCompany.id.in_(company_ids)).all()
    return {c.id: c.company_name for c in cos}


def list_branches(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_branches(client_db, client_id, **kwargs)
    company_map = _branch_company_names(client_db, rows)
    counts_map = repo.get_branch_employee_counts_batch(client_db, client_id, [b.id for b in rows])
    result = []
    for b in rows:
        counts = counts_map.get(b.id, {"total_employees": 0, "active_employees": 0})
        result.append(_branch_dict(b, company_name=company_map.get(b.company_id), **counts))
    return {"data": result, "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 50)}


def get_branch(client_db: Session, client_id: str, branch_id: str) -> Dict:
    b = repo.get_branch(client_db, client_id, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found.")
    counts = repo.get_branch_employee_count(client_db, client_id, branch_id)
    company_map = _branch_company_names(client_db, [b])
    return _branch_dict(b, company_name=company_map.get(b.company_id), **counts)


def create_branch(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    if repo.get_branch_by_code(client_db, client_id, payload.company_id, payload.branch_code):
        raise HTTPException(409, f"Branch code '{payload.branch_code}' already exists for this company.")
    data = payload.model_dump()
    b = repo.create_branch(client_db, client_id, data)
    _log(client_db, client_id, c.ACTION_BRANCH_CREATED, actor_id, ip,
         {"branch_name": b.branch_name, "branch_code": b.branch_code})
    client_db.commit()
    return _branch_dict(b)


def update_branch(
    client_db: Session, client_id: str, branch_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    b = repo.get_branch(client_db, client_id, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found.")
    data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    repo.update_branch(client_db, b, data)
    _log(client_db, client_id, c.ACTION_BRANCH_UPDATED, actor_id, ip,
         {"branch_name": b.branch_name})
    client_db.commit()
    return _branch_dict(b)


def set_branch_status(
    client_db: Session, client_id: str, branch_id: str, is_active: bool,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    b = repo.get_branch(client_db, client_id, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found.")
    if b.is_active == is_active:
        raise HTTPException(400, f"Branch is already {'active' if is_active else 'inactive'}.")
    b.is_active = is_active
    b.updated_at = datetime.utcnow()
    action = c.ACTION_BRANCH_ACTIVATED if is_active else c.ACTION_BRANCH_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"branch_name": b.branch_name})
    client_db.commit()
    return _branch_dict(b)


def delete_branch(
    client_db: Session, client_id: str, branch_id: str,
    actor_id: Optional[str], ip: Optional[str],
) -> None:
    b = repo.get_branch(client_db, client_id, branch_id)
    if not b:
        raise HTTPException(404, "Branch not found.")
    if b.is_active:
        raise HTTPException(400, "Deactivate the branch before deleting it.")
    counts = repo.get_branch_employee_count(client_db, client_id, branch_id)
    if counts.get("total_employees", 0):
        raise HTTPException(409, "Cannot delete a branch that still has employees assigned to it.")
    repo.soft_delete_branch(client_db, b)
    _log(client_db, client_id, c.ACTION_BRANCH_DELETED, actor_id, ip, {"branch_name": b.branch_name})
    client_db.commit()


# ── Departments ────────────────────────────────────────────────────────────────

def _resolve_head(client_db: Session, client_id: str, dept):
    """Fetch the head employee row (or None) for a department."""
    eid = getattr(dept, "head_employee_id", None)
    if not eid:
        return None
    return repo.get_head_employee(client_db, client_id, eid)


def _check_no_cycle(client_db: Session, client_id: str, dept_id: str, new_parent_id: str) -> None:
    """Raise 400 if setting new_parent_id would create a cycle."""
    visited = set()
    cursor = new_parent_id
    while cursor:
        if cursor == dept_id:
            raise HTTPException(400, "Setting this parent would create a circular hierarchy.")
        if cursor in visited:
            break
        visited.add(cursor)
        parent_row = repo.get_department(client_db, client_id, cursor)
        cursor = parent_row.parent_id if parent_row else None


def list_departments(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_departments(client_db, client_id, **kwargs)
    stats_map = repo.get_dept_stats_batch(client_db, client_id, [d.id for d in rows])
    head_ids = [getattr(d, "head_employee_id", None) for d in rows]
    heads_map = repo.get_heads_batch(client_db, client_id, head_ids)
    result = []
    for d in rows:
        head = heads_map.get(getattr(d, "head_employee_id", None))
        item = _dept_dict(d, head_emp=head)
        item.update(stats_map.get(d.id, {}))
        result.append(item)
    return {"data": result, "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 200)}


def get_department(client_db: Session, client_id: str, dept_id: str) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    head = _resolve_head(client_db, client_id, d)
    stats = repo.get_dept_stats(client_db, client_id, dept_id)
    result = _dept_dict(d, head_emp=head)
    result.update(stats)
    return result


def get_dept_employees(client_db: Session, client_id: str, dept_id: str,
                       page: int = 1, page_size: int = 50) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    rows, total = repo.list_dept_employees(client_db, client_id, dept_id, page=page, page_size=page_size)
    return {
        "data": [_emp_mini(e) for e in rows],
        "total": total, "page": page, "page_size": page_size,
    }


def get_dept_designations(client_db: Session, client_id: str, dept_id: str,
                          page: int = 1, page_size: int = 100) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    rows, total = repo.list_designations(client_db, client_id,
                                         department_id=dept_id, page=page, page_size=page_size)
    return {"data": [_desig_dict(r) for r in rows], "total": total, "page": page, "page_size": page_size}


def get_dept_activities(client_db: Session, client_id: str, dept_id: str,
                        page: int = 1, page_size: int = 50) -> Dict:
    rows, total = repo.list_dept_activities(client_db, client_id, dept_id, page=page, page_size=page_size)
    return {"data": [_activity_dict(a) for a in rows], "total": total, "page": page, "page_size": page_size}


def get_dept_stats(client_db: Session, client_id: str, dept_id: str) -> Dict:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    return repo.get_dept_stats(client_db, client_id, dept_id)


def list_active_employees(client_db: Session, client_id: str, *, company_id: str = None,
                           department_id: str = None) -> Dict:
    """Return active employees for use in pickers (e.g. dept head)."""
    rows = repo.list_active_employees(client_db, client_id, company_id=company_id, department_id=department_id)
    return {"data": [_emp_mini(e) for e in rows], "total": len(rows)}


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
    stats_map = repo.get_dept_stats_batch(client_db, client_id, [d.id for d in rows])
    head_ids = [getattr(d, "head_employee_id", None) for d in rows]
    heads_map = repo.get_heads_batch(client_db, client_id, head_ids)
    flat = []
    for d in rows:
        head = heads_map.get(getattr(d, "head_employee_id", None))
        item = _dept_dict(d, head_emp=head)
        item.update(stats_map.get(d.id, {}))
        flat.append(item)
    return _build_tree(flat, parent_id=None)


def create_department(
    client_db: Session, client_id: str, payload,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    if not repo.get_company(client_db, client_id, payload.company_id):
        raise HTTPException(404, "Company not found.")
    if repo.get_dept_by_code(client_db, client_id, payload.company_id, payload.department_code):
        raise HTTPException(409, f"Department code '{payload.department_code}' already exists in this company.")
    if payload.parent_id:
        parent = repo.get_department(client_db, client_id, payload.parent_id)
        if not parent:
            raise HTTPException(404, "Parent department not found.")
        if parent.company_id != payload.company_id:
            raise HTTPException(400, "Parent department must belong to the same company.")
    if payload.head_employee_id:
        head_emp = repo.get_head_employee(client_db, client_id, payload.head_employee_id)
        if not head_emp:
            raise HTTPException(404, "Head employee not found.")
        if getattr(head_emp, "company_id", None) and head_emp.company_id != payload.company_id:
            raise HTTPException(400, "Head employee must belong to the same company as the department.")
    data = payload.model_dump()
    d = repo.create_department(client_db, client_id, data)
    _log(client_db, client_id, c.ACTION_DEPT_CREATED, actor_id, ip,
         {"department_name": d.department_name})
    client_db.commit()
    return get_department(client_db, client_id, d.id)


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
        _check_no_cycle(client_db, client_id, dept_id, data["parent_id"])
        parent = repo.get_department(client_db, client_id, data["parent_id"])
        if not parent:
            raise HTTPException(404, "Parent department not found.")
        if parent.company_id != d.company_id:
            raise HTTPException(400, "Parent must belong to the same company.")
    # Track if head changed for extra log
    old_head = getattr(d, "head_employee_id", None)
    new_head = data.get("head_employee_id", old_head)
    if "head_employee_id" in data and data["head_employee_id"]:
        head_emp = repo.get_head_employee(client_db, client_id, data["head_employee_id"])
        if not head_emp:
            raise HTTPException(404, "Head employee not found.")
        if getattr(head_emp, "company_id", None) and head_emp.company_id != d.company_id:
            raise HTTPException(400, "Head employee must belong to the same company as the department.")
    repo.update_department(client_db, d, data)
    _log(client_db, client_id, c.ACTION_DEPT_UPDATED, actor_id, ip,
         {"department_name": d.department_name})
    if old_head != new_head:
        _log(client_db, client_id, c.ACTION_DEPT_HEAD_CHANGED, actor_id, ip,
             {"department_name": d.department_name, "old_head_id": old_head, "new_head_id": new_head})
    client_db.commit()
    return get_department(client_db, client_id, dept_id)


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
    if not is_active:
        # Cascade: deactivating a department also deactivates all of its sub-departments
        # (recursively) and their designations.
        descendant_ids = repo.get_all_department_descendant_ids(client_db, client_id, dept_id)
        all_dept_ids = [dept_id] + descendant_ids
        repo.bulk_deactivate_departments_by_ids(client_db, client_id, descendant_ids)
        repo.bulk_deactivate_designations_by_departments(client_db, client_id, all_dept_ids)
    action = c.ACTION_DEPT_ACTIVATED if is_active else c.ACTION_DEPT_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"department_name": d.department_name})
    client_db.commit()
    return get_department(client_db, client_id, dept_id)


def delete_department(
    client_db: Session, client_id: str, dept_id: str,
    actor_id: Optional[str], ip: Optional[str],
) -> None:
    d = repo.get_department(client_db, client_id, dept_id)
    if not d:
        raise HTTPException(404, "Department not found.")
    if d.is_active:
        raise HTTPException(400, "Deactivate the department before deleting it.")
    if repo.department_has_children(client_db, client_id, dept_id):
        raise HTTPException(409, "Cannot delete a department that still has sub-departments or designations. Remove them first.")
    repo.soft_delete_department(client_db, d)
    _log(client_db, client_id, c.ACTION_DEPT_DELETED, actor_id, ip, {"department_name": d.department_name})
    client_db.commit()


def seed_departments(
    client_db: Session, client_id: str, company_id: str,
    actor_id: Optional[str], ip: Optional[str],
) -> Dict:
    """Seed sample departments for a company. Idempotent (no-op if any exist)."""
    company = repo.get_company(client_db, client_id, company_id)
    if not company:
        raise HTTPException(404, "Company not found.")
    count = repo.seed_sample_departments(client_db, client_id, company_id)
    if count:
        client_db.commit()
        _log(client_db, client_id, "DEPARTMENTS_SEEDED", actor_id, ip,
             {"company_id": company_id, "count": count})
        client_db.commit()
    return {"seeded": count, "message": f"{count} departments created." if count else "Departments already exist, no changes made."}


# ── Designations ───────────────────────────────────────────────────────────────

def list_designations(client_db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_designations(client_db, client_id, **kwargs)
    stats_map = repo.get_desig_stats_batch(client_db, client_id, [r.id for r in rows])
    emp_counts = {rid: s.get("total_employees", 0) for rid, s in stats_map.items()}
    return {"data": [_desig_dict(r, emp_counts.get(r.id, 0)) for r in rows], "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 200)}


def get_designation(client_db: Session, client_id: str, desig_id: str) -> Dict:
    d = repo.get_designation(client_db, client_id, desig_id)
    if not d:
        raise HTTPException(404, "Designation not found.")
    stats = repo.get_desig_stats(client_db, client_id, desig_id)
    return _desig_dict(d, stats.get("total_employees", 0))


def get_desig_employees(
    client_db: Session, client_id: str, desig_id: str,
    *, page: int = 1, page_size: int = 50,
) -> Dict:
    d = repo.get_designation(client_db, client_id, desig_id)
    if not d:
        raise HTTPException(404, "Designation not found.")
    rows, total = repo.list_desig_employees(client_db, client_id, desig_id,
                                            page=page, page_size=page_size)
    dept_map = repo.get_departments_batch(
        client_db, client_id, [emp.department_id for emp in rows if emp.department_id]
    )
    data = []
    for emp in rows:
        dept = dept_map.get(emp.department_id) if emp.department_id else None
        dept_name = dept.department_name if dept else None
        data.append({
            "id": emp.id,
            "employee_code": emp.employee_code,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "full_name": f"{emp.first_name} {emp.last_name or ''}".strip(),
            "department_id": emp.department_id,
            "department_name": dept_name,
            "is_active": emp.is_active,
        })
    return {"data": data, "total": total, "page": page, "page_size": page_size}


def get_desig_activities(
    client_db: Session, client_id: str,
    *, page: int = 1, page_size: int = 50,
) -> Dict:
    rows, total = repo.list_desig_activities(client_db, client_id, page=page, page_size=page_size)
    return {
        "data": [_activity_dict(a) for a in rows],
        "total": total, "page": page, "page_size": page_size,
    }


def seed_designations(
    client_db: Session, client_id: str, company_id: str,
) -> Dict:
    count = repo.seed_sample_designations(client_db, client_id, company_id)
    client_db.commit()
    return {"created": count, "message": f"{count} designations seeded." if count else "Designations already exist — no seed needed."}


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


def delete_designation(
    client_db: Session, client_id: str, desig_id: str,
    actor_id: Optional[str], ip: Optional[str],
) -> None:
    desig = repo.get_designation(client_db, client_id, desig_id)
    if not desig:
        raise HTTPException(404, "Designation not found.")
    if desig.is_active:
        raise HTTPException(400, "Deactivate the designation before deleting it.")
    stats = repo.get_desig_stats(client_db, client_id, desig_id)
    if stats.get("total_employees", 0):
        raise HTTPException(409, "Cannot delete a designation that still has employees assigned to it.")
    repo.soft_delete_designation(client_db, desig)
    _log(client_db, client_id, c.ACTION_DESIG_DELETED, actor_id, ip, {"designation_name": desig.designation_name})
    client_db.commit()


# ── Company Documents ───────────────────────────────────────────────────────────

def _doc_dict(doc) -> dict:
    return {
        "id": doc.id,
        "client_id": doc.client_id,
        "company_id": doc.company_id,
        "doc_type": doc.doc_type,
        "doc_number": doc.doc_number,
        "issue_date": doc.issue_date,
        "expiry_date": doc.expiry_date,
        "remarks": doc.remarks,
        "file_name": doc.file_name,
        "has_file": bool(doc.file_path),
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def list_company_documents(
    client_db: Session, client_id: str, company_id: str,
) -> list:
    from backend.app.modules.organization_management import repository as _repo
    docs = _repo.list_company_documents(client_db, client_id, company_id)
    return [_doc_dict(d) for d in docs]


def list_expiring_documents(
    client_db: Session, client_id: str, days_ahead: int = 30,
) -> list:
    """Return all documents expiring within `days_ahead` days (or already expired),
    enriched with company name for display in the central warnings panel."""
    from backend.app.modules.organization_management import repository as _repo
    return _repo.list_expiring_documents(client_db, client_id, days_ahead=days_ahead)


_EXPIRY_REQUIRED_DOC_TYPES = {
    "GST Certificate", "MSME Certificate", "Trade License", "Shop & Establishment License",
}


def add_company_document(
    client_db: Session,
    client_id: str,
    company_id: str,
    doc_type: str,
    doc_number,
    issue_date,
    expiry_date,
    remarks,
    file_name,
    file_path,
    actor_id,
    ip,
) -> dict:
    from backend.app.modules.organization_management import repository as _repo
    if doc_type in _EXPIRY_REQUIRED_DOC_TYPES and not expiry_date:
        raise HTTPException(
            status_code=422,
            detail=f"Expiry date is required for document type '{doc_type}'.",
        )
    co = _repo.get_company(client_db, client_id, company_id)
    if not co:
        raise HTTPException(404, "Company not found.")
    doc = _repo.create_company_document(
        client_db,
        client_id=client_id,
        company_id=company_id,
        doc_type=doc_type,
        doc_number=doc_number,
        issue_date=issue_date,
        expiry_date=expiry_date,
        remarks=remarks,
        file_name=file_name,
        file_path=file_path,
        uploaded_by=actor_id,
    )
    _log(client_db, client_id, "COMPANY_DOCUMENT_UPLOADED", actor_id, ip, {
        "company_id": company_id, "doc_type": doc_type, "doc_id": doc.id,
    })
    client_db.commit()
    client_db.refresh(doc)
    return _doc_dict(doc)


def get_company_document_file(
    client_db: Session, client_id: str, company_id: str, doc_id: str,
):
    from backend.app.modules.organization_management import repository as _repo
    from fastapi import HTTPException
    doc = _repo.get_company_document(client_db, client_id, company_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    if not doc.file_path:
        raise HTTPException(404, "No file attached to this document.")
    return doc.file_path, (doc.file_name or "document")


def update_company_document(
    client_db: Session,
    client_id: str,
    company_id: str,
    doc_id: str,
    doc_type,
    doc_number,
    issue_date,
    expiry_date,
    remarks,
    new_file_name,
    new_file_path,
    actor_id,
    ip,
) -> dict:
    from backend.app.modules.organization_management import repository as _repo
    from fastapi import HTTPException
    doc = _repo.get_company_document(client_db, client_id, company_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    effective_type = doc_type if doc_type is not None else doc.doc_type
    effective_expiry = expiry_date if expiry_date is not None else doc.expiry_date
    if effective_type in _EXPIRY_REQUIRED_DOC_TYPES and not effective_expiry:
        raise HTTPException(
            status_code=422,
            detail=f"Expiry date is required for document type '{effective_type}'.",
        )
    old_file_key = doc.file_path if new_file_path else None
    _repo.update_company_document(
        client_db, doc,
        doc_type=doc_type,
        doc_number=doc_number,
        issue_date=issue_date,
        expiry_date=expiry_date,
        remarks=remarks,
        file_name=new_file_name,
        file_path=new_file_path,
    )
    _log(client_db, client_id, "COMPANY_DOCUMENT_UPDATED", actor_id, ip, {
        "company_id": company_id, "doc_type": doc.doc_type, "doc_id": doc_id,
    })
    client_db.commit()
    client_db.refresh(doc)
    return _doc_dict(doc), old_file_key or ""


def delete_company_document(
    client_db: Session, client_id: str, company_id: str, doc_id: str,
    actor_id, ip,
) -> str:
    from backend.app.modules.organization_management import repository as _repo
    from fastapi import HTTPException
    doc = _repo.get_company_document(client_db, client_id, company_id, doc_id)
    if not doc:
        raise HTTPException(404, "Document not found.")
    file_key = doc.file_path
    _repo.soft_delete_company_document(client_db, doc)
    _log(client_db, client_id, "COMPANY_DOCUMENT_DELETED", actor_id, ip, {
        "company_id": company_id, "doc_type": doc.doc_type, "doc_id": doc_id,
    })
    client_db.commit()
    return file_key or ""
