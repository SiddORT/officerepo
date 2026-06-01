"""Router — Organization Settings (superadmin, permission-guarded)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.permissions import require_permission
from backend.app.database.platform import get_platform_db
from backend.app.modules.organization import service
from backend.app.modules.organization.schemas import OrganizationUpdateRequest
from backend.app.modules.rbac import constants as perms
from backend.shared.response import ApiResponse

router = APIRouter()


@router.get("", summary="Get organization settings")
def get_org_settings(
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_ORG_VIEW)),
):
    data = service.get_settings(db, actor=admin.get("email", "unknown"))
    return ApiResponse.ok(data, message="Organization settings retrieved").model_dump()


@router.patch("", summary="Update organization settings")
def update_org_settings(
    payload: OrganizationUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_ORG_UPDATE)),
):
    data = service.update_settings(db, payload, actor=admin.get("email", "unknown"))
    return ApiResponse.ok(data, message="Organization settings saved").model_dump()
