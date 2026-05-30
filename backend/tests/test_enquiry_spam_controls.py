"""
Tests for the public enquiry controls (GDPR/privacy-aware lead capture):
  - client IP resolution resists X-Forwarded-For spoofing
  - per-IP rate limiting cannot be bypassed with arbitrary XFF
  - duplicate submission detection (email + company within the window)
  - honeypot (website_url) trips silently
  - Turnstile is enforced only when a secret is configured
  - PII is encrypted at rest and consent/marketing are tracked
  - field-level encryption round-trips and blind index is deterministic
  - audit entries are written with masked PII
"""
import os
import sys
import types
import unittest

from fastapi import HTTPException
from pydantic import ValidationError
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
from backend.shared.audit.models import AuditLog  # noqa: E402
from backend.shared.audit.audit_logger import mask_email, mask_value  # noqa: E402
from backend.shared.security.encryption import (  # noqa: E402
    encrypt_value,
    decrypt_value,
    blind_index,
)


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
        consent_given=True,
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


class TestSchemaValidation(unittest.TestCase):
    def test_consent_required(self):
        with self.assertRaises(ValidationError):
            _valid_payload(consent_given=False)

    def test_collapses_consecutive_spaces(self):
        p = _valid_payload(full_name="Jane    Doe", company_name="Acme    Corporation")
        self.assertEqual(p.full_name, "Jane Doe")
        self.assertEqual(p.company_name, "Acme Corporation")

    def test_blocks_xss_in_message(self):
        with self.assertRaises(ValidationError):
            _valid_payload(message="<script>alert(1)</script> hello there team")


class TestEncryptionHelper(unittest.TestCase):
    def test_round_trip(self):
        token = encrypt_value("secret@example.com")
        self.assertNotEqual(token, "secret@example.com")
        self.assertEqual(decrypt_value(token), "secret@example.com")

    def test_empty_and_none(self):
        self.assertIsNone(encrypt_value(None))
        self.assertIsNone(encrypt_value(""))
        self.assertIsNone(decrypt_value(None))

    def test_blind_index_deterministic_and_normalized(self):
        a = blind_index("Jane@Acme.com", "Acme Corp")
        b = blind_index("  jane@acme.com ", "acme corp")
        self.assertEqual(a, b)
        self.assertNotEqual(a, blind_index("other@acme.com", "Acme Corp"))

    def test_decrypt_invalid_raises(self):
        with self.assertRaises(ValueError):
            decrypt_value("not-a-valid-token")


class TestMasking(unittest.TestCase):
    def test_mask_email(self):
        self.assertEqual(mask_email("jane.doe@acme.com"), "j***e@acme.com")
        self.assertEqual(mask_email("ab@acme.com"), "a*@acme.com")
        self.assertIsNone(mask_email("not-an-email"))

    def test_mask_value(self):
        self.assertEqual(mask_value("1234567890"), "***90")
        self.assertIsNone(mask_value(None))


class TestSpamServiceControls(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Enquiry.__table__.create(bind=self.engine)
        AuditLog.__table__.create(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_honeypot_trips_silently(self):
        payload = _valid_payload(website_url="i-am-a-bot")
        with self.assertRaises(service.HoneypotTripped):
            service.create_enquiry(self.db, payload, ip_address="203.0.113.1", user_agent="UA")
        # Nothing persisted.
        self.assertEqual(self.db.query(Enquiry).count(), 0)

    def test_defaults_and_encryption_on_success(self):
        enq = service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.2", user_agent="UA"
        )
        self.assertEqual(enq.source, "Website")
        self.assertEqual(enq.status, "New")
        self.assertTrue(enq.enquiry_number.startswith("ENQ-"))
        # PII stored encrypted, decrypts back to the original.
        self.assertNotIn("jane@acme.com", enq.email_encrypted)
        self.assertEqual(decrypt_value(enq.email_encrypted), "jane@acme.com")
        self.assertEqual(decrypt_value(enq.phone_encrypted), "+91 555 000 0000")
        # Consent tracked.
        self.assertTrue(enq.consent_given)
        self.assertIsNotNone(enq.consent_timestamp)
        self.assertIsNotNone(enq.retention_until)

    def test_marketing_consent_tracked_separately(self):
        enq = service.create_enquiry(
            self.db,
            _valid_payload(marketing_consent=True),
            ip_address="203.0.113.3",
            user_agent="UA",
        )
        self.assertTrue(enq.marketing_consent)
        self.assertIsNotNone(enq.marketing_consent_timestamp)
        actions = {a.action for a in self.db.query(AuditLog).all()}
        self.assertIn("enquiry.created", actions)
        self.assertIn("enquiry.consent_given", actions)
        self.assertIn("enquiry.marketing_consent_given", actions)

    def test_audit_never_stores_raw_pii(self):
        service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.4", user_agent="UA"
        )
        for log in self.db.query(AuditLog).all():
            serialized = str(log.log_metadata)
            self.assertNotIn("jane@acme.com", serialized)

    def test_rate_limit_enforced_per_ip(self):
        ip = "203.0.113.50"
        for i in range(RATE_LIMIT_MAX):
            service.create_enquiry(
                self.db,
                _valid_payload(work_email=f"user{i}@acme.com"),
                ip_address=ip,
                user_agent="UA",
            )
        with self.assertRaises(HTTPException) as ctx:
            service.create_enquiry(
                self.db,
                _valid_payload(work_email="extra@acme.com"),
                ip_address=ip,
                user_agent="UA",
            )
        self.assertEqual(ctx.exception.status_code, 429)

    def test_rate_limit_not_bypassed_by_different_ip(self):
        for i in range(RATE_LIMIT_MAX):
            service.create_enquiry(
                self.db,
                _valid_payload(work_email=f"user{i}@acme.com"),
                ip_address="203.0.113.60",
                user_agent="UA",
            )
        # A different IP is unaffected by the first IP's count.
        enq = service.create_enquiry(
            self.db,
            _valid_payload(work_email="fresh@acme.com"),
            ip_address="203.0.113.61",
            user_agent="UA",
        )
        self.assertIsNotNone(enq.id)

    def test_duplicate_detection_email_plus_company(self):
        service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.70", user_agent="UA"
        )
        # Same email + company again (different message, different IP).
        with self.assertRaises(HTTPException) as ctx:
            service.create_enquiry(
                self.db,
                _valid_payload(message="A different message entirely for the same firm."),
                ip_address="203.0.113.71",
                user_agent="UA",
            )
        self.assertEqual(ctx.exception.status_code, 409)

    def test_same_email_different_company_not_duplicate(self):
        service.create_enquiry(
            self.db, _valid_payload(), ip_address="203.0.113.80", user_agent="UA"
        )
        enq = service.create_enquiry(
            self.db,
            _valid_payload(company_name="Different Company Ltd"),
            ip_address="203.0.113.81",
            user_agent="UA",
        )
        self.assertIsNotNone(enq.id)


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
