"""
Tests for POST /api/v1/superadmin/rotate-secrets.

Covers:
  - Unauthenticated requests are rejected (401)
  - Valid token with non-superadmin role is rejected (403)
  - In non-production: secrets are rotated in-process and new values returned
  - In non-production: previous-secret fields are promoted correctly
  - In production: no rotation happens; manual instructions are returned

These tests mock the database, settings singleton, and token-decode path so
they run without a real PostgreSQL instance.
"""
import sys
import os
import secrets
import hashlib
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from jose import jwt

# Ensure the repo root is on sys.path so `backend.*` imports resolve.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)


# ── helpers ──────────────────────────────────────────────────────────────────

_SUPERADMIN_JWT_SECRET = "test-jwt-secret-superadmin"
_TENANT_JWT_SECRET = "test-jwt-secret-superadmin"


def _make_token(role: str, secret: str = _SUPERADMIN_JWT_SECRET) -> str:
    payload = {
        "user_id": 1,
        "tenant_id": "platform" if role == "superadmin" else "acme",
        "role": role,
        "email": "admin@officerepo.io",
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _kid(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()[:8]


# ── fixtures ─────────────────────────────────────────────────────────────────

def _make_settings_mock(environment: str = "development") -> MagicMock:
    """Return a settings mock wired for the given environment."""
    old_jwt = "old-jwt-secret-value"
    old_refresh = "old-refresh-secret-value"
    s = MagicMock()
    s.JWT_SECRET = old_jwt
    s.REFRESH_SECRET = old_refresh
    s.PREVIOUS_JWT_SECRET = ""
    s.PREVIOUS_REFRESH_SECRET = ""
    s.PREVIOUS_SECRET_ISSUED_AT = ""
    s._previous_secret_origin = None
    s.PREVIOUS_SECRET_GRACE_HOURS = 168
    s.ENVIRONMENT = environment
    return s


def _build_client() -> tuple:
    """Return (TestClient, settings_mock) with all external deps patched out."""
    settings_mock = _make_settings_mock()

    # Patch decode_access_token so it uses our test secret without hitting the
    # real settings singleton.
    def _fake_decode(token: str) -> dict:
        return jwt.decode(token, _SUPERADMIN_JWT_SECRET, algorithms=["HS256"])

    patches = [
        patch("backend.app.core.deps.decode_access_token", side_effect=_fake_decode),
        patch("backend.app.platform.superadmin.rotation_router.settings", settings_mock),
    ]
    return patches, settings_mock


# ── test cases ────────────────────────────────────────────────────────────────

class TestRotateSecretsUnauthorized(unittest.TestCase):
    """Requests without a valid superadmin JWT must be rejected."""

    def setUp(self):
        from backend.main import app
        self.client = TestClient(app, raise_server_exceptions=False)

    def test_no_token_returns_403(self):
        resp = self.client.post("/api/v1/superadmin/rotate-secrets")
        self.assertIn(resp.status_code, (401, 403))

    def test_invalid_token_returns_401(self):
        resp = self.client.post(
            "/api/v1/superadmin/rotate-secrets",
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_non_superadmin_role_returns_403(self):
        """A well-formed JWT with role != superadmin must receive 403."""
        def _fake_decode(token):
            return jwt.decode(token, _SUPERADMIN_JWT_SECRET, algorithms=["HS256"])

        tenant_token = _make_token("admin")  # tenant admin, not superadmin
        with patch("backend.app.core.deps.decode_access_token", side_effect=_fake_decode):
            resp = self.client.post(
                "/api/v1/superadmin/rotate-secrets",
                headers={"Authorization": f"Bearer {tenant_token}"},
            )
        self.assertEqual(resp.status_code, 403)
        self.assertIn("Superadmin", resp.json()["detail"])


class TestRotateSecretsNonProduction(unittest.TestCase):
    """In development/staging the endpoint rotates secrets in-process."""

    def _call_rotate(self, settings_mock) -> dict:
        from backend.main import app

        def _fake_decode(token):
            return jwt.decode(token, _SUPERADMIN_JWT_SECRET, algorithms=["HS256"])

        client = TestClient(app, raise_server_exceptions=True)
        token = _make_token("superadmin")

        with patch("backend.app.core.deps.decode_access_token", side_effect=_fake_decode), \
             patch("backend.app.platform.superadmin.rotation_router.settings", settings_mock):
            resp = client.post(
                "/api/v1/superadmin/rotate-secrets",
                headers={"Authorization": f"Bearer {token}"},
            )
        self.assertEqual(resp.status_code, 200)
        return resp.json()

    def test_rotated_flag_is_true(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertTrue(data["rotated"])

    def test_new_secrets_are_returned_and_non_empty(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertIsNotNone(data["new_jwt_secret"])
        self.assertIsNotNone(data["new_refresh_secret"])
        self.assertGreater(len(data["new_jwt_secret"]), 0)
        self.assertGreater(len(data["new_refresh_secret"]), 0)

    def test_new_secrets_differ_from_old(self):
        s = _make_settings_mock("development")
        old_jwt = s.JWT_SECRET
        old_refresh = s.REFRESH_SECRET
        data = self._call_rotate(s)
        self.assertNotEqual(data["new_jwt_secret"], old_jwt)
        self.assertNotEqual(data["new_refresh_secret"], old_refresh)

    def test_previous_key_ids_match_old_secrets(self):
        s = _make_settings_mock("development")
        old_jwt_kid = _kid(s.JWT_SECRET)
        old_refresh_kid = _kid(s.REFRESH_SECRET)
        data = self._call_rotate(s)
        self.assertEqual(data["previous_jwt_secret_kid"], old_jwt_kid)
        self.assertEqual(data["previous_refresh_secret_kid"], old_refresh_kid)

    def test_settings_are_mutated_in_process(self):
        """After the call the settings mock should hold the new secrets."""
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertEqual(s.JWT_SECRET, data["new_jwt_secret"])
        self.assertEqual(s.REFRESH_SECRET, data["new_refresh_secret"])

    def test_previous_secrets_are_promoted(self):
        """Old JWT_SECRET / REFRESH_SECRET must be set as PREVIOUS_* on the mock."""
        s = _make_settings_mock("development")
        old_jwt = s.JWT_SECRET
        old_refresh = s.REFRESH_SECRET
        self._call_rotate(s)
        self.assertEqual(s.PREVIOUS_JWT_SECRET, old_jwt)
        self.assertEqual(s.PREVIOUS_REFRESH_SECRET, old_refresh)

    def test_grace_period_expiry_is_in_future(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        expiry = datetime.fromisoformat(data["grace_period_expires_at"])
        # Ensure it's timezone-aware for comparison
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        self.assertGreater(expiry, datetime.now(tz=timezone.utc))

    def test_grace_period_hours_matches_settings(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertEqual(data["grace_period_hours"], s.PREVIOUS_SECRET_GRACE_HOURS)

    def test_instructions_list_is_present(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertIsInstance(data["instructions"], list)
        self.assertGreater(len(data["instructions"]), 0)

    def test_environment_field_reflects_current_env(self):
        s = _make_settings_mock("development")
        data = self._call_rotate(s)
        self.assertEqual(data["environment"], "development")


class TestRotateSecretsProduction(unittest.TestCase):
    """In production the endpoint must NOT rotate; it returns manual instructions."""

    def _call_rotate_prod(self) -> dict:
        from backend.main import app

        s = _make_settings_mock("production")

        def _fake_decode(token):
            return jwt.decode(token, _SUPERADMIN_JWT_SECRET, algorithms=["HS256"])

        client = TestClient(app, raise_server_exceptions=True)
        token = _make_token("superadmin")

        with patch("backend.app.core.deps.decode_access_token", side_effect=_fake_decode), \
             patch("backend.app.platform.superadmin.rotation_router.settings", s):
            resp = client.post(
                "/api/v1/superadmin/rotate-secrets",
                headers={"Authorization": f"Bearer {token}"},
            )
        self.assertEqual(resp.status_code, 200)
        return resp.json(), s

    def test_rotated_flag_is_false_in_production(self):
        data, _ = self._call_rotate_prod()
        self.assertFalse(data["rotated"])

    def test_secrets_are_not_returned_in_production(self):
        data, _ = self._call_rotate_prod()
        self.assertIsNone(data["new_jwt_secret"])
        self.assertIsNone(data["new_refresh_secret"])

    def test_settings_not_mutated_in_production(self):
        """Production path must not change the in-process secrets."""
        data, s = self._call_rotate_prod()
        self.assertEqual(s.JWT_SECRET, "old-jwt-secret-value")
        self.assertEqual(s.REFRESH_SECRET, "old-refresh-secret-value")
        self.assertEqual(s.PREVIOUS_JWT_SECRET, "")
        self.assertEqual(s.PREVIOUS_REFRESH_SECRET, "")

    def test_instructions_list_is_present_in_production(self):
        data, _ = self._call_rotate_prod()
        self.assertIsInstance(data["instructions"], list)
        self.assertGreater(len(data["instructions"]), 0)

    def test_environment_field_is_production(self):
        data, _ = self._call_rotate_prod()
        self.assertEqual(data["environment"], "production")


if __name__ == "__main__":
    unittest.main()
