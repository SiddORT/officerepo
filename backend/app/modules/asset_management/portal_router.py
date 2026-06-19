"""Portal-facing Asset Management router.

Prefix: /api/v1/portal/{subdomain}/assets
Requires: valid portal_access JWT + "Asset Management" module enabled for the client.
Reads and writes the platform DB (catalog is platform-level, shared across tenants).
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.asset_management import service as svc
from backend.app.modules.asset_management.schemas import (
    AssetCategoryCreate, AssetCategoryUpdate,
    AssetSubCategoryCreate, AssetSubCategoryUpdate,
    AssetMasterCreate, AssetMasterUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter()

MODULE_NAME = "Asset Management"


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


def _module_guard(
    portal_user: dict = Depends(_portal_jwt),
    platform_db: Session = Depends(get_platform_db),
) -> dict:
    from backend.app.modules.client_management import repository as client_repo
    client_id = portal_user["client_id"]
    mod = client_repo.get_module(platform_db, client_id, MODULE_NAME)
    if not mod or not mod.is_enabled:
        raise HTTPException(403, f"{MODULE_NAME} is not enabled for this workspace.")
    return portal_user


def _subdomain_check(portal_user: dict, subdomain: str) -> None:
    if portal_user.get("subdomain") != subdomain:
        raise HTTPException(403, "Token does not match this workspace.")


# ── Meta Options ──────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/meta/options")
def get_meta_options(
    subdomain: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options(db)).model_dump()


# ── Categories ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/categories")
def list_categories(
    subdomain: str,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_categories(
        db, search=search, status=status, page=page, page_size=page_size,
    )).model_dump()


@router.post("/{subdomain}/assets/categories", status_code=201)
def create_category(
    subdomain: str,
    payload: AssetCategoryCreate,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.create_category(
        db, payload,
        actor_id=portal_user.get("user_id"),
        actor_email=portal_user.get("email"),
    ), "Category created.").model_dump()


@router.get("/{subdomain}/assets/categories/{category_id}")
def get_category(
    subdomain: str,
    category_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_category(db, category_id)).model_dump()


@router.patch("/{subdomain}/assets/categories/{category_id}")
def update_category(
    subdomain: str,
    category_id: str,
    payload: AssetCategoryUpdate,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.update_category(
        db, category_id, payload,
        actor_id=portal_user.get("user_id"),
        actor_email=portal_user.get("email"),
    ), "Category updated.").model_dump()


@router.post("/{subdomain}/assets/categories/{category_id}/activate")
def activate_category(
    subdomain: str,
    category_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.set_category_status(
        db, category_id, activate=True,
        actor_email=portal_user.get("email"),
    ), "Category activated.").model_dump()


@router.post("/{subdomain}/assets/categories/{category_id}/deactivate")
def deactivate_category(
    subdomain: str,
    category_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.set_category_status(
        db, category_id, activate=False,
        actor_email=portal_user.get("email"),
    ), "Category deactivated.").model_dump()


# ── Sub-Categories ────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/sub-categories")
def list_sub_categories(
    subdomain: str,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_sub_categories(
        db, category_id=category_id, search=search, status=status,
        page=page, page_size=page_size,
    )).model_dump()


@router.post("/{subdomain}/assets/sub-categories", status_code=201)
def create_sub_category(
    subdomain: str,
    payload: AssetSubCategoryCreate,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.create_sub_category(
        db, payload,
        actor_id=portal_user.get("user_id"),
        actor_email=portal_user.get("email"),
    ), "Sub-category created.").model_dump()


@router.get("/{subdomain}/assets/sub-categories/{sub_cat_id}")
def get_sub_category(
    subdomain: str,
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_sub_category(db, sub_cat_id)).model_dump()


@router.patch("/{subdomain}/assets/sub-categories/{sub_cat_id}")
def update_sub_category(
    subdomain: str,
    sub_cat_id: str,
    payload: AssetSubCategoryUpdate,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.update_sub_category(
        db, sub_cat_id, payload,
        actor_id=portal_user.get("user_id"),
        actor_email=portal_user.get("email"),
    ), "Sub-category updated.").model_dump()


@router.post("/{subdomain}/assets/sub-categories/{sub_cat_id}/activate")
def activate_sub_category(
    subdomain: str,
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.set_sub_category_status(
        db, sub_cat_id, activate=True,
        actor_email=portal_user.get("email"),
    ), "Sub-category activated.").model_dump()


@router.post("/{subdomain}/assets/sub-categories/{sub_cat_id}/deactivate")
def deactivate_sub_category(
    subdomain: str,
    sub_cat_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.set_sub_category_status(
        db, sub_cat_id, activate=False,
        actor_email=portal_user.get("email"),
    ), "Sub-category deactivated.").model_dump()


# ── Asset Masters (Catalog) ───────────────────────────────────────────────────

@router.post("/{subdomain}/assets/catalog", status_code=201)
def create_catalog_item(
    subdomain: str,
    payload: AssetMasterCreate,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.create_asset_master(
        db, payload,
        actor_id=portal_user.get("user_id"),
        actor_email=portal_user.get("email"),
    ), "Asset added to catalog.").model_dump()


@router.get("/{subdomain}/assets/catalog")
def list_catalog(
    subdomain: str,
    category_id: Optional[str] = None,
    sub_category_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_asset_masters(
        db, category_id=category_id, sub_category_id=sub_category_id,
        search=search, status="Active", page=page, page_size=page_size,
    )).model_dump()


@router.get("/{subdomain}/assets/catalog/{master_id}")
def get_catalog_item(
    subdomain: str,
    master_id: str,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.get_asset_master(db, master_id)).model_dump()
