"""
Tests for Content-Security-Policy header.

All assertions are made against the real constants exported by
backend/app/core/security_headers.py — the same module that main.py uses —
so any drift between the running application and the tests is impossible.

Verifies that:
  - The CSP_POLICY constant contains all required directives.
  - A FastAPI app wired with the real add_security_headers middleware returns
    the Content-Security-Policy header on every non-exempt response.
  - The header value exactly matches the exported CSP_POLICY constant.
  - Exempt paths (/docs, /redoc, /openapi.json) do NOT receive the CSP header.
  - 404 responses also carry the header.
"""
import os
import sys
import unittest

from fastapi import FastAPI
from fastapi.testclient import TestClient

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.core.security_headers import (  # noqa: E402
    CSP_POLICY,
    CSP_EXEMPT_PATHS,
    add_security_headers,
)

_REQUIRED_DIRECTIVES: list[str] = [
    "default-src",
    "script-src",
    "style-src",
    "img-src",
    "connect-src",
    "object-src 'none'",
]


def _build_csp_app() -> FastAPI:
    """Return a minimal FastAPI app with the real add_security_headers middleware."""
    app = FastAPI()
    app.middleware("http")(add_security_headers)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/v1/ping")
    def ping():
        return {"ok": True}

    @app.post("/api/v1/data")
    def post_data():
        return {"created": True}

    return app


class TestCspPolicyConstant(unittest.TestCase):
    """The exported CSP_POLICY string must contain all required directives."""

    def test_required_directives_present_in_policy_constant(self):
        for directive in _REQUIRED_DIRECTIVES:
            with self.subTest(directive=directive):
                self.assertIn(
                    directive,
                    CSP_POLICY,
                    f"CSP_POLICY must contain '{directive}', got: {CSP_POLICY}",
                )

    def test_object_src_is_none(self):
        self.assertIn(
            "object-src 'none'",
            CSP_POLICY,
            "object-src must be set to 'none' to block plugin execution",
        )

    def test_default_src_is_self(self):
        self.assertIn(
            "default-src 'self'",
            CSP_POLICY,
            "default-src must be 'self' to restrict resource loading",
        )


class TestCspExemptPathsConstant(unittest.TestCase):
    """CSP_EXEMPT_PATHS must contain the three documentation paths."""

    def test_docs_is_exempt(self):
        self.assertIn("/docs", CSP_EXEMPT_PATHS)

    def test_redoc_is_exempt(self):
        self.assertIn("/redoc", CSP_EXEMPT_PATHS)

    def test_openapi_json_is_exempt(self):
        self.assertIn("/openapi.json", CSP_EXEMPT_PATHS)

    def test_health_is_not_exempt(self):
        self.assertNotIn("/health", CSP_EXEMPT_PATHS)

    def test_api_paths_are_not_exempt(self):
        self.assertNotIn("/api/v1/ping", CSP_EXEMPT_PATHS)


class TestCspHeaderOnResponses(unittest.TestCase):
    """Every non-exempt endpoint must return the Content-Security-Policy header."""

    def setUp(self):
        self.client = TestClient(_build_csp_app(), raise_server_exceptions=True)

    def test_health_endpoint_has_csp_header(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        self.assertIn(
            "content-security-policy",
            resp.headers,
            "GET /health must include a Content-Security-Policy header",
        )

    def test_api_get_endpoint_has_csp_header(self):
        resp = self.client.get("/api/v1/ping")
        self.assertIn(
            "content-security-policy",
            resp.headers,
            "GET /api/v1/ping must include a Content-Security-Policy header",
        )

    def test_api_post_endpoint_has_csp_header(self):
        resp = self.client.post("/api/v1/data")
        self.assertIn(
            "content-security-policy",
            resp.headers,
            "POST /api/v1/data must include a Content-Security-Policy header",
        )

    def test_csp_header_value_matches_exported_constant(self):
        resp = self.client.get("/health")
        csp = resp.headers.get("content-security-policy", "")
        self.assertEqual(
            csp,
            CSP_POLICY,
            f"CSP header value does not match the exported CSP_POLICY constant.\n"
            f"Got:      {csp}\nExpected: {CSP_POLICY}",
        )


class TestCspHeaderDirectiveContent(unittest.TestCase):
    """The CSP header value in responses must contain all required directives."""

    def setUp(self):
        client = TestClient(_build_csp_app(), raise_server_exceptions=True)
        resp = client.get("/health")
        self.csp = resp.headers.get("content-security-policy", "")

    def test_default_src_directive_present(self):
        self.assertIn(
            "default-src",
            self.csp,
            f"CSP header must contain 'default-src', got: {self.csp}",
        )

    def test_script_src_directive_present(self):
        self.assertIn(
            "script-src",
            self.csp,
            f"CSP header must contain 'script-src', got: {self.csp}",
        )

    def test_style_src_directive_present(self):
        self.assertIn(
            "style-src",
            self.csp,
            f"CSP header must contain 'style-src', got: {self.csp}",
        )

    def test_img_src_directive_present(self):
        self.assertIn(
            "img-src",
            self.csp,
            f"CSP header must contain 'img-src', got: {self.csp}",
        )

    def test_connect_src_directive_present(self):
        self.assertIn(
            "connect-src",
            self.csp,
            f"CSP header must contain 'connect-src', got: {self.csp}",
        )

    def test_object_src_none_directive_present(self):
        self.assertIn(
            "object-src 'none'",
            self.csp,
            f"CSP header must contain \"object-src 'none'\", got: {self.csp}",
        )

    def test_all_required_directives_present(self):
        for directive in _REQUIRED_DIRECTIVES:
            with self.subTest(directive=directive):
                self.assertIn(
                    directive,
                    self.csp,
                    f"CSP header must contain '{directive}', got: {self.csp}",
                )


class TestCspExemptPaths(unittest.TestCase):
    """Exempt paths must NOT receive the CSP header; all other paths must."""

    def setUp(self):
        self.client = TestClient(_build_csp_app(), raise_server_exceptions=True)

    def test_docs_path_is_exempt_from_csp(self):
        resp = self.client.get("/docs", follow_redirects=True)
        self.assertNotIn(
            "content-security-policy",
            resp.headers,
            "/docs must be exempt from the Content-Security-Policy header",
        )

    def test_redoc_path_is_exempt_from_csp(self):
        resp = self.client.get("/redoc", follow_redirects=True)
        self.assertNotIn(
            "content-security-policy",
            resp.headers,
            "/redoc must be exempt from the Content-Security-Policy header",
        )

    def test_openapi_json_path_is_exempt_from_csp(self):
        resp = self.client.get("/openapi.json")
        self.assertNotIn(
            "content-security-policy",
            resp.headers,
            "/openapi.json must be exempt from the Content-Security-Policy header",
        )

    def test_health_path_is_not_exempt(self):
        resp = self.client.get("/health")
        self.assertIn(
            "content-security-policy",
            resp.headers,
            "/health is not an exempt path and must include Content-Security-Policy",
        )


class TestCspNotFoundResponse(unittest.TestCase):
    """CSP header must also be present on 404 responses (unknown routes)."""

    def setUp(self):
        self.client = TestClient(_build_csp_app(), raise_server_exceptions=True)

    def test_404_response_has_csp_header(self):
        resp = self.client.get("/this/path/does/not/exist")
        self.assertEqual(resp.status_code, 404)
        self.assertIn(
            "content-security-policy",
            resp.headers,
            "404 responses must also include the Content-Security-Policy header",
        )


if __name__ == "__main__":
    unittest.main()
