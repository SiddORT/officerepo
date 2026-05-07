"""
Tests for CORS security configuration.

Verifies that:
  - Wildcard ('*') is rejected in production mode (startup guard).
  - A missing/empty ALLOWED_ORIGINS raises an error at startup in production.
  - Requests from origins not listed in ALLOWED_ORIGINS are rejected (no
    Access-Control-Allow-Origin header returned).
  - Requests from a listed origin are accepted (header present and correct).
  - Wildcard is permitted in development (no error raised).
"""
import importlib
import os
import sys
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient
from pydantic import ValidationError

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Fully-set production env with valid secrets — only ALLOWED_ORIGINS varies
_PROD_SECRETS = {
    "ENVIRONMENT": "production",
    "JWT_SECRET": "prod-jwt-secret",
    "REFRESH_SECRET": "prod-refresh-secret",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test",
}

_DEV_BASE_ENV = {
    "ENVIRONMENT": "development",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test",
}


def _make_settings(env: dict):
    """Instantiate a fresh Settings object with the given env, no .env file."""
    with patch.dict("os.environ", env, clear=True):
        mod = importlib.import_module("app.config.settings")
        return mod.Settings(_env_file=None)


def _assert_cors_guard_raised(test_case, env, expected_keyword):
    """Assert Settings() raises an error whose message contains expected_keyword."""
    try:
        _make_settings(env)
        test_case.fail(
            f"Expected an exception mentioning '{expected_keyword}', but "
            "Settings() succeeded unexpectedly."
        )
    except (ValidationError, ValueError, RuntimeError) as exc:
        error_text = str(exc)
        test_case.assertIn(
            expected_keyword,
            error_text,
            f"Expected '{expected_keyword}' in error: {error_text}",
        )


def _build_cors_app(allowed_origins: list[str]) -> FastAPI:
    """Return a minimal FastAPI app with CORSMiddleware using *allowed_origins*."""
    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Tenant-ID"],
    )

    @test_app.get("/ping")
    def ping():
        return {"ok": True}

    return test_app


class TestCorsStartupGuardProduction(unittest.TestCase):
    """Settings validation must block dangerous CORS configs at startup."""

    def test_wildcard_in_allowed_origins_raises_in_production(self):
        env = {**_PROD_SECRETS, "ALLOWED_ORIGINS": "*"}
        _assert_cors_guard_raised(self, env, "ALLOWED_ORIGINS")

    def test_wildcard_among_origins_raises_in_production(self):
        env = {**_PROD_SECRETS, "ALLOWED_ORIGINS": "https://app.example.com,*"}
        _assert_cors_guard_raised(self, env, "ALLOWED_ORIGINS")

    def test_empty_allowed_origins_raises_in_production(self):
        env = {**_PROD_SECRETS, "ALLOWED_ORIGINS": ""}
        _assert_cors_guard_raised(self, env, "ALLOWED_ORIGINS")

    def test_whitespace_only_allowed_origins_raises_in_production(self):
        env = {**_PROD_SECRETS, "ALLOWED_ORIGINS": "   "}
        _assert_cors_guard_raised(self, env, "ALLOWED_ORIGINS")

    def test_absent_allowed_origins_raises_in_production(self):
        # ALLOWED_ORIGINS key is entirely absent from the environment — must
        # still fail because the default falls back to "" which is disallowed.
        env = {k: v for k, v in _PROD_SECRETS.items() if k != "ALLOWED_ORIGINS"}
        _assert_cors_guard_raised(self, env, "ALLOWED_ORIGINS")

    def test_valid_origins_accepted_in_production(self):
        env = {
            **_PROD_SECRETS,
            "ALLOWED_ORIGINS": "https://app.officerepo.io,https://www.officerepo.io",
        }
        s = _make_settings(env)
        self.assertEqual(s.ENVIRONMENT, "production")
        self.assertIn("https://app.officerepo.io", s.ALLOWED_ORIGINS)


class TestCorsStartupGuardDevelopment(unittest.TestCase):
    """In development, wildcard is allowed and ALLOWED_ORIGINS may be empty."""

    def test_no_error_when_allowed_origins_empty_in_development(self):
        env = {**_DEV_BASE_ENV, "ALLOWED_ORIGINS": ""}
        s = _make_settings(env)
        self.assertEqual(s.ENVIRONMENT, "development")

    def test_no_error_when_allowed_origins_absent_in_development(self):
        env = {**_DEV_BASE_ENV}
        s = _make_settings(env)
        self.assertEqual(s.ENVIRONMENT, "development")


class TestCorsRequestBehaviour(unittest.TestCase):
    """CORSMiddleware must reflect only listed origins, block everything else."""

    ALLOWED = "https://app.officerepo.io"
    OTHER = "https://evil.example.com"

    def setUp(self):
        app = _build_cors_app([self.ALLOWED])
        self.client = TestClient(app, raise_server_exceptions=True)

    # ── preflight (OPTIONS) ────────────────────────────────────────────────

    def test_preflight_allowed_origin_returns_acao_header(self):
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": self.ALLOWED,
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight from listed origin must include Access-Control-Allow-Origin",
        )
        self.assertEqual(resp.headers["access-control-allow-origin"], self.ALLOWED)

    def test_preflight_unlisted_origin_is_rejected(self):
        # Starlette's CORSMiddleware returns 400 "Disallowed CORS origin" for
        # preflight requests that come from an origin not in the allow-list.
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": self.OTHER,
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(
            resp.status_code,
            400,
            f"Preflight from unlisted origin must be rejected with 400, got {resp.status_code}",
        )
        self.assertIn(
            "Disallowed CORS origin",
            resp.text,
            "Preflight rejection body must identify the cause",
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Rejected preflight must NOT include Access-Control-Allow-Origin",
        )

    # ── simple (GET) ───────────────────────────────────────────────────────

    def test_simple_request_allowed_origin_returns_acao_header(self):
        resp = self.client.get("/ping", headers={"Origin": self.ALLOWED})
        self.assertIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request from listed origin must include Access-Control-Allow-Origin",
        )
        self.assertEqual(resp.headers["access-control-allow-origin"], self.ALLOWED)

    def test_simple_request_unlisted_origin_has_no_acao_header(self):
        resp = self.client.get("/ping", headers={"Origin": self.OTHER})
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request from unlisted origin must NOT include Access-Control-Allow-Origin",
        )

    def test_simple_request_no_origin_header_has_no_acao_header(self):
        resp = self.client.get("/ping")
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Request with no Origin header must not include Access-Control-Allow-Origin",
        )


class TestCorsWildcardDevelopmentOnly(unittest.TestCase):
    """Wildcard is safe in development; all origins should be reflected."""

    def test_wildcard_app_allows_any_origin(self):
        app = _build_cors_app(["*"])
        client = TestClient(app)
        resp = client.get("/ping", headers={"Origin": "https://anywhere.example.com"})
        acao = resp.headers.get("access-control-allow-origin")
        self.assertIsNotNone(acao, "Wildcard app must set Access-Control-Allow-Origin")
        self.assertIn(
            acao,
            ("*", "https://anywhere.example.com"),
            f"Unexpected Access-Control-Allow-Origin value: {acao}",
        )


class TestCorsMainAppWiring(unittest.TestCase):
    """Verify that main.py's origin-derivation logic wires the middleware correctly.

    backend/main.py cannot be imported directly in this test runner because it
    uses `from backend.app.*` absolute imports (designed for the workspace root)
    and triggers DB/seeding side-effects at import time.  Instead, these tests
    replicate the exact derivation logic from main.py:

        _is_restricted = settings.ENVIRONMENT.lower() != "development"
        if _is_restricted:
            _cors_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
        else:
            _cors_origins = ["*"]

    ensuring that whatever Settings produces is handled the same way the app
    will handle it in production.
    """

    @staticmethod
    def _derive_origins(settings_obj) -> list[str]:
        """Mirror the origin-derivation logic from backend/main.py."""
        is_restricted = settings_obj.ENVIRONMENT.lower() != "development"
        if is_restricted:
            return [o.strip() for o in settings_obj.ALLOWED_ORIGINS.split(",") if o.strip()]
        return ["*"]

    def _client_from_env(self, env: dict) -> TestClient:
        s = _make_settings(env)
        origins = self._derive_origins(s)
        app = _build_cors_app(origins)
        return TestClient(app)

    def test_production_listed_origin_is_allowed(self):
        env = {
            **_PROD_SECRETS,
            "ALLOWED_ORIGINS": "https://app.officerepo.io",
        }
        client = self._client_from_env(env)
        resp = client.get("/ping", headers={"Origin": "https://app.officerepo.io"})
        self.assertEqual(
            resp.headers.get("access-control-allow-origin"),
            "https://app.officerepo.io",
            "Listed origin must be reflected in production",
        )

    def test_production_unlisted_origin_is_blocked(self):
        env = {
            **_PROD_SECRETS,
            "ALLOWED_ORIGINS": "https://app.officerepo.io",
        }
        client = self._client_from_env(env)
        resp = client.options(
            "/ping",
            headers={
                "Origin": "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(
            resp.status_code,
            400,
            "Unlisted origin preflight must be rejected with 400 in production",
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Unlisted origin must not receive Access-Control-Allow-Origin in production",
        )

    def test_development_wildcard_allows_any_origin(self):
        env = {**_DEV_BASE_ENV}
        client = self._client_from_env(env)
        resp = client.get("/ping", headers={"Origin": "https://anywhere.example.com"})
        acao = resp.headers.get("access-control-allow-origin")
        self.assertIsNotNone(acao, "Development mode must set Access-Control-Allow-Origin")
        self.assertIn(
            acao,
            ("*", "https://anywhere.example.com"),
            f"Unexpected Access-Control-Allow-Origin in development: {acao}",
        )

    def test_production_multiple_origins_only_matching_reflected(self):
        env = {
            **_PROD_SECRETS,
            "ALLOWED_ORIGINS": "https://app.officerepo.io,https://www.officerepo.io",
        }
        client = self._client_from_env(env)

        resp_allowed = client.get(
            "/ping", headers={"Origin": "https://www.officerepo.io"}
        )
        self.assertEqual(
            resp_allowed.headers.get("access-control-allow-origin"),
            "https://www.officerepo.io",
        )

        resp_blocked = client.get(
            "/ping", headers={"Origin": "https://evil.example.com"}
        )
        self.assertNotIn("access-control-allow-origin", resp_blocked.headers)


if __name__ == "__main__":
    unittest.main()
