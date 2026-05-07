"""
Tests for the auto-expiry grace-period logic introduced in settings.py and
exercised by security.py's decode helpers.

Key behaviours under test:
  - previous_secret_grace_active() returns True while within the grace window.
  - previous_secret_grace_active() returns False once the grace window has closed.
  - previous_secret_grace_active() returns False when no PREVIOUS_* secrets are set.
  - decode_access_token / decode_refresh_token accept old-secret tokens during
    the grace window.
  - decode_access_token / decode_refresh_token REJECT old-secret tokens after
    the grace window even when PREVIOUS_* env vars are still set.
  - A startup warning is emitted when grace period has already elapsed at boot.
  - A startup warning is emitted when PREVIOUS_SECRET_ISSUED_AT is missing.
"""
import sys
import os
import unittest
import importlib
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from jose import jwt, JWTError

# Ensure backend/ is on sys.path so "app.*" imports resolve correctly.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# security.py uses "from backend.app.config.settings import settings".
# We register a "backend" namespace package pointing at _BACKEND_DIR so those
# imports resolve without adding the workspace root to sys.path (which would
# shadow the correct "app" package with an unrelated one at the workspace root).
import types as _types
if "backend" not in sys.modules:
    _backend_pkg = _types.ModuleType("backend")
    _backend_pkg.__path__ = [_BACKEND_DIR]
    _backend_pkg.__package__ = "backend"
    sys.modules["backend"] = _backend_pkg

CURRENT_JWT = "current-jwt-secret-abc123"
PREVIOUS_JWT = "previous-jwt-secret-xyz789"
CURRENT_REFRESH = "current-refresh-secret-abc123"
PREVIOUS_REFRESH = "previous-refresh-secret-xyz789"

_DEV_BASE_ENV = {
    "ENVIRONMENT": "development",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test",
    "JWT_SECRET": CURRENT_JWT,
    "REFRESH_SECRET": CURRENT_REFRESH,
}


def _make_settings(extra_env: dict):
    """Instantiate a fresh Settings object with a controlled environment."""
    env = {**_DEV_BASE_ENV, **extra_env}
    with patch.dict("os.environ", env, clear=True):
        mod = importlib.import_module("backend.app.config.settings")
        Settings = mod.Settings
        return Settings(_env_file=None)


def _make_token(secret: str, kind: str = "access",
                exp_delta: timedelta = timedelta(hours=1)) -> str:
    payload = {
        "sub": "user-1",
        "type": kind,
        "exp": datetime.utcnow() + exp_delta,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _decode_access(token: str, s) -> dict:
    """Mirror the logic in security.decode_access_token using a settings object."""
    try:
        return jwt.decode(token, s.JWT_SECRET, algorithms=["HS256"])
    except JWTError:
        if s.PREVIOUS_JWT_SECRET and s.previous_secret_grace_active():
            return jwt.decode(token, s.PREVIOUS_JWT_SECRET, algorithms=["HS256"])
        raise


def _decode_refresh(token: str, s) -> dict:
    """Mirror the logic in security.decode_refresh_token using a settings object."""
    try:
        return jwt.decode(token, s.REFRESH_SECRET, algorithms=["HS256"])
    except JWTError:
        if s.PREVIOUS_REFRESH_SECRET and s.previous_secret_grace_active():
            return jwt.decode(token, s.PREVIOUS_REFRESH_SECRET, algorithms=["HS256"])
        raise


# ─────────────────────────────────────────────────────────────────────────────
# previous_secret_grace_active() unit tests
# ─────────────────────────────────────────────────────────────────────────────

class TestGraceActiveFlag(unittest.TestCase):

    def test_grace_active_within_window(self):
        """Grace period is active when issued_at is recent."""
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_REFRESH_SECRET": PREVIOUS_REFRESH,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        self.assertTrue(s.previous_secret_grace_active())

    def test_grace_inactive_after_window_closes(self):
        """Grace period is NOT active when issued_at is older than grace hours."""
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_REFRESH_SECRET": PREVIOUS_REFRESH,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        self.assertFalse(s.previous_secret_grace_active())

    def test_grace_inactive_when_no_previous_secrets_set(self):
        """Grace period is irrelevant (False) when no PREVIOUS_* vars are set."""
        s = _make_settings({})
        self.assertFalse(s.previous_secret_grace_active())

    def test_grace_active_with_short_custom_window(self):
        """A custom short grace window still works correctly."""
        issued = datetime.now(tz=timezone.utc) - timedelta(minutes=30)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "1",
        })
        self.assertTrue(s.previous_secret_grace_active())

    def test_grace_inactive_after_short_custom_window(self):
        """Custom short window expires correctly."""
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=2)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "1",
        })
        self.assertFalse(s.previous_secret_grace_active())

    def test_issued_at_with_Z_suffix_parsed_correctly(self):
        """ISO-8601 timestamps with a trailing 'Z' are parsed as UTC."""
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        issued_str = issued.strftime("%Y-%m-%dT%H:%M:%SZ")
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued_str,
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        self.assertTrue(s.previous_secret_grace_active())


# ─────────────────────────────────────────────────────────────────────────────
# decode_access_token grace-period integration
# ─────────────────────────────────────────────────────────────────────────────

class TestDecodeAccessTokenGracePeriod(unittest.TestCase):

    def test_old_token_accepted_within_grace_period(self):
        token = _make_token(PREVIOUS_JWT)
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        result = _decode_access(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_old_token_rejected_after_grace_period(self):
        token = _make_token(PREVIOUS_JWT)
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        with self.assertRaises(JWTError):
            _decode_access(token, s)

    def test_current_token_always_accepted(self):
        token = _make_token(CURRENT_JWT)
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        s = _make_settings({
            "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        result = _decode_access(token, s)
        self.assertEqual(result["sub"], "user-1")


# ─────────────────────────────────────────────────────────────────────────────
# decode_refresh_token grace-period integration
# ─────────────────────────────────────────────────────────────────────────────

class TestDecodeRefreshTokenGracePeriod(unittest.TestCase):

    def test_old_token_accepted_within_grace_period(self):
        token = _make_token(PREVIOUS_REFRESH, kind="refresh")
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=1)
        s = _make_settings({
            "PREVIOUS_REFRESH_SECRET": PREVIOUS_REFRESH,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        result = _decode_refresh(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_old_token_rejected_after_grace_period(self):
        token = _make_token(PREVIOUS_REFRESH, kind="refresh")
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        s = _make_settings({
            "PREVIOUS_REFRESH_SECRET": PREVIOUS_REFRESH,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        with self.assertRaises(JWTError):
            _decode_refresh(token, s)

    def test_current_token_always_accepted(self):
        token = _make_token(CURRENT_REFRESH, kind="refresh")
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        s = _make_settings({
            "PREVIOUS_REFRESH_SECRET": PREVIOUS_REFRESH,
            "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
            "PREVIOUS_SECRET_GRACE_HOURS": "168",
        })
        result = _decode_refresh(token, s)
        self.assertEqual(result["sub"], "user-1")


# ─────────────────────────────────────────────────────────────────────────────
# Startup warning behaviour
# ─────────────────────────────────────────────────────────────────────────────

class TestStartupWarnings(unittest.TestCase):

    def test_warning_when_grace_already_elapsed_at_startup(self):
        """A warning must be logged if the grace period has already expired."""
        issued = datetime.now(tz=timezone.utc) - timedelta(hours=200)
        with self.assertLogs("backend.app.config.settings", level="WARNING") as cm:
            _make_settings({
                "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
                "PREVIOUS_SECRET_ISSUED_AT": issued.isoformat(),
                "PREVIOUS_SECRET_GRACE_HOURS": "168",
            })
        warning_text = " ".join(cm.output)
        self.assertIn("grace period has already elapsed", warning_text)

    def test_warning_when_issued_at_missing(self):
        """A warning must be logged when PREVIOUS_SECRET_ISSUED_AT is absent."""
        with self.assertLogs("backend.app.config.settings", level="WARNING") as cm:
            _make_settings({
                "PREVIOUS_JWT_SECRET": PREVIOUS_JWT,
            })
        warning_text = " ".join(cm.output)
        self.assertIn("PREVIOUS_SECRET_ISSUED_AT", warning_text)

    def test_no_warning_when_no_previous_secrets(self):
        """No rotation-related warning should fire when PREVIOUS_* is unset."""
        import logging
        with self.assertLogs("backend.app.config.settings", level="WARNING") as cm:
            # Trigger at least one warning from another validator so assertLogs
            # doesn't fail on "no logs emitted".
            _make_settings({
                "JWT_SECRET": "__unset__",
            })
        rotation_warnings = [
            line for line in cm.output
            if "grace period" in line or "PREVIOUS_SECRET_ISSUED_AT" in line
        ]
        self.assertEqual(rotation_warnings, [])


# ─────────────────────────────────────────────────────────────────────────────
# Direct integration: call security.decode_* with patched settings
# ─────────────────────────────────────────────────────────────────────────────

class TestSecurityModuleDirectIntegration(unittest.TestCase):
    """
    Invoke the real security.decode_access_token / decode_refresh_token
    (not local mirror helpers) with a patched settings object, so any
    future divergence in the production code is caught immediately.
    """

    def _patched_settings(self, grace_active: bool) -> MagicMock:
        s = MagicMock()
        s.JWT_SECRET = CURRENT_JWT
        s.REFRESH_SECRET = CURRENT_REFRESH
        s.PREVIOUS_JWT_SECRET = PREVIOUS_JWT
        s.PREVIOUS_REFRESH_SECRET = PREVIOUS_REFRESH
        s.previous_secret_grace_active.return_value = grace_active
        return s

    @classmethod
    def _import_security(cls):
        import importlib
        return importlib.import_module("backend.app.core.security")

    def test_decode_access_token_accepts_old_secret_within_grace(self):
        token = _make_token(PREVIOUS_JWT, kind="access")
        mock_settings = self._patched_settings(grace_active=True)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            result = sec.decode_access_token(token)
        self.assertEqual(result["sub"], "user-1")

    def test_decode_access_token_rejects_old_secret_after_grace(self):
        token = _make_token(PREVIOUS_JWT, kind="access")
        mock_settings = self._patched_settings(grace_active=False)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            with self.assertRaises(JWTError):
                sec.decode_access_token(token)

    def test_decode_refresh_token_accepts_old_secret_within_grace(self):
        token = _make_token(PREVIOUS_REFRESH, kind="refresh")
        mock_settings = self._patched_settings(grace_active=True)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            result = sec.decode_refresh_token(token)
        self.assertEqual(result["sub"], "user-1")

    def test_decode_refresh_token_rejects_old_secret_after_grace(self):
        token = _make_token(PREVIOUS_REFRESH, kind="refresh")
        mock_settings = self._patched_settings(grace_active=False)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            with self.assertRaises(JWTError):
                sec.decode_refresh_token(token)

    def test_decode_access_token_always_accepts_current_secret(self):
        token = _make_token(CURRENT_JWT, kind="access")
        mock_settings = self._patched_settings(grace_active=False)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            result = sec.decode_access_token(token)
        self.assertEqual(result["sub"], "user-1")

    def test_decode_refresh_token_always_accepts_current_secret(self):
        token = _make_token(CURRENT_REFRESH, kind="refresh")
        mock_settings = self._patched_settings(grace_active=False)
        sec = self._import_security()
        with patch.object(sec, "settings", mock_settings):
            result = sec.decode_refresh_token(token)
        self.assertEqual(result["sub"], "user-1")


# ─────────────────────────────────────────────────────────────────────────────
# PREVIOUS_SECRET_GRACE_HOURS validation
# ─────────────────────────────────────────────────────────────────────────────

class TestGraceHoursValidation(unittest.TestCase):

    def test_zero_grace_hours_raises(self):
        from pydantic import ValidationError
        with self.assertRaises((ValidationError, ValueError)):
            _make_settings({"PREVIOUS_SECRET_GRACE_HOURS": "0"})

    def test_negative_grace_hours_raises(self):
        from pydantic import ValidationError
        with self.assertRaises((ValidationError, ValueError)):
            _make_settings({"PREVIOUS_SECRET_GRACE_HOURS": "-1"})

    def test_positive_grace_hours_accepted(self):
        s = _make_settings({"PREVIOUS_SECRET_GRACE_HOURS": "24"})
        self.assertEqual(s.PREVIOUS_SECRET_GRACE_HOURS, 24)


if __name__ == "__main__":
    unittest.main()
