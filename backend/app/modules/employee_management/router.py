"""Employee Management Router.

Prefix: /api/v1/portal/{subdomain}/employees
All routes require:
  1. Valid portal_access JWT
  2. Employee Management module enabled for the client

Routes
  GET    /{subdomain}/employees/meta/options
  GET    /{subdomain}/employees
  POST   /{subdomain}/employees
  GET    /{subdomain}/employees/{emp_id}
  GET    /{subdomain}/employees/{emp_id}/profile
  PATCH  /{subdomain}/employees/{emp_id}
  POST   /{subdomain}/employees/{emp_id}/activate
  POST   /{subdomain}/employees/{emp_id}/deactivate
  GET/POST/PATCH/DELETE  .../education[/{edu_id}]
  GET/POST/PATCH/DELETE  .../employment-history[/{hist_id}]
  GET/POST/PATCH/DELETE  .../emergency-contacts[/{contact_id}]
  GET/PUT                .../bank-details
  GET/PUT                .../government-ids
  GET                    .../activities
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session
from backend.app.modules.employee_management import service as svc
from backend.app.modules.employee_management.constants import MODULE_NAME
from backend.app.modules.employee_management.schemas import (
    EmployeeCreate, EmployeeUpdate,
    EducationCreate, EducationUpdate,
    PreviousEmploymentCreate, PreviousEmploymentUpdate,
    EmergencyContactCreate, EmergencyContactUpdate,
    BankDetailsUpsert, GovernmentIdsUpsert,
)
from backend.shared.response import ApiResponse

router = APIRouter()


def _portal_jwt(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(401, "Portal authentication required.")
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(401, "Invalid or expired portal token.")
    if payload.get("token_type") != "portal_access":
        raise HTTPException(401, "Portal token required.")
    return payload


def _get_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    return xff.split(",")[-1].strip() if xff else (request.client.host if request.client else "unknown")


def _client_db_dep(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> Generator[Session, None, None]:
    from backend.app.modules.client_management import repository as client_repo
    from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE

    client_id = portal_user["client_id"]
    mod = client_repo.get_module(platform_db, client_id, MODULE_NAME)
    if not mod or not mod.is_enabled:
        raise HTTPException(403, f"{MODULE_NAME} is not enabled for this workspace.")

    conn = client_repo.get_db_connection(platform_db, client_id)
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(503, "Client workspace database is not provisioned.")

    url = build_client_db_url(conn)
    from backend.app.database.client_db import provision_portal_schema
    provision_portal_schema(url)

    session = make_client_session(url)
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _sub(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/meta/options")
def meta_options(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


# ── Employee CRUD ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees")
def list_employees(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    search: Optional[str] = None,
    company_id: Optional[str] = None,
    department_id: Optional[str] = None,
    designation_id: Optional[str] = None,
    employee_category: Optional[str] = None,
    employment_type: Optional[str] = None,
    employment_status: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_employees(
        client_db, portal_user["client_id"],
        page=page, page_size=page_size, search=search,
        company_id=company_id, department_id=department_id,
        designation_id=designation_id, employee_category=employee_category,
        employment_type=employment_type, employment_status=employment_status,
    )
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/employees")
def create_employee(
    subdomain: str, payload: EmployeeCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.create_employee(
        client_db, portal_user["client_id"], payload,
        actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Employee created.").model_dump()


@router.get("/{subdomain}/employees/{emp_id}/profile")
def get_employee_profile(
    subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.get_employee_profile(client_db, portal_user["client_id"], emp_id)
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/employees/{emp_id}")
def get_employee(
    subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.get_employee(client_db, portal_user["client_id"], emp_id)
    return ApiResponse.ok(result).model_dump()


@router.patch("/{subdomain}/employees/{emp_id}")
def update_employee(
    subdomain: str, emp_id: str, payload: EmployeeUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.update_employee(
        client_db, portal_user["client_id"], emp_id, payload,
        actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Employee updated.").model_dump()


@router.post("/{subdomain}/employees/{emp_id}/activate")
def activate_employee(
    subdomain: str, emp_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.activate_employee(
        client_db, portal_user["client_id"], emp_id,
        actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Employee activated.").model_dump()


@router.post("/{subdomain}/employees/{emp_id}/deactivate")
def deactivate_employee(
    subdomain: str, emp_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.deactivate_employee(
        client_db, portal_user["client_id"], emp_id,
        actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request),
    )
    return ApiResponse.ok(result, "Employee deactivated.").model_dump()


# ── Education ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/education")
def list_education(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_education(client_db, portal_user["client_id"], emp_id)).model_dump()


@router.post("/{subdomain}/employees/{emp_id}/education")
def add_education(subdomain: str, emp_id: str, payload: EducationCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.add_education(client_db, portal_user["client_id"], emp_id, payload,
                               actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Education record added.").model_dump()


@router.patch("/{subdomain}/employees/{emp_id}/education/{edu_id}")
def update_education(subdomain: str, emp_id: str, edu_id: str, payload: EducationUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.update_education(client_db, portal_user["client_id"], emp_id, edu_id, payload,
                                  actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Education record updated.").model_dump()


@router.delete("/{subdomain}/employees/{emp_id}/education/{edu_id}")
def delete_education(subdomain: str, emp_id: str, edu_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_education(client_db, portal_user["client_id"], emp_id, edu_id)
    return ApiResponse.ok(None, "Education record removed.").model_dump()


# ── Previous Employment ───────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/employment-history")
def list_prev_employment(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_prev_employment(client_db, portal_user["client_id"], emp_id)).model_dump()


@router.post("/{subdomain}/employees/{emp_id}/employment-history")
def add_prev_employment(subdomain: str, emp_id: str, payload: PreviousEmploymentCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.add_prev_employment(client_db, portal_user["client_id"], emp_id, payload,
                                     actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Employment history added.").model_dump()


@router.patch("/{subdomain}/employees/{emp_id}/employment-history/{hist_id}")
def update_prev_employment(subdomain: str, emp_id: str, hist_id: str, payload: PreviousEmploymentUpdate,
    request: Request, portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.update_prev_employment(client_db, portal_user["client_id"], emp_id, hist_id, payload,
                                        actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Employment history updated.").model_dump()


@router.delete("/{subdomain}/employees/{emp_id}/employment-history/{hist_id}")
def delete_prev_employment(subdomain: str, emp_id: str, hist_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_prev_employment(client_db, portal_user["client_id"], emp_id, hist_id)
    return ApiResponse.ok(None, "Employment history removed.").model_dump()


# ── Emergency Contacts ────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/emergency-contacts")
def list_emergency_contacts(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_emergency_contacts(client_db, portal_user["client_id"], emp_id)).model_dump()


@router.post("/{subdomain}/employees/{emp_id}/emergency-contacts")
def add_emergency_contact(subdomain: str, emp_id: str, payload: EmergencyContactCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.add_emergency_contact(client_db, portal_user["client_id"], emp_id, payload,
                                       actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Emergency contact added.").model_dump()


@router.patch("/{subdomain}/employees/{emp_id}/emergency-contacts/{contact_id}")
def update_emergency_contact(subdomain: str, emp_id: str, contact_id: str,
    payload: EmergencyContactUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.update_emergency_contact(client_db, portal_user["client_id"], emp_id, contact_id, payload,
                                          actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Emergency contact updated.").model_dump()


@router.delete("/{subdomain}/employees/{emp_id}/emergency-contacts/{contact_id}")
def delete_emergency_contact(subdomain: str, emp_id: str, contact_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    svc.delete_emergency_contact(client_db, portal_user["client_id"], emp_id, contact_id)
    return ApiResponse.ok(None, "Emergency contact removed.").model_dump()


# ── Bank Details ──────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/bank-details")
def get_bank_details(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_bank_details(client_db, portal_user["client_id"], emp_id)).model_dump()


@router.put("/{subdomain}/employees/{emp_id}/bank-details")
def upsert_bank_details(subdomain: str, emp_id: str, payload: BankDetailsUpsert, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.upsert_bank_details(client_db, portal_user["client_id"], emp_id, payload,
                                     actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Bank details saved.").model_dump()


# ── Government IDs ────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/government-ids")
def get_government_ids(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_government_ids(client_db, portal_user["client_id"], emp_id)).model_dump()


@router.put("/{subdomain}/employees/{emp_id}/government-ids")
def upsert_government_ids(subdomain: str, emp_id: str, payload: GovernmentIdsUpsert, request: Request,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    result = svc.upsert_government_ids(client_db, portal_user["client_id"], emp_id, payload,
                                       actor_id=portal_user.get("admin_user_id"), ip=_get_ip(request))
    return ApiResponse.ok(result, "Government IDs saved.").model_dump()


# ── Activities ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employees/{emp_id}/activities")
def list_activities(subdomain: str, emp_id: str,
    portal_user: dict = Depends(_portal_jwt), client_db: Session = Depends(_client_db_dep)):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.list_activities(client_db, portal_user["client_id"], emp_id)).model_dump()
