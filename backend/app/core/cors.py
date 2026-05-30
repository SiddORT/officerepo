"""
Cross-Origin Resource Sharing (CORS) policy — import-safe module.

Single source of truth for the CORS configuration so the running
application (backend/main.py) and the test-suite
(backend/tests/test_cors_security.py) can never silently drift apart.

Policy summary:
  - In development the wildcard "*" is used (any origin allowed).
  - In all other (restricted) environments only the explicit
    ALLOWED_ORIGINS list is honoured, PLUS the production apex domain
    "officerepo.com" and any of its subdomains over HTTPS, matched via
    OFFICEREPO_ORIGIN_REGEX.
"""
import re

# HTTP methods the API actually exposes. The app uses PATCH (not PUT) for
# partial updates; OPTIONS preflight is handled by the middleware itself and
# does not need to be listed here.
CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "PATCH", "DELETE"]

# Request headers clients are allowed to send. X-Tenant-ID is required for
# tenant-scoped login from a browser on another origin.
CORS_ALLOW_HEADERS: list[str] = ["Authorization", "Content-Type", "X-Tenant-ID"]

# Credentialed requests (Authorization header / cookies) are permitted.
CORS_ALLOW_CREDENTIALS: bool = True

# Subdomain-aware origin regex. Matches the production apex domain
# "https://officerepo.com" and any subdomain "https://<anything>.officerepo.com"
# over HTTPS only. Applied in restricted environments IN ADDITION to the exact
# ALLOWED_ORIGINS list so any tenant subdomain can call the API without having
# to be enumerated explicitly.
#
# Examples that MATCH:   https://officerepo.com, https://app.officerepo.com,
#                        https://a.b.officerepo.com
# Examples that DO NOT:  http://app.officerepo.com (not https),
#                        https://evilofficerepo.com (not a subdomain),
#                        https://officerepo.com.evil.com (suffix attack)
OFFICEREPO_ORIGIN_REGEX: str = r"^https://([a-z0-9-]+\.)*officerepo\.com$"

# Pre-compiled for callers that want to test an origin directly.
OFFICEREPO_ORIGIN_PATTERN = re.compile(OFFICEREPO_ORIGIN_REGEX)


def is_restricted_environment(environment: str) -> bool:
    """True for every environment except 'development'."""
    return environment.lower() != "development"


def build_cors_origins(environment: str, allowed_origins: str) -> list[str]:
    """Return the exact-match origin list for CORSMiddleware.allow_origins."""
    if is_restricted_environment(environment):
        return [o.strip() for o in allowed_origins.split(",") if o.strip()]
    return ["*"]


def build_cors_kwargs(environment: str, allowed_origins: str) -> dict:
    """Return the full kwargs dict for FastAPI's CORSMiddleware.

    In restricted environments the subdomain-aware regex is included so
    officerepo.com and its subdomains are accepted alongside the explicit
    ALLOWED_ORIGINS list. In development only the wildcard is used.
    """
    kwargs: dict = {
        "allow_origins": build_cors_origins(environment, allowed_origins),
        "allow_credentials": CORS_ALLOW_CREDENTIALS,
        "allow_methods": CORS_ALLOW_METHODS,
        "allow_headers": CORS_ALLOW_HEADERS,
    }
    if is_restricted_environment(environment):
        kwargs["allow_origin_regex"] = OFFICEREPO_ORIGIN_REGEX
    return kwargs


def is_origin_allowed(origin: str, environment: str, allowed_origins: str) -> bool:
    """Return True if *origin* would be accepted by the CORS policy.

    Mirrors the matching that Starlette's CORSMiddleware performs given the
    kwargs from :func:`build_cors_kwargs`:
      - In development the wildcard accepts every origin.
      - In restricted environments an origin is allowed only if it is in the
        exact ALLOWED_ORIGINS list OR matches the officerepo.com subdomain
        regex (OFFICEREPO_ORIGIN_PATTERN).

    A request with no Origin header is not a cross-origin browser request and
    is therefore treated as allowed (it is not a CORS rejection). The incoming
    origin is matched verbatim (no whitespace stripping) so this helper agrees
    with what CORSMiddleware actually accepts.
    """
    if not is_restricted_environment(environment):
        return True
    if not origin:
        return True
    if origin in build_cors_origins(environment, allowed_origins):
        return True
    return bool(OFFICEREPO_ORIGIN_PATTERN.match(origin))


# Maximum length to which a logged/alerted Origin value is truncated. The Origin
# header is attacker-controlled, so we bound it to keep log lines tidy and avoid
# echoing an unbounded value into logs/alerts.
MAX_LOGGED_ORIGIN_LEN: int = 128


def mask_origin(origin: str) -> str:
    """Return a log-safe representation of an Origin header value.

    The Origin is not a secret, but it is attacker-controlled, so the value is
    truncated to :data:`MAX_LOGGED_ORIGIN_LEN` characters. ``None``/empty input
    becomes ``"<none>"``.
    """
    if not origin:
        return "<none>"
    origin = origin.strip()
    if len(origin) > MAX_LOGGED_ORIGIN_LEN:
        return origin[:MAX_LOGGED_ORIGIN_LEN] + "...(truncated)"
    return origin
