"""Unit tests for lead scoring logic (pure point helpers + compute_score)."""
import types
import unittest
from unittest.mock import MagicMock, patch

from backend.app.modules.lead_management import constants as c
from backend.app.modules.lead_management import service


class TestPointHelpers(unittest.TestCase):
    def test_company_size_points_tiers(self):
        self.assertEqual(service._company_size_points(None), 0)
        self.assertEqual(service._company_size_points("5"), 2)
        self.assertEqual(service._company_size_points("10-20"), 4)
        self.assertEqual(service._company_size_points("100"), 8)
        self.assertEqual(service._company_size_points("250"), 12)
        self.assertEqual(service._company_size_points("1000+"), 15)

    def test_users_points_tiers(self):
        self.assertEqual(service._users_points(None), 0)
        self.assertEqual(service._users_points(5), 3)
        self.assertEqual(service._users_points(25), 6)
        self.assertEqual(service._users_points(100), 10)
        self.assertEqual(service._users_points(500), 15)

    def test_revenue_points_tiers(self):
        self.assertEqual(service._revenue_points(None), 0)
        self.assertEqual(service._revenue_points(0), 0)
        self.assertEqual(service._revenue_points(5_000), 6)
        self.assertEqual(service._revenue_points(10_000), 12)
        self.assertEqual(service._revenue_points(50_000), 18)
        self.assertEqual(service._revenue_points(100_000), 25)


def _lead(**kw):
    base = dict(
        id="lead-1",
        expected_revenue=None,
        company_size=None,
        expected_user_count=None,
        score_label_override=None,
        lead_score=0,
        lead_score_label=None,
    )
    base.update(kw)
    return types.SimpleNamespace(**base)


class TestComputeScore(unittest.TestCase):
    def _run(self, *, demos, proposals, lead):
        mock_repo = MagicMock()
        mock_repo.list_demos.return_value = demos
        mock_repo.list_proposals.return_value = proposals
        with patch.object(service, "repo", mock_repo):
            return service.compute_score(MagicMock(), lead)

    def test_cold_lead_low_signals(self):
        score, label = self._run(demos=[], proposals=[], lead=_lead())
        self.assertEqual(score, 0)
        self.assertEqual(label, c.SCORE_LABEL_COLD)

    def test_hot_lead_full_signals(self):
        demo = types.SimpleNamespace(status=c.DEMO_STATUS_COMPLETED)
        proposal = types.SimpleNamespace(status=c.PROPOSAL_STATUS_SENT)
        lead = _lead(expected_revenue=100_000, company_size="1000", expected_user_count=500)
        score, label = self._run(demos=[demo], proposals=[proposal], lead=lead)
        # 30 + 25 + 25 + 15 + 15 = 110 -> clamped to 100
        self.assertEqual(score, 100)
        self.assertEqual(label, c.SCORE_LABEL_HOT)

    def test_score_is_clamped_to_100(self):
        demo = types.SimpleNamespace(status=c.DEMO_STATUS_COMPLETED)
        proposal = types.SimpleNamespace(status=c.PROPOSAL_STATUS_ACCEPTED)
        lead = _lead(expected_revenue=999_999, company_size="9999", expected_user_count=9999)
        score, _ = self._run(demos=[demo], proposals=[proposal], lead=lead)
        self.assertLessEqual(score, 100)

    def test_warm_threshold(self):
        # scheduled demo (10) + revenue 50k (18) + size 100 (8) = 36 -> cold;
        # add users 100 (10) => 46 -> warm
        demo = types.SimpleNamespace(status="Scheduled")
        lead = _lead(expected_revenue=50_000, company_size="100", expected_user_count=100)
        score, label = self._run(demos=[demo], proposals=[], lead=lead)
        self.assertGreaterEqual(score, c.SCORE_WARM_THRESHOLD)
        self.assertLess(score, c.SCORE_HOT_THRESHOLD)
        self.assertEqual(label, c.SCORE_LABEL_WARM)


class TestRecomputeScoreOverride(unittest.TestCase):
    def test_manual_override_wins_for_label(self):
        mock_repo = MagicMock()
        mock_repo.list_demos.return_value = []
        mock_repo.list_proposals.return_value = []
        lead = _lead(score_label_override=c.SCORE_LABEL_HOT)
        with patch.object(service, "repo", mock_repo):
            service._recompute_score(MagicMock(), lead)
        # computed label would be Cold, but override forces Hot
        self.assertEqual(lead.lead_score_label, c.SCORE_LABEL_HOT)
        self.assertEqual(lead.lead_score, 0)

    def test_no_override_uses_computed_label(self):
        mock_repo = MagicMock()
        mock_repo.list_demos.return_value = []
        mock_repo.list_proposals.return_value = []
        lead = _lead(score_label_override=None)
        with patch.object(service, "repo", mock_repo):
            service._recompute_score(MagicMock(), lead)
        self.assertEqual(lead.lead_score_label, c.SCORE_LABEL_COLD)


if __name__ == "__main__":
    unittest.main()
