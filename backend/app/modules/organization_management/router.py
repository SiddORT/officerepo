"""Organization Management Router.

Prefix: /api/v1/portal/{subdomain}/org
All routes require:
  1. Valid portal_access JWT
  2. Organization Management module enabled for the client

Routes
  Companies
    GET    /{subdomain}/org/companies
    POST   /{subdomain}/org/companies
    GET    /{subdomain}/org/companies/{company_id}
    PATCH  /{subdomain}/org/companies/{company_id}
    POST   /{subdomain}/org/companies/{company_id}/activate
    POST   /{subdomain}/org/companies/{company_id}/deactivate

  Departments
    GET    /{subdomain}/org/departments
    POST   /{subdomain}/org/departments
    GET    /{subdomain}/org/departments/hierarchy/{company_id}
    GET    /{subdomain}/org/departments/{dept_id}
    PATCH  /{subdomain}/org/departments/{dept_id}
    POST   /{subdomain}/org/departments/{dept_id}/activate
    POST   /{subdomain}/org/departments/{dept_id}/deactivate
    GET    /{subdomain}/org/departments/{dept_id}/employees
    GET    /{subdomain}/org/departments/{dept_id}/designations
    GET    /{subdomain}/org/departments/{dept_id}/activities
    GET    /{subdomain}/org/departments/{dept_id}/stats
    POST   /{subdomain}/org/departments/seed/{company_id}

  Employees picker
    GET    /{subdomain}/org/employees/active

  Designations
    GET    /{subdomain}/org/designations
    POST   /{subdomain}/org/designations
    GET    /{subdomain}/org/designations/{desig_id}
    PATCH  /{subdomain}/org/designations/{desig_id}
    POST   /{subdomain}/org/designations/{desig_id}/activate
    POST   /{subdomain}/org/designations/{desig_id}/deactivate

  Hierarchy
    GET    /{subdomain}/org/hierarchy/{company_id}
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session
from backend.app.modules.organization_management import service as svc
from backend.app.modules.organization_management.constants import MODULE_NAME
from backend.app.modules.organization_management.schemas import (
    CompanyCreate, CompanyUpdate,
    DepartmentCreate, DepartmentUpdate,
    DesignationCreate, DesignationUpdate,
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

    # Module gate — check ORGANIZATION is enabled for this client
    mod = client_repo.get_module(platform_db, client_id, MODULE_NAME)
    if not mod or not mod.is_enabled:
        raise HTTPException(403, f"{MODULE_NAME} is not enabled for this workspace.")

    conn = client_repo.get_db_connection(platform_db, client_id)
    if not conn or conn.database_status != DB_STATUS_ACTIVE:
        raise HTTPException(503, "Client workspace database is not provisioned.")

    session = make_client_session(build_client_db_url(conn))
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _subdomain_check(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


# ── Companies ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/org/companies")
def list_companies(
    subdomain: str,
    page: int = 1, page_size: int = 50,
    search: Optional[str] = None, status: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.list_companies(client_db, portal_user["client_id"],
                                page=page, page_size=page_size, search=search, status=status)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/org/companies")
def create_company(
    subdomain: str, payload: CompanyCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.create_company(client_db, portal_user["client_id"], payload,
                                actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Company created.").model_dump()


@router.get("/{subdomain}/org/companies/{company_id}")
def get_company(
    subdomain: str, company_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_company(client_db, portal_user["client_id"], company_id)).model_dump()


@router.patch("/{subdomain}/org/companies/{company_id}")
def update_company(
    subdomain: str, company_id: str, payload: CompanyUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.update_company(client_db, portal_user["client_id"], company_id, payload,
                                actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Company updated.").model_dump()


@router.post("/{subdomain}/org/companies/{company_id}/activate")
def activate_company(
    subdomain: str, company_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_company_status(client_db, portal_user["client_id"], company_id, True,
                                    actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Company activated.").model_dump()


@router.post("/{subdomain}/org/companies/{company_id}/deactivate")
def deactivate_company(
    subdomain: str, company_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_company_status(client_db, portal_user["client_id"], company_id, False,
                                    actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Company deactivated.").model_dump()


# ── Departments — static routes FIRST to avoid {dept_id} clash ─────────────────

@router.get("/{subdomain}/org/departments/hierarchy/{company_id}")
def dept_hierarchy(
    subdomain: str, company_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    tree = svc.get_department_hierarchy(client_db, portal_user["client_id"], company_id)
    return ApiResponse.ok({"tree": tree}).model_dump()


@router.get("/{subdomain}/org/employees/active")
def list_active_employees(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    """Return active employees for pickers (e.g. department head selector)."""
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_active_employees(client_db, portal_user["client_id"])).model_dump()


@router.post("/{subdomain}/org/departments/seed/{company_id}")
def seed_departments(
    subdomain: str, company_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    """Seed sample departments (HR, Finance, IT, Operations, Sales + sub-depts). Idempotent."""
    _subdomain_check(portal_user, subdomain)
    result = svc.seed_departments(client_db, portal_user["client_id"], company_id,
                                  actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result).model_dump()


# ── Departments — parameterized routes ─────────────────────────────────────────

@router.get("/{subdomain}/org/departments")
def list_departments(
    subdomain: str,
    company_id: Optional[str] = None, page: int = 1, page_size: int = 200,
    search: Optional[str] = None, status: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.list_departments(client_db, portal_user["client_id"],
                                  company_id=company_id, page=page, page_size=page_size,
                                  search=search, status=status)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/org/departments")
def create_department(
    subdomain: str, payload: DepartmentCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.create_department(client_db, portal_user["client_id"], payload,
                                   actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Department created.").model_dump()


@router.get("/{subdomain}/org/departments/{dept_id}")
def get_department(
    subdomain: str, dept_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_department(client_db, portal_user["client_id"], dept_id)).model_dump()


@router.patch("/{subdomain}/org/departments/{dept_id}")
def update_department(
    subdomain: str, dept_id: str, payload: DepartmentUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.update_department(client_db, portal_user["client_id"], dept_id, payload,
                                   actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Department updated.").model_dump()


@router.post("/{subdomain}/org/departments/{dept_id}/activate")
def activate_dept(
    subdomain: str, dept_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_department_status(client_db, portal_user["client_id"], dept_id, True,
                                       actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Department activated.").model_dump()


@router.post("/{subdomain}/org/departments/{dept_id}/deactivate")
def deactivate_dept(
    subdomain: str, dept_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_department_status(client_db, portal_user["client_id"], dept_id, False,
                                       actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Department deactivated.").model_dump()


@router.get("/{subdomain}/org/departments/{dept_id}/employees")
def dept_employees(
    subdomain: str, dept_id: str,
    page: int = 1, page_size: int = 50,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(
        svc.get_dept_employees(client_db, portal_user["client_id"], dept_id, page=page, page_size=page_size)
    ).model_dump()


@router.get("/{subdomain}/org/departments/{dept_id}/designations")
def dept_designations(
    subdomain: str, dept_id: str,
    page: int = 1, page_size: int = 100,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(
        svc.get_dept_designations(client_db, portal_user["client_id"], dept_id, page=page, page_size=page_size)
    ).model_dump()


@router.get("/{subdomain}/org/departments/{dept_id}/activities")
def dept_activities(
    subdomain: str, dept_id: str,
    page: int = 1, page_size: int = 50,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(
        svc.get_dept_activities(client_db, portal_user["client_id"], dept_id, page=page, page_size=page_size)
    ).model_dump()


@router.get("/{subdomain}/org/departments/{dept_id}/stats")
def dept_stats(
    subdomain: str, dept_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(
        svc.get_dept_stats(client_db, portal_user["client_id"], dept_id)
    ).model_dump()


# ── Designations ───────────────────────────────────────────────────────────────

@router.get("/{subdomain}/org/designations")
def list_designations(
    subdomain: str,
    company_id: Optional[str] = None, department_id: Optional[str] = None,
    page: int = 1, page_size: int = 200,
    search: Optional[str] = None, status: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.list_designations(client_db, portal_user["client_id"],
                                   company_id=company_id, department_id=department_id,
                                   page=page, page_size=page_size, search=search, status=status)
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/org/designations")
def create_designation(
    subdomain: str, payload: DesignationCreate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.create_designation(client_db, portal_user["client_id"], payload,
                                    actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Designation created.").model_dump()


# Static routes BEFORE /{desig_id} to avoid conflicts
@router.post("/{subdomain}/org/designations/seed/{company_id}")
def seed_designations(
    subdomain: str, company_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.seed_designations(client_db, portal_user["client_id"], company_id)
    return ApiResponse.ok(result, result["message"]).model_dump()


@router.get("/{subdomain}/org/designations/{desig_id}")
def get_designation(
    subdomain: str, desig_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_designation(client_db, portal_user["client_id"], desig_id)).model_dump()


@router.patch("/{subdomain}/org/designations/{desig_id}")
def update_designation(
    subdomain: str, desig_id: str, payload: DesignationUpdate, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.update_designation(client_db, portal_user["client_id"], desig_id, payload,
                                    actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Designation updated.").model_dump()


@router.post("/{subdomain}/org/designations/{desig_id}/activate")
def activate_desig(
    subdomain: str, desig_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_designation_status(client_db, portal_user["client_id"], desig_id, True,
                                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Designation activated.").model_dump()


@router.post("/{subdomain}/org/designations/{desig_id}/deactivate")
def deactivate_desig(
    subdomain: str, desig_id: str, request: Request,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.set_designation_status(client_db, portal_user["client_id"], desig_id, False,
                                        actor_id=portal_user["admin_user_id"], ip=_get_ip(request))
    return ApiResponse.ok(result, "Designation deactivated.").model_dump()


@router.get("/{subdomain}/org/designations/{desig_id}/employees")
def desig_employees(
    subdomain: str, desig_id: str,
    page: int = 1, page_size: int = 50,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.get_desig_employees(client_db, portal_user["client_id"], desig_id,
                                     page=page, page_size=page_size)
    return ApiResponse.ok(result).model_dump()


@router.get("/{subdomain}/org/designations/{desig_id}/activities")
def desig_activities(
    subdomain: str, desig_id: str,
    page: int = 1, page_size: int = 50,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    result = svc.get_desig_activities(client_db, portal_user["client_id"],
                                      page=page, page_size=page_size)
    return ApiResponse.ok(result).model_dump()


# ── Hierarchy (org-wide view) ──────────────────────────────────────────────────

@router.get("/{subdomain}/org/hierarchy/{company_id}")
def org_hierarchy(
    subdomain: str, company_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _subdomain_check(portal_user, subdomain)
    client_id = portal_user["client_id"]
    from backend.app.modules.organization_management import repository as org_repo
    company = svc.get_company(client_db, client_id, company_id)
    dept_tree = svc.get_department_hierarchy(client_db, client_id, company_id)
    desigs, _ = org_repo.list_designations(client_db, client_id, company_id=company_id, page_size=1000)
    return ApiResponse.ok({
        "company": company,
        "department_tree": dept_tree,
        "designations": [svc._desig_dict(d) for d in desigs],
    }).model_dump()
