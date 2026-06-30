"""
Tests for lead proposal file Replace lifecycle and add-proposal cleanup.

Covers:
- replace_proposal (service): new file saved, old storage key returned, DB row updated
- replace_proposal (service): returns None old key when proposal had no prior document
- replace_proposal (service): 404 when proposal_id is invalid
- replace_proposal (router): delete_file called with old key after successful replace
- replace_proposal (router): newly saved file cleaned up when service raises 404
- replace_proposal (router): no delete_file call for old key when proposal had no prior file
- add_proposal (router): newly saved file cleaned up when service raises (lead not found)
- add_proposal (router): no cleanup when no file was uploaded
"""
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch, call

from fastapi import HTTPException


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _FakeProposal:
    """Minimal stand-in for a LeadProposal ORM row."""

    def __init__(self, proposal_id, doc_path):
        self.id = proposal_id
        self.lead_id = "lead-1"
        self.proposal_document_path = doc_path
        self.proposal_version = 1
        self.proposal_date = datetime(2026, 1, 1)
        self.quoted_amount = 5000.0
        self.modules_included = "HR, Payroll"
        self.status = "Draft"
        self.created_by = None
        self.is_deleted = False
        self.deleted_at = None
        self.created_at = datetime(2026, 1, 1)
        self.updated_at = datetime(2026, 1, 2)

    def __repr__(self):
        return f"<_FakeProposal id={self.id}>"


class _FakeLead:
    """Minimal stand-in for a Lead ORM row."""

    def __init__(self):
        self.id = "lead-1"
        self.is_deleted = False
        self.lead_number = "LEAD-20260101-ABCD1234"
        self.current_stage = "Qualified"
        self.proposal_date = None


def _make_db():
    """Return a mock Session whose commit/refresh are no-ops."""
    db = MagicMock()
    db.commit.return_value = None
    db.refresh.side_effect = lambda obj: None
    return db


# ---------------------------------------------------------------------------
# Service-level tests — replace_proposal
# ---------------------------------------------------------------------------

class TestReplaceProposalService(unittest.TestCase):
    """service.replace_proposal updates the DB row and returns the old key."""

    def _run(self, proposal, new_file_path="platform/lead_proposals/new.pdf"):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=proposal),
            patch("backend.app.modules.lead_management.service.proposal_to_dict",
                  side_effect=lambda p: {
                      "id": p.id,
                      "proposal_document_path": p.proposal_document_path,
                  }),
        ):
            return service.replace_proposal(
                db, "lead-1", proposal.id,
                file_name="new.pdf",
                file_path=new_file_path,
                actor_id=99,
            )

    def test_returns_old_key(self):
        old_key = "platform/lead_proposals/old_abc.pdf"
        proposal = _FakeProposal("prop-1", old_key)
        old_returned, _ = self._run(proposal)
        self.assertEqual(old_returned, old_key)

    def test_db_row_updated_with_new_path(self):
        proposal = _FakeProposal("prop-2", "platform/lead_proposals/old.pdf")
        new_key = "platform/lead_proposals/new_xyz.pdf"
        _, result = self._run(proposal, new_file_path=new_key)
        self.assertEqual(proposal.proposal_document_path, new_key)

    def test_result_dict_reflects_new_file(self):
        proposal = _FakeProposal("prop-3", "platform/lead_proposals/old.pdf")
        new_key = "platform/lead_proposals/replaced.pdf"
        _, result = self._run(proposal, new_file_path=new_key)
        self.assertEqual(result["proposal_document_path"], new_key)

    def test_returns_none_old_key_when_no_prior_document(self):
        """A proposal that had no prior file should return None as the old key."""
        proposal = _FakeProposal("prop-4", None)
        old_key, _ = self._run(proposal, new_file_path="platform/lead_proposals/first.pdf")
        self.assertIsNone(old_key)

    def test_404_when_proposal_not_found(self):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=None),
        ):
            with self.assertRaises(HTTPException) as ctx:
                service.replace_proposal(
                    db, "lead-1", "nonexistent-proposal",
                    file_name="x.pdf",
                    file_path="platform/lead_proposals/x.pdf",
                    actor_id=1,
                )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_commit_called_once(self):
        proposal = _FakeProposal("prop-5", "platform/lead_proposals/old.pdf")
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=proposal),
            patch("backend.app.modules.lead_management.service.proposal_to_dict",
                  return_value={}),
        ):
            service.replace_proposal(
                db, "lead-1", proposal.id,
                file_name="new.pdf",
                file_path="platform/lead_proposals/new.pdf",
                actor_id=1,
            )
        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Router-level tests — replace_proposal
# ---------------------------------------------------------------------------

class TestReplaceProposalRouter(unittest.TestCase):
    """Router calls delete_file with the old key after a successful replace."""

    OLD_KEY = "platform/lead_proposals/old.pdf"
    NEW_KEY = "platform/lead_proposals/new.pdf"

    def _invoke_router(self, service_side_effect=None, old_key=OLD_KEY):
        from backend.app.modules.lead_management import router as r
        from backend.shared.storage.file_handler import Visibility

        fake_file = MagicMock()

        with (
            patch("backend.app.modules.lead_management.router.save_document",
                  return_value=(self.NEW_KEY, "new.pdf")) as mock_save,
            patch("backend.app.modules.lead_management.router.service") as mock_svc,
            patch("backend.app.modules.lead_management.router.delete_file") as mock_del,
        ):
            if service_side_effect:
                mock_svc.replace_proposal.side_effect = service_side_effect
            else:
                mock_svc.replace_proposal.return_value = (
                    old_key,
                    {"id": "prop-6", "proposal_document_path": self.NEW_KEY},
                )

            db = MagicMock()
            admin = {"user_id": 1, "email": "admin@example.com"}

            if service_side_effect:
                with self.assertRaises(Exception) as ctx:
                    r.replace_proposal("lead-1", "prop-6", file=fake_file,
                                       db=db, admin=admin)
                return mock_save, mock_del, ctx.exception
            else:
                result = r.replace_proposal("lead-1", "prop-6", file=fake_file,
                                            db=db, admin=admin)
                return mock_save, mock_del, result

    def test_old_file_deleted_after_successful_replace(self):
        from backend.shared.storage.file_handler import Visibility

        mock_save, mock_del, _ = self._invoke_router()
        mock_del.assert_called_once_with(self.OLD_KEY, Visibility.PRIVATE)

    def test_new_file_saved_before_db_update(self):
        mock_save, mock_del, _ = self._invoke_router()
        mock_save.assert_called_once()

    def test_newly_saved_file_deleted_when_proposal_not_found(self):
        """
        If the service raises 404 (invalid proposal_id), the router must delete
        the newly saved file to prevent it from being orphaned on disk.
        The old file is untouched — only the new upload is cleaned up.
        """
        from backend.shared.storage.file_handler import Visibility

        mock_save, mock_del, exc = self._invoke_router(
            service_side_effect=HTTPException(status_code=404, detail="Proposal not found.")
        )
        mock_del.assert_called_once_with(self.NEW_KEY, Visibility.PRIVATE)
        self.assertEqual(exc.status_code, 404)

    def test_no_old_file_delete_when_proposal_had_no_prior_document(self):
        """
        When old_key is None (proposal never had a file), delete_file must
        not be called for the old key — only the new file should be stored.
        """
        mock_save, mock_del, _ = self._invoke_router(old_key=None)
        mock_del.assert_not_called()

    def test_returns_ok_response_on_success(self):
        mock_save, mock_del, result = self._invoke_router()
        self.assertTrue(result["success"])


# ---------------------------------------------------------------------------
# Router-level tests — add_proposal file cleanup
# ---------------------------------------------------------------------------

class TestAddProposalRouterCleanup(unittest.TestCase):
    """
    Router's add_proposal must delete the newly saved file when service raises,
    and must not call delete_file when no file was uploaded.
    """

    FILE_KEY = "platform/lead_proposals/uploaded.pdf"

    def _invoke_router(self, *, has_file=True, service_side_effect=None):
        from backend.app.modules.lead_management import router as r

        fake_file = MagicMock()
        fake_file.filename = "report.pdf"

        with (
            patch("backend.app.modules.lead_management.router.save_document",
                  return_value=(self.FILE_KEY, "report.pdf")) as mock_save,
            patch("backend.app.modules.lead_management.router.service") as mock_svc,
            patch("backend.app.modules.lead_management.router.delete_file") as mock_del,
        ):
            if service_side_effect:
                mock_svc.add_proposal.side_effect = service_side_effect
            else:
                mock_svc.add_proposal.return_value = {"id": "prop-new"}

            db = MagicMock()
            admin = {"user_id": 1, "email": "admin@example.com"}

            if service_side_effect:
                with self.assertRaises(Exception) as ctx:
                    r.add_proposal(
                        lead_id="lead-1",
                        proposal_date=None,
                        quoted_amount=None,
                        modules_included=None,
                        status="Draft",
                        file=fake_file if has_file else None,
                        db=db,
                        admin=admin,
                    )
                return mock_save, mock_del, ctx.exception
            else:
                result = r.add_proposal(
                    lead_id="lead-1",
                    proposal_date=None,
                    quoted_amount=None,
                    modules_included=None,
                    status="Draft",
                    file=fake_file if has_file else None,
                    db=db,
                    admin=admin,
                )
                return mock_save, mock_del, result

    def test_newly_saved_file_deleted_when_service_raises(self):
        """If the service raises after the file was saved, the file must be cleaned up."""
        from backend.shared.storage.file_handler import Visibility

        mock_save, mock_del, exc = self._invoke_router(
            has_file=True,
            service_side_effect=HTTPException(status_code=404, detail="Lead not found.")
        )
        mock_del.assert_called_once_with(self.FILE_KEY, Visibility.PRIVATE)
        self.assertEqual(exc.status_code, 404)

    def test_no_cleanup_when_no_file_uploaded_and_service_raises(self):
        """If no file was uploaded, delete_file must not be called even if service raises."""
        mock_save, mock_del, exc = self._invoke_router(
            has_file=False,
            service_side_effect=HTTPException(status_code=404, detail="Lead not found.")
        )
        mock_del.assert_not_called()

    def test_no_cleanup_on_success(self):
        """On success with a file, delete_file must not be called."""
        mock_save, mock_del, result = self._invoke_router(has_file=True)
        mock_del.assert_not_called()


if __name__ == "__main__":
    unittest.main()
