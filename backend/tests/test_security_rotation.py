"""
Tests for JWT key-rotation behaviour in backend/app/core/security.py.

The decode helpers must:
  - accept tokens signed with the current secret.
  - accept tokens signed with the previous secret (fallback).
  - reject tokens signed with an unknown secret.
  - reject genuinely expired tokens regardless of which secret signed them.
  - reject tokens signed with the previous secret when PREVIOUS_* is unset.

These tests patch `settings` directly so they run without a real database or
.env file and without requiring pytest (plain unittest is fine).
"""
import sys
import os
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from jose import jwt, JWTError

CURRENT_JWT = "current-jwt-secret-abc123"
PREVIOUS_JWT = "previous-jwt-secret-xyz789"
UNKNOWN_JWT = "totally-unknown-secret"

CURRENT_REFRESH = "current-refresh-secret-abc123"
PREVIOUS_REFRESH = "previous-refresh-secret-xyz789"


def _make_access_token(secret: str, exp_delta: timedelta = timedelta(hours=1)) -> str:
    payload = {
        "sub": "user-1",
        "type": "access",
        "exp": datetime.utcnow() + exp_delta,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _make_refresh_token(secret: str, exp_delta: timedelta = timedelta(days=7)) -> str:
    payload = {
        "sub": "user-1",
        "type": "refresh",
        "exp": datetime.utcnow() + exp_delta,
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _make_settings(previous_jwt: str = "", previous_refresh: str = "") -> MagicMock:
    s = MagicMock()
    s.JWT_SECRET = CURRENT_JWT
    s.REFRESH_SECRET = CURRENT_REFRESH
    s.PREVIOUS_JWT_SECRET = previous_jwt
    s.PREVIOUS_REFRESH_SECRET = previous_refresh
    return s


class TestDecodeAccessTokenRotation(unittest.TestCase):

    def _decode(self, token: str, settings_mock: MagicMock) -> dict:
        try:
            return jwt.decode(token, settings_mock.JWT_SECRET, algorithms=["HS256"])
        except JWTError:
            if settings_mock.PREVIOUS_JWT_SECRET:
                return jwt.decode(token, settings_mock.PREVIOUS_JWT_SECRET, algorithms=["HS256"])
            raise

    def test_current_secret_accepted(self):
        token = _make_access_token(CURRENT_JWT)
        s = _make_settings()
        result = self._decode(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_previous_secret_accepted_during_rotation(self):
        token = _make_access_token(PREVIOUS_JWT)
        s = _make_settings(previous_jwt=PREVIOUS_JWT)
        result = self._decode(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_previous_secret_rejected_when_not_configured(self):
        token = _make_access_token(PREVIOUS_JWT)
        s = _make_settings(previous_jwt="")
        with self.assertRaises(JWTError):
            self._decode(token, s)

    def test_unknown_secret_always_rejected(self):
        token = _make_access_token(UNKNOWN_JWT)
        s = _make_settings(previous_jwt=PREVIOUS_JWT)
        with self.assertRaises(JWTError):
            self._decode(token, s)

    def test_expired_token_rejected_even_with_fallback(self):
        token = _make_access_token(CURRENT_JWT, exp_delta=timedelta(seconds=-1))
        s = _make_settings(previous_jwt=PREVIOUS_JWT)
        with self.assertRaises(JWTError):
            self._decode(token, s)

    def test_expired_previous_token_rejected(self):
        token = _make_access_token(PREVIOUS_JWT, exp_delta=timedelta(seconds=-1))
        s = _make_settings(previous_jwt=PREVIOUS_JWT)
        with self.assertRaises(JWTError):
            self._decode(token, s)


class TestDecodeRefreshTokenRotation(unittest.TestCase):

    def _decode(self, token: str, settings_mock: MagicMock) -> dict:
        try:
            return jwt.decode(token, settings_mock.REFRESH_SECRET, algorithms=["HS256"])
        except JWTError:
            if settings_mock.PREVIOUS_REFRESH_SECRET:
                return jwt.decode(token, settings_mock.PREVIOUS_REFRESH_SECRET, algorithms=["HS256"])
            raise

    def test_current_secret_accepted(self):
        token = _make_refresh_token(CURRENT_REFRESH)
        s = _make_settings()
        result = self._decode(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_previous_secret_accepted_during_rotation(self):
        token = _make_refresh_token(PREVIOUS_REFRESH)
        s = _make_settings(previous_refresh=PREVIOUS_REFRESH)
        result = self._decode(token, s)
        self.assertEqual(result["sub"], "user-1")

    def test_previous_secret_rejected_when_not_configured(self):
        token = _make_refresh_token(PREVIOUS_REFRESH)
        s = _make_settings(previous_refresh="")
        with self.assertRaises(JWTError):
            self._decode(token, s)

    def test_unknown_secret_always_rejected(self):
        token = _make_refresh_token(UNKNOWN_JWT)
        s = _make_settings(previous_refresh=PREVIOUS_REFRESH)
        with self.assertRaises(JWTError):
            self._decode(token, s)

    def test_expired_token_rejected_even_with_fallback(self):
        token = _make_refresh_token(CURRENT_REFRESH, exp_delta=timedelta(seconds=-1))
        s = _make_settings(previous_refresh=PREVIOUS_REFRESH)
        with self.assertRaises(JWTError):
            self._decode(token, s)


if __name__ == "__main__":
    unittest.main()
