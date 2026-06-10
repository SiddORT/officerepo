"""Repository — thin DB access layer for Employee Management (client DB)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.modules.employee_management.models import (
    Employee, EmployeeEducation, EmployeePreviousEmployment,
    EmployeeEmergencyContact, EmployeeBankDetails,
    EmployeeGovernmentIds, EmployeeActivity,
)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Employee code generation ──────────────────────────────────────────────────

def next_employee_code(db: Session, client_id: str) -> str:
    """Generate next EMP-XXXXX code, scoped per client."""
    result = db.query(func.max(Employee.employee_code)).filter(
        Employee.client_id == client_id,
    ).scalar()
    if result and result.startswith("EMP-"):
        try:
            seq = int(result[4:]) + 1
        except ValueError:
            seq = 1
    else:
        seq = 1
    return f"EMP-{seq:05d}"


# ── Employees ─────────────────────────────────────────────────────────────────

def list_employees(
    db: Session, client_id: str, *,
    page: int = 1, page_size: int = 50,
    search: Optional[str] = None,
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    designation_id: Optional[str] = None,
    employee_category: Optional[str] = None,
    employment_type: Optional[str] = None,
    employment_status: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Tuple[List[Employee], int]:
    q = db.query(Employee).filter(
        Employee.client_id == client_id,
        Employee.is_deleted.is_(False),
    )
    if search:
        t = f"%{search}%"
        q = q.filter(
            Employee.first_name.ilike(t) |
            Employee.last_name.ilike(t) |
            Employee.employee_code.ilike(t) |
            Employee.official_email.ilike(t) |
            Employee.mobile_number.ilike(t)
        )
    if company_id:
        q = q.filter(Employee.company_id == company_id)
    if department_id:
        q = q.filter(Employee.department_id == department_id)
    if designation_id:
        q = q.filter(Employee.designation_id == designation_id)
    if employee_category:
        q = q.filter(Employee.employee_category == employee_category)
    if employment_type:
        q = q.filter(Employee.employment_type == employment_type)
    if employment_status:
        q = q.filter(Employee.employment_status == employment_status)
    if is_active is not None:
        q = q.filter(Employee.is_active == is_active)
    total = q.count()
    rows = q.order_by(Employee.employee_code).offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_employee(db: Session, client_id: str, employee_id: str) -> Optional[Employee]:
    return db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.client_id == client_id,
        Employee.is_deleted.is_(False),
    ).first()


def get_employee_by_code(db: Session, client_id: str, code: str) -> Optional[Employee]:
    return db.query(Employee).filter(
        Employee.client_id == client_id,
        Employee.employee_code == code,
        Employee.is_deleted.is_(False),
    ).first()


def get_employee_by_email(db: Session, client_id: str, email: str) -> Optional[Employee]:
    return db.query(Employee).filter(
        Employee.client_id == client_id,
        Employee.official_email == email.lower(),
        Employee.is_deleted.is_(False),
    ).first()


def create_employee(db: Session, client_id: str, data: dict) -> Employee:
    emp = Employee(id=_uuid(), client_id=client_id, **data)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


def update_employee(db: Session, emp: Employee, data: dict) -> Employee:
    for k, v in data.items():
        if hasattr(emp, k):
            setattr(emp, k, v)
    emp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(emp)
    return emp


# ── Education ─────────────────────────────────────────────────────────────────

def list_education(db: Session, client_id: str, employee_id: str) -> List[EmployeeEducation]:
    return db.query(EmployeeEducation).filter(
        EmployeeEducation.client_id == client_id,
        EmployeeEducation.employee_id == employee_id,
    ).order_by(EmployeeEducation.end_year.desc().nullslast()).all()


def get_education(db: Session, client_id: str, edu_id: str) -> Optional[EmployeeEducation]:
    return db.query(EmployeeEducation).filter(
        EmployeeEducation.id == edu_id,
        EmployeeEducation.client_id == client_id,
    ).first()


def create_education(db: Session, client_id: str, employee_id: str, data: dict) -> EmployeeEducation:
    row = EmployeeEducation(id=_uuid(), client_id=client_id, employee_id=employee_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_education(db: Session, row: EmployeeEducation, data: dict) -> EmployeeEducation:
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_education(db: Session, row: EmployeeEducation) -> None:
    db.delete(row)
    db.commit()


# ── Previous Employment ───────────────────────────────────────────────────────

def list_prev_employment(db: Session, client_id: str, employee_id: str) -> List[EmployeePreviousEmployment]:
    return db.query(EmployeePreviousEmployment).filter(
        EmployeePreviousEmployment.client_id == client_id,
        EmployeePreviousEmployment.employee_id == employee_id,
    ).order_by(EmployeePreviousEmployment.end_date.desc().nullslast()).all()


def get_prev_employment(db: Session, client_id: str, hist_id: str) -> Optional[EmployeePreviousEmployment]:
    return db.query(EmployeePreviousEmployment).filter(
        EmployeePreviousEmployment.id == hist_id,
        EmployeePreviousEmployment.client_id == client_id,
    ).first()


def create_prev_employment(db: Session, client_id: str, employee_id: str, data: dict) -> EmployeePreviousEmployment:
    row = EmployeePreviousEmployment(id=_uuid(), client_id=client_id, employee_id=employee_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_prev_employment(db: Session, row: EmployeePreviousEmployment, data: dict) -> EmployeePreviousEmployment:
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_prev_employment(db: Session, row: EmployeePreviousEmployment) -> None:
    db.delete(row)
    db.commit()


# ── Emergency Contacts ────────────────────────────────────────────────────────

def list_emergency_contacts(db: Session, client_id: str, employee_id: str) -> List[EmployeeEmergencyContact]:
    return db.query(EmployeeEmergencyContact).filter(
        EmployeeEmergencyContact.client_id == client_id,
        EmployeeEmergencyContact.employee_id == employee_id,
    ).order_by(EmployeeEmergencyContact.created_at).all()


def get_emergency_contact(db: Session, client_id: str, contact_id: str) -> Optional[EmployeeEmergencyContact]:
    return db.query(EmployeeEmergencyContact).filter(
        EmployeeEmergencyContact.id == contact_id,
        EmployeeEmergencyContact.client_id == client_id,
    ).first()


def create_emergency_contact(db: Session, client_id: str, employee_id: str, data: dict) -> EmployeeEmergencyContact:
    row = EmployeeEmergencyContact(id=_uuid(), client_id=client_id, employee_id=employee_id, **data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_emergency_contact(db: Session, row: EmployeeEmergencyContact, data: dict) -> EmployeeEmergencyContact:
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def delete_emergency_contact(db: Session, row: EmployeeEmergencyContact) -> None:
    db.delete(row)
    db.commit()


# ── Bank Details ──────────────────────────────────────────────────────────────

def get_bank_details(db: Session, client_id: str, employee_id: str) -> Optional[EmployeeBankDetails]:
    return db.query(EmployeeBankDetails).filter(
        EmployeeBankDetails.client_id == client_id,
        EmployeeBankDetails.employee_id == employee_id,
    ).first()


def upsert_bank_details(db: Session, client_id: str, employee_id: str, data: dict) -> EmployeeBankDetails:
    row = get_bank_details(db, client_id, employee_id)
    if row:
        for k, v in data.items():
            if hasattr(row, k):
                setattr(row, k, v)
        row.updated_at = datetime.utcnow()
    else:
        row = EmployeeBankDetails(id=_uuid(), client_id=client_id, employee_id=employee_id, **data)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ── Government IDs ────────────────────────────────────────────────────────────

def get_government_ids(db: Session, client_id: str, employee_id: str) -> Optional[EmployeeGovernmentIds]:
    return db.query(EmployeeGovernmentIds).filter(
        EmployeeGovernmentIds.client_id == client_id,
        EmployeeGovernmentIds.employee_id == employee_id,
    ).first()


def upsert_government_ids(db: Session, client_id: str, employee_id: str, data: dict) -> EmployeeGovernmentIds:
    row = get_government_ids(db, client_id, employee_id)
    if row:
        for k, v in data.items():
            if hasattr(row, k):
                setattr(row, k, v)
        row.updated_at = datetime.utcnow()
    else:
        row = EmployeeGovernmentIds(id=_uuid(), client_id=client_id, employee_id=employee_id, **data)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ── Activities ────────────────────────────────────────────────────────────────

def list_activities(db: Session, client_id: str, employee_id: str, limit: int = 50) -> List[EmployeeActivity]:
    return db.query(EmployeeActivity).filter(
        EmployeeActivity.client_id == client_id,
        EmployeeActivity.employee_id == employee_id,
    ).order_by(EmployeeActivity.created_at.desc()).limit(limit).all()


def log_activity(
    db: Session, client_id: str, employee_id: str, action: str, *,
    actor_id: Optional[str] = None, ip_address: Optional[str] = None,
    old_value: Optional[str] = None, new_value: Optional[str] = None,
    notes: Optional[str] = None,
) -> None:
    row = EmployeeActivity(
        id=_uuid(), client_id=client_id, employee_id=employee_id,
        action=action, actor_id=actor_id, ip_address=ip_address,
        old_value=old_value, new_value=new_value, notes=notes,
    )
    db.add(row)
    db.commit()
