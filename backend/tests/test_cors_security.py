"""
Tests for CORS security configuration.

Verifies that:
  - Wildcard ('*') is rejected in production mode (startup guard).
  - A missing/empty ALLOWED_ORIGINS raises an error at startup in production.
  - Requests from origins not listed in ALLOWED_ORIGINS are rejected (no
    Access-Control-Allow-Origin header returned).
  - Requests from a listed origin are accepted (header present and correct).
  - Wildcard is permitted in development (no error raised).
  - Only the explicitly listed HTTP methods are accepted in preflight requests.
  - Only the explicitly listed request headers are accepted in preflight requests.
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

# ---------------------------------------------------------------------------
# CORS constants — kept in sync with backend/main.py CORSMiddleware config.
# If you change allow_methods or allow_headers in main.py, update these too.
# ---------------------------------------------------------------------------
_CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "PATCH", "DELETE"]
_CORS_ALLOW_HEADERS: list[str] = ["Authorization", "Content-Type", "X-Tenant-ID"]

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
    """Return a minimal FastAPI app with CORSMiddleware using *allowed_origins*.

    The allow_methods and allow_headers values are taken from the shared
    constants above, which mirror backend/main.py's CORSMiddleware config.
    """
    test_app = FastAPI()
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=_CORS_ALLOW_METHODS,
        allow_headers=_CORS_ALLOW_HEADERS,
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


class TestCorsAllowedMethods(unittest.TestCase):
    """Preflight requests must only succeed for the explicitly listed HTTP methods.

    ALLOWED_METHODS references _CORS_ALLOW_METHODS so this class stays in sync
    with _build_cors_app (and therefore main.py's CORSMiddleware config).
    """

    ALLOWED = "https://app.officerepo.io"
    ALLOWED_METHODS = _CORS_ALLOW_METHODS
    DISALLOWED_METHODS = ["PUT", "HEAD", "TRACE", "CONNECT"]

    def setUp(self):
        app = _build_cors_app([self.ALLOWED])
        self.client = TestClient(app, raise_server_exceptions=True)

    def _preflight(self, method: str):
        return self.client.options(
            "/ping",
            headers={
                "Origin": self.ALLOWED,
                "Access-Control-Request-Method": method,
            },
        )

    def test_allowed_methods_preflight_returns_200(self):
        for method in self.ALLOWED_METHODS:
            with self.subTest(method=method):
                resp = self._preflight(method)
                self.assertEqual(
                    resp.status_code,
                    200,
                    f"Preflight for allowed method {method} must return 200, got {resp.status_code}",
                )

    def test_allowed_methods_preflight_includes_acao_and_acam_headers(self):
        for method in self.ALLOWED_METHODS:
            with self.subTest(method=method):
                resp = self._preflight(method)
                self.assertIn(
                    "access-control-allow-origin",
                    resp.headers,
                    f"Preflight for allowed method {method} must include Access-Control-Allow-Origin",
                )
                self.assertEqual(resp.headers["access-control-allow-origin"], self.ALLOWED)
                acam = resp.headers.get("access-control-allow-methods", "")
                self.assertTrue(
                    len(acam) > 0,
                    f"Preflight for allowed method {method} must include Access-Control-Allow-Methods",
                )

    def test_disallowed_methods_preflight_returns_400_with_cause(self):
        for method in self.DISALLOWED_METHODS:
            with self.subTest(method=method):
                resp = self._preflight(method)
                self.assertEqual(
                    resp.status_code,
                    400,
                    f"Preflight for disallowed method {method} must return 400, got {resp.status_code}",
                )
                self.assertIn(
                    "Disallowed CORS",
                    resp.text,
                    f"Preflight rejection for {method} must identify the CORS cause in the body",
                )

    def test_disallowed_method_acam_header_excludes_the_rejected_method(self):
        resp = self._preflight("PUT")
        acam = resp.headers.get("access-control-allow-methods", "")
        for allowed in self.ALLOWED_METHODS:
            self.assertIn(allowed, acam)
        self.assertNotIn("PUT", acam)

    def test_options_method_not_in_explicit_allow_list_is_rejected(self):
        resp = self._preflight("OPTIONS")
        self.assertEqual(
            resp.status_code,
            400,
            "Preflight requesting OPTIONS method (not in allow_methods) must return 400",
        )


class TestCorsAllowedHeaders(unittest.TestCase):
    """Preflight requests must only succeed for the explicitly listed request headers.

    ALLOWED_HEADERS references _CORS_ALLOW_HEADERS so this class stays in sync
    with _build_cors_app (and therefore main.py's CORSMiddleware config).
    """

    ALLOWED = "https://app.officerepo.io"
    ALLOWED_HEADERS = _CORS_ALLOW_HEADERS
    DISALLOWED_HEADERS = ["X-Custom-Header", "X-API-Key", "X-Forwarded-For"]

    def setUp(self):
        app = _build_cors_app([self.ALLOWED])
        self.client = TestClient(app, raise_server_exceptions=True)

    def _preflight(self, header: str):
        return self.client.options(
            "/ping",
            headers={
                "Origin": self.ALLOWED,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": header,
            },
        )

    def test_allowed_headers_preflight_returns_200_with_correct_headers(self):
        for header in self.ALLOWED_HEADERS:
            with self.subTest(header=header):
                resp = self._preflight(header)
                self.assertEqual(
                    resp.status_code,
                    200,
                    f"Preflight for allowed header '{header}' must return 200, got {resp.status_code}",
                )
                self.assertIn(
                    "access-control-allow-origin",
                    resp.headers,
                    f"Preflight for allowed header '{header}' must include Access-Control-Allow-Origin",
                )
                self.assertEqual(resp.headers["access-control-allow-origin"], self.ALLOWED)
                acah = resp.headers.get("access-control-allow-headers", "")
                self.assertIn(
                    header.lower(),
                    acah.lower(),
                    f"Access-Control-Allow-Headers must include '{header}', got: {acah}",
                )

    def test_disallowed_headers_preflight_returns_400_with_cause(self):
        for header in self.DISALLOWED_HEADERS:
            with self.subTest(header=header):
                resp = self._preflight(header)
                self.assertEqual(
                    resp.status_code,
                    400,
                    f"Preflight for disallowed header '{header}' must return 400, got {resp.status_code}",
                )
                self.assertIn(
                    "Disallowed CORS",
                    resp.text,
                    f"Preflight rejection for header '{header}' must identify the CORS cause in the body",
                )

    def test_disallowed_header_acah_excludes_the_rejected_header(self):
        resp = self._preflight("X-Custom-Header")
        acah = resp.headers.get("access-control-allow-headers", "").lower()
        for allowed in self.ALLOWED_HEADERS:
            self.assertIn(allowed.lower(), acah)
        self.assertNotIn("x-custom-header", acah)

    def test_combined_allowed_headers_in_single_preflight(self):
        combined = ", ".join(self.ALLOWED_HEADERS)
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": self.ALLOWED,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": combined,
            },
        )
        self.assertEqual(
            resp.status_code,
            200,
            f"Preflight with all allowed headers combined must return 200, got {resp.status_code}",
        )
        self.assertIn(
            "access-control-allow-headers",
            resp.headers,
            "Combined allowed-header preflight must include Access-Control-Allow-Headers",
        )

    def test_mixed_allowed_and_disallowed_header_is_rejected(self):
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": self.ALLOWED,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization, X-Custom-Header",
            },
        )
        self.assertEqual(
            resp.status_code,
            400,
            f"Preflight mixing allowed and disallowed headers must return 400, got {resp.status_code}",
        )
        self.assertIn(
            "Disallowed CORS",
            resp.text,
            "Mixed allowed/disallowed header preflight must identify the CORS cause in the body",
        )


class TestCorsOriginEdgeCases(unittest.TestCase):
    """CORS middleware must handle malformed, unusual, and absent Origin headers safely.

    Edge cases tested:
      - null origin (sent by browsers for sandboxed iframes / data: URIs)
      - data: URI origin
      - file:// URI origin
      - Origins with leading/trailing whitespace
      - Origins that differ only in case (HTTPS://APP.OFFICEREPO.IO)
      - Preflight sent with no Origin header at all (invalid but possible)
    """

    ALLOWED = "https://app.officerepo.io"

    def setUp(self):
        app = _build_cors_app([self.ALLOWED])
        self.client = TestClient(app, raise_server_exceptions=True)

    # ── null / special scheme origins ─────────────────────────────────────

    def test_preflight_null_origin_is_rejected(self):
        """Browsers send Origin: null for sandboxed iframes — must be rejected."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": "null",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(
            resp.status_code,
            400,
            f"Preflight with Origin: null must be rejected with 400, got {resp.status_code}",
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Rejected null-origin preflight must NOT include Access-Control-Allow-Origin",
        )

    def test_simple_request_null_origin_has_no_acao_header(self):
        """Simple GET with Origin: null must not receive CORS headers."""
        resp = self.client.get("/ping", headers={"Origin": "null"})
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request with Origin: null must NOT include Access-Control-Allow-Origin",
        )

    def test_preflight_data_uri_origin_is_rejected(self):
        """data: URI is not a valid CORS origin — must be rejected."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": "data:",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with data: origin must NOT include Access-Control-Allow-Origin",
        )

    def test_simple_request_data_uri_origin_has_no_acao_header(self):
        resp = self.client.get("/ping", headers={"Origin": "data:"})
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request with data: origin must NOT include Access-Control-Allow-Origin",
        )

    def test_preflight_file_uri_origin_is_rejected(self):
        """file:// origin (local filesystem) is not a valid CORS origin."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": "file://",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with file:// origin must NOT include Access-Control-Allow-Origin",
        )

    def test_simple_request_file_uri_origin_has_no_acao_header(self):
        resp = self.client.get("/ping", headers={"Origin": "file://"})
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request with file:// origin must NOT include Access-Control-Allow-Origin",
        )

    # ── whitespace-padded origins ──────────────────────────────────────────

    def test_preflight_origin_with_leading_whitespace_is_rejected(self):
        """' https://app.officerepo.io' (leading space) must not match the listed origin."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": f" {self.ALLOWED}",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with leading-whitespace origin must NOT include Access-Control-Allow-Origin",
        )

    def test_preflight_origin_with_trailing_whitespace_is_rejected(self):
        """'https://app.officerepo.io ' (trailing space) must not match the listed origin."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": f"{self.ALLOWED} ",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with trailing-whitespace origin must NOT include Access-Control-Allow-Origin",
        )

    # ── case-sensitivity ───────────────────────────────────────────────────

    def test_preflight_uppercase_scheme_is_rejected(self):
        """HTTPS://app.officerepo.io differs in case — must NOT be accepted."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": "HTTPS://app.officerepo.io",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with upper-case scheme must NOT include Access-Control-Allow-Origin",
        )

    def test_preflight_mixed_case_host_is_rejected(self):
        """https://App.OfficereRepo.io differs in case — must NOT be accepted."""
        resp = self.client.options(
            "/ping",
            headers={
                "Origin": "https://App.OfficereRepo.io",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Preflight with mixed-case host must NOT include Access-Control-Allow-Origin",
        )

    def test_simple_request_mixed_case_host_has_no_acao_header(self):
        """Simple GET with https://APP.OFFICEREPO.IO must not receive CORS headers."""
        resp = self.client.get(
            "/ping", headers={"Origin": "https://APP.OFFICEREPO.IO"}
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "Simple request with upper-case host must NOT include Access-Control-Allow-Origin",
        )

    # ── missing Origin header ──────────────────────────────────────────────

    def test_preflight_without_origin_header_has_no_acao_header(self):
        """OPTIONS request with no Origin header is technically invalid.

        Starlette passes it through to the route handler rather than treating
        it as a CORS preflight, so no CORS response headers should be set.
        """
        resp = self.client.options(
            "/ping",
            headers={"Access-Control-Request-Method": "GET"},
        )
        self.assertNotIn(
            "access-control-allow-origin",
            resp.headers,
            "OPTIONS without Origin header must NOT include Access-Control-Allow-Origin",
        )

    def test_preflight_without_origin_does_not_set_vary_on_origin(self):
        """With no Origin present, Vary: Origin should not be set by CORS middleware."""
        resp = self.client.options(
            "/ping",
            headers={"Access-Control-Request-Method": "GET"},
        )
        vary = resp.headers.get("vary", "")
        self.assertNotIn(
            "origin",
            vary.lower(),
            "OPTIONS without Origin header must not add Origin to the Vary header",
        )


if __name__ == "__main__":
    unittest.main()
