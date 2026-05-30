"""Server-side logging + optional webhook alerting for CORS-rejected origins.

Starlette's ``CORSMiddleware`` rejects disallowed cross-origin requests
silently: simple requests are served without an ``Access-Control-Allow-Origin``
header (so the *browser* throws an opaque CORS error) and preflights get a bare
HTTP 400. In neither case is the offending ``Origin`` logged. That makes a
misconfigured ``ALLOWED_ORIGINS`` entry or a typo'd tenant subdomain invisible
server-side and very hard to diagnose.

This module adds an HTTP middleware that inspects the incoming ``Origin`` header
and, when it would NOT be accepted by the CORS policy (see
:func:`app.core.cors.is_origin_allowed`), logs the rejection with the offending
``Origin`` (truncated via :func:`app.core.cors.mask_origin`). If
``CORS_REJECTION_ALERT_URL`` is configured, a JSON payload is POSTed to that
webhook, reusing the ``SECRET_ROTATION_ALERT_*`` alerting pattern.

Webhook alerts for the same origin are throttled
(``CORS_REJECTION_ALERT_COOLDOWN_MINUTES``) so a retrying misconfigured client
cannot flood the receiver; the WARNING log line is always emitted.

Webhook payload shape (all fields always present):
  {
    "alert":       "cors_origin_rejected",
    "message":     "<human-readable description>",
    "severity":    "<CORS_REJECTION_ALERT_SEVERITY or 'warning'>",
    "environment": "<CORS_REJECTION_ALERT_ENV_TAG or ENVIRONMENT>",
    "origin":      "<masked/truncated offending Origin>",
    "method":      "<HTTP method>",
    "path":        "<request path>",
    "detected_at": "<ISO-8601 UTC timestamp>"
  }
"""

import logging
from datetime import datetime, timezone

import httpx

try:  # pragma: no cover - exercised via both import roots
    from backend.app.core.cors import is_origin_allowed, mask_origin
except ImportError:  # pragma: no cover
    from app.core.cors import is_origin_allowed, mask_origin

logger = logging.getLogger(__name__)

# In-memory throttle: maps a rejected origin -> time of its last webhook alert
# (UTC). Single-instance state; reset on restart. The log line is never
# throttled, only the webhook POST.
_last_alert_at: dict[str, datetime] = {}


async def _fire_webhook(url: str, payload: dict) -> None:
    """POST *payload* as JSON to *url*, swallowing all errors so a misconfigured
    or unreachable endpoint can never break request handling."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload)
            if response.status_code >= 400:
                logger.warning(
                    "cors_monitor: webhook POST to %s returned HTTP %d",
                    url,
                    response.status_code,
                )
            else:
                logger.debug(
                    "cors_monitor: webhook delivered to %s (HTTP %d)",
                    url,
                    response.status_code,
                )
    except Exception as exc:
        logger.warning(
            "cors_monitor: webhook POST to %s failed: %s",
            url,
            exc,
        )


def _should_alert(origin: str, cooldown_minutes: int, now: datetime = None) -> bool:
    """Return True if a webhook alert for *origin* is permitted under the
    per-origin cooldown, recording the fire time when it returns True.

    A non-positive *cooldown_minutes* disables throttling (always True).
    """
    if cooldown_minutes <= 0:
        return True
    now = now or datetime.now(tz=timezone.utc)
    last = _last_alert_at.get(origin)
    if last is not None and (now - last).total_seconds() < cooldown_minutes * 60:
        return False
    _last_alert_at[origin] = now
    return True


def _build_payload(origin: str, method: str, path: str, settings) -> dict:
    """Assemble the webhook JSON payload for a rejected origin."""
    severity = settings.CORS_REJECTION_ALERT_SEVERITY.strip() or "warning"
    env_tag = settings.CORS_REJECTION_ALERT_ENV_TAG.strip() or settings.ENVIRONMENT
    return {
        "alert": "cors_origin_rejected",
        "message": (
            "A browser request was blocked by the CORS policy because its "
            "Origin is not in the allow-list. Check ALLOWED_ORIGINS for typos "
            "or a missing subdomain."
        ),
        "severity": severity,
        "environment": env_tag,
        "origin": mask_origin(origin),
        "method": method,
        "path": path,
        "detected_at": datetime.now(tz=timezone.utc).isoformat(),
    }


async def handle_cors_rejection(origin: str, method: str, path: str, settings) -> None:
    """Log a CORS rejection and, if configured, fire a (throttled) webhook."""
    logger.warning(
        "cors_monitor: blocked cross-origin request — Origin %s is not allowed "
        "by the CORS policy (method=%s path=%s). Check ALLOWED_ORIGINS for typos "
        "or a missing subdomain.",
        mask_origin(origin),
        method,
        path,
    )

    alert_url = settings.CORS_REJECTION_ALERT_URL.strip()
    if not alert_url:
        return
    if not _should_alert(origin, settings.CORS_REJECTION_ALERT_COOLDOWN_MINUTES):
        return
    await _fire_webhook(alert_url, _build_payload(origin, method, path, settings))


def make_cors_rejection_logger(settings):
    """Return an HTTP middleware that logs (and optionally alerts on) requests
    whose ``Origin`` is rejected by the CORS policy.

    The middleware only acts on requests that carry an ``Origin`` header which
    would be rejected; everything else passes through untouched. In development
    (wildcard CORS) nothing is ever rejected, so the middleware is a no-op.
    """

    async def cors_rejection_logger(request, call_next):
        origin = request.headers.get("origin")
        if origin and not is_origin_allowed(
            origin, settings.ENVIRONMENT, settings.ALLOWED_ORIGINS
        ):
            await handle_cors_rejection(
                origin, request.method, request.url.path, settings
            )
        return await call_next(request)

    return cors_rejection_logger
