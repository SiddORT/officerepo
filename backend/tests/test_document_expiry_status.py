"""
Unit tests for _compute_expiry_status (service layer) and the expiry_status
field returned by list_expiring_documents (repository layer).

These tests focus on boundary dates — yesterday, today, exactly 30 days out,
31 days out, and None — so that a future refactor of the helper cannot
silently break compliance-critical badge logic.
"""
import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch


# ---------------------------------------------------------------------------
# _compute_expiry_status — pure unit tests (no DB required)
# ---------------------------------------------------------------------------

class TestComputeExpiryStatus(unittest.TestCase):
    """Unit tests for the _compute_expiry_status helper in service.py."""

    def _fn(self):
        from backend.app.modules.organization_management.service import (
            _compute_expiry_status,
        )
        return _compute_expiry_status

    def test_none_expiry_returns_valid(self):
        """None expiry_date (no expiry tracked) must always return 'valid'."""
        result = self._fn()(None)
        self.assertEqual(result, "valid")

    def test_expired_yesterday_returns_expired(self):
        """A document that expired yesterday must return 'expired'."""
        yesterday = date.today() - timedelta(days=1)
        result = self._fn()(yesterday)
        self.assertEqual(result, "expired")

    def test_expiring_today_returns_expiring_soon(self):
        """
        A document expiring exactly today is NOT yet expired (today < today is False),
        but is within the 30-day window → 'expiring_soon'.
        """
        today = date.today()
        result = self._fn()(today)
        self.assertEqual(result, "expiring_soon")

    def test_expiring_in_30_days_exact_returns_expiring_soon(self):
        """
        A document expiring in exactly 30 days sits on the boundary of the
        'expiring_soon' window (expiry <= today + 30) → 'expiring_soon'.
        """
        in_30 = date.today() + timedelta(days=30)
        result = self._fn()(in_30)
        self.assertEqual(result, "expiring_soon")

    def test_expiring_in_31_days_returns_valid(self):
        """
        A document expiring in 31 days is outside the 30-day window → 'valid'.
        This confirms the boundary is exclusive on the far side.
        """
        in_31 = date.today() + timedelta(days=31)
        result = self._fn()(in_31)
        self.assertEqual(result, "valid")

    def test_expiring_far_future_returns_valid(self):
        """A document expiring far in the future must return 'valid'."""
        far_future = date.today() + timedelta(days=365)
        result = self._fn()(far_future)
        self.assertEqual(result, "valid")

    def test_expired_long_ago_returns_expired(self):
        """A document that expired years ago must still return 'expired'."""
        long_ago = date.today() - timedelta(days=730)
        result = self._fn()(long_ago)
        self.assertEqual(result, "expired")

    def test_return_type_is_string(self):
        """The helper must always return a str, never None or a non-string."""
        fn = self._fn()
        for val in [None, date.today(), date.today() - timedelta(1), date.today() + timedelta(31)]:
            with self.subTest(val=val):
                self.assertIsInstance(fn(val), str)

    def test_only_valid_status_values_returned(self):
        """Every possible input maps to one of the three known status strings."""
        fn = self._fn()
        allowed = {"expired", "expiring_soon", "valid"}
        candidates = [
            None,
            date.today() - timedelta(days=1),
            date.today(),
            date.today() + timedelta(days=30),
            date.today() + timedelta(days=31),
            date.today() + timedelta(days=365),
        ]
        for val in candidates:
            with self.subTest(val=val):
                self.assertIn(fn(val), allowed)


# ---------------------------------------------------------------------------
# list_expiring_documents — confirm expiry_status key in every returned row
# ---------------------------------------------------------------------------

class TestListExpiringDocumentsExpiryStatusField(unittest.TestCase):
    """
    Confirm that list_expiring_documents (repository) includes an 'expiry_status'
    key in every row dict.  The DB query is mocked so no live database is needed.
    """

    def _make_fake_doc(self, expiry_date):
        """Return a minimal ORM-like object for OrgCompanyDocument."""
        doc = MagicMock()
        doc.id = "doc-uuid-1"
        doc.company_id = "company-uuid-1"
        doc.doc_type = "GST Certificate"
        doc.doc_number = "GST123"
        doc.expiry_date = expiry_date
        doc.issue_date = date(2023, 1, 1)
        doc.file_name = "cert.pdf"
        doc.file_path = "/private_storage/platform/cert.pdf"
        doc.is_deleted = False
        return doc

    def _make_fake_company(self, name="Acme Ltd"):
        company = MagicMock()
        company.company_name = name
        company.is_deleted = False
        return company

    def _run_list(self, expiry_dates):
        """
        Patch the SQLAlchemy query chain so list_expiring_documents processes
        the given expiry dates and returns its serialised rows.
        """
        from backend.app.modules.organization_management import repository as repo

        fake_rows = [
            (self._make_fake_doc(ed), self._make_fake_company())
            for ed in expiry_dates
        ]

        db = MagicMock()
        query_mock = MagicMock()
        db.query.return_value = query_mock
        query_mock.join.return_value = query_mock
        query_mock.filter.return_value = query_mock
        query_mock.order_by.return_value = query_mock
        query_mock.all.return_value = fake_rows

        return repo.list_expiring_documents(db, client_id="client-uuid-1", days_ahead=30)

    def test_expired_doc_has_expiry_status_key(self):
        """An already-expired document row must contain 'expiry_status'."""
        yesterday = date.today() - timedelta(days=1)
        rows = self._run_list([yesterday])
        self.assertEqual(len(rows), 1)
        self.assertIn("expiry_status", rows[0])

    def test_expired_doc_has_correct_status(self):
        """An already-expired document row must carry expiry_status='expired'."""
        yesterday = date.today() - timedelta(days=1)
        rows = self._run_list([yesterday])
        self.assertEqual(rows[0]["expiry_status"], "expired")

    def test_expiring_today_has_expiry_status_key(self):
        """A document expiring today must contain 'expiry_status'."""
        rows = self._run_list([date.today()])
        self.assertIn("expiry_status", rows[0])

    def test_expiring_today_has_correct_status(self):
        """A document expiring today must carry expiry_status='expiring_soon'."""
        rows = self._run_list([date.today()])
        self.assertEqual(rows[0]["expiry_status"], "expiring_soon")

    def test_expiring_in_30_days_has_expiry_status_key(self):
        """A document expiring in exactly 30 days must contain 'expiry_status'."""
        in_30 = date.today() + timedelta(days=30)
        rows = self._run_list([in_30])
        self.assertIn("expiry_status", rows[0])

    def test_expiring_in_30_days_has_correct_status(self):
        """A document expiring in exactly 30 days must carry expiry_status='expiring_soon'."""
        in_30 = date.today() + timedelta(days=30)
        rows = self._run_list([in_30])
        self.assertEqual(rows[0]["expiry_status"], "expiring_soon")

    def test_multiple_rows_all_have_expiry_status(self):
        """
        When multiple documents are returned, every row must contain 'expiry_status'
        regardless of date — no row may silently omit the field.
        """
        dates = [
            date.today() - timedelta(days=1),
            date.today(),
            date.today() + timedelta(days=15),
            date.today() + timedelta(days=30),
        ]
        rows = self._run_list(dates)
        self.assertEqual(len(rows), 4)
        for row in rows:
            with self.subTest(row_expiry=row.get("expiry_date")):
                self.assertIn("expiry_status", row)
                self.assertIn(row["expiry_status"], {"expired", "expiring_soon", "valid"})

    def test_empty_result_does_not_raise(self):
        """An empty query result must return an empty list, not raise."""
        rows = self._run_list([])
        self.assertEqual(rows, [])


# ---------------------------------------------------------------------------
# Agreement test — repository output must match _compute_expiry_status exactly
# ---------------------------------------------------------------------------

class TestRepositoryAgreesWithServiceHelper(unittest.TestCase):
    """
    Confirm that expiry_status values returned by list_expiring_documents
    (repository) agree with _compute_expiry_status (service) for every
    boundary date.  If someone changes _EXPIRY_SOON_DAYS in service.py this
    test will fail, making the drift visible immediately.
    """

    def _run_list(self, expiry_dates):
        from backend.app.modules.organization_management import repository as repo
        from unittest.mock import MagicMock
        from datetime import date as _date

        fake_rows = []
        for ed in expiry_dates:
            doc = MagicMock()
            doc.id = "doc-1"
            doc.company_id = "co-1"
            doc.doc_type = "GST Certificate"
            doc.doc_number = "NUM"
            doc.expiry_date = ed
            doc.issue_date = _date(2023, 1, 1)
            doc.file_name = "f.pdf"
            doc.file_path = "/private_storage/f.pdf"
            doc.is_deleted = False
            company = MagicMock()
            company.company_name = "Acme"
            company.is_deleted = False
            fake_rows.append((doc, company))

        db = MagicMock()
        q = MagicMock()
        db.query.return_value = q
        q.join.return_value = q
        q.filter.return_value = q
        q.order_by.return_value = q
        q.all.return_value = fake_rows

        return repo.list_expiring_documents(db, client_id="c1", days_ahead=30)

    def test_boundary_dates_agree_with_service_helper(self):
        """
        For every boundary date the expiry_status from list_expiring_documents
        (repository) must equal the value produced by _compute_expiry_status
        (service).  This is the single assertion that catches any divergence
        between the two implementations.
        """
        from backend.app.modules.organization_management.service import (
            _compute_expiry_status,
        )

        boundary_dates = [
            date.today() - timedelta(days=730),
            date.today() - timedelta(days=1),
            date.today(),
            date.today() + timedelta(days=1),
            date.today() + timedelta(days=15),
            date.today() + timedelta(days=30),
        ]

        rows = self._run_list(boundary_dates)
        self.assertEqual(len(rows), len(boundary_dates))

        for row, bd in zip(rows, boundary_dates):
            expected = _compute_expiry_status(bd)
            with self.subTest(expiry_date=bd, expected=expected):
                self.assertEqual(
                    row["expiry_status"],
                    expected,
                    msg=(
                        f"list_expiring_documents returned '{row['expiry_status']}' "
                        f"but _compute_expiry_status returned '{expected}' "
                        f"for expiry_date={bd}"
                    ),
                )


if __name__ == "__main__":
    unittest.main()
