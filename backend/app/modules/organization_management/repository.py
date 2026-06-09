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
