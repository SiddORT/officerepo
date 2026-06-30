"""
Tests for lead document Replace and Delete file lifecycle.

Covers:
- replace_document (service): new file saved, old storage key returned, DB row updated
- delete_document (service): DB row soft-deleted, storage key returned
- replace_document (router): delete_file called with old key after successful replace
- replace_document (router): newly saved file cleaned up when document_id is invalid (404)
- replace_document (router): newly saved file cleaned up when db.commit() fails mid-replace
- delete_document (router): delete_file called with the key from the service
"""
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch

from fastapi import HTTPException


class _FakeDoc:
    """Minimal stand-in for a LeadDocument ORM row."""

    def __init__(self, doc_id, file_path, file_name):
        self.id = doc_id
        self.lead_id = "lead-1"
        self.file_path = file_path
        self.file_name = file_name
        self.uploaded_by = None
        self.is_deleted = False
        self.deleted_at = None
        self.document_type = "Contract"
        self.created_at = datetime(2026, 1, 1)
        self.updated_at = datetime(2026, 1, 2)

    def __repr__(self):
        return f"<_FakeDoc id={self.id}>"


class _FakeLead:
    """Minimal stand-in for a Lead ORM row."""

    def __init__(self):
        self.id = "lead-1"
        self.is_deleted = False


def _make_db():
    """Return a mock Session whose commit/refresh are no-ops."""
    db = MagicMock()
    db.commit.return_value = None
    db.refresh.side_effect = lambda obj: None
    return db


# ---------------------------------------------------------------------------
# Service-level tests — replace_document
# ---------------------------------------------------------------------------

class TestReplaceDocumentService(unittest.TestCase):
    """service.replace_document updates the DB row and returns the old key."""

    def _run(self, doc, new_file_path="platform/lead_documents/new.pdf",
             new_file_name="new.pdf"):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=doc),
            patch("backend.app.modules.lead_management.service.document_to_dict",
                  side_effect=lambda d: {"id": d.id, "file_path": d.file_path,
                                         "file_name": d.file_name}),
        ):
            return service.replace_document(
                db, "lead-1", doc.id,
                file_name=new_file_name,
                file_path=new_file_path,
                actor_id=99,
            )

    def test_returns_old_key(self):
        old_key = "platform/lead_documents/old_abc.pdf"
        doc = _FakeDoc("doc-1", old_key, "old.pdf")
        old_returned, _ = self._run(doc)
        self.assertEqual(old_returned, old_key)

    def test_db_row_updated_with_new_path(self):
        doc = _FakeDoc("doc-1", "platform/lead_documents/old.pdf", "old.pdf")
        new_key = "platform/lead_documents/new_xyz.pdf"
        _, result = self._run(doc, new_file_path=new_key, new_file_name="new.pdf")
        self.assertEqual(doc.file_path, new_key)
        self.assertEqual(doc.file_name, "new.pdf")
        self.assertEqual(doc.uploaded_by, 99)

    def test_result_dict_reflects_new_file(self):
        doc = _FakeDoc("doc-2", "platform/lead_documents/old.pdf", "old.pdf")
        new_key = "platform/lead_documents/replaced.pdf"
        _, result = self._run(doc, new_file_path=new_key, new_file_name="replaced.pdf")
        self.assertEqual(result["file_path"], new_key)
        self.assertEqual(result["file_name"], "replaced.pdf")

    def test_404_when_document_not_found(self):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=None),
        ):
            with self.assertRaises(HTTPException) as ctx:
                service.replace_document(
                    db, "lead-1", "nonexistent-doc",
                    file_name="x.pdf",
                    file_path="platform/lead_documents/x.pdf",
                    actor_id=1,
                )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_commit_called_once(self):
        doc = _FakeDoc("doc-3", "platform/lead_documents/old.pdf", "old.pdf")
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=doc),
            patch("backend.app.modules.lead_management.service.document_to_dict",
                  return_value={}),
        ):
            service.replace_document(
                db, "lead-1", doc.id,
                file_name="new.pdf",
                file_path="platform/lead_documents/new.pdf",
                actor_id=1,
            )
        db.commit.assert_called_once()


# ---------------------------------------------------------------------------
# Service-level tests — delete_document
# ---------------------------------------------------------------------------

class TestDeleteDocumentService(unittest.TestCase):
    """service.delete_document soft-deletes the row and returns the storage key."""

    def _run(self, doc):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=doc),
        ):
            return service.delete_document(db, "lead-1", doc.id), db

    def test_returns_storage_key(self):
        key = "platform/lead_documents/contract.pdf"
        doc = _FakeDoc("doc-4", key, "contract.pdf")
        returned_key, _ = self._run(doc)
        self.assertEqual(returned_key, key)

    def test_row_marked_deleted(self):
        doc = _FakeDoc("doc-5", "platform/lead_documents/file.pdf", "file.pdf")
        self._run(doc)
        self.assertTrue(doc.is_deleted)
        self.assertIsNotNone(doc.deleted_at)

    def test_commit_called_once(self):
        doc = _FakeDoc("doc-6", "platform/lead_documents/file.pdf", "file.pdf")
        _, db = self._run(doc)
        db.commit.assert_called_once()

    def test_404_when_document_not_found(self):
        from backend.app.modules.lead_management import service

        db = _make_db()
        fake_lead = _FakeLead()

        with (
            patch.object(service, "_require_lead", return_value=fake_lead),
            patch.object(service.repo, "get_child", return_value=None),
        ):
            with self.assertRaises(HTTPException) as ctx:
                service.delete_document(db, "lead-1", "ghost-doc")
        self.assertEqual(ctx.exception.status_code, 404)


# ---------------------------------------------------------------------------
# Router-level tests — replace_document
# ---------------------------------------------------------------------------

class TestReplaceDocumentRouter(unittest.TestCase):
    """Router calls delete_file with the old key after a successful replace."""

    def _invoke_router(self, service_side_effect=None, service_return=None):
        from backend.app.modules.lead_management import router as r
        from backend.shared.storage.file_handler import Visibility

        fake_file = MagicMock()
        old_key = "platform/lead_documents/old.pdf"
        new_key = "platform/lead_documents/new.pdf"

        with (
            patch("backend.app.modules.lead_management.router.save_document",
                  return_value=(new_key, "new.pdf")) as mock_save,
            patch("backend.app.modules.lead_management.router.service") as mock_svc,
            patch("backend.app.modules.lead_management.router.delete_file") as mock_del,
        ):
            if service_side_effect:
                mock_svc.replace_document.side_effect = service_side_effect
            else:
                mock_svc.replace_document.return_value = (
                    old_key,
                    service_return or {"id": "doc-7", "file_path": new_key},
                )

            db = MagicMock()
            admin = {"user_id": 1, "email": "admin@example.com"}

            if service_side_effect:
                with self.assertRaises(Exception) as ctx:
                    r.replace_document("lead-1", "doc-7", file=fake_file,
                                       db=db, admin=admin)
                return mock_save, mock_del, ctx.exception
            else:
                result = r.replace_document("lead-1", "doc-7", file=fake_file,
                                            db=db, admin=admin)
                return mock_save, mock_del, result

    def test_old_file_deleted_after_successful_replace(self):
        from backend.shared.storage.file_handler import Visibility

        mock_save, mock_del, _ = self._invoke_router()
        mock_del.assert_called_once_with(
            "platform/lead_documents/old.pdf", Visibility.PRIVATE
        )

    def test_new_file_saved_before_db_update(self):
        """save_document must be called so the new file lands on disk."""
        mock_save, mock_del, _ = self._invoke_router()
        mock_save.assert_called_once()

    def test_newly_saved_file_deleted_when_document_not_found(self):
        """
        If the service raises 404 (invalid document_id), the router must delete
        the *newly* saved file to prevent it from being orphaned on disk.
        The old file is untouched — only the new upload is cleaned up.
        """
        from backend.shared.storage.file_handler import Visibility

        new_key = "platform/lead_documents/new.pdf"
        mock_save, mock_del, exc = self._invoke_router(
            service_side_effect=HTTPException(status_code=404, detail="Document not found.")
        )
        mock_del.assert_called_once_with(new_key, Visibility.PRIVATE)
        self.assertEqual(exc.status_code, 404)

    def test_newly_saved_file_deleted_when_db_commit_fails(self):
        """
        Partial-failure guard: if db.commit() raises inside service.replace_document
        (e.g. a DB timeout), the new file is already persisted to storage but the DB
        row still holds the old key.  The router's except block must call delete_file
        on the *newly* saved key so it doesn't become an orphan, and must re-raise so
        the caller receives the error.
        """
        from backend.shared.storage.file_handler import Visibility

        new_key = "platform/lead_documents/new.pdf"

        # Simulate a DB commit timeout propagating out of service.replace_document.
        db_commit_error = RuntimeError("DB timeout during commit")

        mock_save, mock_del, exc = self._invoke_router(
            service_side_effect=db_commit_error
        )

        # The newly uploaded file must be cleaned up.
        mock_del.assert_called_once_with(new_key, Visibility.PRIVATE)

        # The original exception must be re-raised (not swallowed).
        self.assertIs(exc, db_commit_error)


# ---------------------------------------------------------------------------
# Router-level tests — delete_document
# ---------------------------------------------------------------------------

class TestDeleteDocumentRouter(unittest.TestCase):
    """Router calls delete_file with the key returned by service.delete_document."""

    def _invoke_router(self, service_return_key="platform/lead_documents/old.pdf"):
        from backend.app.modules.lead_management import router as r

        with (
            patch("backend.app.modules.lead_management.router.service") as mock_svc,
            patch("backend.app.modules.lead_management.router.delete_file") as mock_del,
        ):
            mock_svc.delete_document.return_value = service_return_key

            db = MagicMock()
            result = r.delete_document("lead-1", "doc-8", db=db,
                                       _admin={"user_id": 1, "email": "admin@example.com"})
            return mock_del, result

    def test_file_deleted_with_private_visibility(self):
        from backend.shared.storage.file_handler import Visibility

        key = "platform/lead_documents/contract.pdf"
        mock_del, _ = self._invoke_router(service_return_key=key)
        mock_del.assert_called_once_with(key, Visibility.PRIVATE)

    def test_returns_ok_response(self):
        _, result = self._invoke_router()
        self.assertEqual(result["success"], True)


if __name__ == "__main__":
    unittest.main()
