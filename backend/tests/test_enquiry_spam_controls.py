"""
Tests for the public enquiry anti-spam controls:
  - client IP resolution resists X-Forwarded-For spoofing
  - per-IP rate limiting cannot be bypassed with arbitrary XFF
  - duplicate submission detection (email + message within the window)
  - honeypot trips silently
  - Turnstile is enforced only when a secret is configured
"""
import os
import sys
import types
import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

_WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _WORKSPACE_ROOT not in sys.path:
    sys.path.insert(0, _WORKSPACE_ROOT)

from backend.app.modules.enquiry.models import Enquiry  # noqa: E402
from backend.app.modules.enquiry.schemas import EnquiryCreateRequest  # noqa: E402
from backend.app.modules.enquiry import service  # noqa: E402
from backend.app.modules.enquiry.router import _client_ip  # noqa: E402
from backend.app.modules.enquiry.constants import RATE_LIMIT_MAX  # noqa: E402
from backend.app.config.settings import settings  # noqa: E402


def _fake_request(xff=None, client_host="10.0.0.1"):
    headers = {}
    if xff is not None:
        headers["x-forwarded-for"] = xff
    return types.SimpleNamespace(
        headers=headers,
        client=types.SimpleNamespace(host=client_host),
    )


def _valid_payload(**overrides):
    base = dict(
        full_name="Jane Doe",
        work_email="jane@acme.com",
        phone_number="+91 555 000 0000",
        company_name="Acme Corporation",
        interested_module="hrms",
        message="We would like a demo of your HRMS module for our team.",
    )
    base.update(overrides)
    return EnquiryCreateRequest(**base)


class TestClientIpResolution(unittest.TestCase):
    def test_takes_rightmost_entry_ignoring_spoofed_left(self):
        # Client prepends a fake IP; trusted proxy appends the real one.
        req = _fake_request(xff="1.2.3.4, 5.6.7.8, 203.0.113.9")
        self.assertEqual(_client_ip(req), "203.0.113.9")

    def test_single_entry(self):
        req = _fake_request(xff="203.0.113.9")
        self.assertEqual(_client_ip(req), "203.0.113.9")

    def test_falls_back_to_peer_when_no_header(self):
        req = _fake_request(xff=None, client_host="198.51.100.2")
        self.assertEqual(_client_ip(req), "198.51.100.2")


class TestSpamServiceControls(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Enquiry.__table__.create(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_honeypot_trips_silently(self):
        payload = _valid_payload(honeypot="i-am-a-bot")
        with self.assertRaises(service.HoneypotTripped):
            service.create_enquiry(self.db, payload, ip_address="203.0.113.1", user_agent="UA")
        # Nothing persisted.
        self.assertEqual(self.db.query(Enquiry).count(), 0)

    def test_defaults_applied_on_success(self):
        enq = service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.2", user_agent="UA"
        )
        self.assertEqual(enq.source, "Website")
        self.assertEqual(enq.status, "New")

    def test_rate_limit_enforced_per_ip(self):
        ip = "203.0.113.50"
        for i in range(RATE_LIMIT_MAX):
            service.create_enquiry(
                self.db,
                _valid_payload(message=f"Message number {i} for the demo request please."),
                ip_address=ip,
                user_agent="UA",
            )
        with self.assertRaises(HTTPException) as ctx:
            service.create_enquiry(
                self.db,
                _valid_payload(message="One too many requests from this same address now."),
                ip_address=ip,
                user_agent="UA",
            )
        self.assertEqual(ctx.exception.status_code, 429)

    def test_rate_limit_not_bypassed_by_different_ip(self):
        for i in range(RATE_LIMIT_MAX):
            service.create_enquiry(
                self.db,
                _valid_payload(message=f"Message number {i} for the demo request please."),
                ip_address="203.0.113.60",
                user_agent="UA",
            )
        # A different IP is unaffected by the first IP's count.
        enq = service.create_enquiry(
            self.db,
            _valid_payload(message="A fresh enquiry from a completely different address."),
            ip_address="203.0.113.61",
            user_agent="UA",
        )
        self.assertIsNotNone(enq.id)

    def test_duplicate_detection(self):
        service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.70", user_agent="UA"
        )
        # Same email + message again (different IP so rate limit isn't the trigger).
        with self.assertRaises(HTTPException) as ctx:
            service.create_enquiry(
                self.db, _valid_payload(), ip_address="203.0.113.71", user_agent="UA"
            )
        self.assertEqual(ctx.exception.status_code, 409)


class TestTurnstileEnforcement(unittest.TestCase):
    def setUp(self):
        self._orig = getattr(settings, "TURNSTILE_SECRET_KEY", "")

    def tearDown(self):
        settings.TURNSTILE_SECRET_KEY = self._orig

    def test_skipped_when_no_secret(self):
        settings.TURNSTILE_SECRET_KEY = ""
        # Should not raise.
        service._verify_turnstile(None, "203.0.113.1")

    def test_required_when_secret_set_and_token_missing(self):
        settings.TURNSTILE_SECRET_KEY = "test-secret"
        with self.assertRaises(HTTPException) as ctx:
            service._verify_turnstile(None, "203.0.113.1")
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
