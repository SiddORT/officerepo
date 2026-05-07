"""
Repository layer — raw DB operations only. No business logic here.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional, List, Tuple

from backend.app.platform.tenants.models import (
    Tenant, TenantDomain, TenantDbConnection,
)
from backend.app.platform.subscriptions.models import Subscription
from backend.app.platform.feature_flags.models import FeatureFlag
from backend.app.platform.tenant_management.models import TenantBranding, TenantActivityLog


# ── Tenant ────────────────────────────────────────────────────────────────────

def get_tenant_by_id(db: Session, tenant_id: int) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.id == tenant_id, Tenant.is_deleted.isnot(True)).first()


def get_tenant_by_code(db: Session, tenant_code: str) -> Optional[Tenant]:
    return db.query(Tenant).filter(Tenant.slug == tenant_code).first()


def create_tenant(db: Session, **fields) -> Tenant:
    tenant = Tenant(**fields)
    db.add(tenant)
    db.flush()
    return tenant


def update_tenant(db: Session, tenant: Tenant, **fields) -> Tenant:
    for k, v in fields.items():
        setattr(tenant, k, v)
    db.flush()
    return tenant


def soft_delete_tenant(db: Session, tenant: Tenant) -> None:
    from datetime import datetime
    tenant.is_deleted = True
    tenant.deleted_at = datetime.utcnow()
    db.flush()


def list_tenants(
    db: Session,
    search: Optional[str],
    status: Optional[str],
    region: Optional[str],
    page: int,
    page_size: int,
) -> Tuple[List[Tenant], int]:
    q = db.query(Tenant).filter(Tenant.is_deleted.isnot(True))

    if search:
        term = f"%{search}%"
        q = q.filter(
            or_(
                Tenant.name.ilike(term),
                Tenant.slug.ilike(term),
                Tenant.company_email.ilike(term),
            )
        )
    if status:
        if status == "active":
            q = q.filter(Tenant.is_active.is_(True), Tenant.is_suspended.isnot(True))
        elif status == "suspended":
            q = q.filter(Tenant.is_suspended.is_(True))
        elif status == "inactive":
            q = q.filter(Tenant.is_active.isnot(True))

    if region:
        q = q.filter(Tenant.region.ilike(f"%{region}%"))

    total = q.count()
    items = q.order_by(Tenant.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ── Domain ────────────────────────────────────────────────────────────────────

def get_domain_by_subdomain(db: Session, subdomain: str) -> Optional[TenantDomain]:
    return db.query(TenantDomain).filter(TenantDomain.subdomain == subdomain).first()


def create_domain(db: Session, tenant_id: int, subdomain: str, custom_domain: Optional[str]) -> TenantDomain:
    domain = TenantDomain(
        tenant_id=tenant_id,
        subdomain=subdomain,
        custom_domain=custom_domain,
        domain=subdomain,
        is_primary=True,
    )
    db.add(domain)
    db.flush()
    return domain


def update_domain(db: Session, domain: TenantDomain, **fields) -> TenantDomain:
    for k, v in fields.items():
        setattr(domain, k, v)
    db.flush()
    return domain


# ── DB Connection ─────────────────────────────────────────────────────────────

def create_db_connection(db: Session, tenant_id: int, **fields) -> TenantDbConnection:
    conn = TenantDbConnection(tenant_id=tenant_id, db_url="", **fields)
    db.add(conn)
    db.flush()
    return conn


def update_db_connection(db: Session, conn: TenantDbConnection, **fields) -> TenantDbConnection:
    for k, v in fields.items():
        setattr(conn, k, v)
    db.flush()
    return conn


# ── Feature Flags ─────────────────────────────────────────────────────────────

def get_flags_for_tenant(db: Session, tenant_id: int) -> List[FeatureFlag]:
    return db.query(FeatureFlag).filter(FeatureFlag.tenant_id == tenant_id).all()


def upsert_flag(db: Session, tenant_id: int, module: str, is_enabled: bool) -> FeatureFlag:
    flag = db.query(FeatureFlag).filter(
        FeatureFlag.tenant_id == tenant_id,
        FeatureFlag.module == module,
    ).first()
    if flag:
        flag.is_enabled = is_enabled
    else:
        flag = FeatureFlag(tenant_id=tenant_id, module=module, is_enabled=is_enabled)
        db.add(flag)
    db.flush()
    return flag


def seed_default_flags(db: Session, tenant_id: int, modules_dict: dict) -> None:
    defaults = ["employee", "hrms", "assets", "billing", "workflow", "reports"]
    for mod in defaults:
        enabled = modules_dict.get(mod, False) if modules_dict else False
        upsert_flag(db, tenant_id, mod, enabled)


# ── Subscription ──────────────────────────────────────────────────────────────

def create_subscription(db: Session, tenant_id: int, **fields) -> Subscription:
    sub = Subscription(tenant_id=tenant_id, plan_id=1, **fields)
    db.add(sub)
    db.flush()
    return sub


def update_subscription(db: Session, sub: Subscription, **fields) -> Subscription:
    for k, v in fields.items():
        setattr(sub, k, v)
    db.flush()
    return sub


# ── Branding ──────────────────────────────────────────────────────────────────

def get_branding(db: Session, tenant_id: int) -> Optional[TenantBranding]:
    return db.query(TenantBranding).filter(TenantBranding.tenant_id == tenant_id).first()


def create_branding(db: Session, tenant_id: int, **fields) -> TenantBranding:
    branding = TenantBranding(tenant_id=tenant_id, **fields)
    db.add(branding)
    db.flush()
    return branding


def update_branding(db: Session, branding: TenantBranding, **fields) -> TenantBranding:
    for k, v in fields.items():
        setattr(branding, k, v)
    db.flush()
    return branding


# ── Activity Logs ─────────────────────────────────────────────────────────────

def log_activity(
    db: Session,
    tenant_id: int,
    action: str,
    performed_by: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> TenantActivityLog:
    entry = TenantActivityLog(
        tenant_id=tenant_id,
        action=action,
        performed_by=performed_by,
        log_metadata=metadata,
    )
    db.add(entry)
    db.flush()
    return entry


def get_activity_logs(db: Session, tenant_id: int, limit: int = 50) -> List[TenantActivityLog]:
    return (
        db.query(TenantActivityLog)
        .filter(TenantActivityLog.tenant_id == tenant_id)
        .order_by(TenantActivityLog.created_at.desc())
        .limit(limit)
        .all()
    )
