from fastapi import Request, HTTPException
from sqlalchemy.orm import Session


def get_tenant_db(request: Request) -> Session:
    """
    Dependency that returns the tenant's database session from request state.
    The TenantMiddleware must have resolved it first.
    """
    tenant_db = getattr(request.state, "tenant_db", None)
    if tenant_db is None:
        raise HTTPException(
            status_code=400,
            detail="Tenant context not found. Provide X-Tenant-ID header."
        )
    try:
        yield tenant_db
    finally:
        tenant_db.close()


def get_tenant_slug(request: Request) -> str:
    tenant_slug = getattr(request.state, "tenant_slug", None)
    if not tenant_slug:
        raise HTTPException(status_code=400, detail="Tenant not identified.")
    return tenant_slug
