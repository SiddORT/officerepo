"""
Security response headers — import-safe module.

Defines the Content-Security-Policy constant and the ASGI middleware
function that attaches it (plus any future security headers) to every
non-exempt response.

Import from here in both main.py and tests so the policy can never
silently drift between the running application and the test suite.
"""
from fastapi import Request

# Cloudflare Turnstile is loaded only when configured, but the policy permits
# its script/frame/endpoint unconditionally so the integration is deploy-ready.
_TURNSTILE_ORIGIN = "https://challenges.cloudflare.com"

# Zippopotam.us powers the portal's postal-code auto-fill lookup (city/state/country).
_PINCODE_LOOKUP_ORIGIN = "https://api.zippopotam.us"

CSP_POLICY: str = "; ".join([
    "default-src 'self'",
    f"script-src 'self' {_TURNSTILE_ORIGIN}",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    f"connect-src 'self' {_TURNSTILE_ORIGIN} {_PINCODE_LOOKUP_ORIGIN}",
    "font-src 'self'",
    f"frame-src {_TURNSTILE_ORIGIN}",
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
