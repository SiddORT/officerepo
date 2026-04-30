from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.app.database.platform import SessionLocal
from backend.app.core.tenant_resolver import resolve_tenant_slug, get_tenant_db_url
from backend.app.database.tenant import get_tenant_session

# Routes that don't require tenant context
TENANT_EXEMPT_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip tenant resolution for exempt paths and superadmin routes
        if path in TENANT_EXEMPT_PATHS or path.startswith("/api/v1/superadmin") or path.startswith("/api/v1/auth/superadmin"):
            return await call_next(request)

        # Try to resolve tenant for tenant-scoped routes
        if path.startswith("/api/v1/tenant/"):
            platform_db = SessionLocal()
            try:
                tenant_slug = resolve_tenant_slug(request)
                if tenant_slug:
                    db_url = get_tenant_db_url(tenant_slug, platform_db)
                    if db_url:
                        tenant_session = get_tenant_session(db_url)
                        request.state.tenant_slug = tenant_slug
                        request.state.tenant_db = tenant_session
                    else:
                        request.state.tenant_slug = tenant_slug
                        request.state.tenant_db = None
                else:
                    request.state.tenant_slug = None
                    request.state.tenant_db = None
            finally:
                platform_db.close()

        response = await call_next(request)
        return response
