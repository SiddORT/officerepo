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


# ── Branches ───────────────────────────────────────────────────────────────────

def _branch_dict(b, company_name: Optional[str] = None, total_employees: int = 0, active_employees: int = 0) -> Dict[str, Any]:
    return {
        "id": b.id, "client_id": b.client_id, "company_id": b.company_id,
        "company_name": company_name,
        "branch_code": b.branch_code, "branch_name": b.branch_name,
        "branch_type": b.branch_type,
        "email": b.email, "phone": b.phone,
        "address_line_1": b.address_line_1, "address_line_2": b.address_line_2,
        "city": b.city, "state": b.state, "country": b.country, "postal_code": b.postal_code,
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
    result = []
    for b in rows:
        counts = repo.get_branch_employee_count(client_db, client_id, b.id)
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
    stats_map: dict = {}
    for d in rows:
        stats_map[d.id] = repo.get_dept_stats(client_db, client_id, d.id)
    result = []
    for d in rows:
        head = _resolve_head(client_db, client_id, d)
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


def list_active_employees(client_db: Session, client_id: str) -> Dict:
    """Return active employees for use in pickers (e.g. dept head)."""
    rows = repo.list_active_employees(client_db, client_id)
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
    flat = []
    for d in rows:
        head = _resolve_head(client_db, client_id, d)
        stats = repo.get_dept_stats(client_db, client_id, d.id)
        item = _dept_dict(d, head_emp=head)
        item.update(stats)
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
    action = c.ACTION_DEPT_ACTIVATED if is_active else c.ACTION_DEPT_DEACTIVATED
    _log(client_db, client_id, action, actor_id, ip, {"department_name": d.department_name})
    client_db.commit()
    return get_department(client_db, client_id, dept_id)


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
    # Batch-fetch employee counts for all returned designations
    emp_counts: Dict[str, int] = {}
    try:
        for r in rows:
            stats = repo.get_desig_stats(client_db, client_id, r.id)
            emp_counts[r.id] = stats.get("total_employees", 0)
    except Exception:
        pass
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
    data = []
    for emp in rows:
        # Resolve department name if available
        dept_name = None
        try:
            if emp.department_id:
                dept = repo.get_department(client_db, client_id, emp.department_id)
                if dept:
                    dept_name = dept.department_name
        except Exception:
            pass
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
