import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.app.config.settings import settings
from backend.app.core.security import _derive_kid
from backend.app.database.platform import SessionLocal
from backend.app.core.tenant_resolver import resolve_tenant_slug, get_tenant_db_url
from backend.app.database.tenant import get_tenant_session

logger = logging.getLogger(__name__)

# Routes that don't require tenant context
TENANT_EXEMPT_PATHS = {
    "/",
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}


def _log_verified_kid(request: Request) -> None:
    """Emit a structured log record for a successfully authenticated request.

    Auth dependencies (``require_superadmin``, ``_current_admin``) set
    ``request.state.token_kid`` after verifying the JWT signature.  This
    function reads that value — which is guaranteed to come from a
    cryptographically verified payload — and compares it against the current
    expected kid so operators can filter log aggregators for stale-key traffic.

    Only runs when ``request.state.token_kid`` is present; unauthenticated
    requests produce no kid log entry.
    """
    token_kid = getattr(request.state, "token_kid", None)
    if token_kid is None:
        return

    current_kid = _derive_kid(settings.JWT_SECRET)

    log_extra = {
        "kid": token_kid,
        "current_kid": current_kid,
        "method": request.method,
        "path": request.url.path,
        "stale_key": token_kid != current_kid,
    }

    if token_kid != current_kid:
        logger.warning(
            "authenticated request used stale key kid=%s current_kid=%s method=%s path=%s",
            token_kid,
            current_kid,
            request.method,
            request.url.path,
            extra=log_extra,
        )
    else:
        logger.info(
            "authenticated request kid=%s method=%s path=%s",
            token_kid,
            request.method,
            request.url.path,
            extra=log_extra,
        )


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip tenant resolution for exempt paths and superadmin routes
        if path in TENANT_EXEMPT_PATHS or path.startswith("/api/v1/superadmin") or path.startswith("/api/v1/auth/superadmin"):
            response = await call_next(request)
            # Log the verified kid after route handlers / auth dependencies ran.
            _log_verified_kid(request)
            return response

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
        # Log the verified kid after route handlers / auth dependencies ran.
        _log_verified_kid(request)
        return response
