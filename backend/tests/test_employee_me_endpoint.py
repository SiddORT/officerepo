"""
Tests for GET /api/v1/portal/{subdomain}/employees/me — graceful degradation.

The endpoint returns 200 in all cases, varying the payload to signal the
current state to the frontend rather than throwing 403/503.

Cases covered:
  1. Module disabled (or not found)          → {employee_module_enabled: false}
  2. Module enabled, DB not provisioned      → {employee_module_enabled: true, db_provisioned: false}
  3. Module enabled, DB active, no record    → {employee_module_enabled: true, db_provisioned: true, data: null}

All tests run against an in-memory SQLite database and mock the portal JWT
and the client_management repository calls so no real PostgreSQL is required.
"""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.app.core.security import create_access_token  # noqa: E402
from backend.app.database.platform import get_platform_db  # noqa: E402
from backend.app.modules.employee_management.router import router as emp_router  # noqa: E402
from backend.app.modules.client_management.constants import DB_STATUS_ACTIVE  # noqa: E402

_SUBDOMAIN = "acme"
_CLIENT_ID = "client-uuid-001"
_USER_EMAIL = "alice@acme.com"


def _make_portal_token() -> str:
    """Create a valid portal_access JWT for the test user."""
    payload = {
        "token_type": "portal_access",
        "client_id": _CLIENT_ID,
        "subdomain": _SUBDOMAIN,
        "email": _USER_EMAIL,
        "admin_user_id": "admin-001",
    }
    return create_access_token(payload)


def _make_platform_db_override():
    """A FastAPI dependency override that yields a plain MagicMock session."""
    def _dep():
        yield MagicMock()
    return _dep


def _build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(emp_router, prefix="/api/v1/portal")
    app.dependency_overrides[get_platform_db] = _make_platform_db_override()
    return app


class TestGetMyEmployeeModuleDisabled(unittest.TestCase):
    """Returns 200 {employee_module_enabled: false} when module row is absent or disabled."""

    def setUp(self):
        self.app = _build_app()
        self.client = TestClient(self.app, raise_server_exceptions=True)
        self.token = _make_portal_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.url = f"/api/v1/portal/{_SUBDOMAIN}/employees/me"

    def test_module_row_missing_returns_disabled(self):
        """get_module returns None → employee_module_enabled: false."""
        with patch(
            "backend.app.modules.client_management.repository.get_module",
            return_value=None,
        ):
            resp = self.client.get(self.url, headers=self.headers)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertFalse(body["data"]["employee_module_enabled"])
        self.assertNotIn("db_provisioned", body["data"])

    def test_module_disabled_flag_returns_disabled(self):
        """get_module returns a row with is_enabled=False → employee_module_enabled: false."""
        mod = MagicMock()
        mod.is_enabled = False
        with patch(
            "backend.app.modules.client_management.repository.get_module",
            return_value=mod,
        ):
            resp = self.client.get(self.url, headers=self.headers)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertFalse(body["data"]["employee_module_enabled"])
        self.assertNotIn("db_provisioned", body["data"])


class TestGetMyEmployeeDbNotProvisioned(unittest.TestCase):
    """Returns 200 {employee_module_enabled: true, db_provisioned: false} when DB is not ready."""

    def setUp(self):
        self.app = _build_app()
        self.client = TestClient(self.app, raise_server_exceptions=True)
        self.token = _make_portal_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.url = f"/api/v1/portal/{_SUBDOMAIN}/employees/me"

        self._enabled_mod = MagicMock()
        self._enabled_mod.is_enabled = True

    def test_no_db_connection_row(self):
        """get_db_connection returns None → db_provisioned: false."""
        with (
            patch(
                "backend.app.modules.client_management.repository.get_module",
                return_value=self._enabled_mod,
            ),
            patch(
                "backend.app.modules.client_management.repository.get_db_connection",
                return_value=None,
            ),
        ):
            resp = self.client.get(self.url, headers=self.headers)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["employee_module_enabled"])
        self.assertFalse(body["data"]["db_provisioned"])

    def test_db_connection_not_active_status(self):
        """DB row exists but status is Not Provisioned → db_provisioned: false."""
        conn = MagicMock()
        conn.database_status = "Not Provisioned"
        with (
            patch(
                "backend.app.modules.client_management.repository.get_module",
                return_value=self._enabled_mod,
            ),
            patch(
                "backend.app.modules.client_management.repository.get_db_connection",
                return_value=conn,
            ),
        ):
            resp = self.client.get(self.url, headers=self.headers)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["employee_module_enabled"])
        self.assertFalse(body["data"]["db_provisioned"])


class TestGetMyEmployeeDbActive(unittest.TestCase):
    """Module enabled + DB active — data field varies with record presence."""

    def setUp(self):
        self.app = _build_app()
        self.client = TestClient(self.app, raise_server_exceptions=True)
        self.token = _make_portal_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.url = f"/api/v1/portal/{_SUBDOMAIN}/employees/me"

        self._enabled_mod = MagicMock()
        self._enabled_mod.is_enabled = True

        self._active_conn = MagicMock()
        self._active_conn.database_status = DB_STATUS_ACTIVE

    def _call_with_record(self, record):
        """Shared helper: patch repos + client DB seam, then GET /me."""
        with (
            patch(
                "backend.app.modules.client_management.repository.get_module",
                return_value=self._enabled_mod,
            ),
            patch(
                "backend.app.modules.client_management.repository.get_db_connection",
                return_value=self._active_conn,
            ),
            patch(
                "backend.app.database.client_db.build_client_db_url",
                return_value="sqlite://",
            ),
            patch(
                "backend.app.database.client_db.provision_portal_schema",
            ),
            patch(
                "backend.app.database.client_db.make_client_session",
                return_value=MagicMock(),
            ),
            patch(
                "backend.app.modules.employee_management.service.get_my_employee",
                return_value=record,
            ),
        ):
            return self.client.get(self.url, headers=self.headers)

    def test_no_linked_record_returns_data_null(self):
        """Module + DB ready but no employee row matched → data: null."""
        resp = self._call_with_record(None)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["employee_module_enabled"])
        self.assertTrue(body["data"]["db_provisioned"])
        self.assertIsNone(body["data"]["data"])

    def test_linked_record_returned_in_data(self):
        """Module + DB ready, employee found → data contains the record dict."""
        fake_emp = {"id": "emp-1", "full_name": "Alice", "employee_number": "EMP-001"}
        resp = self._call_with_record(fake_emp)

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["success"])
        self.assertTrue(body["data"]["employee_module_enabled"])
        self.assertTrue(body["data"]["db_provisioned"])
        self.assertEqual(body["data"]["data"]["id"], "emp-1")
        self.assertEqual(body["data"]["data"]["full_name"], "Alice")


class TestGetMyEmployeeAuthGuard(unittest.TestCase):
    """The endpoint rejects requests that are missing or have an invalid token."""

    def setUp(self):
        self.app = _build_app()
        self.client = TestClient(self.app, raise_server_exceptions=False)
        self.url = f"/api/v1/portal/{_SUBDOMAIN}/employees/me"

    def test_no_auth_header_returns_401(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 401)

    def test_malformed_token_returns_401(self):
        resp = self.client.get(self.url, headers={"Authorization": "Bearer not-a-real-jwt"})
        self.assertEqual(resp.status_code, 401)

    def test_wrong_token_type_returns_401(self):
        """A superadmin access token (not portal_access) must be rejected."""
        from backend.app.core.security import create_access_token
        superadmin_token = create_access_token({"user_id": 1, "role": "superadmin"})
        resp = self.client.get(
            self.url, headers={"Authorization": f"Bearer {superadmin_token}"}
        )
        self.assertEqual(resp.status_code, 401)

    def test_wrong_subdomain_returns_403(self):
        """Token subdomain mismatch → 403."""
        token = _make_portal_token()
        resp = self.client.get(
            "/api/v1/portal/other-subdomain/employees/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 403)


if __name__ == "__main__":
    unittest.main()
