"""
Service layer — business logic, orchestration, encryption.
"""
import base64
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.platform.tenant_management import repository as repo
from backend.app.platform.tenant_management.schemas import (
    TenantCreateRequest, TenantUpdateRequest,
    TenantDraftCreateRequest,
    DomainStepRequest, DatabaseStepRequest,
    SubscriptionStepRequest, ModulesStepRequest,
)
from backend.app.platform.tenants.models import Tenant


# ── Password encryption (Fernet) ──────────────────────────────────────────────

def _get_fernet():
    from cryptography.fernet import Fernet
    from backend.app.config.settings import settings
    raw = settings.JWT_SECRET.encode()
    key = base64.urlsafe_b64encode(raw[:32].ljust(32, b"0"))
    return Fernet(key)


def encrypt_password(plain: str) -> str:
    return _get_fernet().encrypt(plain.encode()).decode()


def decrypt_password(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()


# ── Profile completion ─────────────────────────────────────────────────────────

def _calc_profile_completion(tenant: Tenant) -> dict:
    """Calculate profile completion 0–100 based on 5 criteria (20% each)."""
    has_domain = bool(tenant.domains)
    has_db = bool(tenant.db_connection)
    has_sub = bool(tenant.subscription)
    has_modules = any(getattr(f, "is_enabled", False) for f in (tenant.feature_flags or []))

    breakdown = {
        "basic_info": bool(getattr(tenant, "company_email", None)),
        "domain":     has_domain,
        "database":   has_db,
        "subscription": has_sub,
        "modules":    has_modules,
    }
    pct = int(sum(breakdown.values()) * 20)
    return {"percentage": pct, "breakdown": breakdown}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _derive_status(tenant: Tenant) -> str:
    if getattr(tenant, "is_deleted", False):
        return "deleted"
    if getattr(tenant, "is_suspended", False):
        return "suspended"
    if not getattr(tenant, "is_active", True):
        return "inactive"
    return "active"


def _build_list_item(tenant: Tenant) -> dict:
    domain = next(
        (d for d in (tenant.domains or []) if d.is_primary),
        (tenant.domains or [None])[0] if tenant.domains else None,
    )
    sub = getattr(tenant, "subscription", None)
    completion = _calc_profile_completion(tenant)
    return {
        "id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_code": tenant.slug,
        "subdomain": getattr(domain, "subdomain", None) if domain else None,
        "plan_name": getattr(sub, "plan_name", None) if sub else None,
        "status": _derive_status(tenant),
        "profile_completion": completion["percentage"],
        "completion_breakdown": completion["breakdown"],
        "created_at": tenant.created_at,
    }


def _build_detail(db: Session, tenant: Tenant) -> dict:
    flags = repo.get_flags_for_tenant(db, tenant.id)
    branding = repo.get_branding(db, tenant.id)
    logs = repo.get_activity_logs(db, tenant.id, limit=50)
    completion = _calc_profile_completion(tenant)

    domains = [
        {
            "id": d.id,
            "subdomain": getattr(d, "subdomain", None),
            "custom_domain": getattr(d, "custom_domain", None),
            "is_primary": d.is_primary,
            "created_at": d.created_at,
        }
        for d in (tenant.domains or [])
    ]

    db_conn = None
    if tenant.db_connection:
        c = tenant.db_connection
        db_conn = {
            "id": c.id,
            "db_name": getattr(c, "db_name", None),
            "db_host": getattr(c, "db_host", None),
            "db_port": getattr(c, "db_port", None),
            "db_username": getattr(c, "db_username", None),
            "db_status": getattr(c, "db_status", "unknown"),
            "is_active": c.is_active,
            "created_at": c.created_at,
        }

    sub = None
    if tenant.subscription:
        s = tenant.subscription
        sub = {
            "id": s.id,
            "plan_name": getattr(s, "plan_name", None),
            "status": s.status,
            "trial_start": getattr(s, "trial_start", None),
            "trial_end": getattr(s, "trial_end", None),
            "user_limit": getattr(s, "user_limit", None),
            "storage_limit": getattr(s, "storage_limit", None),
            "created_at": s.created_at,
        }

    return {
        "id": tenant.id,
        "tenant_name": tenant.name,
        "tenant_code": tenant.slug,
        "company_email": getattr(tenant, "company_email", None),
        "contact_number": getattr(tenant, "contact_number", None),
        "company_website": getattr(tenant, "company_website", None),
        "timezone": getattr(tenant, "timezone", "UTC"),
        "region": getattr(tenant, "region", None),
        "logo_path": getattr(tenant, "logo_path", None),
        "status": _derive_status(tenant),
        "profile_completion": completion["percentage"],
        "completion_breakdown": completion["breakdown"],
        "created_at": tenant.created_at,
        "updated_at": tenant.updated_at,
        "domains": domains,
        "db_connection": db_conn,
        "subscription": sub,
        "modules": [{"module": f.module, "is_enabled": f.is_enabled} for f in flags],
        "branding": {
            "primary_color": branding.primary_color,
            "theme_mode": branding.theme_mode,
            "logo_path": branding.logo_path,
            "favicon_path": branding.favicon_path,
        } if branding else None,
        "activity_logs": [
            {
                "id": l.id,
                "action": l.action,
                "performed_by": l.performed_by,
                "metadata": l.log_metadata,
                "created_at": l.created_at,
            }
            for l in logs
        ],
    }


# ── Public service functions ──────────────────────────────────────────────────

def list_tenants(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    region: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    tenants, total = repo.list_tenants(db, search, status, region, page, page_size)
    items = [_build_list_item(t) for t in tenants]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


def get_tenant_detail(db: Session, tenant_id: int) -> dict:
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    return _build_detail(db, tenant)


def create_tenant(db: Session, payload: TenantCreateRequest, performed_by: str) -> dict:
    if repo.get_tenant_by_code(db, payload.tenant_code):
        raise HTTPException(status_code=409, detail=f"Tenant code '{payload.tenant_code}' already exists.")
    if repo.get_domain_by_subdomain(db, payload.domain.subdomain):
        raise HTTPException(status_code=409, detail=f"Subdomain '{payload.domain.subdomain}' is already taken.")

    tenant = repo.create_tenant(
        db,
        name=payload.tenant_name,
        slug=payload.tenant_code,
        company_email=payload.company_email,
        contact_number=payload.contact_number,
        company_website=payload.company_website,
        timezone=payload.timezone or "UTC",
        region=payload.region,
        is_active=True,
        is_suspended=False,
        is_deleted=False,
    )
    repo.create_domain(db, tenant.id, payload.domain.subdomain, payload.domain.custom_domain)

    if payload.db_config:
        enc_pw = encrypt_password(payload.db_config.db_password)
        repo.create_db_connection(
            db, tenant.id,
            db_name=payload.db_config.db_name,
            db_host=payload.db_config.db_host,
            db_port=payload.db_config.db_port,
            db_username=payload.db_config.db_username,
            db_password_encrypted=enc_pw,
            db_status="configured",
        )

    sub_in = payload.subscription or {}
    sub_data = sub_in.model_dump() if hasattr(sub_in, "model_dump") else {}
    plan_name = sub_data.get("plan_name") or "Starter"
    repo.create_subscription(
        db, tenant.id,
        plan_name=plan_name,
        trial_start=sub_data.get("trial_start"),
        trial_end=sub_data.get("trial_end"),
        user_limit=sub_data.get("user_limit") or 25,
        storage_limit=sub_data.get("storage_limit") or 1024,
        status="trial" if sub_data.get("trial_end") else "active",
    )

    modules_dict = {}
    if payload.modules:
        modules_dict = payload.modules.model_dump()
    repo.seed_default_flags(db, tenant.id, modules_dict)

    branding_data = {}
    if payload.branding:
        branding_data = payload.branding.model_dump()
    repo.create_branding(
        db, tenant.id,
        primary_color=branding_data.get("primary_color", "#6366f1"),
        theme_mode=branding_data.get("theme_mode", "dark"),
    )

    repo.log_activity(db, tenant.id, "tenant.created", performed_by, {"tenant_code": payload.tenant_code})
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


# ── Draft + step-save functions ───────────────────────────────────────────────

def create_draft_tenant(db: Session, payload: TenantDraftCreateRequest, performed_by: str) -> dict:
    """Step 0 — create tenant with basic info only (no domain required)."""
    if repo.get_tenant_by_code(db, payload.tenant_code):
        raise HTTPException(status_code=409, detail=f"Tenant code '{payload.tenant_code}' already exists.")

    tenant = repo.create_tenant(
        db,
        name=payload.tenant_name,
        slug=payload.tenant_code,
        company_email=payload.company_email,
        contact_number=payload.contact_number,
        company_website=payload.company_website,
        timezone=payload.timezone or "UTC",
        region=payload.region,
        is_active=True,
        is_suspended=False,
        is_deleted=False,
    )
    repo.create_branding(db, tenant.id, primary_color="#00aeec", theme_mode="dark")
    repo.log_activity(db, tenant.id, "tenant.draft_created", performed_by, {"tenant_code": payload.tenant_code})
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def update_basic_info(db: Session, tenant_id: int, payload: TenantDraftCreateRequest, performed_by: str) -> dict:
    """Re-save step 0 for an existing draft."""
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    # Allow code update only if unchanged or matching
    if tenant.slug != payload.tenant_code:
        if repo.get_tenant_by_code(db, payload.tenant_code):
            raise HTTPException(status_code=409, detail=f"Tenant code '{payload.tenant_code}' is already taken.")

    repo.update_tenant(
        db, tenant,
        name=payload.tenant_name,
        slug=payload.tenant_code,
        company_email=payload.company_email,
        contact_number=payload.contact_number,
        company_website=payload.company_website,
        timezone=payload.timezone or "UTC",
        region=payload.region,
    )
    repo.log_activity(db, tenant_id, "tenant.basic_info_updated", performed_by)
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def save_domain_step(db: Session, tenant_id: int, payload: DomainStepRequest, performed_by: str) -> dict:
    """Step 1 — upsert domain."""
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    # Check uniqueness excluding this tenant
    existing = repo.get_domain_by_subdomain(db, payload.subdomain)
    if existing and existing.tenant_id != tenant_id:
        raise HTTPException(status_code=409, detail=f"Subdomain '{payload.subdomain}' is already taken.")

    if tenant.domains:
        primary = next((d for d in tenant.domains if d.is_primary), tenant.domains[0])
        repo.update_domain(db, primary, subdomain=payload.subdomain, custom_domain=payload.custom_domain)
    else:
        repo.create_domain(db, tenant_id, payload.subdomain, payload.custom_domain)

    repo.log_activity(db, tenant_id, "tenant.domain_saved", performed_by, {"subdomain": payload.subdomain})
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def save_database_step(db: Session, tenant_id: int, payload: DatabaseStepRequest, performed_by: str) -> dict:
    """Step 2 — upsert DB connection (skip if all fields empty)."""
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    # Only save if there's actual data
    has_data = any([payload.db_name, payload.db_host, payload.db_username, payload.db_password])
    if has_data:
        enc_pw = encrypt_password(payload.db_password) if payload.db_password else None
        if tenant.db_connection:
            repo.update_db_connection(
                db, tenant.db_connection,
                db_name=payload.db_name,
                db_host=payload.db_host,
                db_port=payload.db_port or 5432,
                db_username=payload.db_username,
                db_password_encrypted=enc_pw,
                db_status="configured",
            )
        else:
            repo.create_db_connection(
                db, tenant_id,
                db_name=payload.db_name,
                db_host=payload.db_host,
                db_port=payload.db_port or 5432,
                db_username=payload.db_username,
                db_password_encrypted=enc_pw,
                db_status="configured",
            )
        repo.log_activity(db, tenant_id, "tenant.database_saved", performed_by)
    else:
        repo.log_activity(db, tenant_id, "tenant.database_skipped", performed_by)

    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def save_subscription_step(db: Session, tenant_id: int, payload: SubscriptionStepRequest, performed_by: str) -> dict:
    """Step 3 — upsert subscription."""
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    status = "trial" if payload.trial_end else "active"
    if tenant.subscription:
        repo.update_subscription(
            db, tenant.subscription,
            plan_name=payload.plan_name or "Starter",
            trial_start=payload.trial_start,
            trial_end=payload.trial_end,
            user_limit=payload.user_limit or 25,
            storage_limit=payload.storage_limit or 1024,
            status=status,
        )
    else:
        repo.create_subscription(
            db, tenant_id,
            plan_name=payload.plan_name or "Starter",
            trial_start=payload.trial_start,
            trial_end=payload.trial_end,
            user_limit=payload.user_limit or 25,
            storage_limit=payload.storage_limit or 1024,
            status=status,
        )

    repo.log_activity(db, tenant_id, "tenant.subscription_saved", performed_by, {"plan": payload.plan_name})
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def save_modules_step(db: Session, tenant_id: int, payload: ModulesStepRequest, performed_by: str) -> dict:
    """Step 4 — upsert feature flags (final step)."""
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    modules_dict = payload.model_dump()
    repo.seed_default_flags(db, tenant_id, modules_dict)
    repo.log_activity(db, tenant_id, "tenant.modules_saved", performed_by, modules_dict)
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def update_tenant(db: Session, tenant_id: int, payload: TenantUpdateRequest, performed_by: str) -> dict:
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    field_map = {
        "tenant_name": "name",
        "company_email": "company_email",
        "contact_number": "contact_number",
        "company_website": "company_website",
        "timezone": "timezone",
        "region": "region",
    }
    model_updates = {field_map.get(k, k): v for k, v in updates.items()}
    repo.update_tenant(db, tenant, **model_updates)
    repo.log_activity(db, tenant_id, "tenant.updated", performed_by, updates)
    db.commit()
    db.refresh(tenant)
    return _build_detail(db, tenant)


def suspend_tenant(db: Session, tenant_id: int, performed_by: str) -> dict:
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    if tenant.is_suspended:
        raise HTTPException(status_code=400, detail="Tenant is already suspended.")
    repo.update_tenant(db, tenant, is_suspended=True)
    repo.log_activity(db, tenant_id, "tenant.suspended", performed_by)
    db.commit()
    return {"message": f"Tenant '{tenant.slug}' suspended."}


def activate_tenant(db: Session, tenant_id: int, performed_by: str) -> dict:
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    repo.update_tenant(db, tenant, is_active=True, is_suspended=False)
    repo.log_activity(db, tenant_id, "tenant.activated", performed_by)
    db.commit()
    return {"message": f"Tenant '{tenant.slug}' activated."}


def update_logo(db: Session, tenant_id: int, logo_path: str, performed_by: str) -> dict:
    tenant = repo.get_tenant_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found.")
    repo.update_tenant(db, tenant, logo_path=logo_path)
    branding = repo.get_branding(db, tenant_id)
    if branding:
        repo.update_branding(db, branding, logo_path=logo_path)
    repo.log_activity(db, tenant_id, "tenant.logo_updated", performed_by)
    db.commit()
    return {"logo_path": logo_path}
