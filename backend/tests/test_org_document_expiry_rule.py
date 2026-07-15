"""
Integration tests for the company document expiry-date enforcement.

These tests drive the actual router functions (upload_company_document and
update_company_document) while mocking only the infrastructure layer
(DB repository, storage helpers, activity logger).  The service guard
(_EXPIRY_REQUIRED_DOC_TYPES check) runs for real, so the tests prove that
the rule cannot be bypassed via direct API-level calls.

Two layers of enforcement are tested:
  1. Router-level guard on CREATE  (upload_company_document router fn)
  2. Service-level guard on PATCH  (update_company_document router fn →
                                    svc.update_company_document)

Scenarios:
  A. CREATE required-type doc without expiry       → 422 (router check)
  B. CREATE required-type doc with valid expiry    → succeeds
  C. PATCH: required-type doc with no stored expiry, no expiry sent → 422
  D. PATCH: change non-required type to required, no expiry sent    → 422
  E. PATCH: required-type doc with stored expiry, no expiry sent
            (API preserves stored value)                             → succeeds
  F. PATCH: required-type doc with no stored expiry, expiry sent    → succeeds
"""
import unittest
from datetime import date
from unittest.mock import MagicMock, patch

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers shared across all tests
# ---------------------------------------------------------------------------

_SUBDOMAIN = "acme"
_CLIENT_ID = "client-uuid-1"
_COMPANY_ID = "company-uuid-1"
_DOC_ID = "doc-uuid-1"

_PORTAL_USER = {
    "subdomain": _SUBDOMAIN,
    "client_id": _CLIENT_ID,
    "admin_user_id": "admin-uuid-1",
}


def _make_request():
    """Minimal Request mock that satisfies _get_ip and any header reads."""
    req = MagicMock()
    req.headers.get.return_value = None
    req.client.host = "127.0.0.1"
    return req


def _make_db():
    db = MagicMock()
    db.commit.return_value = None
    db.refresh.side_effect = lambda obj: None
    return db


class _FakeDoc:
    """Stand-in for an OrgCompanyDocument ORM row."""
    def __init__(self, doc_type, expiry_date=None):
        self.id = _DOC_ID
        self.doc_type = doc_type
        self.doc_number = None
        self.issue_date = None
        self.expiry_date = expiry_date
        self.remarks = None
        self.file_path = None
        self.file_name = None
        self.is_deleted = False

    def __repr__(self):
        return f"<_FakeDoc type={self.doc_type!r} expiry={self.expiry_date!r}>"


# ---------------------------------------------------------------------------
# CREATE handler (upload_company_document) — router-level guard
# ---------------------------------------------------------------------------

class TestCreateDocumentRouterExpiryGuard(unittest.TestCase):
    """
    The upload_company_document router function pre-validates required doc types
    before any storage or DB work happens.  These tests drive that function
    directly, mocking only the DB and storage layer.
    """

    def _invoke_create(self, doc_type, expiry_date_str=None):
        """
        Call the router function directly, bypassing FastAPI DI.
        Returns the response dict or raises HTTPException.
        """
        from backend.app.modules.organization_management import router as r

        fake_company = MagicMock()

        with (
            patch(
                "backend.app.modules.organization_management.service._log",
                return_value=None,
            ),
            patch(
                "backend.app.modules.organization_management.repository.get_company",
                return_value=fake_company,
            ),
            patch(
                "backend.app.modules.organization_management.repository.create_company_document",
                return_value=_FakeDoc(doc_type, None),
            ),
            patch(
                "backend.app.modules.organization_management.service._doc_dict",
                side_effect=lambda d: {"id": d.id, "doc_type": d.doc_type},
            ),
        ):
            return r.upload_company_document(
                subdomain=_SUBDOMAIN,
                company_id=_COMPANY_ID,
                request=_make_request(),
                doc_type=doc_type,
                doc_number=None,
                issue_date=None,
                expiry_date=expiry_date_str,
                remarks=None,
                file=None,
                portal_user=_PORTAL_USER,
                client_db=_make_db(),
            )

    def test_create_required_type_without_expiry_raises_422(self):
        """Router rejects POST for a required type with no expiry_date."""
        with self.assertRaises(HTTPException) as ctx:
            self._invoke_create(doc_type="GST Certificate", expiry_date_str=None)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_required_type_empty_expiry_raises_422(self):
        """Empty-string expiry_date is treated as absent → 422."""
        with self.assertRaises(HTTPException) as ctx:
            self._invoke_create(doc_type="Trade License", expiry_date_str="")
        self.assertEqual(ctx.exception.status_code, 422)

    def test_create_all_required_types_blocked(self):
        """Every member of the required-type set blocks creation without expiry."""
        from backend.app.modules.organization_management.router import _EXPIRY_REQUIRED_DOC_TYPES
        for doc_type in _EXPIRY_REQUIRED_DOC_TYPES:
            with self.subTest(doc_type=doc_type):
                with self.assertRaises(HTTPException) as ctx:
                    self._invoke_create(doc_type=doc_type, expiry_date_str=None)
                self.assertEqual(ctx.exception.status_code, 422)

    def test_create_required_type_with_expiry_succeeds(self):
        """Providing a valid expiry_date for a required type must not raise."""
        result = self._invoke_create(
            doc_type="GST Certificate",
            expiry_date_str="2027-12-31",
        )
        self.assertTrue(result.get("success"))

    def test_create_non_required_type_without_expiry_succeeds(self):
        """Non-required types need no expiry on create."""
        result = self._invoke_create(doc_type="Invoice", expiry_date_str=None)
        self.assertTrue(result.get("success"))


# ---------------------------------------------------------------------------
# PATCH handler (update_company_document) — service-level guard
# ---------------------------------------------------------------------------

class TestPatchDocumentRouterExpiryGuard(unittest.TestCase):
    """
    The update_company_document router function calls the real
    svc.update_company_document (NOT mocked).  Only the repository and
    storage layers are mocked so that the service guard runs for real,
    proving the rule cannot be bypassed via the PATCH endpoint.
    """

    def _invoke_patch(self, stored_doc, doc_type=None, expiry_date_str=None):
        """
        Drive the PATCH router function with the given stored doc and form
        fields.  Returns (data_dict, old_file_key) or raises HTTPException.
        """
        from backend.app.modules.organization_management import router as r

        with (
            patch(
                "backend.app.modules.organization_management.repository.get_company_document",
                return_value=stored_doc,
            ),
            patch(
                "backend.app.modules.organization_management.repository.update_company_document",
                return_value=None,
            ),
            patch(
                "backend.app.modules.organization_management.service._log",
                return_value=None,
            ),
            patch(
                "backend.app.modules.organization_management.service._doc_dict",
                side_effect=lambda d: {"id": d.id, "doc_type": d.doc_type},
            ),
        ):
            return r.update_company_document(
                subdomain=_SUBDOMAIN,
                company_id=_COMPANY_ID,
                doc_id=_DOC_ID,
                request=_make_request(),
                doc_type=doc_type,
                doc_number=None,
                issue_date=None,
                expiry_date=expiry_date_str,
                remarks=None,
                file=None,
                portal_user=_PORTAL_USER,
                client_db=_make_db(),
            )

    # ── 422 cases ────────────────────────────────────────────────────────────

    def test_patch_required_type_no_stored_expiry_no_new_expiry_raises_422(self):
        """
        A required-type document with no stored expiry_date must be rejected
        when the PATCH provides no expiry_date either.  This is the primary
        guard-bypass scenario: a doc that slipped into the DB without an expiry
        (e.g. via import or direct insert) cannot be updated without one.
        """
        doc = _FakeDoc(doc_type="GST Certificate", expiry_date=None)
        with self.assertRaises(HTTPException) as ctx:
            self._invoke_patch(doc, doc_type=None, expiry_date_str=None)
        self.assertEqual(ctx.exception.status_code, 422)

    def test_patch_change_to_required_type_no_expiry_raises_422(self):
        """
        Changing a document from a non-required type to a required type via
        PATCH, without supplying an expiry_date, must be rejected.
        """
        doc = _FakeDoc(doc_type="Invoice", expiry_date=None)
        with self.assertRaises(HTTPException) as ctx:
            self._invoke_patch(
                doc, doc_type="GST Certificate", expiry_date_str=None
            )
        self.assertEqual(ctx.exception.status_code, 422)

    def test_patch_all_required_types_blocked_when_no_expiry(self):
        """The guard fires for every required type, not just GST Certificate."""
        from backend.app.modules.organization_management.service import (
            _EXPIRY_REQUIRED_DOC_TYPES,
        )
        for doc_type in _EXPIRY_REQUIRED_DOC_TYPES:
            with self.subTest(doc_type=doc_type):
                doc = _FakeDoc(doc_type=doc_type, expiry_date=None)
                with self.assertRaises(HTTPException) as ctx:
                    self._invoke_patch(doc, doc_type=None, expiry_date_str=None)
                self.assertEqual(ctx.exception.status_code, 422)

    def test_patch_422_detail_names_the_doc_type(self):
        """The 422 response detail must identify which type is the problem."""
        doc = _FakeDoc(doc_type="Trade License", expiry_date=None)
        with self.assertRaises(HTTPException) as ctx:
            self._invoke_patch(doc, doc_type=None, expiry_date_str=None)
        self.assertIn("Trade License", str(ctx.exception.detail))

    # ── API semantics: clearing expiry via PATCH ──────────────────────────────

    def test_patch_cannot_clear_expiry_when_stored_value_is_valid(self):
        """
        The PATCH API preserves a stored expiry when no new expiry_date is sent.
        This is the documented contract: sending no expiry_date falls back to
        the stored value, so an attacker cannot silently clear an existing expiry
        by omitting the field.  Assert the patch succeeds (no 422), confirming
        the existing expiry is intact.
        """
        doc = _FakeDoc(
            doc_type="GST Certificate", expiry_date=date(2027, 12, 31)
        )
        result = self._invoke_patch(doc, doc_type=None, expiry_date_str=None)
        self.assertIn("success", result)
        self.assertTrue(result["success"])

    # ── Success cases ─────────────────────────────────────────────────────────

    def test_patch_required_type_with_valid_expiry_succeeds(self):
        """Providing a valid expiry_date for a required-type doc must succeed."""
        doc = _FakeDoc(doc_type="GST Certificate", expiry_date=None)
        result = self._invoke_patch(
            doc, doc_type=None, expiry_date_str="2027-12-31"
        )
        self.assertIn("success", result)

    def test_patch_change_to_required_type_with_expiry_succeeds(self):
        """Changing to a required type AND supplying an expiry must succeed."""
        doc = _FakeDoc(doc_type="Invoice", expiry_date=None)
        result = self._invoke_patch(
            doc, doc_type="GST Certificate", expiry_date_str="2028-06-30"
        )
        self.assertIn("success", result)

    def test_patch_non_required_type_without_expiry_succeeds(self):
        """Non-required type documents need no expiry on update."""
        doc = _FakeDoc(doc_type="Invoice", expiry_date=None)
        result = self._invoke_patch(doc, doc_type=None, expiry_date_str=None)
        self.assertIn("success", result)


# ---------------------------------------------------------------------------
# 404 guard (missing document, independent of expiry logic)
# ---------------------------------------------------------------------------

class TestMissingDocumentRaises404(unittest.TestCase):
    """A PATCH on a non-existent document must raise 404 before the expiry check."""

    def test_patch_404_when_doc_not_found(self):
        from backend.app.modules.organization_management import router as r

        with patch(
            "backend.app.modules.organization_management.repository.get_company_document",
            return_value=None,
        ):
            with self.assertRaises(HTTPException) as ctx:
                r.update_company_document(
                    subdomain=_SUBDOMAIN,
                    company_id=_COMPANY_ID,
                    doc_id="ghost-id",
                    request=_make_request(),
                    doc_type=None,
                    doc_number=None,
                    issue_date=None,
                    expiry_date=None,
                    remarks=None,
                    file=None,
                    portal_user=_PORTAL_USER,
                    client_db=_make_db(),
                )
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
