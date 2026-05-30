"""
Router layer — RBAC management (superadmin, permission-guarded).

HTTP only: validates auth + permission, maps requests to the service layer, and
wraps results in the standard ApiResponse. No business logic lives here.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.permissions import require_permission
from backend.app.database.platform import get_platform_db
from backend.app.modules.rbac import constants as c
from backend.app.modules.rbac import service
from backend.app.modules.rbac.schemas import (
    RoleCreateRequest, RoleUpdateRequest, AssignRolesRequest,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Permission catalog ───────────────────────────────────────────────────────
@router.get("/permissions", summary="List the permission catalog (grouped by module)")
def list_permissions(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(c.PERM_ROLE_VIEW)),
):
    return ApiResponse.ok(service.list_permissions_grouped(db)).model_dump()


# ── Roles ────────────────────────────────────────────────────────────────────
@router.get("/roles", summary="List roles (paginated / searchable)")
def list_roles(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(c.PERM_ROLE_VIEW)),
    page: int = Query(c.DEFAULT_PAGE, ge=1),
    page_size: int = Query(c.DEFAULT_PAGE_SIZE, ge=1, le=c.MAX_PAGE_SIZE),
    sort_by: str = Query(c.DEFAULT_SORT_BY),
    sort_dir: str = Query(c.DEFAULT_SORT_DIR),
    search: Optional[str] = Query(None),
):
    result = service.list_roles(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir, search=search,
    )
    return ApiResponse.paginated(
        items=result["items"], total=result["total"],
        page=result["page"], page_size=result["page_size"],
    ).model_dump()


@router.get("/roles/{role_id}", summary="Role detail (with permission ids)")
def get_role(
    role_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(c.PERM_ROLE_VIEW)),
):
    return ApiResponse.ok(service.get_role_detail(db, role_id)).model_dump()


@router.post("/roles", status_code=status.HTTP_201_CREATED, summary="Create a role")
def create_role(
    payload: RoleCreateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(c.PERM_ROLE_CREATE)),
):
    data = service.create_role(db, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Role created.").model_dump()


@router.patch("/roles/{role_id}", summary="Update a role and/or its permissions")
def update_role(
    role_id: str,
    payload: RoleUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(c.PERM_ROLE_UPDATE)),
):
    data = service.update_role(db, role_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Role updated.").model_dump()


@router.delete("/roles/{role_id}", summary="Delete a role (soft delete)")
def delete_role(
    role_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(c.PERM_ROLE_DELETE)),
):
    service.delete_role(db, role_id, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(message="Role deleted.").model_dump()


# ── Admin ↔ Role assignment ──────────────────────────────────────────────────
@router.get("/admins", summary="List admin accounts with their assigned roles")
def list_admins(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(c.PERM_ROLE_VIEW)),
):
    return ApiResponse.ok(service.list_admins_with_roles(db)).model_dump()


@router.put("/admins/{admin_id}/roles", summary="Set the roles assigned to an admin")
def assign_roles(
    admin_id: int,
    payload: AssignRolesRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(c.PERM_ROLE_ASSIGN)),
):
    data = service.assign_roles(db, admin_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Roles updated.").model_dump()
