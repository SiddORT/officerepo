"""
Service layer — Client Management.

Business logic: orchestrates repository calls, encryption of PII at rest, audit
logging (masked), activity-log journaling, and response DTO assembly. PII is
decrypted only into responses, never logged. Functions flush via the repository
and commit at the end of a unit of work (except ``create_client_from_lead``,
which participates in the caller's transaction so Lead→Client conversion is
atomic).
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional, Tuple
from urllib.parse import urlparse

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.client_management import constants as c
from backend.app.modules.client_management import repository as repo
from backend.app.modules.client_management import validators as v
from backend.app.modules.client_management.models import (
    Client, ClientContact, ClientBillingProfile, ClientDbConnection,
    ClientSubscription, ClientModule, ClientDocument, ClientActivityLog,
    ClientDomain, ClientAdminUser,
)
from backend.app.modules.client_management.schemas import (
    ClientCreateRequest, ClientUpdateRequest, StatusUpdateRequest,
    ContactCreateRequest, ContactUpdateRequest, BillingProfileRequest,
    SubscriptionRequest, ModuleToggleRequest, DbConnectionRequest,
    DomainCreateRequest, AdminUserCreateRequest, AdminUserUpdateRequest,
)
from backend.shared.audit.audit_logger import record_audit, mask_email, mask_value
from backend.shared.security.encryption import encrypt_value, decrypt_value
from backend.app.config.settings import settings
from backend.app.modules.testing.database_provisioning import repository as pg_repo
import hashlib
import os
import secrets
from datetime import timedelta


# ════════════════════════════════════════════════════════════════════════════
# Helpers
# ════════════════════════════════════════════════════════════════════════════
def _dec(token: Optional[str]) -> Optional[str]:
    """Decrypt a PII token defensively (never raise into a response)."""
    if not token:
        return None
    try:
        return decrypt_value(token)
    except ValueError:
        return None


def _require_client(db: Session, client_id: str) -> Client:
    client = repo.get_client(db, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    return client


def _generate_client_code(db: Session) -> str:
    """Generate a unique client code: CLT-YYYYMMDD-XXXXXXXX."""
    import uuid as _uuid
    for _ in range(5):
        suffix = _uuid.uuid4().hex[:8].upper()
        code = f"{c.CLIENT_CODE_PREFIX}-{datetime.utcnow():%Y%m%d}-{suffix}"
        if not repo.get_client_by_code(db, code):
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique client code.")


def _journal(db: Session, client_id: str, action: str, *, remarks: Optional[str] = None,
             performed_by=None) -> None:
    """Write a client-facing activity-log row (within the caller's transaction)."""
    repo.add(db, ClientActivityLog(
        client_id=client_id, action=action, remarks=remarks, performed_by=performed_by,
    ))


# ════════════════════════════════════════════════════════════════════════════
# Response DTO builders
# ════════════════════════════════════════════════════════════════════════════
def client_to_summary(client: Client, *, subscription: Optional[ClientSubscription] = None) -> dict:
    return {
        "id": client.id,
        "client_code": client.client_code,
        "company_name": client.company_name,
        "industry": client.industry,
        "country": client.country,
        "status": client.status,
        "subscription_plan": subscription.plan_name if subscription else None,
        "subscription_status": subscription.status if subscription else None,
        "converted_from_lead": client.converted_from_lead,
        "lead_id": client.lead_id,
        "created_at": client.created_at,
    }


def contact_to_dict(contact: ClientContact) -> dict:
    return {
        "id": contact.id,
        "contact_type": contact.contact_type,
        "first_name": contact.first_name,
        "last_name": contact.last_name,
        "designation": contact.designation,
        "email": _dec(contact.email_encrypted),
        "phone": _dec(contact.phone_encrypted),
        "country_code": contact.country_code,
        "is_primary": contact.is_primary,
        "created_at": contact.created_at,
    }


def billing_to_dict(b: Optional[ClientBillingProfile]) -> Optional[dict]:
    if not b:
        return None
    return {
        "id": b.id,
        "gst_number": b.gst_number,
        "pan_number": b.pan_number,
        "tax_registration_number": b.tax_registration_number,
        "billing_email": _dec(b.billing_email_encrypted),
        "payment_terms": b.payment_terms,
        "currency_code": b.currency_code,
        "billing_address_1": b.billing_address_1,
        "billing_address_2": b.billing_address_2,
        "city": b.city,
        "state": b.state,
        "country": b.country,
        "postal_code": b.postal_code,
        "bank_account_name": b.bank_account_name,
        "bank_account_number": b.bank_account_number,
        "bank_name": b.bank_name,
        "bank_branch_name": b.bank_branch_name,
        "bank_ifsc_code": b.bank_ifsc_code,
        "bank_swift_code": b.bank_swift_code,
        "bank_iban": b.bank_iban,
        "bank_upi_id": b.bank_upi_id,
        "updated_at": b.updated_at,
    }


def db_connection_to_dict(d: Optional[ClientDbConnection]) -> Optional[dict]:
    if not d:
        return None
    return {
        "id": d.id,
        "database_name": d.database_name,
        "database_host": d.database_host,
        "database_port": d.database_port,
        "database_username": d.database_username,
        "has_password": bool(d.database_password_encrypted),
        "database_status": d.database_status,
        "provisioned_at": d.provisioned_at,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
    }


def subscription_to_dict(s: Optional[ClientSubscription]) -> Optional[dict]:
    if not s:
        return None
    return {
        "id": s.id,
        "plan_name": s.plan_name,
        "start_date": s.start_date,
        "end_date": s.end_date,
        "billing_cycle": s.billing_cycle,
        "user_limit": s.user_limit,
        "storage_limit": s.storage_limit,
        "status": s.status,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }


def module_to_dict(m: ClientModule) -> dict:
    return {
        "id": m.id,
        "module_name": m.module_name,
        "is_enabled": m.is_enabled,
        "enabled_at": m.enabled_at,
    }


def document_to_dict(doc: ClientDocument) -> dict:
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "file_name": doc.file_name,
        "has_file": bool(doc.file_path),
        "url": f"/api/v1/superadmin/clients/{doc.client_id}/documents/{doc.id}/download",
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at,
    }


def activity_log_to_dict(a: ClientActivityLog) -> dict:
    return {
        "id": a.id,
        "action": a.action,
        "remarks": a.remarks,
        "performed_by": a.performed_by,
        "created_at": a.created_at,
    }


def domain_to_dict(d: ClientDomain) -> dict:
    return {
        "id": d.id,
        "domain_type": d.domain_type or "custom",
        "subdomain": d.subdomain,
        "custom_domain": d.custom_domain,
        "is_active": d.is_active if d.is_active is not None else d.is_primary,
        "is_primary": d.is_primary,
        "created_at": d.created_at,
    }


def admin_user_to_dict(u: ClientAdminUser) -> dict:
    return {
        "id": u.id,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": _dec(u.email_encrypted),
        "phone": _dec(u.phone_encrypted),
        "country_code": u.country_code,
        "status": u.status,
        "created_at": u.created_at,
    }


def client_to_detail(db: Session, client: Client) -> dict:
    subscription = repo.get_subscription(db, client.id)
    return {
        "id": client.id,
        "client_code": client.client_code,
        "company_name": client.company_name,
        "legal_name": client.legal_name,
        "industry": client.industry,
        "website": client.website,
        "company_size": client.company_size,
        "country": client.country,
        "state": client.state,
        "city": client.city,
        "timezone": client.timezone,
        "status": client.status,
        "lead_id": client.lead_id,
        "converted_from_lead": client.converted_from_lead,
        "created_by": client.created_by,
        "created_at": client.created_at,
        "updated_at": client.updated_at,
        "contacts": [contact_to_dict(x) for x in repo.list_contacts(db, client.id)],
        "billing_profile": billing_to_dict(repo.get_billing_profile(db, client.id)),
        "db_connection": db_connection_to_dict(repo.get_db_connection(db, client.id)),
        "subscription": subscription_to_dict(subscription),
        "modules": [module_to_dict(x) for x in repo.list_modules(db, client.id)],
        "documents": [document_to_dict(x) for x in repo.list_documents(db, client.id)],
        "domains": [domain_to_dict(x) for x in repo.list_domains(db, client.id)],
        "admin_users": [admin_user_to_dict(x) for x in repo.list_admin_users(db, client.id)],
    }


# ════════════════════════════════════════════════════════════════════════════
# Client CRUD
# ════════════════════════════════════════════════════════════════════════════
def list_clients(db: Session, **kwargs) -> Tuple[list, int]:
    items, total = repo.list_clients(db, **kwargs)
    # Bulk-fetch subscriptions in one query to avoid N+1 (one query per client).
    subs = repo.get_subscriptions_bulk(db, [c.id for c in items])
    summaries = [client_to_summary(client, subscription=subs.get(client.id)) for client in items]
    return summaries, total


def _seed_default_modules(db: Session, client_id: str) -> None:
    """Create a (disabled) row for every assignable module so the grid is complete."""
    for name in c.CLIENT_MODULES:
        repo.add(db, ClientModule(client_id=client_id, module_name=name, is_enabled=False))


def create_client(db: Session, payload: ClientCreateRequest, *, actor_id, actor) -> dict:
    code = _generate_client_code(db)
    client = Client(
        client_code=code,
        company_name=payload.company_name,
        legal_name=payload.legal_name,
        industry=payload.industry,
        website=payload.website,
        company_size=payload.company_size,
        country=payload.country,
        state=payload.state,
        city=payload.city,
        timezone=payload.timezone,
        status=payload.status or c.STATUS_PROSPECTIVE,
        created_by=actor_id,
    )
    repo.add(db, client)

    # Nested contacts (the first / a flagged one becomes primary)
    contacts = payload.contacts or []
    has_primary = any(x.is_primary for x in contacts)
    for idx, contact in enumerate(contacts):
        is_primary = contact.is_primary or (not has_primary and idx == 0)
        repo.add(db, ClientContact(
            client_id=client.id,
            contact_type=contact.contact_type or c.CONTACT_PRIMARY,
            first_name=contact.first_name,
            last_name=contact.last_name,
            designation=contact.designation,
            email_encrypted=encrypt_value(contact.email),
            phone_encrypted=encrypt_value(contact.phone),
            country_code=contact.country_code,
            is_primary=is_primary,
            created_by=actor_id,
        ))

    # Scaffold the 1:1 placeholder records so every tab is populated.
    repo.add(db, ClientBillingProfile(client_id=client.id))
    repo.add(db, ClientSubscription(client_id=client.id, status=c.SUBSCRIPTION_STATUS_INACTIVE))
    repo.add(db, ClientDbConnection(client_id=client.id, database_status=c.DB_STATUS_NOT_PROVISIONED))
    _seed_default_modules(db, client.id)

    _journal(db, client.id, c.ACT_CLIENT_CREATED, performed_by=actor_id)
    record_audit(db, c.AUDIT_CLIENT_CREATED, c.AUDIT_ENTITY, client.client_code, actor=actor,
                 metadata={"company_name": client.company_name})
    db.commit()
    db.refresh(client)
    return client_to_detail(db, client)


def get_client_detail(db: Session, client_id: str) -> dict:
    client = _require_client(db, client_id)
    return client_to_detail(db, client)


def update_client(db: Session, client_id: str, payload: ClientUpdateRequest, *, actor) -> dict:
    client = _require_client(db, client_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(client, field, value)
    client.updated_at = datetime.utcnow()

    _journal(db, client.id, c.ACT_CLIENT_UPDATED)
    record_audit(db, c.AUDIT_CLIENT_UPDATED, c.AUDIT_ENTITY, client.client_code, actor=actor,
                 metadata={"fields": list(data.keys())})
    db.commit()
    db.refresh(client)
    return client_to_detail(db, client)


def update_status(db: Session, client_id: str, payload: StatusUpdateRequest, *, actor) -> dict:
    client = _require_client(db, client_id)
    old = client.status
    client.status = payload.status
    client.updated_at = datetime.utcnow()

    _journal(db, client.id, c.ACT_STATUS_CHANGED, remarks=f"{old} → {payload.status}")
    record_audit(db, c.AUDIT_CLIENT_STATUS_CHANGED, c.AUDIT_ENTITY, client.client_code, actor=actor,
                 metadata={"from": old, "to": payload.status})
    db.commit()
    db.refresh(client)
    return client_to_detail(db, client)


def delete_client(db: Session, client_id: str, *, actor) -> None:
    client = _require_client(db, client_id)
    client.is_deleted = True
    client.deleted_at = datetime.utcnow()
    record_audit(db, c.AUDIT_CLIENT_UPDATED, c.AUDIT_ENTITY, client.client_code, actor=actor,
                 metadata={"soft_deleted": True})
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# Contacts
# ════════════════════════════════════════════════════════════════════════════
def list_contacts(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    return [contact_to_dict(x) for x in repo.list_contacts(db, client_id)]


def add_contact(db: Session, client_id: str, payload: ContactCreateRequest, *, actor_id, actor) -> dict:
    _require_client(db, client_id)
    is_primary = bool(payload.is_primary)
    if is_primary:
        _demote_primary_contacts(db, client_id)
    elif not repo.get_primary_contact(db, client_id):
        is_primary = True  # first contact becomes primary
    contact = ClientContact(
        client_id=client_id,
        contact_type=payload.contact_type or c.CONTACT_PRIMARY,
        first_name=payload.first_name,
        last_name=payload.last_name,
        designation=payload.designation,
        email_encrypted=encrypt_value(payload.email),
        phone_encrypted=encrypt_value(payload.phone),
        country_code=payload.country_code,
        is_primary=is_primary,
        created_by=actor_id,
    )
    repo.add(db, contact)
    _journal(db, client_id, c.ACT_CONTACT_ADDED, remarks=payload.first_name)
    record_audit(db, c.AUDIT_CONTACT_ADDED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"email": mask_email(payload.email), "type": contact.contact_type})
    db.commit()
    db.refresh(contact)
    return contact_to_dict(contact)


def _demote_primary_contacts(db: Session, client_id: str) -> None:
    for existing in repo.list_contacts(db, client_id):
        if existing.is_primary:
            existing.is_primary = False


def update_contact(db: Session, client_id: str, contact_id: str, payload: ContactUpdateRequest, *, actor) -> dict:
    _require_client(db, client_id)
    contact = repo.get_contact(db, client_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("is_primary"):
        _demote_primary_contacts(db, client_id)
    if "email" in data:
        contact.email_encrypted = encrypt_value(data.pop("email"))
    if "phone" in data:
        contact.phone_encrypted = encrypt_value(data.pop("phone"))
    for field, value in data.items():
        setattr(contact, field, value)
    contact.updated_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_CONTACT_UPDATED, remarks=contact.first_name)
    record_audit(db, c.AUDIT_CONTACT_UPDATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"contact_id": contact_id})
    db.commit()
    db.refresh(contact)
    return contact_to_dict(contact)


def delete_contact(db: Session, client_id: str, contact_id: str, *, actor) -> None:
    _require_client(db, client_id)
    contact = repo.get_contact(db, client_id, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    was_primary = contact.is_primary
    contact.is_deleted = True
    contact.deleted_at = datetime.utcnow()
    # Promote the next remaining contact if we removed the primary.
    if was_primary:
        remaining = [x for x in repo.list_contacts(db, client_id) if x.id != contact_id]
        if remaining:
            remaining[0].is_primary = True
    _journal(db, client_id, c.ACT_CONTACT_DELETED, remarks=contact.first_name)
    record_audit(db, c.AUDIT_CONTACT_DELETED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"contact_id": contact_id})
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# Billing profile (Commercials)
# ════════════════════════════════════════════════════════════════════════════
def get_billing(db: Session, client_id: str) -> Optional[dict]:
    _require_client(db, client_id)
    return billing_to_dict(repo.get_billing_profile(db, client_id))


def upsert_billing(db: Session, client_id: str, payload: BillingProfileRequest, *, actor) -> dict:
    _require_client(db, client_id)
    profile = repo.get_billing_profile(db, client_id)
    if not profile:
        profile = ClientBillingProfile(client_id=client_id)
        repo.add(db, profile)
    data = payload.model_dump(exclude_unset=True)
    # billing_email is PII — encrypt before persisting; all other fields are plain.
    if "billing_email" in data:
        email_val = data.pop("billing_email")
        profile.billing_email_encrypted = encrypt_value(email_val) if email_val else None
    for field, value in data.items():
        setattr(profile, field, value)
    profile.updated_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_BILLING_UPDATED)
    record_audit(db, c.AUDIT_BILLING_UPDATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"gst": mask_value(profile.gst_number)})
    db.commit()
    db.refresh(profile)
    return billing_to_dict(profile)


# ════════════════════════════════════════════════════════════════════════════
# Database connection (tenant DB config)
# ════════════════════════════════════════════════════════════════════════════
def get_db_config(db: Session, client_id: str) -> Optional[dict]:
    _require_client(db, client_id)
    return db_connection_to_dict(repo.get_db_connection(db, client_id))


def upsert_db_config(db: Session, client_id: str, payload: DbConnectionRequest, *, actor) -> dict:
    _require_client(db, client_id)
    conn = repo.get_db_connection(db, client_id)
    if not conn:
        conn = ClientDbConnection(client_id=client_id, database_status=c.DB_STATUS_NOT_PROVISIONED)
        repo.add(db, conn)
    data = payload.model_dump(exclude_unset=True)
    if "database_password" in data:
        conn.database_password_encrypted = encrypt_value(data.pop("database_password"))
    if data.get("database_status") == c.DB_STATUS_ACTIVE and not conn.provisioned_at:
        conn.provisioned_at = datetime.utcnow()
    for field, value in data.items():
        setattr(conn, field, value)
    conn.updated_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_DB_UPDATED, remarks=conn.database_status)
    record_audit(db, c.AUDIT_DB_UPDATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"database_status": conn.database_status})
    db.commit()
    db.refresh(conn)
    return db_connection_to_dict(conn)


def _parse_platform_db_conn() -> dict:
    url = settings.PLATFORM_DB_URL.replace("+psycopg2", "").replace("+asyncpg", "")
    p = urlparse(url)
    return {
        "host": p.hostname or "localhost",
        "port": p.port or 5432,
        "username": p.username or "postgres",
    }


def _safe_db_name(client_code: str) -> str:
    slug = re.sub(r"[^a-z0-9]", "_", client_code.lower())[:50].strip("_")
    return f"officerepo_{slug}"


def provision_database(db: Session, client_id: str, *, actor: str) -> dict:
    client = _require_client(db, client_id)
    conn = repo.get_db_connection(db, client_id)
    if conn and conn.database_status == c.DB_STATUS_ACTIVE:
        raise HTTPException(status_code=409, detail="Database is already provisioned.")

    db_name = _safe_db_name(client.client_code)
    result = pg_repo.create_database(db_name) if not pg_repo.db_exists(db_name) else None

    pg = _parse_platform_db_conn()
    if not conn:
        conn = ClientDbConnection(
            client_id=client_id, database_status=c.DB_STATUS_NOT_PROVISIONED
        )
        repo.add(db, conn)

    conn.database_name = db_name
    conn.database_host = pg["host"]
    conn.database_port = pg["port"]
    conn.database_username = pg["username"]
    conn.database_status = c.DB_STATUS_ACTIVE
    conn.provisioned_at = datetime.utcnow()
    conn.updated_at = datetime.utcnow()

    _journal(db, client_id, c.ACT_DB_PROVISIONED, remarks=db_name)
    record_audit(db, c.AUDIT_DB_PROVISIONED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"database_name": db_name})
    db.commit()
    db.refresh(conn)
    return db_connection_to_dict(conn)


def deprovision_database(db: Session, client_id: str, *, actor: str) -> dict:
    _require_client(db, client_id)
    conn = repo.get_db_connection(db, client_id)
    if not conn or not conn.database_name:
        raise HTTPException(status_code=404, detail="No database configured for this client.")

    db_name = conn.database_name
    if pg_repo.db_exists(db_name):
        pg_repo.drop_database(db_name)

    conn.database_name = None
    conn.database_host = None
    conn.database_port = None
    conn.database_username = None
    conn.database_password_encrypted = None
    conn.database_status = c.DB_STATUS_NOT_PROVISIONED
    conn.provisioned_at = None
    conn.updated_at = datetime.utcnow()

    _journal(db, client_id, c.ACT_DB_DEPROVISIONED, remarks=db_name)
    record_audit(db, c.AUDIT_DB_DEPROVISIONED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"database_name": db_name})
    db.commit()
    db.refresh(conn)
    return db_connection_to_dict(conn)


# ════════════════════════════════════════════════════════════════════════════
# Subscription
# ════════════════════════════════════════════════════════════════════════════
def get_subscription(db: Session, client_id: str) -> Optional[dict]:
    _require_client(db, client_id)
    return subscription_to_dict(repo.get_subscription(db, client_id))


def upsert_subscription(db: Session, client_id: str, payload: SubscriptionRequest, *, actor) -> dict:
    _require_client(db, client_id)
    sub = repo.get_subscription(db, client_id)
    if not sub:
        sub = ClientSubscription(client_id=client_id, status=c.SUBSCRIPTION_STATUS_INACTIVE)
        repo.add(db, sub)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(sub, field, value)
    sub.updated_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_SUBSCRIPTION_UPDATED, remarks=sub.plan_name)
    record_audit(db, c.AUDIT_SUBSCRIPTION_UPDATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"plan_name": sub.plan_name, "status": sub.status})
    db.commit()
    db.refresh(sub)
    return subscription_to_dict(sub)


# ════════════════════════════════════════════════════════════════════════════
# Modules
# ════════════════════════════════════════════════════════════════════════════
def list_modules(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    existing = {m.module_name: m for m in repo.list_modules(db, client_id)}
    # Self-heal: ensure a row exists for every assignable module.
    created = False
    for name in c.CLIENT_MODULES:
        if name not in existing:
            repo.add(db, ClientModule(client_id=client_id, module_name=name, is_enabled=False))
            created = True
    if created:
        db.commit()
    return [module_to_dict(x) for x in repo.list_modules(db, client_id)]


def toggle_module(db: Session, client_id: str, payload: ModuleToggleRequest, *, actor) -> dict:
    _require_client(db, client_id)
    module = repo.get_module(db, client_id, payload.module_name)
    if not module:
        module = ClientModule(client_id=client_id, module_name=payload.module_name)
        repo.add(db, module)
    module.is_enabled = payload.is_enabled
    module.enabled_at = datetime.utcnow() if payload.is_enabled else None
    module.updated_at = datetime.utcnow()
    if payload.is_enabled:
        _journal(db, client_id, c.ACT_MODULE_ENABLED, remarks=payload.module_name)
        record_audit(db, c.AUDIT_MODULE_ENABLED, c.AUDIT_ENTITY, client_id, actor=actor,
                     metadata={"module": payload.module_name})
    else:
        _journal(db, client_id, c.ACT_MODULE_DISABLED, remarks=payload.module_name)
        record_audit(db, c.AUDIT_MODULE_DISABLED, c.AUDIT_ENTITY, client_id, actor=actor,
                     metadata={"module": payload.module_name})
    db.commit()
    db.refresh(module)
    return module_to_dict(module)


# ════════════════════════════════════════════════════════════════════════════
# Documents
# ════════════════════════════════════════════════════════════════════════════
def list_documents(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    return [document_to_dict(x) for x in repo.list_documents(db, client_id)]


def add_document(db: Session, client_id: str, *, document_type: str, file_name: str,
                 file_path: str, actor_id, actor) -> dict:
    _require_client(db, client_id)
    doc = ClientDocument(
        client_id=client_id, document_type=document_type,
        file_name=file_name, file_path=file_path, uploaded_by=actor_id,
    )
    repo.add(db, doc)
    _journal(db, client_id, c.ACT_DOCUMENT_UPLOADED, remarks=file_name)
    record_audit(db, c.AUDIT_DOCUMENT_UPLOADED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"document_type": document_type, "file_name": file_name})
    db.commit()
    db.refresh(doc)
    return document_to_dict(doc)


def get_document_file(db: Session, client_id: str, document_id: str) -> Tuple[str, str]:
    _require_client(db, client_id)
    doc = repo.get_document(db, client_id, document_id)
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc.file_path, doc.file_name


def delete_document(db: Session, client_id: str, document_id: str, *, actor) -> str:
    _require_client(db, client_id)
    doc = repo.get_document(db, client_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    key = doc.file_path
    doc.is_deleted = True
    doc.deleted_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_DOCUMENT_DELETED, remarks=doc.file_name)
    record_audit(db, c.AUDIT_DOCUMENT_DELETED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"document_id": document_id})
    db.commit()
    return key


# ════════════════════════════════════════════════════════════════════════════
# Activity logs
# ════════════════════════════════════════════════════════════════════════════
def list_activity_logs(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    return [activity_log_to_dict(x) for x in repo.list_activity_logs(db, client_id)]


# ════════════════════════════════════════════════════════════════════════════
# Domains
# ════════════════════════════════════════════════════════════════════════════
def list_domains(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    return [domain_to_dict(x) for x in repo.list_domains(db, client_id)]


def add_domain(db: Session, client_id: str, payload: DomainCreateRequest, *, actor) -> dict:
    _require_client(db, client_id)
    domain_type = payload.domain_type or "custom"
    if domain_type == "subdomain":
        if not payload.subdomain:
            raise HTTPException(status_code=422, detail="Provide a subdomain value.")
    else:
        if not payload.custom_domain:
            raise HTTPException(status_code=422, detail="Provide a domain value.")
    existing_domains = repo.list_domains(db, client_id)
    set_active = bool(payload.is_primary) or not existing_domains
    if set_active:
        for ex in existing_domains:
            ex.is_active = False
            ex.is_primary = False
    domain = ClientDomain(
        client_id=client_id,
        domain_type=domain_type,
        subdomain=payload.subdomain,
        custom_domain=payload.custom_domain,
        is_active=set_active,
        is_primary=set_active,
    )
    repo.add(db, domain)
    display = payload.subdomain or payload.custom_domain
    _journal(db, client_id, c.ACT_DOMAIN_ADDED, remarks=display)
    record_audit(db, c.AUDIT_DOMAIN_ADDED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"domain_type": domain_type, "value": display})
    db.commit()
    db.refresh(domain)
    return domain_to_dict(domain)


def activate_domain(db: Session, client_id: str, domain_id: str, *, actor) -> dict:
    _require_client(db, client_id)
    target = repo.get_domain(db, client_id, domain_id)
    if not target:
        raise HTTPException(status_code=404, detail="Domain not found.")
    for ex in repo.list_domains(db, client_id):
        ex.is_active = ex.id == domain_id
        ex.is_primary = ex.id == domain_id
    display = target.subdomain or target.custom_domain
    _journal(db, client_id, c.ACT_DOMAIN_ACTIVATED, remarks=display)
    record_audit(db, c.AUDIT_DOMAIN_ACTIVATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"domain_id": domain_id, "value": display})
    db.commit()
    db.refresh(target)
    return domain_to_dict(target)


def delete_domain(db: Session, client_id: str, domain_id: str, *, actor) -> None:
    _require_client(db, client_id)
    domain = repo.get_domain(db, client_id, domain_id)
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found.")
    domain.is_deleted = True
    domain.deleted_at = datetime.utcnow()
    _journal(db, client_id, c.ACT_DOMAIN_DELETED, remarks=domain.subdomain or domain.custom_domain)
    record_audit(db, c.AUDIT_DOMAIN_DELETED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"domain_id": domain_id})
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# Admin users
# ════════════════════════════════════════════════════════════════════════════
def list_admin_users(db: Session, client_id: str) -> list:
    _require_client(db, client_id)
    return [admin_user_to_dict(x) for x in repo.list_admin_users(db, client_id)]


def add_admin_user(db: Session, client_id: str, payload: AdminUserCreateRequest, *, actor) -> dict:
    _require_client(db, client_id)
    user = ClientAdminUser(
        client_id=client_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email_encrypted=encrypt_value(payload.email),
        phone_encrypted=encrypt_value(payload.phone),
        country_code=payload.country_code,
        status=payload.status or c.ADMIN_STATUS_INVITED,
    )
    repo.add(db, user)
    _journal(db, client_id, c.ACT_ADMIN_USER_ADDED, remarks=payload.first_name)
    record_audit(db, c.AUDIT_ADMIN_USER_ADDED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"email": mask_email(payload.email)})
    db.commit()
    db.refresh(user)
    return admin_user_to_dict(user)


def update_admin_user(db: Session, client_id: str, admin_id: str, payload: AdminUserUpdateRequest, *, actor) -> dict:
    _require_client(db, client_id)
    user = repo.get_admin_user(db, client_id, admin_id)
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found.")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data:
        user.email_encrypted = encrypt_value(data.pop("email"))
    if "phone" in data:
        user.phone_encrypted = encrypt_value(data.pop("phone"))
    for field, value in data.items():
        setattr(user, field, value)
    user.updated_at = datetime.utcnow()
    record_audit(db, c.AUDIT_ADMIN_USER_UPDATED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"admin_id": admin_id})
    db.commit()
    db.refresh(user)
    return admin_user_to_dict(user)


# ════════════════════════════════════════════════════════════════════════════
# Lead → Client conversion (called from lead_management.service)
# ════════════════════════════════════════════════════════════════════════════
def create_client_from_lead(db: Session, lead, *, client_name: Optional[str], actor_id, actor) -> Client:
    """Create a full Client graph from a Won lead. Participates in the caller's
    transaction (NO commit here) so Lead→Client conversion is atomic.

    Creates: Client + primary Contact + Billing Profile + Subscription placeholder
    + DB Connection (Not Provisioned) + Admin placeholder + module rows +
    activity log. Raises 409 if a client already exists for this lead.
    """
    existing = repo.get_client_by_lead(db, lead.id)
    if existing:
        raise HTTPException(status_code=409, detail="A client already exists for this lead.")

    code = _generate_client_code(db)
    client = Client(
        client_code=code,
        company_name=client_name or lead.company_name,
        legal_name=getattr(lead, "company_name", None),
        industry=getattr(lead, "industry", None),
        website=getattr(lead, "website", None),
        company_size=getattr(lead, "company_size", None),
        country=getattr(lead, "country", None),
        status=c.STATUS_PROSPECTIVE,
        lead_id=lead.id,
        converted_from_lead=True,
        created_by=actor_id,
    )
    repo.add(db, client)

    # Primary contact mirrors the lead's contact (decrypt → re-encrypt PII).
    first_name = (getattr(lead, "contact_name", None) or "Primary Contact").strip()
    last_name = None
    if " " in first_name:
        first_name, last_name = first_name.split(" ", 1)
    lead_email = _dec(getattr(lead, "email_encrypted", None))
    lead_phone = _dec(getattr(lead, "phone_encrypted", None))
    repo.add(db, ClientContact(
        client_id=client.id,
        contact_type=c.CONTACT_PRIMARY,
        first_name=first_name or "Primary",
        last_name=last_name,
        designation=getattr(lead, "designation", None),
        email_encrypted=encrypt_value(lead_email),
        phone_encrypted=encrypt_value(lead_phone),
        country_code=getattr(lead, "country_code", None),
        is_primary=True,
        created_by=actor_id,
    ))

    # 1:1 placeholders
    repo.add(db, ClientBillingProfile(
        client_id=client.id,
        billing_email_encrypted=encrypt_value(lead_email) if lead_email else None,
    ))
    repo.add(db, ClientSubscription(client_id=client.id, status=c.SUBSCRIPTION_STATUS_INACTIVE))
    repo.add(db, ClientDbConnection(client_id=client.id, database_status=c.DB_STATUS_NOT_PROVISIONED))
    repo.add(db, ClientAdminUser(
        client_id=client.id,
        first_name=first_name or "Primary",
        last_name=last_name,
        email_encrypted=encrypt_value(lead_email),
        phone_encrypted=encrypt_value(lead_phone),
        country_code=getattr(lead, "country_code", None),
        status=c.ADMIN_STATUS_PLACEHOLDER,
    ))
    _seed_default_modules(db, client.id)

    _journal(db, client.id, c.ACT_CONVERTED_FROM_LEAD,
             remarks=getattr(lead, "lead_number", None), performed_by=actor_id)
    record_audit(db, c.AUDIT_LEAD_CONVERTED, c.AUDIT_ENTITY, client.client_code, actor=actor,
                 metadata={"lead_number": getattr(lead, "lead_number", None),
                           "email": mask_email(lead_email)})
    return client


# ════════════════════════════════════════════════════════════════════════════
# Portal Auth — invite-based onboarding for client admin users
# ════════════════════════════════════════════════════════════════════════════

def _get_client_by_workspace_id(db: Session, workspace_id: str) -> Optional["Client"]:
    """Resolve a workspace_id to a Client.

    Tries subdomain lookup first (active ClientDomain row whose subdomain matches).
    Falls back to a direct client_id lookup so that invite links work even when
    the client has no domain configured.
    """
    from backend.app.modules.client_management.models import ClientDomain
    domain = (
        db.query(ClientDomain)
        .filter(
            ClientDomain.subdomain == workspace_id,
            ClientDomain.is_active.is_(True),
            ClientDomain.is_deleted.is_(False),
        )
        .first()
    )
    if domain:
        return repo.get_client(db, domain.client_id)
    # Fall back: treat workspace_id as a direct client_id
    return repo.get_client(db, workspace_id)


# Keep old name as an alias so any existing callers still work
_get_client_by_subdomain = _get_client_by_workspace_id


def _get_active_subdomain(db: Session, client_id: str) -> Optional[str]:
    """Return the first active subdomain for a client, or None."""
    from backend.app.modules.client_management.models import ClientDomain
    domain = (
        db.query(ClientDomain)
        .filter(
            ClientDomain.client_id == client_id,
            ClientDomain.is_active.is_(True),
            ClientDomain.is_deleted.is_(False),
        )
        .first()
    )
    return domain.subdomain if (domain and domain.subdomain) else None


def _build_portal_invite_link(workspace_id: str, token: str) -> str:
    """Build the full invite URL using workspace_id (subdomain or client_id).

    workspace_id is always present so the link always points to the correct
    /portal/{workspace_id}/accept-invite route regardless of domain setup.
    """
    base = os.environ.get("APP_BASE_URL", "").rstrip("/")
    if not base:
        domains = os.environ.get("REPLIT_DOMAINS", "")
        first = domains.split(",")[0].strip() if domains else ""
        if first:
            base = f"https://{first}"
    path = f"/portal/{workspace_id}/accept-invite?token={token}"
    return f"{base}{path}" if base else path


def send_admin_invite(db: Session, client_id: str, admin_id: str, *, actor: str) -> dict:
    """Generate a single-use invite link for a client admin user.

    - Stores a SHA-256 hash of the token (never the raw token).
    - Sends an email if the notification channel is configured.
    - Returns the raw invite_link + whether the email was sent (for the UI to display/copy).
    """
    from backend.shared.notifications import notifier
    _require_client(db, client_id)
    user = repo.get_admin_user(db, client_id, admin_id)
    if not user:
        raise HTTPException(status_code=404, detail="Admin user not found.")
    if not user.email_encrypted:
        raise HTTPException(status_code=422, detail="Admin user has no email address. Add one before sending an invite.")

    email = _dec(user.email_encrypted)
    raw_token = secrets.token_urlsafe(c.PORTAL_INVITE_TOKEN_BYTES)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    user.invite_token_hash = token_hash
    user.invite_expires_at = datetime.utcnow() + timedelta(days=c.PORTAL_INVITE_EXPIRY_DAYS)
    user.invite_accepted_at = None
    user.status = c.ADMIN_STATUS_INVITED
    user.updated_at = datetime.utcnow()

    subdomain = _get_active_subdomain(db, client_id)
    workspace_id = subdomain or client_id  # always non-None → link always valid
    invite_link = _build_portal_invite_link(workspace_id, raw_token)

    name = " ".join(filter(None, [user.first_name, user.last_name]))
    workspace = _require_client(db, client_id).company_name

    email_sent = False
    try:
        result = notifier.send_email(
            to=email,
            subject=f"You're invited to {workspace} — set your password",
            body=(
                f"Hello{(' ' + name) if name else ''},\n\n"
                f"You've been invited to access the {workspace} portal on Office Repo.\n\n"
                "Click the link below to set your password and sign in:\n\n"
                f"{invite_link}\n\n"
                f"This link expires in {c.PORTAL_INVITE_EXPIRY_DAYS} days.\n\n"
                "If you did not expect this invitation, you can ignore this email."
            ),
        )
        email_sent = bool(getattr(result, "success", False))
    except Exception:
        pass

    _journal(db, client_id, c.ACT_ADMIN_USER_INVITED, remarks=name or email)
    record_audit(db, c.AUDIT_ADMIN_USER_INVITED, c.AUDIT_ENTITY, client_id, actor=actor,
                 metadata={"email": mask_email(email)})
    db.commit()
    return {"invite_link": invite_link, "email_sent": email_sent, "expires_days": c.PORTAL_INVITE_EXPIRY_DAYS}


def validate_portal_invite(db: Session, subdomain: str, token: str) -> dict:
    """Public: validate an invite token, return workspace + user info."""
    client = _get_client_by_subdomain(db, subdomain)
    if not client:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    user = (
        db.query(ClientAdminUser)
        .filter(
            ClientAdminUser.client_id == client.id,
            ClientAdminUser.invite_token_hash == token_hash,
            ClientAdminUser.is_deleted.is_(False),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired.")
    if user.invite_accepted_at:
        raise HTTPException(status_code=400, detail="This invitation has already been used. Please sign in.")
    if user.invite_expires_at and user.invite_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation has expired. Ask your admin to resend it.")

    email = _dec(user.email_encrypted) if user.email_encrypted else ""
    name = " ".join(filter(None, [user.first_name, user.last_name]))
    return {
        "email": email,
        "name": name,
        "workspace_name": client.company_name,
        "expires_at": user.invite_expires_at.isoformat() if user.invite_expires_at else None,
    }


def accept_portal_invite(db: Session, subdomain: str, token: str, password: str) -> None:
    """Public: set password for the invited user and activate their account."""
    from backend.app.core.security import hash_password as _hash_pw

    client = _get_client_by_subdomain(db, subdomain)
    if not client:
        raise HTTPException(status_code=404, detail="Workspace not found.")

    token_hash = hashlib.sha256(token.encode()).hexdigest()
    user = (
        db.query(ClientAdminUser)
        .filter(
            ClientAdminUser.client_id == client.id,
            ClientAdminUser.invite_token_hash == token_hash,
            ClientAdminUser.is_deleted.is_(False),
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="This invitation link is invalid or has expired.")
    if user.invite_accepted_at:
        raise HTTPException(status_code=400, detail="This invitation has already been used.")
    if user.invite_expires_at and user.invite_expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation has expired.")

    user.password_hash = _hash_pw(password)
    user.invite_accepted_at = datetime.utcnow()
    user.invite_token_hash = None
    user.status = c.ADMIN_STATUS_ACTIVE
    user.updated_at = datetime.utcnow()
    db.commit()


def portal_login(db: Session, subdomain: str, email: str, password: str) -> dict:
    """Public: authenticate a client admin user and return a portal JWT."""
    from backend.app.core.security import verify_password, create_portal_token

    client = _get_client_by_subdomain(db, subdomain)
    if not client:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    users = (
        db.query(ClientAdminUser)
        .filter(
            ClientAdminUser.client_id == client.id,
            ClientAdminUser.is_deleted.is_(False),
            ClientAdminUser.status == c.ADMIN_STATUS_ACTIVE,
        )
        .all()
    )

    matched = None
    for u in users:
        if u.email_encrypted and _dec(u.email_encrypted) == email:
            matched = u
            break

    if not matched or not matched.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    if not verify_password(password, matched.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    name = " ".join(filter(None, [matched.first_name, matched.last_name]))
    token = create_portal_token({
        "admin_user_id": matched.id,
        "client_id": client.id,
        "subdomain": subdomain,
        "email": email,
        "name": name,
    })
    return {
        "access_token": token,
        "admin_user_id": matched.id,
        "client_id": client.id,
        "name": name,
        "email": email,
        "workspace_name": client.company_name,
    }
