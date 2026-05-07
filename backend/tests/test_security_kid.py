"""
Tests for the key-ID (kid) claim embedded in JWTs by security.py.

Covers:
  - _derive_kid produces a stable 8-char hex string.
  - create_access_token / create_refresh_token embed a kid header derived
    from the current secret.
  - decode_access_token / decode_refresh_token succeed with the kid present.
  - Tokens signed with the previous secret are accepted via the fallback path
    and trigger an INFO log that references the old kid.
  - Tokens without a kid header (legacy tokens) are handled gracefully.
"""
import hashlib
import logging
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from jose import jwt

CURRENT_JWT = "current-jwt-secret-abc123"
PREVIOUS_JWT = "previous-jwt-secret-xyz789"

CURRENT_REFRESH = "current-refresh-secret-abc123"
PREVIOUS_REFRESH = "previous-refresh-secret-xyz789"


def _expected_kid(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()[:8]


def _make_settings(*, previous_jwt: str = "", previous_refresh: str = "", grace_active: bool = True) -> MagicMock:
    s = MagicMock()
    s.JWT_SECRET = CURRENT_JWT
    s.REFRESH_SECRET = CURRENT_REFRESH
    s.PREVIOUS_JWT_SECRET = previous_jwt
    s.PREVIOUS_REFRESH_SECRET = previous_refresh
    s.ACCESS_TOKEN_EXPIRE_MINUTES = 30
    s.REFRESH_TOKEN_EXPIRE_DAYS = 7
    s.previous_secret_grace_active.return_value = grace_active
    return s


class TestDeriveKid(unittest.TestCase):

    def test_returns_8_hex_chars(self):
        from backend.app.core.security import _derive_kid
        kid = _derive_kid("some-secret")
        self.assertEqual(len(kid), 8)
        int(kid, 16)

    def test_stable_for_same_secret(self):
        from backend.app.core.security import _derive_kid
        self.assertEqual(_derive_kid("abc"), _derive_kid("abc"))

    def test_different_secrets_produce_different_kids(self):
        from backend.app.core.security import _derive_kid
        self.assertNotEqual(_derive_kid("secret-a"), _derive_kid("secret-b"))

    def test_matches_sha256_prefix(self):
        from backend.app.core.security import _derive_kid
        expected = hashlib.sha256(b"my-secret").hexdigest()[:8]
        self.assertEqual(_derive_kid("my-secret"), expected)


class TestCreateTokensEmbedKid(unittest.TestCase):

    def test_access_token_has_kid_header(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = sec.create_access_token({"sub": "user-1"})

        header = jwt.get_unverified_header(token)
        self.assertIn("kid", header)
        self.assertEqual(header["kid"], _expected_kid(CURRENT_JWT))

    def test_refresh_token_has_kid_header(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = sec.create_refresh_token({"sub": "user-1"})

        header = jwt.get_unverified_header(token)
        self.assertIn("kid", header)
        self.assertEqual(header["kid"], _expected_kid(CURRENT_REFRESH))

    def test_kid_changes_when_secret_changes(self):
        from backend.app.core import security as sec

        s1 = _make_settings()
        s1.JWT_SECRET = "secret-version-1"
        with patch.object(sec, "settings", s1):
            token1 = sec.create_access_token({"sub": "u"})

        s2 = _make_settings()
        s2.JWT_SECRET = "secret-version-2"
        with patch.object(sec, "settings", s2):
            token2 = sec.create_access_token({"sub": "u"})

        self.assertNotEqual(
            jwt.get_unverified_header(token1)["kid"],
            jwt.get_unverified_header(token2)["kid"],
        )


class TestDecodeAccessTokenKid(unittest.TestCase):

    def _make_token(self, secret: str, include_kid: bool = True) -> str:
        payload = {"sub": "user-1", "type": "access", "exp": datetime.utcnow() + timedelta(hours=1)}
        headers = {"kid": _expected_kid(secret)} if include_kid else {}
        return jwt.encode(payload, secret, algorithm="HS256", headers=headers)

    def test_current_token_decoded_successfully(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = self._make_token(CURRENT_JWT)
            result = sec.decode_access_token(token)
        self.assertEqual(result["sub"], "user-1")

    def test_fallback_key_accepted_and_logged(self):
        from backend.app.core import security as sec
        s = _make_settings(previous_jwt=PREVIOUS_JWT, grace_active=True)
        token = self._make_token(PREVIOUS_JWT)

        with patch.object(sec, "settings", s):
            with self.assertLogs("backend.app.core.security", level="INFO") as cm:
                result = sec.decode_access_token(token)

        self.assertEqual(result["sub"], "user-1")
        self.assertTrue(
            any("fallback key" in line for line in cm.output),
            msg=f"Expected 'fallback key' in log output: {cm.output}",
        )
        previous_kid = _expected_kid(PREVIOUS_JWT)
        self.assertTrue(
            any(previous_kid in line for line in cm.output),
            msg=f"Expected kid={previous_kid!r} in log output: {cm.output}",
        )

    def test_token_without_kid_header_handled(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = self._make_token(CURRENT_JWT, include_kid=False)
            result = sec.decode_access_token(token)
        self.assertEqual(result["sub"], "user-1")


class TestDecodeRefreshTokenKid(unittest.TestCase):

    def _make_token(self, secret: str, include_kid: bool = True) -> str:
        payload = {"sub": "user-1", "type": "refresh", "exp": datetime.utcnow() + timedelta(days=7)}
        headers = {"kid": _expected_kid(secret)} if include_kid else {}
        return jwt.encode(payload, secret, algorithm="HS256", headers=headers)

    def test_current_token_decoded_successfully(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = self._make_token(CURRENT_REFRESH)
            result = sec.decode_refresh_token(token)
        self.assertEqual(result["sub"], "user-1")

    def test_fallback_key_accepted_and_logged(self):
        from backend.app.core import security as sec
        s = _make_settings(previous_refresh=PREVIOUS_REFRESH, grace_active=True)
        token = self._make_token(PREVIOUS_REFRESH)

        with patch.object(sec, "settings", s):
            with self.assertLogs("backend.app.core.security", level="INFO") as cm:
                result = sec.decode_refresh_token(token)

        self.assertEqual(result["sub"], "user-1")
        self.assertTrue(
            any("fallback key" in line for line in cm.output),
            msg=f"Expected 'fallback key' in log output: {cm.output}",
        )
        previous_kid = _expected_kid(PREVIOUS_REFRESH)
        self.assertTrue(
            any(previous_kid in line for line in cm.output),
            msg=f"Expected kid={previous_kid!r} in log output: {cm.output}",
        )

    def test_token_without_kid_header_handled(self):
        from backend.app.core import security as sec
        with patch.object(sec, "settings", _make_settings()):
            token = self._make_token(CURRENT_REFRESH, include_kid=False)
            result = sec.decode_refresh_token(token)
        self.assertEqual(result["sub"], "user-1")


if __name__ == "__main__":
    unittest.main()
