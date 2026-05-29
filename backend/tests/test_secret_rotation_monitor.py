"""
Unit tests for backend/app/core/secret_rotation_monitor.py.

Coverage:
  _check_once
    - no previous secrets set          → silent, no warning, no webhook
    - _previous_secret_origin is None  → silent, no warning, no webhook
    - grace period still active        → silent, no warning, no webhook
    - grace period elapsed             → WARNING emitted
    - grace period elapsed + alert URL → WARNING emitted + webhook POSTed
    - grace period elapsed, blank URL  → WARNING emitted, no webhook POST
    - webhook payload fields           → correct keys/values in POST body

  _fire_webhook
    - HTTP 4xx response                → secondary WARNING logged (no exception raised)
    - network exception                → secondary WARNING logged (no exception raised)

  run_monitor
    - cancels cleanly on CancelledError → no exception propagated, stop log emitted
    - calls _check_once on each loop iteration
"""

import asyncio
import sys
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch, call

# Ensure backend/ is on sys.path so "app.*" imports resolve correctly.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

import types as _types
if "backend" not in sys.modules:
    _backend_pkg = _types.ModuleType("backend")
    _backend_pkg.__path__ = [_BACKEND_DIR]
    _backend_pkg.__package__ = "backend"
    sys.modules["backend"] = _backend_pkg

from app.core.secret_rotation_monitor import _check_once, _fire_webhook, run_monitor


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_settings(
    *,
    previous_jwt: str = "old-jwt-secret",
    previous_refresh: str = "",
    origin_offset_hours: float = 0.0,
    grace_hours: int = 168,
    alert_url: str = "",
    no_previous_secrets: bool = False,
    origin_none: bool = False,
) -> MagicMock:
    """Build a minimal settings-like object for the monitor."""
    s = MagicMock()
    if no_previous_secrets:
        s.PREVIOUS_JWT_SECRET = ""
        s.PREVIOUS_REFRESH_SECRET = ""
    else:
        s.PREVIOUS_JWT_SECRET = previous_jwt
        s.PREVIOUS_REFRESH_SECRET = previous_refresh

    if origin_none:
        s._previous_secret_origin = None
    else:
        s._previous_secret_origin = (
            datetime.now(tz=timezone.utc) - timedelta(hours=origin_offset_hours)
        )

    s.PREVIOUS_SECRET_GRACE_HOURS = grace_hours
    s.SECRET_ROTATION_ALERT_URL = alert_url
    s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 1
    return s


def _run(coro):
    """Execute an async coroutine synchronously."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ─────────────────────────────────────────────────────────────────────────────
# _check_once — silent cases
# ─────────────────────────────────────────────────────────────────────────────

class TestCheckOnceSilentCases(unittest.TestCase):

    def test_no_previous_secrets_emits_no_warning(self):
        """When PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET are both empty,
        _check_once must return without logging any warning."""
        s = _make_settings(no_previous_secrets=True)
        with self.assertNoLogs("app.core.secret_rotation_monitor", level="WARNING"):
            _run(_check_once(s))

    def test_origin_none_emits_no_warning(self):
        """When _previous_secret_origin is None, _check_once must be silent."""
        s = _make_settings(origin_none=True)
        with self.assertNoLogs("app.core.secret_rotation_monitor", level="WARNING"):
            _run(_check_once(s))

    def test_grace_still_active_emits_no_warning(self):
        """When the grace period has not yet elapsed, no warning is emitted."""
        # Issued 1 hour ago, grace is 168 h → still active
        s = _make_settings(origin_offset_hours=1.0, grace_hours=168)
        with self.assertNoLogs("app.core.secret_rotation_monitor", level="WARNING"):
            _run(_check_once(s))

    def test_grace_active_boundary_emits_no_warning(self):
        """One minute before grace expiry should still be silent."""
        s = _make_settings(origin_offset_hours=167.98, grace_hours=168)
        with self.assertNoLogs("app.core.secret_rotation_monitor", level="WARNING"):
            _run(_check_once(s))

    def test_no_previous_secrets_does_not_call_webhook(self):
        """No HTTP call should be made when there are no previous secrets."""
        s = _make_settings(no_previous_secrets=True, alert_url="https://example.com/hook")
        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient") as mock_client:
            _run(_check_once(s))
        mock_client.assert_not_called()

    def test_grace_active_does_not_call_webhook(self):
        """No HTTP call should be made while grace period is active."""
        s = _make_settings(origin_offset_hours=1.0, grace_hours=168, alert_url="https://example.com/hook")
        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient") as mock_client:
            _run(_check_once(s))
        mock_client.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# _check_once — grace elapsed cases
# ─────────────────────────────────────────────────────────────────────────────

class TestCheckOnceGraceElapsed(unittest.TestCase):

    def test_warning_emitted_when_grace_elapsed(self):
        """A WARNING must be logged when secrets are still set after grace expires."""
        # Issued 200 h ago, grace is 168 h → elapsed
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168)
        with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
            _run(_check_once(s))
        warning_text = " ".join(cm.output)
        self.assertIn("grace period has elapsed", warning_text)

    def test_warning_message_contains_elapsed_hours(self):
        """Warning should include elapsed hours so operators can act quickly."""
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168)
        with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
            _run(_check_once(s))
        warning_text = " ".join(cm.output)
        # elapsed ≈ 200 h — log uses "%.1f h"
        self.assertIn("200", warning_text)

    def test_warning_message_contains_grace_hours(self):
        """Warning should include the configured grace period."""
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168)
        with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
            _run(_check_once(s))
        warning_text = " ".join(cm.output)
        self.assertIn("168", warning_text)

    def test_no_webhook_call_when_alert_url_blank(self):
        """When SECRET_ROTATION_ALERT_URL is blank, no HTTP call should be made."""
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168, alert_url="")
        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient") as mock_client:
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_check_once(s))
        mock_client.assert_not_called()

    def test_no_webhook_call_when_alert_url_whitespace_only(self):
        """A whitespace-only SECRET_ROTATION_ALERT_URL should be treated as blank."""
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168, alert_url="   ")
        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient") as mock_client:
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_check_once(s))
        mock_client.assert_not_called()

    def test_webhook_posted_when_alert_url_set(self):
        """When SECRET_ROTATION_ALERT_URL is set and grace elapsed, a POST is made."""
        alert_url = "https://hooks.example.com/rotation-alert"
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168, alert_url=alert_url)

        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_check_once(s))

        mock_client_instance.post.assert_awaited_once()
        call_args = mock_client_instance.post.call_args
        # First positional arg is the URL
        self.assertEqual(call_args[0][0], alert_url)

    def test_webhook_payload_structure(self):
        """The webhook JSON payload must contain all required fields."""
        alert_url = "https://hooks.example.com/rotation-alert"
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168, alert_url=alert_url)

        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_check_once(s))

        call_kwargs = mock_client_instance.post.call_args[1]
        payload = call_kwargs["json"]

        self.assertIn("alert", payload)
        self.assertIn("message", payload)
        self.assertIn("elapsed_hours", payload)
        self.assertIn("grace_hours", payload)
        self.assertIn("checked_at", payload)

    def test_webhook_payload_values(self):
        """Payload values must match the current settings and elapsed time."""
        alert_url = "https://hooks.example.com/rotation-alert"
        s = _make_settings(origin_offset_hours=200.0, grace_hours=168, alert_url=alert_url)

        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_check_once(s))

        payload = mock_client_instance.post.call_args[1]["json"]

        self.assertEqual(payload["alert"], "stale_previous_secrets")
        self.assertEqual(payload["grace_hours"], 168)
        # elapsed_hours should be approximately 200
        self.assertAlmostEqual(payload["elapsed_hours"], 200.0, delta=0.1)
        # checked_at should be a valid ISO-8601 string
        checked_at = datetime.fromisoformat(payload["checked_at"])
        now = datetime.now(tz=timezone.utc)
        self.assertLess(abs((now - checked_at).total_seconds()), 5)

    def test_grace_elapsed_with_only_refresh_secret_set(self):
        """PREVIOUS_REFRESH_SECRET alone (JWT unset) still triggers the warning."""
        s = _make_settings(
            previous_jwt="",
            previous_refresh="old-refresh-secret",
            origin_offset_hours=200.0,
            grace_hours=168,
        )
        with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
            _run(_check_once(s))
        self.assertIn("grace period has elapsed", " ".join(cm.output))

    def test_custom_short_grace_hours_triggers_warning(self):
        """A short custom grace window should trigger the warning when elapsed."""
        # grace = 2 h, elapsed = 3 h → stale
        s = _make_settings(origin_offset_hours=3.0, grace_hours=2)
        with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
            _run(_check_once(s))
        self.assertIn("grace period has elapsed", " ".join(cm.output))


# ─────────────────────────────────────────────────────────────────────────────
# _fire_webhook — error handling
# ─────────────────────────────────────────────────────────────────────────────

class TestFireWebhook(unittest.TestCase):

    def test_http_4xx_response_logs_warning_does_not_raise(self):
        """A 4xx response from the webhook endpoint should log a warning but not raise."""
        mock_response = MagicMock()
        mock_response.status_code = 400

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
                _run(_fire_webhook("https://example.com/hook", {"key": "value"}))

        self.assertTrue(any("HTTP 400" in line or "returned HTTP" in line for line in cm.output))

    def test_http_5xx_response_logs_warning_does_not_raise(self):
        """A 5xx response should also log a warning without raising."""
        mock_response = MagicMock()
        mock_response.status_code = 503

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
                _run(_fire_webhook("https://example.com/hook", {}))

        self.assertTrue(any("503" in line for line in cm.output))

    def test_network_exception_logs_warning_does_not_raise(self):
        """A network-level exception must be swallowed and logged as a warning."""
        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(side_effect=Exception("connection refused"))
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            with self.assertLogs("app.core.secret_rotation_monitor", level="WARNING") as cm:
                _run(_fire_webhook("https://example.com/hook", {}))

        self.assertTrue(any("connection refused" in line for line in cm.output))

    def test_200_response_logs_debug_not_warning(self):
        """A successful 200 response must NOT produce a WARNING (only DEBUG)."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        import logging
        with patch("app.core.secret_rotation_monitor.httpx.AsyncClient", return_value=mock_client_instance):
            # assertNoLogs at WARNING level confirms no warning is emitted
            with self.assertNoLogs("app.core.secret_rotation_monitor", level="WARNING"):
                _run(_fire_webhook("https://example.com/hook", {"key": "val"}))


# ─────────────────────────────────────────────────────────────────────────────
# run_monitor — lifecycle
# ─────────────────────────────────────────────────────────────────────────────

class TestRunMonitor(unittest.TestCase):

    def test_run_monitor_cancels_cleanly(self):
        """Cancelling the monitor task must not propagate CancelledError."""
        s = _make_settings(no_previous_secrets=True)
        s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 1  # 1 h sleep

        async def _cancel_after_start():
            task = asyncio.ensure_future(run_monitor(s))
            # Yield control so the monitor starts its first iteration
            await asyncio.sleep(0)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass  # Expected — task was cancelled
            return task

        loop = asyncio.get_event_loop()
        task = loop.run_until_complete(_cancel_after_start())
        self.assertTrue(task.done())

    def test_run_monitor_logs_stopped_on_cancel(self):
        """An INFO log saying the monitor stopped must be emitted on cancellation."""
        s = _make_settings(no_previous_secrets=True)
        s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 1

        async def _cancel_and_collect():
            task = asyncio.ensure_future(run_monitor(s))
            await asyncio.sleep(0)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        with self.assertLogs("app.core.secret_rotation_monitor", level="INFO") as cm:
            asyncio.get_event_loop().run_until_complete(_cancel_and_collect())

        log_text = " ".join(cm.output)
        self.assertIn("stopped", log_text)

    def test_run_monitor_logs_started(self):
        """An INFO log saying the monitor started must be emitted on first run."""
        s = _make_settings(no_previous_secrets=True)
        s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 1

        async def _start_and_cancel():
            task = asyncio.ensure_future(run_monitor(s))
            await asyncio.sleep(0)
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        with self.assertLogs("app.core.secret_rotation_monitor", level="INFO") as cm:
            asyncio.get_event_loop().run_until_complete(_start_and_cancel())

        log_text = " ".join(cm.output)
        self.assertIn("started", log_text)

    def test_run_monitor_calls_check_once(self):
        """run_monitor must invoke _check_once at least once before sleeping."""
        s = _make_settings(no_previous_secrets=True)
        s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 1

        call_count = 0

        async def _fake_check_once(settings):
            nonlocal call_count
            call_count += 1

        async def _run_and_cancel():
            with patch("app.core.secret_rotation_monitor._check_once", side_effect=_fake_check_once):
                task = asyncio.ensure_future(run_monitor(s))
                # Allow one full iteration (check + start of sleep)
                await asyncio.sleep(0)
                await asyncio.sleep(0)
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        with self.assertLogs("app.core.secret_rotation_monitor", level="INFO"):
            asyncio.get_event_loop().run_until_complete(_run_and_cancel())

        self.assertGreaterEqual(call_count, 1)

    def test_run_monitor_uses_configured_interval(self):
        """PREVIOUS_SECRET_CHECK_INTERVAL_HOURS must be respected as the sleep duration."""
        s = _make_settings(no_previous_secrets=True)
        s.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS = 3  # 3 h → 10800 seconds

        sleep_calls = []

        original_sleep = asyncio.sleep

        async def _fake_sleep(seconds):
            sleep_calls.append(seconds)
            raise asyncio.CancelledError()

        async def _run_with_patched_sleep():
            with patch("app.core.secret_rotation_monitor.asyncio.sleep", side_effect=_fake_sleep):
                try:
                    await run_monitor(s)
                except asyncio.CancelledError:
                    pass

        with self.assertLogs("app.core.secret_rotation_monitor", level="INFO"):
            asyncio.get_event_loop().run_until_complete(_run_with_patched_sleep())

        self.assertTrue(sleep_calls, "asyncio.sleep was never called")
        self.assertEqual(sleep_calls[0], 3 * 3600)


if __name__ == "__main__":
    unittest.main()
