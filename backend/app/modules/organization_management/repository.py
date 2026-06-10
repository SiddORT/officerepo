"""Repository — thin DB access layer for Organization Management (client DB)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.app.modules.organization_management.models import (
    OrgCompany, OrgDepartment, OrgDesignation,
)


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
    except Exception:
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
    except Exception:
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
    except Exception:
        return None


def list_active_employees(db: Session, client_id: str, *, page_size: int = 500) -> list:
    """Return all active employees (for dept-head picker)."""
    try:
        from backend.app.modules.employee_management.models import Employee
        return db.query(Employee).filter(
            Employee.client_id == client_id,
            Employee.is_deleted.is_(False),
            Employee.is_active.is_(True),
        ).order_by(Employee.first_name).limit(page_size).all()
    except Exception:
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
    except Exception:
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
    except Exception:
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
    except Exception:
        total = active = 0
    return {"total_employees": total, "active_employees": active}


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
    except Exception:
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
    except Exception:
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
    except Exception:
        pass

    return count
