"""Service layer for Employee Management."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.employee_management import constants as c
from backend.app.modules.employee_management import repository as repo
from backend.app.modules.organization_management.models import (
    OrgBranch, OrgCompany, OrgDepartment, OrgDesignation,
)


def _resolve_names(db: Session, rows) -> tuple:
    """Batch-fetch company/branch/dept/desig names for a list of employee rows."""
    company_ids  = {r.company_id      for r in rows if r.company_id}
    branch_ids   = {getattr(r, "branch_id", None) for r in rows if getattr(r, "branch_id", None)}
    dept_ids     = {r.department_id   for r in rows if r.department_id}
    desig_ids    = {r.designation_id  for r in rows if r.designation_id}
    companies = {c.id: c.company_name for c in db.query(OrgCompany).filter(OrgCompany.id.in_(company_ids))} if company_ids else {}
    branches  = {b.id: b.branch_name  for b in db.query(OrgBranch).filter(OrgBranch.id.in_(branch_ids))}   if branch_ids  else {}
    depts     = {d.id: d.department_name  for d in db.query(OrgDepartment).filter(OrgDepartment.id.in_(dept_ids))}  if dept_ids  else {}
    desigs    = {d.id: d.designation_name for d in db.query(OrgDesignation).filter(OrgDesignation.id.in_(desig_ids))} if desig_ids else {}
    return companies, branches, depts, desigs


# ── Serializers ───────────────────────────────────────────────────────────────

def _emp_dict(e, *, company_name=None, branch_name=None, department_name=None, designation_name=None, include_children: bool = False) -> Dict[str, Any]:
    d = {
        "id": e.id, "client_id": e.client_id,
        "company_id": e.company_id,
        "branch_id": getattr(e, "branch_id", None),
        "department_id": e.department_id,
        "designation_id": e.designation_id,
        "company_name": company_name,
        "branch_name": branch_name,
        "department_name": department_name,
        "designation_name": designation_name,
        "work_mode": getattr(e, "work_mode", None),
        "employee_code": e.employee_code,
        "first_name": e.first_name, "middle_name": e.middle_name,
        "last_name": e.last_name, "display_name": e.display_name,
        "full_name": f"{e.first_name} {e.last_name}".strip(),
        "gender": e.gender, "date_of_birth": e.date_of_birth,
        "marital_status": e.marital_status, "blood_group": e.blood_group,
        "nationality": e.nationality, "profile_photo_url": e.profile_photo_url,
        "resume_url": getattr(e, "resume_url", None),
        "resume_filename": getattr(e, "resume_filename", None),
        "personal_email": e.personal_email, "official_email": e.official_email,
        "mobile_country_code": getattr(e, "mobile_country_code", "+91") or "+91",
        "mobile_number": e.mobile_number,
        "alternate_mobile_country_code": getattr(e, "alternate_mobile_country_code", "+91") or "+91",
        "alternate_mobile": e.alternate_mobile,
        "landline_number": e.landline_number,
        "current_address_line_1": e.current_address_line_1,
        "current_address_line_2": e.current_address_line_2,
        "current_city": e.current_city, "current_state": e.current_state,
        "current_country": e.current_country, "current_postal_code": e.current_postal_code,
        "permanent_same_as_current": e.permanent_same_as_current,
        "permanent_address_line_1": e.permanent_address_line_1,
        "permanent_address_line_2": e.permanent_address_line_2,
        "permanent_city": e.permanent_city, "permanent_state": e.permanent_state,
        "permanent_country": e.permanent_country, "permanent_postal_code": e.permanent_postal_code,
        "employee_category": e.employee_category, "employment_type": e.employment_type,
        "employment_status": e.employment_status,
        "joining_date": e.joining_date, "confirmation_date": e.confirmation_date,
        "relieving_date": e.relieving_date,
        "reporting_manager_id": e.reporting_manager_id,
        "functional_manager_id": e.functional_manager_id,
        "is_active": e.is_active,
        "created_at": e.created_at, "updated_at": e.updated_at,
    }
    return d


def _edu_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id, "employee_id": r.employee_id,
        "qualification": r.qualification, "degree": r.degree,
        "specialization": r.specialization, "institution_name": r.institution_name,
        "university": r.university, "country": r.country,
        "start_year": r.start_year, "end_year": r.end_year,
        "percentage": float(r.percentage) if r.percentage is not None else None,
        "cgpa": float(r.cgpa) if r.cgpa is not None else None,
        "is_completed": r.is_completed, "remarks": r.remarks,
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _prev_emp_dict(r) -> Dict[str, Any]:
    duration_months = None
    if r.start_date and r.end_date:
        start = r.start_date
        end = r.end_date
        duration_months = (end.year - start.year) * 12 + (end.month - start.month)
    return {
        "id": r.id, "employee_id": r.employee_id,
        "company_name": r.company_name, "designation": r.designation,
        "department": r.department, "employment_type": r.employment_type,
        "start_date": r.start_date, "end_date": r.end_date,
        "last_salary": float(r.last_salary) if r.last_salary is not None else None,
        "reporting_manager_name": r.reporting_manager_name,
        "reporting_manager_contact": r.reporting_manager_contact,
        "reason_for_leaving": r.reason_for_leaving, "remarks": r.remarks,
        "duration_months": duration_months,
        "duration_years": round(duration_months / 12, 1) if duration_months is not None else None,
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _family_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id, "employee_id": r.employee_id,
        "member_name": r.member_name, "relationship": r.relationship,
        "date_of_birth": r.date_of_birth, "gender": r.gender,
        "occupation": r.occupation,
        "phone_country_code": r.phone_country_code or "+91",
        "phone": r.phone,
        "is_dependent": r.is_dependent, "is_nominee": r.is_nominee,
        "nomination_percentage": float(r.nomination_percentage) if r.nomination_percentage is not None else None,
        "remarks": r.remarks,
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _contact_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id, "employee_id": r.employee_id,
        "contact_name": r.contact_name, "relationship": r.relationship,
        "mobile_country_code": getattr(r, "mobile_country_code", "+91") or "+91",
        "mobile_number": r.mobile_number,
        "alternate_country_code": getattr(r, "alternate_country_code", "+91") or "+91",
        "alternate_number": r.alternate_number,
        "address": r.address,
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _bank_dict(r) -> Dict[str, Any]:
    if r is None:
        return None
    return {
        "id": r.id, "employee_id": r.employee_id,
        "account_holder_name": r.account_holder_name, "bank_name": r.bank_name,
        "branch_name": r.branch_name,
        "account_number": r.account_number,
        "account_type": getattr(r, "account_type", None),
        "ifsc_code": r.ifsc_code, "swift_code": r.swift_code, "upi_id": r.upi_id,
        "salary_credit_date": getattr(r, "salary_credit_date", None),
        "salary_cycle": getattr(r, "salary_cycle", None),
        "pf_account_number": getattr(r, "pf_account_number", None),
        "pf_uan_number": getattr(r, "pf_uan_number", None),
        "esi_number": getattr(r, "esi_number", None),
        "gratuity_applicable": getattr(r, "gratuity_applicable", False),
        "tds_applicable": getattr(r, "tds_applicable", False),
        "tds_percentage": float(r.tds_percentage) if getattr(r, "tds_percentage", None) is not None else None,
        "pan_linked_to_account": getattr(r, "pan_linked_to_account", False),
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _gov_dict(r, mask: bool = True) -> Dict[str, Any]:
    if r is None:
        return None

    def _m(v: Optional[str]) -> Optional[str]:
        if not v or not mask:
            return v
        return "X" * max(0, len(v) - 4) + v[-4:] if len(v) > 4 else "****"

    return {
        "id": r.id, "employee_id": r.employee_id,
        "pan_number": _m(r.pan_number),
        "aadhar_number": _m(r.aadhar_number),
        "passport_number": _m(r.passport_number),
        "driving_license_number": _m(r.driving_license_number),
        "voter_id_number": _m(r.voter_id_number),
        "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _activity_dict(r) -> Dict[str, Any]:
    return {
        "id": r.id, "employee_id": r.employee_id,
        "action": r.action, "actor_id": r.actor_id,
        "ip_address": r.ip_address, "old_value": r.old_value,
        "new_value": r.new_value, "notes": r.notes,
        "created_at": r.created_at,
    }


def _log(db: Session, client_id: str, employee_id: str, action: str, **kwargs) -> None:
    try:
        repo.log_activity(db, client_id, employee_id, action, **kwargs)
    except Exception:
        pass


# ── Experience summary ─────────────────────────────────────────────────────────

def _experience_summary(records: list) -> Dict[str, Any]:
    total_months = 0
    for r in records:
        if r.get("duration_months"):
            total_months += r["duration_months"]
    return {
        "total_months": total_months,
        "total_years": round(total_months / 12, 1),
    }


# ── Employees ─────────────────────────────────────────────────────────────────

def _emp_names(db: Session, emp) -> dict:
    """Single-row name lookup for detail views."""
    companies, branches, depts, desigs = _resolve_names(db, [emp])
    return {
        "company_name":     companies.get(emp.company_id),
        "branch_name":      branches.get(getattr(emp, "branch_id", None)),
        "department_name":  depts.get(emp.department_id),
        "designation_name": desigs.get(emp.designation_id),
    }


def list_employees(db: Session, client_id: str, **kwargs) -> Dict:
    rows, total = repo.list_employees(db, client_id, **kwargs)
    companies, branches, depts, desigs = _resolve_names(db, rows)
    return {
        "data": [_emp_dict(r,
                           company_name=companies.get(r.company_id),
                           branch_name=branches.get(getattr(r, "branch_id", None)),
                           department_name=depts.get(r.department_id),
                           designation_name=desigs.get(r.designation_id))
                 for r in rows],
        "total": total,
        "page": kwargs.get("page", 1),
        "page_size": kwargs.get("page_size", 50),
    }


def get_employee(db: Session, client_id: str, employee_id: str) -> Dict:
    emp = repo.get_employee(db, client_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")
    return _emp_dict(emp, **_emp_names(db, emp))


def get_employee_profile(db: Session, client_id: str, employee_id: str) -> Dict:
    emp = repo.get_employee(db, client_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")

    edu    = [_edu_dict(r)      for r in repo.list_education(db, client_id, employee_id)]
    prev   = [_prev_emp_dict(r) for r in repo.list_prev_employment(db, client_id, employee_id)]
    family = [_family_dict(r)   for r in repo.list_family_members(db, client_id, employee_id)]
    emer   = [_contact_dict(r)  for r in repo.list_emergency_contacts(db, client_id, employee_id)]
    bank   = _bank_dict(repo.get_bank_details(db, client_id, employee_id))
    gov    = _gov_dict(repo.get_government_ids(db, client_id, employee_id), mask=True)
    acts   = [_activity_dict(r) for r in repo.list_activities(db, client_id, employee_id, limit=20)]

    return {
        **_emp_dict(emp, **_emp_names(db, emp)),
        "education": edu,
        "employment_history": prev,
        "experience_summary": _experience_summary(prev),
        "family_members": family,
        "emergency_contacts": emer,
        "bank_details": bank,
        "government_ids": gov,
        "recent_activities": acts,
    }


def create_employee(db: Session, client_id: str, payload, actor_id: Optional[str], ip: Optional[str]) -> Dict:
    data = payload.model_dump(exclude_unset=False)

    if repo.get_employee_by_email(db, client_id, data["official_email"]):
        raise HTTPException(409, f"An employee with email '{data['official_email']}' already exists.")

    data["employee_code"] = repo.next_employee_code(db, client_id)
    data["created_by"] = actor_id

    emp = repo.create_employee(db, client_id, data)
    _log(db, client_id, emp.id, c.ACTION_CREATED, actor_id=actor_id, ip_address=ip,
         notes=f"Employee {emp.employee_code} created")
    return _emp_dict(emp)


def update_employee(db: Session, client_id: str, employee_id: str, payload,
                    actor_id: Optional[str], ip: Optional[str]) -> Dict:
    emp = repo.get_employee(db, client_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")

    data = payload.model_dump(exclude_unset=True, exclude_none=False)

    notes_parts = []
    if "employment_status" in data and data["employment_status"] != emp.employment_status:
        notes_parts.append(f"Status: {emp.employment_status} → {data['employment_status']}")
    if "department_id" in data and data["department_id"] != emp.department_id:
        notes_parts.append("Department changed")
    if "designation_id" in data and data["designation_id"] != emp.designation_id:
        notes_parts.append("Designation changed")

    if "official_email" in data and data["official_email"] != emp.official_email:
        if repo.get_employee_by_email(db, client_id, data["official_email"]):
            raise HTTPException(409, f"Email '{data['official_email']}' already in use.")

    emp = repo.update_employee(db, emp, data)
    _log(db, client_id, emp.id, c.ACTION_UPDATED, actor_id=actor_id, ip_address=ip,
         notes="; ".join(notes_parts) if notes_parts else None)
    return _emp_dict(emp)


def activate_employee(db: Session, client_id: str, employee_id: str,
                      actor_id: Optional[str], ip: Optional[str]) -> Dict:
    emp = repo.get_employee(db, client_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")
    emp = repo.update_employee(db, emp, {"is_active": True, "employment_status": c.STATUS_ACTIVE})
    _log(db, client_id, emp.id, c.ACTION_ACTIVATED, actor_id=actor_id, ip_address=ip)
    return _emp_dict(emp)


def deactivate_employee(db: Session, client_id: str, employee_id: str,
                        actor_id: Optional[str], ip: Optional[str]) -> Dict:
    emp = repo.get_employee(db, client_id, employee_id)
    if not emp:
        raise HTTPException(404, "Employee not found.")
    emp = repo.update_employee(db, emp, {"is_active": False})
    _log(db, client_id, emp.id, c.ACTION_DEACTIVATED, actor_id=actor_id, ip_address=ip)
    return _emp_dict(emp)


def get_meta_options() -> Dict:
    return {
        "employee_categories": c.EMPLOYEE_CATEGORIES,
        "employment_types": c.EMPLOYMENT_TYPES,
        "employment_statuses": c.EMPLOYMENT_STATUSES,
        "genders": c.GENDERS,
        "marital_statuses": c.MARITAL_STATUSES,
        "blood_groups": c.BLOOD_GROUPS,
        "relationships": c.RELATIONSHIPS,
        "family_relationships": c.FAMILY_RELATIONSHIPS,
        "account_types": c.ACCOUNT_TYPES,
        "salary_cycles": c.SALARY_CYCLES,
    }


# ── Education ─────────────────────────────────────────────────────────────────

def list_education(db: Session, client_id: str, employee_id: str) -> List:
    _require_employee(db, client_id, employee_id)
    return [_edu_dict(r) for r in repo.list_education(db, client_id, employee_id)]


def add_education(db: Session, client_id: str, employee_id: str, payload,
                  actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_none=True)
    if data.get("start_year") and data.get("end_year") and data["end_year"] < data["start_year"]:
        raise HTTPException(422, "End year must be >= start year.")
    row = repo.create_education(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "EDUCATION_ADDED", actor_id=actor_id, ip_address=ip)
    return _edu_dict(row)


def update_education(db: Session, client_id: str, employee_id: str, edu_id: str,
                     payload, actor_id: Optional[str], ip: Optional[str]) -> Dict:
    row = repo.get_education(db, client_id, edu_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Education record not found.")
    data = payload.model_dump(exclude_unset=True)
    row = repo.update_education(db, row, data)
    return _edu_dict(row)


def delete_education(db: Session, client_id: str, employee_id: str, edu_id: str) -> None:
    row = repo.get_education(db, client_id, edu_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Education record not found.")
    repo.delete_education(db, row)


# ── Previous Employment ───────────────────────────────────────────────────────

def list_prev_employment(db: Session, client_id: str, employee_id: str) -> List:
    _require_employee(db, client_id, employee_id)
    rows = repo.list_prev_employment(db, client_id, employee_id)
    result = [_prev_emp_dict(r) for r in rows]
    return {"records": result, "experience_summary": _experience_summary(result)}


def add_prev_employment(db: Session, client_id: str, employee_id: str, payload,
                        actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_none=True)
    if data.get("start_date") and data.get("end_date") and data["end_date"] < data["start_date"]:
        raise HTTPException(422, "End date must be >= start date.")
    row = repo.create_prev_employment(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "EMPLOYMENT_HISTORY_ADDED", actor_id=actor_id, ip_address=ip)
    return _prev_emp_dict(row)


def update_prev_employment(db: Session, client_id: str, employee_id: str, hist_id: str,
                           payload, actor_id: Optional[str], ip: Optional[str]) -> Dict:
    row = repo.get_prev_employment(db, client_id, hist_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Employment history record not found.")
    data = payload.model_dump(exclude_unset=True)
    row = repo.update_prev_employment(db, row, data)
    return _prev_emp_dict(row)


def delete_prev_employment(db: Session, client_id: str, employee_id: str, hist_id: str) -> None:
    row = repo.get_prev_employment(db, client_id, hist_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Employment history record not found.")
    repo.delete_prev_employment(db, row)


# ── Family Members ────────────────────────────────────────────────────────────

def list_family_members(db: Session, client_id: str, employee_id: str) -> List:
    _require_employee(db, client_id, employee_id)
    return [_family_dict(r) for r in repo.list_family_members(db, client_id, employee_id)]


def add_family_member(db: Session, client_id: str, employee_id: str, payload,
                      actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_none=True)
    row = repo.create_family_member(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "FAMILY_MEMBER_ADDED", actor_id=actor_id, ip_address=ip,
         notes=f"Added: {row.member_name} ({row.relationship})")
    return _family_dict(row)


def update_family_member(db: Session, client_id: str, employee_id: str, member_id: str,
                         payload, actor_id: Optional[str], ip: Optional[str]) -> Dict:
    row = repo.get_family_member(db, client_id, member_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Family member not found.")
    data = payload.model_dump(exclude_unset=True)
    row = repo.update_family_member(db, row, data)
    return _family_dict(row)


def delete_family_member(db: Session, client_id: str, employee_id: str, member_id: str) -> None:
    row = repo.get_family_member(db, client_id, member_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Family member not found.")
    repo.delete_family_member(db, row)


# ── Emergency Contacts ────────────────────────────────────────────────────────

def list_emergency_contacts(db: Session, client_id: str, employee_id: str) -> List:
    _require_employee(db, client_id, employee_id)
    return [_contact_dict(r) for r in repo.list_emergency_contacts(db, client_id, employee_id)]


def add_emergency_contact(db: Session, client_id: str, employee_id: str, payload,
                          actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_none=True)
    row = repo.create_emergency_contact(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "EMERGENCY_CONTACT_ADDED", actor_id=actor_id, ip_address=ip)
    return _contact_dict(row)


def update_emergency_contact(db: Session, client_id: str, employee_id: str, contact_id: str,
                              payload, actor_id: Optional[str], ip: Optional[str]) -> Dict:
    row = repo.get_emergency_contact(db, client_id, contact_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Emergency contact not found.")
    data = payload.model_dump(exclude_unset=True)
    row = repo.update_emergency_contact(db, row, data)
    return _contact_dict(row)


def delete_emergency_contact(db: Session, client_id: str, employee_id: str, contact_id: str) -> None:
    row = repo.get_emergency_contact(db, client_id, contact_id)
    if not row or row.employee_id != employee_id:
        raise HTTPException(404, "Emergency contact not found.")
    repo.delete_emergency_contact(db, row)


# ── Bank Details ──────────────────────────────────────────────────────────────

def get_bank_details(db: Session, client_id: str, employee_id: str) -> Optional[Dict]:
    _require_employee(db, client_id, employee_id)
    return _bank_dict(repo.get_bank_details(db, client_id, employee_id))


def upsert_bank_details(db: Session, client_id: str, employee_id: str, payload,
                        actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_unset=True)
    row = repo.upsert_bank_details(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "BANK_DETAILS_UPDATED", actor_id=actor_id, ip_address=ip)
    return _bank_dict(row)


# ── Government IDs ────────────────────────────────────────────────────────────

def get_government_ids(db: Session, client_id: str, employee_id: str, mask: bool = True) -> Optional[Dict]:
    _require_employee(db, client_id, employee_id)
    return _gov_dict(repo.get_government_ids(db, client_id, employee_id), mask=mask)


def upsert_government_ids(db: Session, client_id: str, employee_id: str, payload,
                          actor_id: Optional[str], ip: Optional[str]) -> Dict:
    _require_employee(db, client_id, employee_id)
    data = payload.model_dump(exclude_unset=True)
    row = repo.upsert_government_ids(db, client_id, employee_id, data)
    _log(db, client_id, employee_id, "GOVERNMENT_IDS_UPDATED", actor_id=actor_id, ip_address=ip)
    return _gov_dict(row, mask=True)


# ── Activities ────────────────────────────────────────────────────────────────

def list_activities(db: Session, client_id: str, employee_id: str) -> List:
    _require_employee(db, client_id, employee_id)
    return [_activity_dict(r) for r in repo.list_activities(db, client_id, employee_id)]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_employee(db: Session, client_id: str, employee_id: str) -> None:
    if not repo.get_employee(db, client_id, employee_id):
        raise HTTPException(404, "Employee not found.")
