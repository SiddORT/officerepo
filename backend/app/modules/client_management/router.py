"""
Router layer — Client Management (superadmin only).

HTTP only: validates auth, maps requests to the service layer, wraps results in
the standard ApiResponse. No business logic lives here.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.client_management import constants as c
from backend.app.modules.client_management import service
from backend.app.modules.client_management.schemas import (
    ClientCreateRequest, ClientUpdateRequest, StatusUpdateRequest,
    ContactCreateRequest, ContactUpdateRequest, BillingProfileRequest,
    SubscriptionRequest, ModuleToggleRequest, DbConnectionRequest,
    DomainCreateRequest, AdminUserCreateRequest, AdminUserUpdateRequest,
    DocTypeCreateRequest, DocTypeUpdateRequest,
)
from backend.shared.response import ApiResponse
from backend.shared.storage.file_handler import (
    Visibility, delete_file, physical_path, save_document,
)

router = APIRouter()
_bearer = HTTPBearer()


def _current_admin(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Validate the superadmin JWT and return {user_id, email}."""
    try:
        payload = decode_access_token(creds.credentials)
        if payload.get("role") != "superadmin":
            raise HTTPException(status_code=403, detail="Superadmin role required.")
        request.state.token_kid = payload.get("_kid", "unknown")
        return {"user_id": payload.get("user_id"), "email": payload.get("email", "unknown")}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ── Document type master (settings) ──────────────────────────────────────────
doc_type_router = APIRouter()


@doc_type_router.get("", summary="List all document types")
def list_doc_types(
    active_only: bool = Query(False),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(_current_admin),
):
    return ApiResponse.ok(service.list_doc_types(db, active_only=active_only)).model_dump()


@doc_type_router.post("", summary="Create a document type")
def create_doc_type(payload: DocTypeCreateRequest, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.create_doc_type(db, payload, actor=admin["email"]),
                          "Document type created.").model_dump()


@doc_type_router.patch("/{type_id}", summary="Update a document type")
def update_doc_type(type_id: str, payload: DocTypeUpdateRequest, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_doc_type(db, type_id, payload, actor=admin["email"]),
                          "Document type updated.").model_dump()


@doc_type_router.delete("/{type_id}", summary="Delete an unused document type")
def delete_doc_type(type_id: str, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    service.delete_doc_type(db, type_id, actor=admin["email"])
    return ApiResponse.ok(None, "Document type deleted.").model_dump()


# ── Metadata / options ───────────────────────────────────────────────────────
@router.get("/meta/options", summary="Controlled vocabularies for client forms")
def get_options(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(_current_admin),
):
    doc_types = service.list_doc_types(db, active_only=True)
    return ApiResponse.ok({
        "statuses": c.CLIENT_STATUSES,
        "contact_types": c.CONTACT_TYPES,
        "db_statuses": c.DB_STATUSES,
        "admin_statuses": c.ADMIN_STATUSES,
        "subscription_statuses": c.SUBSCRIPTION_STATUSES,
        "billing_cycles": c.BILLING_CYCLES,
        "modules": c.CLIENT_MODULES,
        "document_types": c.DOCUMENT_TYPES,
        "document_type_master": doc_types,
        "payment_terms": c.PAYMENT_TERMS,
        "currencies": c.CURRENCY_CODES,
    }).model_dump()


# ── Dashboard ────────────────────────────────────────────────────────────────
@router.get("/dashboard", summary="Client portfolio dashboard widgets")
def dashboard(db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    total = service.repo.count_clients(db)
    by_status = service.repo.status_counts(db)
    return ApiResponse.ok({
        "total_clients": total,
        "status_breakdown": by_status,
        "active": by_status.get(c.STATUS_ACTIVE, 0),
        "trial": by_status.get(c.STATUS_TRIAL, 0),
        "prospective": by_status.get(c.STATUS_PROSPECTIVE, 0),
        "suspended": by_status.get(c.STATUS_SUSPENDED, 0),
    }).model_dump()


# ── Client CRUD ──────────────────────────────────────────────────────────────
@router.get("", summary="List clients (paginated, filterable, sortable)")
def list_clients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    status: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(_current_admin),
):
    allowed_sort = {"created_at", "updated_at", "company_name", "client_code", "status"}
    sort_by = sort_by if sort_by in allowed_sort else "created_at"
    items, total = service.list_clients(
        db, page=page, page_size=page_size, search=search, status=status,
        industry=industry, country=country, sort_by=sort_by, sort_dir=sort_dir,
    )
    return ApiResponse.paginated(items, total, page, page_size).model_dump()


@router.post("", summary="Create a client")
def create_client(payload: ClientCreateRequest, db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    data = service.create_client(db, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, "Client created.").model_dump()


@router.get("/{client_id}", summary="Get a client's full detail")
def get_client(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_client_detail(db, client_id)).model_dump()


@router.patch("/{client_id}", summary="Update a client")
def update_client(client_id: str, payload: ClientUpdateRequest, db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_client(db, client_id, payload, actor=admin["email"]),
                          "Client updated.").model_dump()


@router.post("/{client_id}/status", summary="Change a client's lifecycle status")
def update_status(client_id: str, payload: StatusUpdateRequest, db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_status(db, client_id, payload, actor=admin["email"]),
                          "Status updated.").model_dump()


@router.delete("/{client_id}", summary="Soft-delete (archive) a client")
def delete_client(client_id: str, db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    service.delete_client(db, client_id, actor=admin["email"])
    return ApiResponse.ok(None, "Client deleted.").model_dump()


# ── Contacts ─────────────────────────────────────────────────────────────────
@router.get("/{client_id}/contacts")
def list_contacts(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_contacts(db, client_id)).model_dump()


@router.post("/{client_id}/contacts")
def add_contact(client_id: str, payload: ContactCreateRequest, db: Session = Depends(get_platform_db),
                admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(
        service.add_contact(db, client_id, payload, actor_id=admin["user_id"], actor=admin["email"]),
        "Contact added.").model_dump()


@router.patch("/{client_id}/contacts/{contact_id}")
def update_contact(client_id: str, contact_id: str, payload: ContactUpdateRequest,
                   db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_contact(db, client_id, contact_id, payload, actor=admin["email"]),
                          "Contact updated.").model_dump()


@router.delete("/{client_id}/contacts/{contact_id}")
def delete_contact(client_id: str, contact_id: str, db: Session = Depends(get_platform_db),
                   admin: dict = Depends(_current_admin)):
    service.delete_contact(db, client_id, contact_id, actor=admin["email"])
    return ApiResponse.ok(None, "Contact deleted.").model_dump()


# ── Billing profile (Commercials) ────────────────────────────────────────────
@router.get("/{client_id}/billing")
def get_billing(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_billing(db, client_id)).model_dump()


@router.put("/{client_id}/billing")
def upsert_billing(client_id: str, payload: BillingProfileRequest, db: Session = Depends(get_platform_db),
                   admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.upsert_billing(db, client_id, payload, actor=admin["email"]),
                          "Commercials updated.").model_dump()


# ── Subscription ─────────────────────────────────────────────────────────────
@router.get("/{client_id}/subscription")
def get_subscription(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_subscription(db, client_id)).model_dump()


@router.put("/{client_id}/subscription")
def upsert_subscription(client_id: str, payload: SubscriptionRequest, db: Session = Depends(get_platform_db),
                        admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.upsert_subscription(db, client_id, payload, actor=admin["email"]),
                          "Subscription updated.").model_dump()


# ── Modules ──────────────────────────────────────────────────────────────────
@router.get("/{client_id}/modules")
def list_modules(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_modules(db, client_id)).model_dump()


@router.get("/{client_id}/modules/nested")
def list_modules_nested(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    """Return top-level modules with their children and enabled status for the Modules tab."""
    return ApiResponse.ok(service.list_modules_nested(db, client_id)).model_dump()


@router.post("/{client_id}/modules")
def toggle_module(client_id: str, payload: ModuleToggleRequest, db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    msg = "Module enabled." if payload.is_enabled else "Module disabled."
    return ApiResponse.ok(service.toggle_module(db, client_id, payload, actor=admin["email"]), msg).model_dump()


# ── Database connection (tenant DB config) ───────────────────────────────────
@router.get("/{client_id}/database")
def get_db_config(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.get_db_config(db, client_id)).model_dump()


@router.put("/{client_id}/database")
def upsert_db_config(client_id: str, payload: DbConnectionRequest, db: Session = Depends(get_platform_db),
                     admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.upsert_db_config(db, client_id, payload, actor=admin["email"]),
                          "Database configuration updated.").model_dump()


@router.post("/{client_id}/database/provision")
def provision_database(client_id: str, db: Session = Depends(get_platform_db),
                       admin: dict = Depends(_current_admin)):
    data = service.provision_database(db, client_id, actor=admin["email"])
    return ApiResponse.ok(data, "Database provisioned successfully.").model_dump()


@router.delete("/{client_id}/database/provision")
def deprovision_database(client_id: str, db: Session = Depends(get_platform_db),
                         admin: dict = Depends(_current_admin)):
    data = service.deprovision_database(db, client_id, actor=admin["email"])
    return ApiResponse.ok(data, "Database deprovisioned.").model_dump()


# ── Domains ──────────────────────────────────────────────────────────────────
@router.get("/{client_id}/domains")
def list_domains(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_domains(db, client_id)).model_dump()


@router.post("/{client_id}/domains")
def add_domain(client_id: str, payload: DomainCreateRequest, db: Session = Depends(get_platform_db),
               admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_domain(db, client_id, payload, actor=admin["email"]),
                          "Domain added.").model_dump()


@router.patch("/{client_id}/domains/{domain_id}/activate")
def activate_domain(client_id: str, domain_id: str, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    data = service.activate_domain(db, client_id, domain_id, actor=admin["email"])
    return ApiResponse.ok(data, "Domain activated.").model_dump()


@router.delete("/{client_id}/domains/{domain_id}")
def delete_domain(client_id: str, domain_id: str, db: Session = Depends(get_platform_db),
                  admin: dict = Depends(_current_admin)):
    service.delete_domain(db, client_id, domain_id, actor=admin["email"])
    return ApiResponse.ok(None, "Domain deleted.").model_dump()


# ── Admin users ──────────────────────────────────────────────────────────────
@router.get("/{client_id}/admin-users")
def list_admin_users(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_admin_users(db, client_id)).model_dump()


@router.post("/{client_id}/admin-users")
def add_admin_user(client_id: str, payload: AdminUserCreateRequest, db: Session = Depends(get_platform_db),
                   admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.add_admin_user(db, client_id, payload, actor=admin["email"]),
                          "Admin user added.").model_dump()


@router.patch("/{client_id}/admin-users/{admin_id}")
def update_admin_user(client_id: str, admin_id: str, payload: AdminUserUpdateRequest,
                      db: Session = Depends(get_platform_db), admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.update_admin_user(db, client_id, admin_id, payload, actor=admin["email"]),
                          "Admin user updated.").model_dump()


@router.post("/{client_id}/admin-users/{admin_id}/send-invite")
def send_admin_user_invite(client_id: str, admin_id: str, db: Session = Depends(get_platform_db),
                           admin: dict = Depends(_current_admin)):
    data = service.send_admin_invite(db, client_id, admin_id, actor=admin["email"])
    return ApiResponse.ok(data, "Invite sent.").model_dump()


# ── Activity logs ────────────────────────────────────────────────────────────
@router.get("/{client_id}/activities")
def list_activities(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_activity_logs(db, client_id)).model_dump()


# ── Documents ────────────────────────────────────────────────────────────────
@router.get("/{client_id}/documents")
def list_documents(client_id: str, db: Session = Depends(get_platform_db), _admin: dict = Depends(_current_admin)):
    return ApiResponse.ok(service.list_documents(db, client_id)).model_dump()


@router.post("/{client_id}/documents")
def upload_document(
    client_id: str,
    document_type_id: Optional[str] = Form(None),
    document_type: str = Form("Other"),
    file: UploadFile = File(...),
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(_current_admin),
):
    # Resolve label from the master if a type_id was provided
    resolved_label = document_type
    resolved_id = None
    if document_type_id:
        dt = service.repo.get_document_type(db, document_type_id)
        if not dt:
            raise HTTPException(status_code=422, detail="Invalid document_type_id.")
        resolved_label = dt.name
        resolved_id = dt.id
    key, original = save_document(file, c.CLIENT_STORAGE_SCOPE, c.CLIENT_DOCUMENTS_MODULE)
    data = service.add_document(
        db, client_id,
        document_type=resolved_label, document_type_id=resolved_id,
        file_name=original, file_path=key,
        actor_id=admin["user_id"], actor=admin["email"],
    )
    return ApiResponse.ok(data, "Document uploaded.").model_dump()


@router.put("/{client_id}/documents/{document_id}")
def replace_document(
    client_id: str,
    document_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(_current_admin),
):
    """Replace the file for an existing document row (keeps type/metadata unchanged)."""
    key, original = save_document(file, c.CLIENT_STORAGE_SCOPE, c.CLIENT_DOCUMENTS_MODULE)
    try:
        old_key, data = service.replace_document(
            db, client_id, document_id,
            file_name=original, file_path=key,
            actor_id=admin["user_id"], actor=admin["email"],
        )
    except Exception:
        delete_file(key, Visibility.PRIVATE)
        raise
    delete_file(old_key, Visibility.PRIVATE)
    return ApiResponse.ok(data, "Document replaced.").model_dump()


@router.get("/{client_id}/documents/{document_id}/download")
def download_document(client_id: str, document_id: str, db: Session = Depends(get_platform_db),
                     _admin: dict = Depends(_current_admin)):
    key, name = service.get_document_file(db, client_id, document_id)
    path = physical_path(key, Visibility.PRIVATE)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="File no longer available.")
    return FileResponse(str(path), filename=name)


@router.delete("/{client_id}/documents/{document_id}")
def delete_document(client_id: str, document_id: str, db: Session = Depends(get_platform_db),
                    admin: dict = Depends(_current_admin)):
    key = service.delete_document(db, client_id, document_id, actor=admin["email"])
    delete_file(key, Visibility.PRIVATE)
    return ApiResponse.ok(None, "Document deleted.").model_dump()
