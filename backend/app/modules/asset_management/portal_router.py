"""Portal-facing Asset Management router.

Prefix: /api/v1/portal/{subdomain}/assets
Requires: valid portal_access JWT + "Asset Management" module enabled for the client.
Reads from the platform DB (catalog is platform-level, not per-tenant).
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.asset_management import service as svc
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
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_categories(
        db, search=search, status="Active", page=page, page_size=page_size,
    )).model_dump()


# ── Sub-Categories ────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/sub-categories")
def list_sub_categories(
    subdomain: str,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 200,
    db: Session = Depends(get_platform_db),
    portal_user: dict = Depends(_module_guard),
):
    _subdomain_check(portal_user, subdomain)
    return ApiResponse.ok(svc.list_sub_categories(
        db, category_id=category_id, search=search, status="Active",
        page=page, page_size=page_size,
    )).model_dump()


# ── Asset Masters (Catalog) ───────────────────────────────────────────────────

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
