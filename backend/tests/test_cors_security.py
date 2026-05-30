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
# CORS constants — imported from the single source of truth
# (backend/app/core/cors.py) so the app and tests can never drift apart.
# ---------------------------------------------------------------------------
from app.core.cors import (
    CORS_ALLOW_METHODS as _CORS_ALLOW_METHODS,
    CORS_ALLOW_HEADERS as _CORS_ALLOW_HEADERS,
    OFFICEREPO_ORIGIN_REGEX,
    build_cors_kwargs,
)

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


class TestCorsOfficerepoSubdomain(unittest.TestCase):
    """officerepo.com and its subdomains must be allowed in restricted envs.

    Builds the app exactly the way main.py does — via build_cors_kwargs — so
    the subdomain regex behaviour is verified against the real policy.
    """

    LISTED = "https://app.officerepo.io"  # explicit exact-match entry

    def _prod_client(self, allowed_origins: str = LISTED) -> TestClient:
        kwargs = build_cors_kwargs("production", allowed_origins)
        app = FastAPI()
        app.add_middleware(CORSMiddleware, **kwargs)

        @app.get("/ping")
        def ping():
            return {"ok": True}

        return TestClient(app)

    def _acao(self, origin: str, allowed_origins: str = LISTED):
        client = self._prod_client(allowed_origins)
        resp = client.get("/ping", headers={"Origin": origin})
        return resp.headers.get("access-control-allow-origin")

    # ── allowed: apex + subdomains over https ──────────────────────────────

    def test_apex_domain_is_allowed(self):
        self.assertEqual(self._acao("https://officerepo.com"), "https://officerepo.com")

    def test_single_subdomain_is_allowed(self):
        self.assertEqual(
            self._acao("https://app.officerepo.com"), "https://app.officerepo.com"
        )

    def test_tenant_subdomain_is_allowed(self):
        self.assertEqual(
            self._acao("https://acme.officerepo.com"), "https://acme.officerepo.com"
        )

    def test_deep_subdomain_is_allowed(self):
        self.assertEqual(
            self._acao("https://a.b.officerepo.com"), "https://a.b.officerepo.com"
        )

    def test_explicit_listed_origin_still_allowed_alongside_regex(self):
        self.assertEqual(self._acao(self.LISTED), self.LISTED)

    # ── rejected: lookalikes, suffix attacks, wrong scheme, others ─────────

    def test_unrelated_origin_is_rejected(self):
        self.assertIsNone(self._acao("https://evil.example.com"))

    def test_lookalike_domain_is_rejected(self):
        # "evilofficerepo.com" is NOT a subdomain of officerepo.com.
        self.assertIsNone(self._acao("https://evilofficerepo.com"))

    def test_suffix_attack_domain_is_rejected(self):
        # "officerepo.com.evil.com" must not match.
        self.assertIsNone(self._acao("https://officerepo.com.evil.com"))

    def test_non_https_subdomain_is_rejected(self):
        self.assertIsNone(self._acao("http://app.officerepo.com"))

    # ── policy wiring sanity ───────────────────────────────────────────────

    def test_regex_present_in_restricted_kwargs(self):
        kwargs = build_cors_kwargs("production", self.LISTED)
        self.assertEqual(kwargs.get("allow_origin_regex"), OFFICEREPO_ORIGIN_REGEX)

    def test_regex_absent_in_development_kwargs(self):
        kwargs = build_cors_kwargs("development", "")
        self.assertNotIn("allow_origin_regex", kwargs)
        self.assertEqual(kwargs["allow_origins"], ["*"])


import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

from app.core.cors import is_origin_allowed, mask_origin, MAX_LOGGED_ORIGIN_LEN
from app.core import cors_monitor
from app.core.cors_monitor import (
    make_cors_rejection_logger,
    handle_cors_rejection,
    _should_alert,
)

_MONITOR_LOGGER = "app.core.cors_monitor"


def _monitor_settings(
    *,
    environment: str = "production",
    allowed_origins: str = "https://app.officerepo.io",
    alert_url: str = "",
    severity: str = "",
    env_tag: str = "",
    cooldown_minutes: int = 60,
) -> SimpleNamespace:
    """Build a minimal settings-like object for the CORS monitor."""
    return SimpleNamespace(
        ENVIRONMENT=environment,
        ALLOWED_ORIGINS=allowed_origins,
        CORS_REJECTION_ALERT_URL=alert_url,
        CORS_REJECTION_ALERT_SEVERITY=severity,
        CORS_REJECTION_ALERT_ENV_TAG=env_tag,
        CORS_REJECTION_ALERT_COOLDOWN_MINUTES=cooldown_minutes,
    )


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


class TestIsOriginAllowed(unittest.TestCase):
    """The origin-matching helper must mirror the running CORS policy."""

    ALLOWED = "https://app.officerepo.io"

    def test_development_allows_any_origin(self):
        self.assertTrue(is_origin_allowed("https://anything.example.com", "development", ""))

    def test_no_origin_is_treated_as_allowed(self):
        self.assertTrue(is_origin_allowed("", "production", self.ALLOWED))
        self.assertTrue(is_origin_allowed(None, "production", self.ALLOWED))

    def test_listed_origin_is_allowed_in_production(self):
        self.assertTrue(is_origin_allowed(self.ALLOWED, "production", self.ALLOWED))

    def test_officerepo_subdomain_allowed_via_regex(self):
        self.assertTrue(is_origin_allowed("https://tenant.officerepo.com", "production", self.ALLOWED))

    def test_unlisted_origin_is_rejected_in_production(self):
        self.assertFalse(is_origin_allowed("https://evil.example.com", "production", self.ALLOWED))

    def test_suffix_attack_origin_is_rejected(self):
        self.assertFalse(is_origin_allowed("https://officerepo.com.evil.com", "production", self.ALLOWED))

    def test_non_https_subdomain_is_rejected(self):
        self.assertFalse(is_origin_allowed("http://app.officerepo.com", "production", self.ALLOWED))


class TestMaskOrigin(unittest.TestCase):
    """mask_origin must bound and sanitise the attacker-controlled Origin."""

    def test_none_becomes_placeholder(self):
        self.assertEqual(mask_origin(None), "<none>")
        self.assertEqual(mask_origin(""), "<none>")

    def test_short_origin_passes_through_trimmed(self):
        self.assertEqual(mask_origin("  https://app.officerepo.io  "), "https://app.officerepo.io")

    def test_long_origin_is_truncated(self):
        long_origin = "https://" + ("a" * 500) + ".example.com"
        masked = mask_origin(long_origin)
        self.assertTrue(masked.endswith("...(truncated)"))
        self.assertLessEqual(len(masked), MAX_LOGGED_ORIGIN_LEN + len("...(truncated)"))


class TestCorsRejectionMiddleware(unittest.TestCase):
    """The middleware logs rejected origins and stays silent for allowed ones."""

    ALLOWED = "https://app.officerepo.io"
    BLOCKED = "https://evil.example.com"

    def setUp(self):
        cors_monitor._last_alert_at.clear()

    def _client(self, settings) -> TestClient:
        app = FastAPI()
        app.middleware("http")(make_cors_rejection_logger(settings))

        @app.get("/ping")
        def ping():
            return {"ok": True}

        return TestClient(app)

    def test_blocked_origin_produces_log_entry(self):
        settings = _monitor_settings()
        client = self._client(settings)
        with self.assertLogs(_MONITOR_LOGGER, level="WARNING") as cm:
            client.get("/ping", headers={"Origin": self.BLOCKED})
        log_text = " ".join(cm.output)
        self.assertIn("blocked cross-origin request", log_text)
        self.assertIn(self.BLOCKED, log_text)

    def test_allowed_origin_produces_no_log(self):
        settings = _monitor_settings()
        client = self._client(settings)
        with self.assertNoLogs(_MONITOR_LOGGER, level="WARNING"):
            client.get("/ping", headers={"Origin": self.ALLOWED})

    def test_no_origin_header_produces_no_log(self):
        settings = _monitor_settings()
        client = self._client(settings)
        with self.assertNoLogs(_MONITOR_LOGGER, level="WARNING"):
            client.get("/ping")

    def test_development_never_logs(self):
        settings = _monitor_settings(environment="development", allowed_origins="")
        client = self._client(settings)
        with self.assertNoLogs(_MONITOR_LOGGER, level="WARNING"):
            client.get("/ping", headers={"Origin": self.BLOCKED})

    def test_officerepo_subdomain_not_logged(self):
        settings = _monitor_settings()
        client = self._client(settings)
        with self.assertNoLogs(_MONITOR_LOGGER, level="WARNING"):
            client.get("/ping", headers={"Origin": "https://tenant.officerepo.com"})


class TestCorsRejectionAlerting(unittest.TestCase):
    """handle_cors_rejection fires the optional webhook reusing the alert pattern."""

    BLOCKED = "https://evil.example.com"

    def setUp(self):
        cors_monitor._last_alert_at.clear()

    @staticmethod
    def _mock_client(status_code: int = 200):
        mock_response = MagicMock()
        mock_response.status_code = status_code
        instance = AsyncMock()
        instance.post = AsyncMock(return_value=mock_response)
        instance.__aenter__ = AsyncMock(return_value=instance)
        instance.__aexit__ = AsyncMock(return_value=False)
        return instance

    def test_no_webhook_when_url_blank(self):
        settings = _monitor_settings(alert_url="")
        with patch("app.core.cors_monitor.httpx.AsyncClient") as mock_client:
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
        mock_client.assert_not_called()

    def test_no_webhook_when_url_whitespace_only(self):
        settings = _monitor_settings(alert_url="   ")
        with patch("app.core.cors_monitor.httpx.AsyncClient") as mock_client:
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
        mock_client.assert_not_called()

    def test_webhook_posted_when_url_set(self):
        alert_url = "https://hooks.example.com/cors-alert"
        settings = _monitor_settings(alert_url=alert_url)
        instance = self._mock_client()
        with patch("app.core.cors_monitor.httpx.AsyncClient", return_value=instance):
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
        instance.post.assert_awaited_once()
        self.assertEqual(instance.post.call_args[0][0], alert_url)

    def test_webhook_payload_structure_and_values(self):
        settings = _monitor_settings(alert_url="https://hooks.example.com/cors-alert")
        instance = self._mock_client()
        with patch("app.core.cors_monitor.httpx.AsyncClient", return_value=instance):
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "POST", "/api/v1/x", settings))
        payload = instance.post.call_args[1]["json"]
        for key in ("alert", "message", "severity", "environment", "origin", "method", "path", "detected_at"):
            self.assertIn(key, payload)
        self.assertEqual(payload["alert"], "cors_origin_rejected")
        self.assertEqual(payload["origin"], self.BLOCKED)
        self.assertEqual(payload["method"], "POST")
        self.assertEqual(payload["path"], "/api/v1/x")
        self.assertEqual(payload["severity"], "warning")  # default
        self.assertEqual(payload["environment"], "production")  # falls back to ENVIRONMENT
        datetime.fromisoformat(payload["detected_at"])  # valid ISO-8601

    def test_custom_severity_and_env_tag_used(self):
        settings = _monitor_settings(
            alert_url="https://hooks.example.com/cors-alert",
            severity="critical",
            env_tag="staging",
        )
        instance = self._mock_client()
        with patch("app.core.cors_monitor.httpx.AsyncClient", return_value=instance):
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
        payload = instance.post.call_args[1]["json"]
        self.assertEqual(payload["severity"], "critical")
        self.assertEqual(payload["environment"], "staging")

    def test_repeated_origin_is_throttled(self):
        settings = _monitor_settings(
            alert_url="https://hooks.example.com/cors-alert", cooldown_minutes=60
        )
        instance = self._mock_client()
        with patch("app.core.cors_monitor.httpx.AsyncClient", return_value=instance):
            with self.assertLogs(_MONITOR_LOGGER, level="WARNING"):
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
                _run(handle_cors_rejection(self.BLOCKED, "GET", "/ping", settings))
        # Two log lines, but only one webhook POST due to per-origin cooldown.
        instance.post.assert_awaited_once()

    def test_cooldown_zero_disables_throttle(self):
        from datetime import datetime as _dt, timezone as _tz
        cors_monitor._last_alert_at.clear()
        now = _dt.now(tz=_tz.utc)
        self.assertTrue(_should_alert("https://a.example.com", 0, now=now))
        self.assertTrue(_should_alert("https://a.example.com", 0, now=now))


# ---------------------------------------------------------------------------
# Integration test — the wired stack with a REAL webhook receiver.
#
# The class-based tests above either (a) drive CORSMiddleware in isolation or
# (b) drive the cors_monitor middleware with httpx mocked out. This integration
# test closes the gap to the actual wired stack by booting an app assembled
# exactly the way backend/main.py assembles it — CORSMiddleware (via the shared
# build_cors_kwargs), the security-headers middleware, and the cors-rejection
# monitor (via make_cors_rejection_logger), in the same order — driven by a real
# production Settings object, and pointed at a real local HTTP webhook receiver
# (no httpx mocking). A disallowed Origin must produce BOTH the WARNING server
# log AND an actual webhook POST whose JSON body carries the expected payload;
# an allowed Origin must produce neither.
#
# backend/main.py itself is not imported (its `from backend.app.*` absolute
# imports plus DB create_all / migrations / seeding side-effects at import time
# make it unsuitable for this runner — see TestCorsMainAppWiring), so the wiring
# is reproduced here using the very same shared helpers main.py calls.
# ---------------------------------------------------------------------------

import json as _json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from app.core.cors import build_cors_kwargs as _build_cors_kwargs
from app.core.cors_monitor import make_cors_rejection_logger as _make_logger
from app.core.security_headers import add_security_headers as _add_security_headers


class _StubWebhookReceiver:
    """A throwaway local HTTP server that records every POST it receives.

    Used as the CORS_REJECTION_ALERT_URL target so the integration test can
    assert against a *real* webhook delivery instead of a mocked httpx client.
    """

    def __init__(self):
        self.received = []
        self._server = None
        self._thread = None
        self.port = None

    def start(self):
        received = self.received

        class _Handler(BaseHTTPRequestHandler):
            def do_POST(self):  # noqa: N802 (BaseHTTPRequestHandler API)
                length = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(length) if length else b""
                try:
                    payload = _json.loads(raw.decode("utf-8"))
                except Exception:
                    payload = None
                received.append({"path": self.path, "payload": payload})
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ok": true}')

            def log_message(self, *args, **kwargs):  # silence stderr noise
                pass

        self._server = HTTPServer(("127.0.0.1", 0), _Handler)
        self.port = self._server.server_address[1]
        self._thread = threading.Thread(
            target=self._server.serve_forever, daemon=True
        )
        self._thread.start()
        return self

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/cors-alert"

    def stop(self):
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
        if self._thread is not None:
            self._thread.join(timeout=5)


class TestCorsRejectionWiredStackIntegration(unittest.TestCase):
    """Boot the wired stack in production mode and verify real webhook delivery."""

    ALLOWED = "https://app.officerepo.io"
    BLOCKED = "https://evil.example.com"

    def setUp(self):
        cors_monitor._last_alert_at.clear()
        self.receiver = _StubWebhookReceiver().start()
        # A real production Settings object — restricted CORS, alert URL set,
        # throttle disabled so each request that should alert actually does.
        self.settings = _make_settings(
            {
                **_PROD_SECRETS,
                "ALLOWED_ORIGINS": self.ALLOWED,
                "CORS_REJECTION_ALERT_URL": self.receiver.url,
                "CORS_REJECTION_ALERT_COOLDOWN_MINUTES": "0",
            }
        )
        self.client = TestClient(self._build_wired_app(self.settings))

    def tearDown(self):
        self.receiver.stop()
        cors_monitor._last_alert_at.clear()

    @staticmethod
    def _build_wired_app(settings_obj) -> FastAPI:
        """Assemble the app exactly as backend/main.py does (same order)."""
        app = FastAPI()
        app.add_middleware(
            CORSMiddleware,
            **_build_cors_kwargs(
                settings_obj.ENVIRONMENT, settings_obj.ALLOWED_ORIGINS
            ),
        )
        app.middleware("http")(_add_security_headers)
        app.middleware("http")(_make_logger(settings_obj))

        @app.get("/ping")
        def ping():
            return {"ok": True}

        return app

    def test_blocked_origin_logs_and_delivers_real_webhook(self):
        with self.assertLogs(_MONITOR_LOGGER, level="WARNING") as cm:
            resp = self.client.get("/ping", headers={"Origin": self.BLOCKED})

        # The request itself still succeeds — the monitor never blocks traffic.
        self.assertEqual(resp.status_code, 200)
        # CORSMiddleware refuses to reflect the disallowed origin.
        self.assertNotIn("access-control-allow-origin", resp.headers)

        # 1) WARNING server log line names the blocked origin.
        log_text = " ".join(cm.output)
        self.assertIn("blocked cross-origin request", log_text)
        self.assertIn(self.BLOCKED, log_text)

        # 2) A real webhook POST landed at the stub receiver with the right body.
        self.assertEqual(
            len(self.receiver.received),
            1,
            f"Expected exactly one webhook POST, got {self.receiver.received}",
        )
        delivery = self.receiver.received[0]
        self.assertEqual(delivery["path"], "/cors-alert")
        payload = delivery["payload"]
        self.assertIsInstance(payload, dict)
        for key in (
            "alert", "message", "severity", "environment",
            "origin", "method", "path", "detected_at",
        ):
            self.assertIn(key, payload)
        self.assertEqual(payload["alert"], "cors_origin_rejected")
        self.assertEqual(payload["origin"], self.BLOCKED)
        self.assertEqual(payload["method"], "GET")
        self.assertEqual(payload["path"], "/ping")
        self.assertEqual(payload["severity"], "warning")  # default
        self.assertEqual(payload["environment"], "production")  # from ENVIRONMENT
        datetime.fromisoformat(payload["detected_at"])  # valid ISO-8601

    def test_allowed_origin_neither_logs_nor_delivers_webhook(self):
        with self.assertNoLogs(_MONITOR_LOGGER, level="WARNING"):
            resp = self.client.get("/ping", headers={"Origin": self.ALLOWED})

        self.assertEqual(resp.status_code, 200)
        # Allowed origin IS reflected by CORSMiddleware.
        self.assertEqual(
            resp.headers.get("access-control-allow-origin"), self.ALLOWED
        )
        # No webhook delivery for an allowed origin.
        self.assertEqual(
            self.receiver.received,
            [],
            f"Allowed origin must not trigger a webhook, got {self.receiver.received}",
        )


if __name__ == "__main__":
    unittest.main()
