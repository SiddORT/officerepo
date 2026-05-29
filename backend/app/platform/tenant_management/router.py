from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.database.platform import get_platform_db
from backend.app.core.security import decode_access_token
from backend.app.platform.tenant_management import service
from backend.app.platform.tenant_management.schemas import (
    TenantCreateRequest, TenantUpdateRequest,
    TenantDraftCreateRequest,
    DomainStepRequest, DatabaseStepRequest,
    SubscriptionStepRequest, ModulesStepRequest,
)
from backend.shared.response import ApiResponse
from backend.shared.storage.file_handler import upload_image
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
_bearer = HTTPBearer()


def _current_admin(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Validate superadmin JWT and expose the verified kid on request state.

    Sets ``request.state.token_kid`` so the TenantMiddleware can emit a
    structured log record for each successfully authenticated request.
    """
    try:
        payload = decode_access_token(creds.credentials)
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Superadmin role required.")
        request.state.token_kid = payload.get("_kid", "unknown")
        return payload.get("email", "unknown")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ── List tenants ──────────────────────────────────────────────────────────────

@router.get("", summary="List tenants (paginated, filterable)")
def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None, pattern="^(active|suspended|inactive)$"),
    region: Optional[str] = Query(None, max_length=100),
    db: Session = Depends(get_platform_db),
    _: str = Depends(_current_admin),
):
    data = service.list_tenants(db, search=search, status=status, region=region, page=page, page_size=page_size)
    return ApiResponse.ok(data, "Tenants retrieved.").model_dump()


# ── Get tenant detail ─────────────────────────────────────────────────────────

@router.get("/{tenant_id}", summary="Get full tenant details")
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_platform_db),
    _: str = Depends(_current_admin),
):
    data = service.get_tenant_detail(db, tenant_id)
    return ApiResponse.ok(data, "Tenant details retrieved.").model_dump()


# ── Create tenant (full, one-shot) ────────────────────────────────────────────

@router.post("", summary="Create a new tenant (one-shot)", status_code=201)
def create_tenant(
    payload: TenantCreateRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.create_tenant(db, payload, performed_by=admin)
    return ApiResponse.ok(data, "Tenant created successfully.").model_dump()


# ── Draft create (step 0) ─────────────────────────────────────────────────────

@router.post("/draft", summary="Create tenant draft (basic info only)", status_code=201)
def create_draft(
    payload: TenantDraftCreateRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.create_draft_tenant(db, payload, performed_by=admin)
    return ApiResponse.ok(data, "Tenant draft created.").model_dump()


# ── Re-save basic info (step 0 revisit) ──────────────────────────────────────

@router.patch("/{tenant_id}/step/basic", summary="Re-save basic info for existing draft")
def update_basic_info(
    tenant_id: int,
    payload: TenantDraftCreateRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.update_basic_info(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Basic info updated.").model_dump()


# ── Save domain step (step 1) ─────────────────────────────────────────────────

@router.patch("/{tenant_id}/step/domain", summary="Save domain configuration")
def save_domain_step(
    tenant_id: int,
    payload: DomainStepRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.save_domain_step(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Domain saved.").model_dump()


# ── Save database step (step 2) ───────────────────────────────────────────────

@router.patch("/{tenant_id}/step/database", summary="Save database configuration")
def save_database_step(
    tenant_id: int,
    payload: DatabaseStepRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.save_database_step(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Database configuration saved.").model_dump()


# ── Save subscription step (step 3) ──────────────────────────────────────────

@router.patch("/{tenant_id}/step/subscription", summary="Save subscription plan")
def save_subscription_step(
    tenant_id: int,
    payload: SubscriptionStepRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.save_subscription_step(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Subscription saved.").model_dump()


# ── Save modules step (step 4) ────────────────────────────────────────────────

@router.patch("/{tenant_id}/step/modules", summary="Save module enablement (final step)")
def save_modules_step(
    tenant_id: int,
    payload: ModulesStepRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.save_modules_step(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Modules saved.").model_dump()


# ── Update tenant ─────────────────────────────────────────────────────────────

@router.put("/{tenant_id}", summary="Update tenant basic info")
def update_tenant(
    tenant_id: int,
    payload: TenantUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    data = service.update_tenant(db, tenant_id, payload, performed_by=admin)
    return ApiResponse.ok(data, "Tenant updated.").model_dump()


# ── Suspend tenant ────────────────────────────────────────────────────────────

@router.patch("/{tenant_id}/suspend", summary="Suspend a tenant")
def suspend_tenant(
    tenant_id: int,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    result = service.suspend_tenant(db, tenant_id, performed_by=admin)
    return ApiResponse.ok(result, result["message"]).model_dump()


# ── Activate tenant ───────────────────────────────────────────────────────────

@router.patch("/{tenant_id}/activate", summary="Activate a tenant")
def activate_tenant(
    tenant_id: int,
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    result = service.activate_tenant(db, tenant_id, performed_by=admin)
    return ApiResponse.ok(result, result["message"]).model_dump()


# ── Upload logo ───────────────────────────────────────────────────────────────

@router.post("/{tenant_id}/logo", summary="Upload tenant logo")
async def upload_logo(
    tenant_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_platform_db),
    admin: str = Depends(_current_admin),
):
    path = await upload_image(file, tenant_id, "branding")
    result = service.update_logo(db, tenant_id, path, performed_by=admin)
    return ApiResponse.ok(result, "Logo uploaded.").model_dump()
