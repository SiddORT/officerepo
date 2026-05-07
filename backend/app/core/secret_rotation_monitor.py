"""Background task that periodically checks whether PREVIOUS_JWT_SECRET /
PREVIOUS_REFRESH_SECRET are still set after the grace period has elapsed.

If stale secrets are detected:
  - A WARNING is emitted to the application logger.
  - If SECRET_ROTATION_ALERT_URL is configured, a JSON payload is POSTed to
    that URL so external alerting systems (PagerDuty, Slack, etc.) are notified.

Configuration (environment variables):
  PREVIOUS_SECRET_CHECK_INTERVAL_HOURS  – how often to run the check (default 1)
  SECRET_ROTATION_ALERT_URL             – optional webhook URL (default disabled)
"""

import asyncio
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)


async def _fire_webhook(url: str, payload: dict) -> None:
    """POST *payload* as JSON to *url*, swallowing all errors so the monitor
    loop is never interrupted by a misconfigured or unreachable endpoint."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload)
            if response.status_code >= 400:
                logger.warning(
                    "secret_rotation_monitor: webhook POST to %s returned HTTP %d",
                    url,
                    response.status_code,
                )
            else:
                logger.debug(
                    "secret_rotation_monitor: webhook delivered to %s (HTTP %d)",
                    url,
                    response.status_code,
                )
    except Exception as exc:
        logger.warning(
            "secret_rotation_monitor: webhook POST to %s failed: %s",
            url,
            exc,
        )


async def _check_once(settings) -> None:
    """Run a single stale-secret check against *settings*."""
    has_previous = bool(settings.PREVIOUS_JWT_SECRET or settings.PREVIOUS_REFRESH_SECRET)
    if not has_previous:
        return

    if settings._previous_secret_origin is None:
        return

    elapsed_hours = (
        datetime.now(tz=timezone.utc) - settings._previous_secret_origin
    ).total_seconds() / 3600

    if elapsed_hours < settings.PREVIOUS_SECRET_GRACE_HOURS:
        return

    logger.warning(
        "secret_rotation_monitor: PREVIOUS_JWT_SECRET / PREVIOUS_REFRESH_SECRET "
        "are still set but the grace period has elapsed "
        "(%.1f h elapsed, %d h grace). "
        "The fallback secrets are no longer used for token verification. "
        "Unset PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET to keep the "
        "environment tidy.",
        elapsed_hours,
        settings.PREVIOUS_SECRET_GRACE_HOURS,
    )

    alert_url = settings.SECRET_ROTATION_ALERT_URL.strip()
    if alert_url:
        payload = {
            "alert": "stale_previous_secrets",
            "message": (
                "PREVIOUS_JWT_SECRET / PREVIOUS_REFRESH_SECRET are still set "
                "after the rotation grace period has elapsed. "
                "Please unset these environment variables."
            ),
            "elapsed_hours": round(elapsed_hours, 2),
            "grace_hours": settings.PREVIOUS_SECRET_GRACE_HOURS,
            "checked_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        await _fire_webhook(alert_url, payload)


async def run_monitor(settings) -> None:
    """Infinite loop that checks for stale PREVIOUS_* secrets every
    ``settings.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS`` hours.

    Designed to be started as a background asyncio task from the FastAPI
    lifespan context manager so it runs alongside the application and is
    cancelled cleanly when the server shuts down.
    """
    interval_seconds = settings.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS * 3600
    logger.info(
        "secret_rotation_monitor: started (check interval: %d h)",
        settings.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS,
    )
    try:
        while True:
            await _check_once(settings)
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        logger.info("secret_rotation_monitor: stopped")
