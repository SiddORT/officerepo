"""Employee Document Management Portal Router.

Prefix: /api/v1/portal/{subdomain}/employee-documents
Requires: valid portal_access JWT + Organization Management module enabled.
Data lives in the CLIENT database.
"""
from __future__ import annotations

from typing import Generator, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.database.client_db import build_client_db_url, make_client_session, provision_portal_schema
from backend.app.modules.employee_document_management import service as svc
from backend.app.modules.employee_document_management.constants import (
    MODULE_NAME, DOCUMENT_CATEGORIES, DOCUMENT_STATUSES,
)
from backend.app.modules.employee_document_management.schemas import (
    DocTypeCreate, DocTypeUpdate, DocumentUpdate, VerifyDocument, RejectDocument,
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


def _actor(portal_user: dict) -> str:
    return portal_user.get("email") or portal_user.get("name") or "Portal User"


# ── Meta ───────────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employee-documents/meta/options")
def meta_options(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    return ApiResponse.ok(data={
        "statuses": DOCUMENT_STATUSES,
        "categories": DOCUMENT_CATEGORIES,
    })


# ── Dashboard ──────────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employee-documents/dashboard")
def dashboard(
    subdomain: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    stats = svc.get_dashboard(db, portal_user["client_id"])
    return ApiResponse.ok(data=stats)


# ── Document Types ─────────────────────────────────────────────────────────────

@router.get("/{subdomain}/employee-documents/types")
def list_doc_types(
    subdomain: str,
    active_only: bool = Query(False),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    types = svc.list_doc_types(db, portal_user["client_id"], active_only)
    return ApiResponse.ok(data={"items": types, "total": len(types)})


@router.post("/{subdomain}/employee-documents/types")
def create_doc_type(
    subdomain: str,
    body: DocTypeCreate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    t = svc.create_doc_type(db, portal_user["client_id"], body.model_dump())
    return ApiResponse.ok(data=t, message="Document type created.")


@router.patch("/{subdomain}/employee-documents/types/{type_id}")
def update_doc_type(
    subdomain: str, type_id: str,
    body: DocTypeUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    t = svc.update_doc_type(db, portal_user["client_id"], type_id, body.model_dump(exclude_none=True))
    return ApiResponse.ok(data=t, message="Document type updated.")


# ── Employee Documents ─────────────────────────────────────────────────────────

@router.get("/{subdomain}/employee-documents")
def list_documents(
    subdomain: str,
    employee_id: Optional[str] = Query(None),
    document_type_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    result = svc.list_documents(
        db, portal_user["client_id"],
        employee_id=employee_id,
        document_type_id=document_type_id,
        status=status, category=category,
        search=search, page=page, page_size=page_size,
    )
    return ApiResponse.ok(data=result)


@router.post("/{subdomain}/employee-documents")
async def upload_document(
    subdomain: str,
    employee_id: str = Form(...),
    document_type_id: str = Form(...),
    document_number: Optional[str] = Form(None),
    issue_date: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    issuing_authority: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    employee_code: Optional[str] = Form(None),
    employee_name: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = await svc.upload_document(
        db=db, client_id=portal_user["client_id"], actor=_actor(portal_user),
        employee_id=employee_id, document_type_id=document_type_id,
        document_number=document_number, issue_date=issue_date, expiry_date=expiry_date,
        issuing_authority=issuing_authority, remarks=remarks, file=file,
        employee_code=employee_code, employee_name=employee_name,
    )
    return ApiResponse.ok(data=doc, message="Document uploaded.")


@router.get("/{subdomain}/employee-documents/{doc_id}")
def get_document(
    subdomain: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = svc.get_document(db, portal_user["client_id"], doc_id)
    return ApiResponse.ok(data=doc)


@router.patch("/{subdomain}/employee-documents/{doc_id}")
def update_document(
    subdomain: str, doc_id: str,
    body: DocumentUpdate,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = svc.update_document(db, portal_user["client_id"], doc_id, body.model_dump(exclude_none=True), _actor(portal_user))
    return ApiResponse.ok(data=doc, message="Document updated.")


@router.delete("/{subdomain}/employee-documents/{doc_id}")
def delete_document(
    subdomain: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    svc.delete_document(db, portal_user["client_id"], doc_id, _actor(portal_user))
    return ApiResponse.ok(message="Document deleted.")


@router.get("/{subdomain}/employee-documents/{doc_id}/download")
def download_document(
    subdomain: str, doc_id: str,
    version: Optional[int] = Query(None),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    path, filename = svc.get_file_path(db, portal_user["client_id"], doc_id, version)
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.post("/{subdomain}/employee-documents/{doc_id}/replace")
async def replace_file(
    subdomain: str, doc_id: str,
    file: UploadFile = File(...),
    change_notes: Optional[str] = Form(None),
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = await svc.replace_file(db, portal_user["client_id"], doc_id, file, change_notes, _actor(portal_user))
    return ApiResponse.ok(data=doc, message="New version uploaded.")


@router.post("/{subdomain}/employee-documents/{doc_id}/submit")
def submit_for_review(
    subdomain: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = svc.submit_for_review(db, portal_user["client_id"], doc_id, _actor(portal_user))
    return ApiResponse.ok(data=doc, message="Submitted for review.")


@router.post("/{subdomain}/employee-documents/{doc_id}/verify")
def verify_document(
    subdomain: str, doc_id: str,
    body: VerifyDocument,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = svc.verify_document(
        db, portal_user["client_id"], doc_id,
        actor_id=portal_user.get("user_id", ""), actor_name=_actor(portal_user),
        notes=body.notes,
    )
    return ApiResponse.ok(data=doc, message="Document verified.")


@router.post("/{subdomain}/employee-documents/{doc_id}/reject")
def reject_document(
    subdomain: str, doc_id: str,
    body: RejectDocument,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    doc = svc.reject_document(db, portal_user["client_id"], doc_id, _actor(portal_user), body.rejection_reason)
    return ApiResponse.ok(data=doc, message="Document rejected.")


@router.get("/{subdomain}/employee-documents/{doc_id}/versions")
def list_versions(
    subdomain: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    versions = svc.list_versions(db, portal_user["client_id"], doc_id)
    return ApiResponse.ok(data={"items": versions, "total": len(versions)})


@router.get("/{subdomain}/employee-documents/{doc_id}/activities")
def list_activities(
    subdomain: str, doc_id: str,
    portal_user: dict = Depends(_portal_jwt),
    db: Session = Depends(_client_db_dep),
):
    _sub(portal_user, subdomain)
    acts = svc.list_activities(db, portal_user["client_id"], doc_id)
    return ApiResponse.ok(data={"items": acts, "total": len(acts)})
