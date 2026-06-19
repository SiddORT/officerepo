"""Asset Inventory Portal Router.

Prefix: /api/v1/portal/{subdomain}/assets/inventory
Requires: valid portal_access JWT + Asset Management module enabled.
Data lives in the CLIENT database.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.asset_management import inventory_service as svc
from backend.app.modules.asset_management.inventory_schemas import (
    AssetCreate, AssetUpdate, AssetAssignSchema, AssetReturnSchema,
)
from backend.shared.response import ApiResponse
from backend.shared.storage.file_handler import (
    save_upload, physical_path, Visibility, ALLOWED_DOCUMENT_EXTENSIONS,
    MAX_DOCUMENT_SIZE_BYTES,
)

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
    provision_portal_schema(url, force=False)

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


def _actor(portal_user: dict):
    return portal_user.get("user_id"), portal_user.get("email", "")


# ── Meta ──────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/inventory/meta/options")
def inventory_meta(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(svc.get_meta_options()).model_dump()


# ── Asset CRUD ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/inventory")
def list_assets(
    subdomain: str,
    page: int = 1, page_size: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    sub_category_id: Optional[str] = None,
    company_id: Optional[str] = None,
    branch_id: Optional[str] = None,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_assets(
        client_db, portal_user["client_id"],
        search=search, status=status, category_id=category_id,
        sub_category_id=sub_category_id, company_id=company_id,
        branch_id=branch_id, page=page, page_size=page_size,
    )
    return ApiResponse.ok(result).model_dump()


@router.post("/{subdomain}/assets/inventory", status_code=201)
def create_asset(
    subdomain: str,
    payload: AssetCreate,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.create_asset(client_db, payload, portal_user["client_id"],
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset created.").model_dump()


@router.get("/{subdomain}/assets/inventory/{asset_id}")
def get_asset(
    subdomain: str, asset_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.get_asset(client_db, portal_user["client_id"], asset_id)
    return ApiResponse.ok(result).model_dump()


@router.patch("/{subdomain}/assets/inventory/{asset_id}")
def update_asset(
    subdomain: str, asset_id: str,
    payload: AssetUpdate,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.update_asset(client_db, portal_user["client_id"], asset_id, payload,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset updated.").model_dump()


@router.delete("/{subdomain}/assets/inventory/{asset_id}", status_code=200)
def delete_asset(
    subdomain: str, asset_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    svc.delete_asset(client_db, portal_user["client_id"], asset_id,
                     actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(None, "Asset deleted.").model_dump()


# ── Assignment / Return ────────────────────────────────────────────────────────

@router.post("/{subdomain}/assets/inventory/{asset_id}/assign")
def assign_asset(
    subdomain: str, asset_id: str,
    payload: AssetAssignSchema,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.assign_asset(client_db, portal_user["client_id"], asset_id, payload,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset assigned.").model_dump()


@router.post("/{subdomain}/assets/inventory/{asset_id}/return")
def return_asset(
    subdomain: str, asset_id: str,
    payload: AssetReturnSchema,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    actor_id, actor_name = _actor(portal_user)
    result = svc.return_asset(client_db, portal_user["client_id"], asset_id, payload,
                              actor_id=actor_id, actor_name=actor_name)
    return ApiResponse.ok(result, "Asset returned.").model_dump()


# ── Documents ─────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/inventory/{asset_id}/documents")
def list_docs(
    subdomain: str, asset_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    from backend.app.modules.asset_management import inventory_repository as repo
    docs = repo.list_documents(client_db, asset_id)
    from backend.app.modules.asset_management.inventory_service import _doc_dict
    return ApiResponse.ok([_doc_dict(d) for d in docs]).model_dump()


@router.post("/{subdomain}/assets/inventory/{asset_id}/documents", status_code=201)
async def upload_doc(
    subdomain: str, asset_id: str,
    document_type: str = Form(...),
    remarks: str = Form(None),
    file: UploadFile = File(None),
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    _, actor_name = _actor(portal_user)
    client_id = portal_user["client_id"]

    file_key = None
    filename = ""
    if file and file.filename:
        filename = file.filename
        file_key = await save_upload(
            file,
            scope=f"client_{client_id}",
            module="asset_documents",
            visibility=Visibility.PRIVATE,
            allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
            max_size_bytes=MAX_DOCUMENT_SIZE_BYTES,
        )

    result = svc.add_document(client_db, client_id, asset_id, document_type, filename,
                               file_key=file_key, remarks=remarks, actor_name=actor_name)
    return ApiResponse.ok(result, "Document uploaded.").model_dump()


@router.delete("/{subdomain}/assets/inventory/{asset_id}/documents/{doc_id}")
def delete_doc(
    subdomain: str, asset_id: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    _, actor_name = _actor(portal_user)
    svc.delete_document(client_db, portal_user["client_id"], asset_id, doc_id,
                        actor_name=actor_name)
    return ApiResponse.ok(None, "Document deleted.").model_dump()


# ── Activities ────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/assets/inventory/{asset_id}/activities")
def list_activities(
    subdomain: str, asset_id: str,
    portal_user: dict = Depends(_portal_jwt),
    client_db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_activities(client_db, portal_user["client_id"], asset_id)
    return ApiResponse.ok(result).model_dump()


# ── Public QR profile (no auth) ───────────────────────────────────────────────

@router.get("/{subdomain}/assets/qr/{asset_uuid}")
def qr_profile(
    subdomain: str, asset_uuid: str,
    platform_db: Session = Depends(get_platform_db),
):
    from backend.app.modules.client_management import repository as client_repo
    client = client_repo.get_client_by_subdomain(platform_db, subdomain)
    if not client:
        raise HTTPException(404, "Workspace not found.")

    conn = client_repo.get_db_connection(platform_db, client.id)
    if not conn:
        raise HTTPException(503, "Database not provisioned.")

    from backend.app.modules.asset_management.inventory_models import Asset
    url = build_client_db_url(conn)
    session = make_client_session(url)
    try:
        from backend.app.modules.asset_management import inventory_repository as repo
        a = repo.get_asset_by_uuid(session, asset_uuid)
        if not a:
            raise HTTPException(404, "Asset not found.")
        from backend.app.modules.asset_management.inventory_service import _asset_dict
        return ApiResponse.ok(_asset_dict(a)).model_dump()
    finally:
        session.close()
