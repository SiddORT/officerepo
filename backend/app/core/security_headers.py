"""
Security response headers — import-safe module.

Defines the Content-Security-Policy constant and the ASGI middleware
function that attaches it (plus any future security headers) to every
non-exempt response.

Import from here in both main.py and tests so the policy can never
silently drift between the running application and the test suite.
"""
from fastapi import Request

CSP_POLICY: str = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "report-uri /api/v1/csp-report",
])

CSP_EXEMPT_PATHS: frozenset[str] = frozenset({"/docs", "/redoc", "/openapi.json"})


async def add_security_headers(request: Request, call_next):
    """ASGI middleware: attaches security headers to every non-exempt response."""
    response = await call_next(request)
    if request.url.path not in CSP_EXEMPT_PATHS:
        response.headers["Content-Security-Policy"] = CSP_POLICY
    return response
