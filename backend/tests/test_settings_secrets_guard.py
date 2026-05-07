"""
Tests for the startup secrets guard in backend/app/config/settings.py.

Verifies that:
  - RuntimeError (via pydantic ValidationError) is raised in production when
    JWT_SECRET or REFRESH_SECRET are absent.
  - A random secret is auto-generated in non-production when the env vars are
    absent, and the generated value is not the hardcoded sentinel string.
"""
import sys
import os
import importlib
import unittest
from unittest.mock import patch

from pydantic import ValidationError

# Ensure backend/ is first on sys.path so `app.config.settings` resolves to
# backend/app/config/settings.py rather than the root-level app/ package,
# regardless of which directory the test runner is launched from.
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Minimal env needed for production so the ALLOWED_ORIGINS check doesn't
# interfere with the secrets-specific assertions.
_PROD_BASE_ENV = {
    "ENVIRONMENT": "production",
    "ALLOWED_ORIGINS": "https://example.com",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test",
}

_DEV_BASE_ENV = {
    "ENVIRONMENT": "development",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/test",
}

_SENTINEL = "__unset__"


def _make_settings(env: dict):
    """Instantiate a fresh Settings object using the given env dict.

    The real environment is replaced entirely by *env* for the duration of
    the call, and the .env file is suppressed, so tests are deterministic
    regardless of the developer's local environment.
    """
    with patch.dict("os.environ", env, clear=True):
        # Import inside the patch so that if this is the first import,
        # the module-level `settings = Settings()` also runs under the
        # controlled environment.
        mod = importlib.import_module("app.config.settings")
        Settings = mod.Settings
        return Settings(_env_file=None)


def _assert_secret_guard_raised(test_case, env, expected_keyword):
    """Assert that instantiating Settings with *env* raises an error whose
    string representation mentions *expected_keyword* (e.g. 'JWT_SECRET').
    This ensures it's the secrets guard — not some other validator — that
    fires.
    """
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
            f"Expected '{expected_keyword}' in error message, got: {error_text}",
        )


class TestProductionSecretsGuard(unittest.TestCase):
    """In production, missing JWT_SECRET or REFRESH_SECRET must abort startup."""

    def test_raises_when_jwt_secret_missing_in_production(self):
        env = {**_PROD_BASE_ENV, "REFRESH_SECRET": "some-refresh-secret"}
        # JWT_SECRET intentionally absent — error must name the missing field
        _assert_secret_guard_raised(self, env, "JWT_SECRET")

    def test_raises_when_refresh_secret_missing_in_production(self):
        env = {**_PROD_BASE_ENV, "JWT_SECRET": "some-jwt-secret"}
        # REFRESH_SECRET intentionally absent — error must name the missing field
        _assert_secret_guard_raised(self, env, "REFRESH_SECRET")

    def test_raises_when_both_secrets_missing_in_production(self):
        env = {**_PROD_BASE_ENV}
        # Neither JWT_SECRET nor REFRESH_SECRET provided
        _assert_secret_guard_raised(self, env, "JWT_SECRET")

    def test_no_error_when_both_secrets_present_in_production(self):
        env = {
            **_PROD_BASE_ENV,
            "JWT_SECRET": "a-real-jwt-secret",
            "REFRESH_SECRET": "a-real-refresh-secret",
        }
        settings = _make_settings(env)
        self.assertEqual(settings.JWT_SECRET, "a-real-jwt-secret")
        self.assertEqual(settings.REFRESH_SECRET, "a-real-refresh-secret")


class TestDevelopmentSecretsFallback(unittest.TestCase):
    """In non-production, absent secrets are replaced with a random value."""

    def test_jwt_secret_is_random_when_missing_in_development(self):
        env = {**_DEV_BASE_ENV, "REFRESH_SECRET": "some-refresh-secret"}
        settings = _make_settings(env)
        self.assertNotEqual(settings.JWT_SECRET, _SENTINEL)
        self.assertTrue(
            len(settings.JWT_SECRET) > 0,
            "Generated JWT_SECRET must be non-empty",
        )

    def test_refresh_secret_is_random_when_missing_in_development(self):
        env = {**_DEV_BASE_ENV, "JWT_SECRET": "some-jwt-secret"}
        settings = _make_settings(env)
        self.assertNotEqual(settings.REFRESH_SECRET, _SENTINEL)
        self.assertTrue(
            len(settings.REFRESH_SECRET) > 0,
            "Generated REFRESH_SECRET must be non-empty",
        )

    def test_both_secrets_generated_when_absent_in_development(self):
        env = {**_DEV_BASE_ENV}
        settings = _make_settings(env)
        self.assertNotEqual(settings.JWT_SECRET, _SENTINEL)
        self.assertNotEqual(settings.REFRESH_SECRET, _SENTINEL)

    def test_generated_secrets_are_random_not_hardcoded(self):
        """Two separate instantiations should produce different random secrets."""
        env = {**_DEV_BASE_ENV}
        s1 = _make_settings(env)
        s2 = _make_settings(env)
        self.assertNotEqual(
            s1.JWT_SECRET,
            s2.JWT_SECRET,
            "Each startup should generate a unique JWT_SECRET",
        )
        self.assertNotEqual(
            s1.REFRESH_SECRET,
            s2.REFRESH_SECRET,
            "Each startup should generate a unique REFRESH_SECRET",
        )

    def test_explicit_secrets_are_preserved_in_development(self):
        env = {
            **_DEV_BASE_ENV,
            "JWT_SECRET": "explicit-jwt",
            "REFRESH_SECRET": "explicit-refresh",
        }
        settings = _make_settings(env)
        self.assertEqual(settings.JWT_SECRET, "explicit-jwt")
        self.assertEqual(settings.REFRESH_SECRET, "explicit-refresh")


if __name__ == "__main__":
    unittest.main()
