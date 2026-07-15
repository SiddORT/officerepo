"""Repository — thin DB access layer for Organization Management (client DB)."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.modules.organization_management.models import (
    OrgBranch, OrgCompany, OrgCompanyDocument, OrgDepartment, OrgDesignation,
)

logger = logging.getLogger(__name__)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Companies ──────────────────────────────────────────────────────────────────

def list_companies(
    db: Session, client_id: str, *,
    page: int = 1, page_size: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[OrgCompany], int]:
    q = db.query(OrgCompany).filter(
        OrgCompany.client_id == client_id,
        OrgCompany.is_deleted.is_(False),
    )
    if search:
        term = f"%{search}%"
        q = q.filter(
            OrgCompany.company_name.ilike(term) |
            OrgCompany.company_code.ilike(term)
        )
    if status:
        q = q.filter(OrgCompany.is_active == (status == "Active"))
    total = q.count()
    rows = q.order_by(OrgCompany.company_name).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_company(db: Session, client_id: str, company_id: str) -> Optional[OrgCompany]:
    return db.query(OrgCompany).filter(
        OrgCompany.id == company_id,
        OrgCompany.client_id == client_id,
        OrgCompany.is_deleted.is_(False),
    ).first()


def get_company_by_code(db: Session, client_id: str, code: str) -> Optional[OrgCompany]:
    return db.query(OrgCompany).filter(
        OrgCompany.client_id == client_id,
        OrgCompany.company_code == code.upper(),
        OrgCompany.is_deleted.is_(False),
    ).first()


def create_company(db: Session, client_id: str, data: dict) -> OrgCompany:
    c = OrgCompany(id=_uuid(), client_id=client_id, **data)
    db.add(c)
    db.flush()
    return c


def update_company(db: Session, company: OrgCompany, data: dict) -> OrgCompany:
    for k, v in data.items():
        if v is not None or k in data:
            setattr(company, k, v)
    company.updated_at = datetime.utcnow()
    db.flush()
    return company


def soft_delete_company(db: Session, company: OrgCompany) -> None:
    company.is_deleted = True
    company.deleted_at = datetime.utcnow()
    db.flush()


def company_has_children(db: Session, client_id: str, company_id: str) -> bool:
    """True if the company still has any non-deleted branches/departments/designations."""
    if db.query(OrgBranch.id).filter(
        OrgBranch.client_id == client_id, OrgBranch.company_id == company_id,
        OrgBranch.is_deleted.is_(False),
    ).first():
        return True
    if db.query(OrgDepartment.id).filter(
        OrgDepartment.client_id == client_id, OrgDepartment.company_id == company_id,
        OrgDepartment.is_deleted.is_(False),
    ).first():
        return True
    if db.query(OrgDesignation.id).filter(
        OrgDesignation.client_id == client_id, OrgDesignation.company_id == company_id,
        OrgDesignation.is_deleted.is_(False),
    ).first():
        return True
    return False


def bulk_deactivate_branches_by_company(db: Session, client_id: str, company_id: str) -> None:
    db.query(OrgBranch).filter(
        OrgBranch.client_id == client_id, OrgBranch.company_id == company_id,
        OrgBranch.is_deleted.is_(False), OrgBranch.is_active.is_(True),
    ).update({"is_active": False, "updated_at": datetime.utcnow()}, synchronize_session=False)


def get_department_ids_by_company(db: Session, client_id: str, company_id: str) -> List[str]:
    rows = db.query(OrgDepartment.id).filter(
        OrgDepartment.client_id == client_id, OrgDepartment.company_id == company_id,
        OrgDepartment.is_deleted.is_(False),
    ).all()
    return [r[0] for r in rows]


def bulk_deactivate_departments_by_ids(db: Session, client_id: str, dept_ids: List[str]) -> None:
    if not dept_ids:
        return
    db.query(OrgDepartment).filter(
        OrgDepartment.client_id == client_id, OrgDepartment.id.in_(dept_ids),
        OrgDepartment.is_deleted.is_(False), OrgDepartment.is_active.is_(True),
    ).update({"is_active": False, "updated_at": datetime.utcnow()}, synchronize_session=False)


def bulk_deactivate_designations_by_company(db: Session, client_id: str, company_id: str) -> None:
    db.query(OrgDesignation).filter(
        OrgDesignation.client_id == client_id, OrgDesignation.company_id == company_id,
        OrgDesignation.is_deleted.is_(False), OrgDesignation.is_active.is_(True),
    ).update({"is_active": False, "updated_at": datetime.utcnow()}, synchronize_session=False)


def bulk_deactivate_designations_by_departments(db: Session, client_id: str, dept_ids: List[str]) -> None:
    if not dept_ids:
        return
    db.query(OrgDesignation).filter(
        OrgDesignation.client_id == client_id, OrgDesignation.department_id.in_(dept_ids),
        OrgDesignation.is_deleted.is_(False), OrgDesignation.is_active.is_(True),
    ).update({"is_active": False, "updated_at": datetime.utcnow()}, synchronize_session=False)


def get_all_department_descendant_ids(db: Session, client_id: str, dept_id: str) -> List[str]:
    """Return ids of ALL descendant departments (children, grandchildren, ...) of dept_id."""
    all_rows = db.query(OrgDepartment.id, OrgDepartment.parent_id).filter(
        OrgDepartment.client_id == client_id, OrgDepartment.is_deleted.is_(False),
    ).all()
    children_map: dict = {}
    for did, pid in all_rows:
        if pid:
            children_map.setdefault(pid, []).append(did)
    descendants: List[str] = []
    stack = list(children_map.get(dept_id, []))
    while stack:
        cur = stack.pop()
        descendants.append(cur)
        stack.extend(children_map.get(cur, []))
    return descendants


# ── Branches ───────────────────────────────────────────────────────────────────

def list_branches(
    db: Session, client_id: str, *,
    company_id: Optional[str] = None,
    page: int = 1, page_size: int = 50,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[OrgBranch], int]:
    q = db.query(OrgBranch).filter(
        OrgBranch.client_id == client_id,
        OrgBranch.is_deleted.is_(False),
    )
    if company_id:
        q = q.filter(OrgBranch.company_id == company_id)
    if search:
        term = f"%{search}%"
        q = q.filter(
            OrgBranch.branch_name.ilike(term) |
            OrgBranch.branch_code.ilike(term)
        )
    if status:
        q = q.filter(OrgBranch.is_active == (status == "Active"))
    total = q.count()
    rows = q.order_by(OrgBranch.branch_name).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_branch(db: Session, client_id: str, branch_id: str) -> Optional[OrgBranch]:
    return db.query(OrgBranch).filter(
        OrgBranch.id == branch_id,
        OrgBranch.client_id == client_id,
        OrgBranch.is_deleted.is_(False),
    ).first()


def get_branch_by_code(db: Session, client_id: str, company_id: str, code: str) -> Optional[OrgBranch]:
    return db.query(OrgBranch).filter(
        OrgBranch.client_id == client_id,
        OrgBranch.company_id == company_id,
        OrgBranch.branch_code == code.upper(),
        OrgBranch.is_deleted.is_(False),
    ).first()


def create_branch(db: Session, client_id: str, data: dict) -> OrgBranch:
    b = OrgBranch(id=_uuid(), client_id=client_id, **data)
    db.add(b)
    db.flush()
    return b


def update_branch(db: Session, branch: OrgBranch, data: dict) -> OrgBranch:
    for k, v in data.items():
        setattr(branch, k, v)
    branch.updated_at = datetime.utcnow()
    db.flush()
    return branch


def soft_delete_branch(db: Session, branch: OrgBranch) -> None:
    branch.is_deleted = True
    branch.deleted_at = datetime.utcnow()
    db.flush()


def get_branch_employee_count(db: Session, client_id: str, branch_id: str) -> dict:
    """Count active and total employees assigned to this branch."""
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        total = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.branch_id == branch_id,
            Employee.is_deleted.is_(False),
        ).scalar() or 0
        active = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.branch_id == branch_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
        ).scalar() or 0
    except (ImportError, SQLAlchemyError):
        logger.warning("get_branch_employee_count failed for branch %s", branch_id, exc_info=True)
        total = active = 0
    return {"total_employees": total, "active_employees": active}


def get_branch_employee_counts_batch(db: Session, client_id: str, branch_ids: List[str]) -> dict:
    """Batch version of get_branch_employee_count — one query per metric instead of N."""
    result = {bid: {"total_employees": 0, "active_employees": 0} for bid in branch_ids}
    if not branch_ids:
        return result
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        totals = (
            db.query(Employee.branch_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.branch_id.in_(branch_ids),
                Employee.is_deleted.is_(False),
            )
            .group_by(Employee.branch_id).all()
        )
        actives = (
            db.query(Employee.branch_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.branch_id.in_(branch_ids),
                Employee.is_deleted.is_(False),
                Employee.is_active.is_(True),
            )
            .group_by(Employee.branch_id).all()
        )
        for bid, cnt in totals:
            result.setdefault(bid, {"total_employees": 0, "active_employees": 0})["total_employees"] = cnt
        for bid, cnt in actives:
            result.setdefault(bid, {"total_employees": 0, "active_employees": 0})["active_employees"] = cnt
    except (ImportError, SQLAlchemyError):
        logger.warning("get_branch_employee_counts_batch failed", exc_info=True)
    return result


# ── Departments ────────────────────────────────────────────────────────────────

def list_departments(
    db: Session, client_id: str, *,
    company_id: Optional[str] = None,
    parent_id: Optional[str] = "__unset__",
    page: int = 1, page_size: int = 200,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[OrgDepartment], int]:
    q = db.query(OrgDepartment).filter(
        OrgDepartment.client_id == client_id,
        OrgDepartment.is_deleted.is_(False),
    )
    if company_id:
        q = q.filter(OrgDepartment.company_id == company_id)
    if parent_id != "__unset__":
        if parent_id is None:
            q = q.filter(OrgDepartment.parent_id.is_(None))
        else:
            q = q.filter(OrgDepartment.parent_id == parent_id)
    if search:
        term = f"%{search}%"
        q = q.filter(OrgDepartment.department_name.ilike(term))
    if status:
        q = q.filter(OrgDepartment.is_active == (status == "Active"))
    total = q.count()
    rows = q.order_by(OrgDepartment.department_name).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_department(db: Session, client_id: str, dept_id: str) -> Optional[OrgDepartment]:
    return db.query(OrgDepartment).filter(
        OrgDepartment.id == dept_id,
        OrgDepartment.client_id == client_id,
        OrgDepartment.is_deleted.is_(False),
    ).first()


def get_dept_by_code(db: Session, client_id: str, company_id: str, code: str) -> Optional[OrgDepartment]:
    return db.query(OrgDepartment).filter(
        OrgDepartment.client_id == client_id,
        OrgDepartment.company_id == company_id,
        OrgDepartment.department_code == code.upper(),
        OrgDepartment.is_deleted.is_(False),
    ).first()


def create_department(db: Session, client_id: str, data: dict) -> OrgDepartment:
    d = OrgDepartment(id=_uuid(), client_id=client_id, **data)
    db.add(d)
    db.flush()
    return d


def update_department(db: Session, dept: OrgDepartment, data: dict) -> OrgDepartment:
    for k, v in data.items():
        setattr(dept, k, v)
    dept.updated_at = datetime.utcnow()
    db.flush()
    return dept


def soft_delete_department(db: Session, dept: OrgDepartment) -> None:
    dept.is_deleted = True
    dept.deleted_at = datetime.utcnow()
    db.flush()


def department_has_children(db: Session, client_id: str, dept_id: str) -> bool:
    """True if the department has non-deleted sub-departments or designations."""
    if db.query(OrgDepartment.id).filter(
        OrgDepartment.client_id == client_id, OrgDepartment.parent_id == dept_id,
        OrgDepartment.is_deleted.is_(False),
    ).first():
        return True
    if db.query(OrgDesignation.id).filter(
        OrgDesignation.client_id == client_id, OrgDesignation.department_id == dept_id,
        OrgDesignation.is_deleted.is_(False),
    ).first():
        return True
    return False


# ── Department employees / designations / activities ──────────────────────────

def list_dept_employees(
    db: Session, client_id: str, dept_id: str, *,
    page: int = 1, page_size: int = 50,
) -> Tuple[list, int]:
    """Return employees belonging to this department."""
    try:
        from backend.app.modules.employee_management.models import Employee
        q = db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.department_id == dept_id,
            Employee.is_deleted.is_(False),
        )
        total = q.count()
        rows = q.order_by(Employee.first_name).offset((page - 1) * page_size).limit(page_size).all()
        return rows, total
    except (ImportError, SQLAlchemyError):
        return [], 0


def get_dept_stats(db: Session, client_id: str, dept_id: str) -> dict:
    """Count employees + designations for a department."""
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        total_emp = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.department_id == dept_id,
            Employee.is_deleted.is_(False),
        ).scalar() or 0
        active_emp = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.department_id == dept_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
        ).scalar() or 0
    except (ImportError, SQLAlchemyError):
        logger.warning("get_dept_stats failed for department %s", dept_id, exc_info=True)
        total_emp = active_emp = 0
    desig_count = db.query(OrgDesignation).filter(
        OrgDesignation.client_id == client_id,
        OrgDesignation.department_id == dept_id,
        OrgDesignation.is_deleted.is_(False),
    ).count()
    return {
        "total_employees": total_emp,
        "active_employees": active_emp,
        "designations_count": desig_count,
    }


def get_dept_stats_batch(db: Session, client_id: str, dept_ids: List[str]) -> dict:
    """Batch version of get_dept_stats — avoids N+1 across a department list."""
    result = {did: {"total_employees": 0, "active_employees": 0, "designations_count": 0} for did in dept_ids}
    if not dept_ids:
        return result
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        totals = (
            db.query(Employee.department_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.department_id.in_(dept_ids),
                Employee.is_deleted.is_(False),
            )
            .group_by(Employee.department_id).all()
        )
        actives = (
            db.query(Employee.department_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.department_id.in_(dept_ids),
                Employee.is_deleted.is_(False),
                Employee.is_active.is_(True),
            )
            .group_by(Employee.department_id).all()
        )
        for did, cnt in totals:
            result.setdefault(did, {"total_employees": 0, "active_employees": 0, "designations_count": 0})["total_employees"] = cnt
        for did, cnt in actives:
            result.setdefault(did, {"total_employees": 0, "active_employees": 0, "designations_count": 0})["active_employees"] = cnt
    except (ImportError, SQLAlchemyError):
        logger.warning("get_dept_stats_batch employee counts failed", exc_info=True)
    from sqlalchemy import func as sqlfunc
    desig_counts = (
        db.query(OrgDesignation.department_id, sqlfunc.count(OrgDesignation.id))
        .filter(
            OrgDesignation.client_id == client_id,
            OrgDesignation.department_id.in_(dept_ids),
            OrgDesignation.is_deleted.is_(False),
        )
        .group_by(OrgDesignation.department_id).all()
    )
    for did, cnt in desig_counts:
        result.setdefault(did, {"total_employees": 0, "active_employees": 0, "designations_count": 0})["designations_count"] = cnt
    return result


def get_heads_batch(db: Session, client_id: str, employee_ids: List[str]) -> dict:
    """Batch-fetch multiple Employee rows for department heads (id -> Employee)."""
    ids = [e for e in employee_ids if e]
    if not ids:
        return {}
    try:
        from backend.app.modules.employee_management.models import Employee
        rows = db.query(Employee).filter(
            Employee.id.in_(ids),
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
        ).all()
        return {r.id: r for r in rows}
    except (ImportError, SQLAlchemyError):
        logger.warning("get_heads_batch failed", exc_info=True)
        return {}


def get_head_employee(db: Session, client_id: str, employee_id: str):
    """Fetch a single Employee row for the dept head (or None)."""
    if not employee_id:
        return None
    try:
        from backend.app.modules.employee_management.models import Employee
        return db.query(Employee).filter(
            Employee.id == employee_id,
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
        ).first()
    except (ImportError, SQLAlchemyError):
        return None


def list_active_employees(db: Session, client_id: str, *, company_id: str = None,
                           department_id: str = None, page_size: int = 500) -> list:
    """Return active employees (for dept-head picker), optionally scoped to a company/department."""
    try:
        from backend.app.modules.employee_management.models import Employee
        q = db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
        )
        if company_id:
            q = q.filter(Employee.company_id == company_id)
        if department_id:
            q = q.filter(Employee.department_id == department_id)
        return q.order_by(Employee.first_name).limit(page_size).all()
    except (ImportError, SQLAlchemyError):
        return []


def list_dept_activities(
    db: Session, client_id: str, dept_id: str, *,
    page: int = 1, page_size: int = 50,
) -> Tuple[list, int]:
    """Return activity logs mentioning this department."""
    try:
        from backend.app.modules.portal_user_management.models import ClientPortalActivityLog
        import json
        q = db.query(ClientPortalActivityLog).filter(
            ClientPortalActivityLog.client_id == client_id,
            ClientPortalActivityLog.action.like("DEPARTMENT%"),
        )
        total = q.count()
        rows = (q.order_by(ClientPortalActivityLog.created_at.desc())
                 .offset((page - 1) * page_size).limit(page_size).all())
        return rows, total
    except (ImportError, SQLAlchemyError):
        return [], 0


# ── Seed departments ───────────────────────────────────────────────────────────

def seed_sample_departments(db: Session, client_id: str, company_id: str) -> int:
    """Create sample departments if none exist yet. Returns count created."""
    existing, _ = list_departments(db, client_id, company_id=company_id, page_size=1)
    if existing:
        return 0  # already seeded

    _SEEDS = [
        {"code": "HR",    "name": "Human Resources", "parent": None},
        {"code": "FIN",   "name": "Finance",          "parent": None},
        {"code": "IT",    "name": "Information Technology", "parent": None},
        {"code": "OPS",   "name": "Operations",       "parent": None},
        {"code": "SALES", "name": "Sales",             "parent": None},
        # Operations children
        {"code": "LOG",   "name": "Logistics",    "parent": "OPS"},
        {"code": "WH",    "name": "Warehouse",    "parent": "OPS"},
        {"code": "PROC",  "name": "Procurement",  "parent": "OPS"},
    ]

    created: dict[str, str] = {}  # code → id
    count = 0
    for s in _SEEDS:
        code = s["code"]
        if get_dept_by_code(db, client_id, company_id, code):
            continue  # skip if somehow exists
        parent_id = created.get(s["parent"]) if s["parent"] else None
        dept = create_department(db, client_id, {
            "company_id": company_id,
            "department_code": code,
            "department_name": s["name"],
            "parent_id": parent_id,
        })
        created[code] = dept.id
        count += 1

    # Randomly assign active employees to top-level depts
    try:
        from backend.app.modules.employee_management.models import Employee
        import random
        top_codes = ["HR", "FIN", "IT", "OPS", "SALES"]
        top_ids = [created[c] for c in top_codes if c in created]
        emps = db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
            Employee.department_id.is_(None),
        ).all()
        for emp in emps:
            if top_ids:
                emp.department_id = random.choice(top_ids)
        if emps:
            db.flush()
    except (ImportError, SQLAlchemyError):
        pass

    return count


# ── Designations ───────────────────────────────────────────────────────────────

def list_designations(
    db: Session, client_id: str, *,
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    page: int = 1, page_size: int = 200,
    search: Optional[str] = None,
    status: Optional[str] = None,
) -> Tuple[List[OrgDesignation], int]:
    q = db.query(OrgDesignation).filter(
        OrgDesignation.client_id == client_id,
        OrgDesignation.is_deleted.is_(False),
    )
    if company_id:
        q = q.filter(OrgDesignation.company_id == company_id)
    if department_id:
        q = q.filter(OrgDesignation.department_id == department_id)
    if search:
        term = f"%{search}%"
        q = q.filter(OrgDesignation.designation_name.ilike(term))
    if status:
        q = q.filter(OrgDesignation.is_active == (status == "Active"))
    total = q.count()
    rows = (q.order_by(OrgDesignation.level.nullsfirst(), OrgDesignation.designation_name)
              .offset((page - 1) * page_size).limit(page_size).all())
    return rows, total


def get_designation(db: Session, client_id: str, desig_id: str) -> Optional[OrgDesignation]:
    return db.query(OrgDesignation).filter(
        OrgDesignation.id == desig_id,
        OrgDesignation.client_id == client_id,
        OrgDesignation.is_deleted.is_(False),
    ).first()


def get_desig_by_code(db: Session, client_id: str, company_id: str, code: str) -> Optional[OrgDesignation]:
    return db.query(OrgDesignation).filter(
        OrgDesignation.client_id == client_id,
        OrgDesignation.company_id == company_id,
        OrgDesignation.designation_code == code.upper(),
        OrgDesignation.is_deleted.is_(False),
    ).first()


def create_designation(db: Session, client_id: str, data: dict) -> OrgDesignation:
    d = OrgDesignation(id=_uuid(), client_id=client_id, **data)
    db.add(d)
    db.flush()
    return d


def update_designation(db: Session, desig: OrgDesignation, data: dict) -> OrgDesignation:
    for k, v in data.items():
        setattr(desig, k, v)
    desig.updated_at = datetime.utcnow()
    db.flush()
    return desig


def soft_delete_designation(db: Session, desig: OrgDesignation) -> None:
    desig.is_deleted = True
    desig.deleted_at = datetime.utcnow()
    db.flush()


# ── Designation employees / stats / activities / seed ─────────────────────────

def get_desig_stats(db: Session, client_id: str, desig_id: str) -> dict:
    """Return employee counts for a designation."""
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        total = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.designation_id == desig_id,
            Employee.is_deleted.is_(False),
        ).scalar() or 0
        active = db.query(sqlfunc.count(Employee.id)).filter(
            Employee.client_id == client_id,
            Employee.designation_id == desig_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
        ).scalar() or 0
    except (ImportError, SQLAlchemyError):
        logger.warning("get_desig_stats failed for designation %s", desig_id, exc_info=True)
        total = active = 0
    return {"total_employees": total, "active_employees": active}


def get_desig_stats_batch(db: Session, client_id: str, desig_ids: List[str]) -> dict:
    """Batch version of get_desig_stats — avoids N+1 across a designation list."""
    result = {did: {"total_employees": 0, "active_employees": 0} for did in desig_ids}
    if not desig_ids:
        return result
    try:
        from backend.app.modules.employee_management.models import Employee
        from sqlalchemy import func as sqlfunc
        totals = (
            db.query(Employee.designation_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.designation_id.in_(desig_ids),
                Employee.is_deleted.is_(False),
            )
            .group_by(Employee.designation_id).all()
        )
        actives = (
            db.query(Employee.designation_id, sqlfunc.count(Employee.id))
            .filter(
                Employee.client_id == client_id,
                Employee.designation_id.in_(desig_ids),
                Employee.is_deleted.is_(False),
                Employee.is_active.is_(True),
            )
            .group_by(Employee.designation_id).all()
        )
        for did, cnt in totals:
            result.setdefault(did, {"total_employees": 0, "active_employees": 0})["total_employees"] = cnt
        for did, cnt in actives:
            result.setdefault(did, {"total_employees": 0, "active_employees": 0})["active_employees"] = cnt
    except (ImportError, SQLAlchemyError):
        logger.warning("get_desig_stats_batch failed", exc_info=True)
    return result


def get_departments_batch(db: Session, client_id: str, dept_ids: List[str]) -> dict:
    """Batch-fetch multiple departments by id (id -> OrgDepartment)."""
    ids = [d for d in dept_ids if d]
    if not ids:
        return {}
    rows = db.query(OrgDepartment).filter(
        OrgDepartment.client_id == client_id,
        OrgDepartment.id.in_(ids),
        OrgDepartment.is_deleted.is_(False),
    ).all()
    return {r.id: r for r in rows}


def list_desig_employees(
    db: Session, client_id: str, desig_id: str, *,
    page: int = 1, page_size: int = 50,
) -> Tuple[list, int]:
    """Return employees with this designation."""
    try:
        from backend.app.modules.employee_management.models import Employee
        q = db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.designation_id == desig_id,
            Employee.is_deleted.is_(False),
        )
        total = q.count()
        rows = q.order_by(Employee.first_name).offset((page - 1) * page_size).limit(page_size).all()
        return rows, total
    except (ImportError, SQLAlchemyError):
        return [], 0


def list_desig_activities(
    db: Session, client_id: str, *, page: int = 1, page_size: int = 50,
) -> Tuple[list, int]:
    """Return activity log entries related to designations."""
    try:
        from backend.app.modules.portal_user_management.models import ClientPortalActivityLog
        q = db.query(ClientPortalActivityLog).filter(
            ClientPortalActivityLog.client_id == client_id,
            ClientPortalActivityLog.action.like("DESIGNATION%"),
        )
        total = q.count()
        rows = (q.order_by(ClientPortalActivityLog.created_at.desc())
                 .offset((page - 1) * page_size).limit(page_size).all())
        return rows, total
    except (ImportError, SQLAlchemyError):
        return [], 0


def seed_sample_designations(db: Session, client_id: str, company_id: str) -> int:
    """Create sample designations. Idempotent — no-op if any already exist. Returns count created."""
    existing, _ = list_designations(db, client_id, company_id=company_id, page_size=1)
    if existing:
        return 0

    # Fetch departments by code for linking
    dept_map: dict[str, str] = {}
    for code in ("HR", "FIN", "IT", "OPS", "SALES", "LOG"):
        d = get_dept_by_code(db, client_id, company_id, code)
        if d:
            dept_map[code] = d.id

    _SEEDS = [
        # code,   name,                      level, dept_key
        ("CEO",   "CEO",                      1,  None),
        ("DIR",   "Director",                 2,  None),
        ("HRHD",  "HR Head",                  3,  "HR"),
        ("HREX",  "HR Executive",             6,  "HR"),
        ("FINMGR","Finance Manager",           4,  "FIN"),
        ("ACCT",  "Accountant",               6,  "FIN"),
        ("ITMGR", "IT Manager",               4,  "IT"),
        ("SWENG", "Software Engineer",        7,  "IT"),
        ("SRSWENG","Senior Software Engineer", 6, "IT"),
        ("SYSADM","System Administrator",     5,  "IT"),
        ("OPSMGR","Operations Manager",       4,  "OPS"),
        ("LOGEX", "Logistics Executive",      6,  "LOG"),
        ("SLSMGR","Sales Manager",            4,  "SALES"),
        ("SLSEX", "Sales Executive",          6,  "SALES"),
    ]

    count = 0
    created_ids: list[str] = []
    for code, name, level, dept_key in _SEEDS:
        if get_desig_by_code(db, client_id, company_id, code):
            continue
        dept_id = dept_map.get(dept_key) if dept_key else None
        desig = create_designation(db, client_id, {
            "company_id": company_id,
            "designation_code": code,
            "designation_name": name,
            "level": level,
            "department_id": dept_id,
        })
        created_ids.append(desig.id)
        count += 1

    # Assign active employees round-robin to newly created designations
    try:
        from backend.app.modules.employee_management.models import Employee
        import random
        emps = db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
            Employee.designation_id.is_(None),
        ).all()
        if emps and created_ids:
            for emp in emps:
                emp.designation_id = random.choice(created_ids)
            db.flush()
    except (ImportError, SQLAlchemyError):
        pass

    return count


# ── Company Documents ───────────────────────────────────────────────────────────

def list_company_documents(
    db: Session, client_id: str, company_id: str,
) -> List[OrgCompanyDocument]:
    return (
        db.query(OrgCompanyDocument)
        .filter(
            OrgCompanyDocument.client_id == client_id,
            OrgCompanyDocument.company_id == company_id,
            OrgCompanyDocument.is_deleted.is_(False),
        )
        .order_by(OrgCompanyDocument.created_at)
        .all()
    )


def get_company_document(
    db: Session, client_id: str, company_id: str, doc_id: str,
) -> Optional[OrgCompanyDocument]:
    return db.query(OrgCompanyDocument).filter(
        OrgCompanyDocument.id == doc_id,
        OrgCompanyDocument.client_id == client_id,
        OrgCompanyDocument.company_id == company_id,
        OrgCompanyDocument.is_deleted.is_(False),
    ).first()


def create_company_document(
    db: Session,
    client_id: str,
    company_id: str,
    doc_type: str,
    doc_number,
    issue_date,
    expiry_date,
    remarks,
    file_name,
    file_path,
    uploaded_by,
) -> OrgCompanyDocument:
    doc = OrgCompanyDocument(
        id=_uuid(),
        client_id=client_id,
        company_id=company_id,
        doc_type=doc_type,
        doc_number=doc_number or None,
        issue_date=issue_date or None,
        expiry_date=expiry_date or None,
        remarks=remarks or None,
        file_name=file_name or None,
        file_path=file_path or None,
        uploaded_by=uploaded_by,
    )
    db.add(doc)
    db.flush()
    return doc


def update_company_document(
    db: Session,
    doc: OrgCompanyDocument,
    doc_type: Optional[str] = None,
    doc_number: Optional[str] = None,
    issue_date=None,
    expiry_date=None,
    remarks: Optional[str] = None,
    file_name: Optional[str] = None,
    file_path: Optional[str] = None,
    clear_file: bool = False,
) -> OrgCompanyDocument:
    if doc_type is not None:
        doc.doc_type = doc_type
    if doc_number is not None:
        doc.doc_number = doc_number or None
    if issue_date is not None:
        doc.issue_date = issue_date or None
    if expiry_date is not None:
        doc.expiry_date = expiry_date or None
    if remarks is not None:
        doc.remarks = remarks or None
    if file_name is not None:
        doc.file_name = file_name or None
    if file_path is not None:
        doc.file_path = file_path or None
    if clear_file:
        doc.file_name = None
        doc.file_path = None
    doc.updated_at = datetime.utcnow()
    db.flush()
    return doc


def soft_delete_company_document(db: Session, doc: OrgCompanyDocument) -> None:
    from datetime import datetime as _dt
    doc.is_deleted = True
    doc.deleted_at = _dt.utcnow()
    db.flush()


def list_expiring_documents(
    db: Session, client_id: str, days_ahead: int = 30,
) -> List[dict]:
    """Return all non-deleted company documents expiring within `days_ahead` days
    (or already expired), enriched with the company name."""
    from datetime import date, timedelta
    from backend.app.modules.organization_management.service import _compute_expiry_status
    cutoff = date.today() + timedelta(days=days_ahead)
    rows = (
        db.query(OrgCompanyDocument, OrgCompany)
        .join(OrgCompany, OrgCompanyDocument.company_id == OrgCompany.id)
        .filter(
            OrgCompanyDocument.client_id == client_id,
            OrgCompanyDocument.is_deleted.is_(False),
            OrgCompany.is_deleted.is_(False),
            OrgCompanyDocument.expiry_date.isnot(None),
            OrgCompanyDocument.expiry_date <= cutoff,
        )
        .order_by(OrgCompanyDocument.expiry_date)
        .all()
    )
    return [
        {
            "id": doc.id,
            "company_id": doc.company_id,
            "company_name": company.company_name,
            "doc_type": doc.doc_type,
            "doc_number": doc.doc_number,
            "expiry_date": doc.expiry_date,
            "expiry_status": _compute_expiry_status(doc.expiry_date),
            "issue_date": doc.issue_date,
            "file_name": doc.file_name,
            "has_file": bool(doc.file_path),
        }
        for doc, company in rows
    ]
