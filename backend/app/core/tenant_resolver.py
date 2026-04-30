from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from jose import JWTError
from backend.app.config.settings import settings
from backend.app.core.security import decode_access_token


def resolve_tenant_slug(request: Request) -> Optional[str]:
    """
    Resolve tenant slug from:
    1. X-Tenant-ID header
    2. JWT token payload (tenant_id field)
    3. Subdomain (host header)
    """
    strategy = settings.TENANT_RESOLVER_STRATEGY

    # Strategy: header
    tenant_slug = request.headers.get("X-Tenant-ID")
    if tenant_slug:
        return tenant_slug

    # Strategy: jwt
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_access_token(token)
            tenant_id = payload.get("tenant_id")
            if tenant_id:
                return tenant_id
        except JWTError:
            pass

    # Strategy: subdomain
    host = request.headers.get("host", "")
    parts = host.split(".")
    if len(parts) >= 3:
        subdomain = parts[0]
        if subdomain not in ("www", "api", "app"):
            return subdomain

    return None


def get_tenant_db_url(tenant_slug: str, platform_db: Session) -> Optional[str]:
    from backend.app.platform.tenants.models import Tenant, TenantDbConnection
    tenant = platform_db.query(Tenant).filter(
        Tenant.slug == tenant_slug,
        Tenant.is_active == True,
        Tenant.is_suspended == False
    ).first()
    if not tenant:
        return None
    if not tenant.db_connection:
        return None
    return tenant.db_connection.db_url
