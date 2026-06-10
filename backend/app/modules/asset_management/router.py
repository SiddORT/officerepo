"""Router — Superadmin Asset Management Setup.

All routes are superadmin-JWT-gated.
Prefix mounted at: /api/v1/superadmin/assets
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.asset_management import service as svc
from backend.app.modules.asset_management.schemas import (
    AssetCategoryCreate, AssetCategoryUpdate,
    AssetSubCategoryCreate, AssetSubCategoryUpdate,
    AssetMasterCreate, AssetMasterUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/meta/options")
def get_meta_options(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.get_meta_options(db)).model_dump()


# ── Asset Categories ──────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.list_categories(
        db, search=search, status=status, page=page, page_size=page_size,
    )).model_dump()


@router.post("/categories", status_code=201)
def create_category(
    payload: AssetCategoryCreate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.create_category(
        db, payload, actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Category created.").model_dump()


@router.get("/categories/{category_id}")
def get_category(
    category_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.get_category(db, category_id)).model_dump()


@router.patch("/categories/{category_id}")
def update_category(
    category_id: str,
    payload: AssetCategoryUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.update_category(
        db, category_id, payload,
        actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Category updated.").model_dump()


@router.post("/categories/{category_id}/activate")
def activate_category(
    category_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_category_status(
        db, category_id, activate=True, actor_email=admin.get("email"),
    ), "Category activated.").model_dump()


@router.post("/categories/{category_id}/deactivate")
def deactivate_category(
    category_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_category_status(
        db, category_id, activate=False, actor_email=admin.get("email"),
    ), "Category deactivated.").model_dump()


# ── Asset Sub-Categories ──────────────────────────────────────────────────────

@router.get("/sub-categories")
def list_sub_categories(
    category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.list_sub_categories(
        db, category_id=category_id, search=search, status=status,
        page=page, page_size=page_size,
    )).model_dump()


@router.post("/sub-categories", status_code=201)
def create_sub_category(
    payload: AssetSubCategoryCreate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.create_sub_category(
        db, payload, actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Sub-category created.").model_dump()


@router.get("/sub-categories/{sub_cat_id}")
def get_sub_category(
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.get_sub_category(db, sub_cat_id)).model_dump()


@router.patch("/sub-categories/{sub_cat_id}")
def update_sub_category(
    sub_cat_id: str,
    payload: AssetSubCategoryUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.update_sub_category(
        db, sub_cat_id, payload,
        actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Sub-category updated.").model_dump()


@router.post("/sub-categories/{sub_cat_id}/activate")
def activate_sub_category(
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_sub_category_status(
        db, sub_cat_id, activate=True, actor_email=admin.get("email"),
    ), "Sub-category activated.").model_dump()


@router.post("/sub-categories/{sub_cat_id}/deactivate")
def deactivate_sub_category(
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_sub_category_status(
        db, sub_cat_id, activate=False, actor_email=admin.get("email"),
    ), "Sub-category deactivated.").model_dump()


# ── Asset Masters ─────────────────────────────────────────────────────────────

@router.get("/masters")
def list_asset_masters(
    category_id: Optional[str] = Query(None),
    sub_category_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.list_asset_masters(
        db, category_id=category_id, sub_category_id=sub_category_id,
        search=search, status=status, page=page, page_size=page_size,
    )).model_dump()


@router.post("/masters", status_code=201)
def create_asset_master(
    payload: AssetMasterCreate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.create_asset_master(
        db, payload, actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Asset master created.").model_dump()


@router.get("/masters/{master_id}")
def get_asset_master(
    master_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.get_asset_master(db, master_id)).model_dump()


@router.patch("/masters/{master_id}")
def update_asset_master(
    master_id: str,
    payload: AssetMasterUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.update_asset_master(
        db, master_id, payload,
        actor_id=admin.get("user_id"), actor_email=admin.get("email"),
    ), "Asset master updated.").model_dump()


@router.post("/masters/{master_id}/activate")
def activate_asset_master(
    master_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_asset_master_status(
        db, master_id, activate=True, actor_email=admin.get("email"),
    ), "Asset master activated.").model_dump()


@router.post("/masters/{master_id}/deactivate")
def deactivate_asset_master(
    master_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    return ApiResponse.ok(svc.set_asset_master_status(
        db, master_id, activate=False, actor_email=admin.get("email"),
    ), "Asset master deactivated.").model_dump()
