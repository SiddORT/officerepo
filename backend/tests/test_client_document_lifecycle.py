"""
Tests for client document Replace and Delete file lifecycle.

Covers:
- replace_document: new file saved, old storage key deleted, DB row updated
- delete_document: DB row soft-deleted, storage key returned for deletion
- replace with invalid document_id: 404 raised before any file is written
- router-level delete: delete_file called with correct key and visibility
"""
import types
import unittest
from datetime import datetime
from unittest.mock import MagicMock, patch, call

from fastapi import HTTPException


class _FakeDoc:
    """Minimal stand-in for a ClientDocument ORM row."""

    def __init__(self, doc_id, file_path, file_name):
        self.id = doc_id
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


def _make_db():
    """Return a mock Session whose commit/refresh are no-ops."""
    db = MagicMock()
    db.commit.return_value = None
    db.refresh.side_effect = lambda obj: None
    return db


# ---------------------------------------------------------------------------
# Service-level tests (no HTTP stack)
# ---------------------------------------------------------------------------

class TestReplaceDocumentService(unittest.TestCase):
    """service.replace_document updates the DB row and returns the old key."""

    def _run(self, doc, new_file_path="platform/client_documents/new.pdf",
             new_file_name="new.pdf"):
        from backend.app.modules.client_management import service

        db = _make_db()

        with (
            patch.object(service, "_require_client", return_value=None),
            patch.object(service.repo, "get_document", return_value=doc),
            patch.object(service, "_journal", return_value=None),
            patch("backend.app.modules.client_management.service.record_audit",
                  return_value=None),
            patch("backend.app.modules.client_management.service.document_to_dict",
                  side_effect=lambda d: {"id": d.id, "file_path": d.file_path,
                                         "file_name": d.file_name}),
        ):
            return service.replace_document(
                db, "client-1", doc.id,
                file_name=new_file_name,
                file_path=new_file_path,
                actor_id=99,
                actor="admin@example.com",
            )

    def test_returns_old_key(self):
        old_key = "platform/client_documents/old_abc.pdf"
        doc = _FakeDoc("doc-1", old_key, "old.pdf")
        old_returned, _ = self._run(doc)
        self.assertEqual(old_returned, old_key)

    def test_db_row_updated_with_new_path(self):
        doc = _FakeDoc("doc-1", "platform/client_documents/old.pdf", "old.pdf")
        new_key = "platform/client_documents/new_xyz.pdf"
        _, result = self._run(doc, new_file_path=new_key, new_file_name="new.pdf")
        self.assertEqual(doc.file_path, new_key)
        self.assertEqual(doc.file_name, "new.pdf")
        self.assertEqual(doc.uploaded_by, 99)

    def test_result_dict_reflects_new_file(self):
        doc = _FakeDoc("doc-2", "platform/client_documents/old.pdf", "old.pdf")
        new_key = "platform/client_documents/replaced.pdf"
        _, result = self._run(doc, new_file_path=new_key, new_file_name="replaced.pdf")
        self.assertEqual(result["file_path"], new_key)
        self.assertEqual(result["file_name"], "replaced.pdf")

    def test_404_when_document_not_found(self):
        from backend.app.modules.client_management import service

        db = _make_db()
        with (
            patch.object(service, "_require_client", return_value=None),
            patch.object(service.repo, "get_document", return_value=None),
        ):
            with self.assertRaises(HTTPException) as ctx:
                service.replace_document(
                    db, "client-1", "nonexistent-doc",
                    file_name="x.pdf",
                    file_path="platform/client_documents/x.pdf",
                    actor_id=1,
                    actor="admin@example.com",
                )
        self.assertEqual(ctx.exception.status_code, 404)

    def test_commit_called_once(self):
        doc = _FakeDoc("doc-3", "platform/client_documents/old.pdf", "old.pdf")
        from backend.app.modules.client_management import service

        db = _make_db()
        with (
            patch.object(service, "_require_client", return_value=None),
            patch.object(service.repo, "get_document", return_value=doc),
            patch.object(service, "_journal", return_value=None),
            patch("backend.app.modules.client_management.service.record_audit",
                  return_value=None),
            patch("backend.app.modules.client_management.service.document_to_dict",
                  return_value={}),
        ):
            service.replace_document(
                db, "client-1", doc.id,
                file_name="new.pdf",
                file_path="platform/client_documents/new.pdf",
                actor_id=1,
                actor="admin@example.com",
            )
        db.commit.assert_called_once()


class TestDeleteDocumentService(unittest.TestCase):
    """service.delete_document soft-deletes the row and returns the storage key."""

    def _run(self, doc):
        from backend.app.modules.client_management import service

        db = _make_db()
        with (
            patch.object(service, "_require_client", return_value=None),
            patch.object(service.repo, "get_document", return_value=doc),
            patch.object(service, "_journal", return_value=None),
            patch("backend.app.modules.client_management.service.record_audit",
                  return_value=None),
        ):
            return service.delete_document(
                db, "client-1", doc.id, actor="admin@example.com"
            ), db

    def test_returns_storage_key(self):
        key = "platform/client_documents/contract.pdf"
        doc = _FakeDoc("doc-4", key, "contract.pdf")
        returned_key, _ = self._run(doc)
        self.assertEqual(returned_key, key)

    def test_row_marked_deleted(self):
        doc = _FakeDoc("doc-5", "platform/client_documents/file.pdf", "file.pdf")
        self._run(doc)
        self.assertTrue(doc.is_deleted)
        self.assertIsNotNone(doc.deleted_at)

    def test_commit_called_once(self):
        doc = _FakeDoc("doc-6", "platform/client_documents/file.pdf", "file.pdf")
        _, db = self._run(doc)
        db.commit.assert_called_once()

    def test_404_when_document_not_found(self):
        from backend.app.modules.client_management import service

        db = _make_db()
        with (
            patch.object(service, "_require_client", return_value=None),
            patch.object(service.repo, "get_document", return_value=None),
        ):
            with self.assertRaises(HTTPException) as ctx:
                service.delete_document(
                    db, "client-1", "ghost-doc", actor="admin@example.com"
                )
        self.assertEqual(ctx.exception.status_code, 404)


# ---------------------------------------------------------------------------
# Router-level tests (mock save_document + service + delete_file)
# ---------------------------------------------------------------------------

class TestReplaceDocumentRouter(unittest.TestCase):
    """Router calls delete_file with the old key after a successful replace."""

    def _invoke_router(self, service_side_effect=None, service_return=None):
        """
        Drive the router function directly (bypasses HTTP stack).
        Returns the (mock_save, mock_del, result_or_exception) triple.
        """
        from backend.app.modules.client_management import router as r
        from backend.shared.storage.file_handler import Visibility

        fake_file = MagicMock()
        old_key = "platform/client_documents/old.pdf"
        new_key = "platform/client_documents/new.pdf"

        with (
            patch("backend.app.modules.client_management.router.save_document",
                  return_value=(new_key, "new.pdf")) as mock_save,
            patch("backend.app.modules.client_management.router.service") as mock_svc,
            patch("backend.app.modules.client_management.router.delete_file") as mock_del,
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
                    r.replace_document("client-1", "doc-7", file=fake_file,
                                       db=db, admin=admin)
                return mock_save, mock_del, ctx.exception
            else:
                result = r.replace_document("client-1", "doc-7", file=fake_file,
                                            db=db, admin=admin)
                return mock_save, mock_del, result

    def test_old_file_deleted_after_successful_replace(self):
        from backend.shared.storage.file_handler import Visibility

        mock_save, mock_del, _ = self._invoke_router()
        mock_del.assert_called_once_with(
            "platform/client_documents/old.pdf", Visibility.PRIVATE
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

        new_key = "platform/client_documents/new.pdf"
        mock_save, mock_del, exc = self._invoke_router(
            service_side_effect=HTTPException(status_code=404, detail="Document not found.")
        )
        mock_del.assert_called_once_with(new_key, Visibility.PRIVATE)
        self.assertEqual(exc.status_code, 404)


class TestDeleteDocumentRouter(unittest.TestCase):
    """Router calls delete_file with the key returned by service.delete_document."""

    def _invoke_router(self, service_return_key="platform/client_documents/old.pdf"):
        from backend.app.modules.client_management import router as r

        with (
            patch("backend.app.modules.client_management.router.service") as mock_svc,
            patch("backend.app.modules.client_management.router.delete_file") as mock_del,
        ):
            mock_svc.delete_document.return_value = service_return_key

            db = MagicMock()
            admin = {"user_id": 1, "email": "admin@example.com"}
            result = r.delete_document("client-1", "doc-8", db=db, admin=admin)
            return mock_del, result

    def test_file_deleted_with_private_visibility(self):
        from backend.shared.storage.file_handler import Visibility

        key = "platform/client_documents/contract.pdf"
        mock_del, _ = self._invoke_router(service_return_key=key)
        mock_del.assert_called_once_with(key, Visibility.PRIVATE)

    def test_returns_ok_response(self):
        _, result = self._invoke_router()
        self.assertEqual(result["success"], True)


# ---------------------------------------------------------------------------
# Storage-level unit tests (delete_file helper)
# ---------------------------------------------------------------------------

class TestDeleteFileHelper(unittest.TestCase):
    """delete_file delegates to the storage driver and normalizes legacy paths."""

    def test_delete_called_for_rootless_key(self):
        from backend.shared.storage import file_handler as fh
        from backend.shared.storage.file_handler import Visibility

        with patch.object(fh.storage, "delete") as mock_delete:
            fh.delete_file("platform/client_documents/abc.pdf", Visibility.PRIVATE)
            mock_delete.assert_called_once_with(
                "platform/client_documents/abc.pdf", Visibility.PRIVATE
            )

    def test_delete_normalizes_legacy_prefixed_key(self):
        from backend.shared.storage import file_handler as fh
        from backend.shared.storage.file_handler import Visibility

        legacy = "private_storage/platform/client_documents/legacy.pdf"
        with patch.object(fh.storage, "delete") as mock_delete:
            fh.delete_file(legacy, Visibility.PRIVATE)
            mock_delete.assert_called_once_with(
                "platform/client_documents/legacy.pdf", Visibility.PRIVATE
            )

    def test_delete_skips_when_key_is_none(self):
        from backend.shared.storage import file_handler as fh
        from backend.shared.storage.file_handler import Visibility

        with patch.object(fh.storage, "delete") as mock_delete:
            fh.delete_file(None, Visibility.PRIVATE)
            mock_delete.assert_not_called()

    def test_delete_skips_when_key_is_empty(self):
        from backend.shared.storage import file_handler as fh
        from backend.shared.storage.file_handler import Visibility

        with patch.object(fh.storage, "delete") as mock_delete:
            fh.delete_file("", Visibility.PRIVATE)
            mock_delete.assert_not_called()

    def test_local_driver_unlinks_existing_file(self):
        """LocalStorage.delete actually removes the file when it exists."""
        import tempfile
        from pathlib import Path
        from backend.shared.storage.file_handler import LocalStorage, Visibility

        with tempfile.TemporaryDirectory() as tmp:
            driver = LocalStorage(
                public_root=Path(tmp) / "public",
                private_root=Path(tmp) / "private",
                public_url_base="/uploads",
            )
            key = "platform/client_documents/test.pdf"
            driver.save(key, b"data", Visibility.PRIVATE)
            self.assertTrue(driver.exists(key, Visibility.PRIVATE))
            driver.delete(key, Visibility.PRIVATE)
            self.assertFalse(driver.exists(key, Visibility.PRIVATE))

    def test_local_driver_delete_nonexistent_does_not_raise(self):
        """LocalStorage.delete is a no-op (with warning) if the file is gone."""
        import tempfile
        from pathlib import Path
        from backend.shared.storage.file_handler import LocalStorage, Visibility

        with tempfile.TemporaryDirectory() as tmp:
            driver = LocalStorage(
                public_root=Path(tmp) / "public",
                private_root=Path(tmp) / "private",
                public_url_base="/uploads",
            )
            driver.delete("platform/client_documents/ghost.pdf", Visibility.PRIVATE)


if __name__ == "__main__":
    unittest.main()
