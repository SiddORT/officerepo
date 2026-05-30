"""Unit tests for conversion metric calculations (pure logic)."""
import types
import unittest
from datetime import datetime, timedelta

from backend.app.modules.lead_management import service


class TestDaysBetween(unittest.TestCase):
    def test_returns_none_on_missing(self):
        self.assertIsNone(service._days_between(None, datetime.utcnow()))
        self.assertIsNone(service._days_between(datetime.utcnow(), None))

    def test_positive_difference(self):
        earlier = datetime(2026, 1, 1)
        later = datetime(2026, 1, 11)
        self.assertEqual(service._days_between(later, earlier), 10)

    def test_never_negative(self):
        earlier = datetime(2026, 1, 11)
        later = datetime(2026, 1, 1)
        self.assertEqual(service._days_between(later, earlier), 0)


class TestComputeMetrics(unittest.TestCase):
    def test_full_lifecycle(self):
        created = datetime.utcnow() - timedelta(days=30)
        lead = types.SimpleNamespace(
            created_at=created,
            demo_date=created + timedelta(days=5),
            proposal_date=created + timedelta(days=12),
            won_date=created + timedelta(days=20),
            conversion_date=created + timedelta(days=25),
        )
        m = service.compute_metrics(lead)
        self.assertEqual(m["time_to_demo_days"], 5)
        self.assertEqual(m["time_to_proposal_days"], 12)
        self.assertEqual(m["sales_cycle_days"], 20)
        self.assertEqual(m["time_to_conversion_days"], 25)
        self.assertGreaterEqual(m["lead_age_days"], 30)

    def test_partial_lifecycle_returns_none_for_missing(self):
        created = datetime.utcnow() - timedelta(days=3)
        lead = types.SimpleNamespace(
            created_at=created,
            demo_date=None,
            proposal_date=None,
            won_date=None,
            conversion_date=None,
        )
        m = service.compute_metrics(lead)
        self.assertIsNone(m["time_to_demo_days"])
        self.assertIsNone(m["sales_cycle_days"])
        self.assertIsNone(m["time_to_conversion_days"])
        self.assertGreaterEqual(m["lead_age_days"], 3)


if __name__ == "__main__":
    unittest.main()
