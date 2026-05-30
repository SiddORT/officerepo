"""
Lifecycle tests for the RBAC user/invitation state machine.

These cover the invariants that distinguish a *pending* invite (never accepted —
removable / re-sendable) from an *onboarded* account (accepted invite, or a
legacy/seeded admin with no invitation row — reactivatable, never hard-deleted):

  - status derivation (active / inactive / invited / expired)
  - set_user_active: pending users cannot be activated; onboarded (incl. legacy
    no-invite) users can be reactivated; no-op toggles rejected; no self-deactivate
  - delete_pending_user: only never-accepted users; onboarded users protected
  - resend_invite: blocked once the account is onboarded

The suite uses an in-memory SQLite DB so it runs without PostgreSQL.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ROOT_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

from fastapi import HTTPException  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from backend.app.database.platform import Base  # noqa: E402
from backend.app.modules.rbac import constants as c  # noqa: E402
from backend.app.modules.rbac import service, repository as repo  # noqa: E402
from backend.app.modules.rbac.models import (  # noqa: E402
    AdminInvitation, Permission, Role, RolePermission, AdminRole,
)
from backend.app.platform.superadmin.models import SuperAdmin  # noqa: E402
from backend.shared.audit.models import AuditLog  # noqa: E402


_TABLES = [
    SuperAdmin.__table__, AdminInvitation.__table__, Permission.__table__,
    Role.__table__, RolePermission.__table__, AdminRole.__table__, AuditLog.__table__,
]


def _fake_inv(*, accepted=False, revoked=False, expired=False) -> AdminInvitation:
    """An unpersisted invitation row for pure status-derivation tests."""
    now = datetime.utcnow()
    return AdminInvitation(
        admin_id=1, email="x@y.com", token_hash="h",
        expires_at=now - timedelta(hours=1) if expired else now + timedelta(days=3),
        accepted_at=now if accepted else None,
        is_revoked=revoked,
    )


class StatusDerivationTests(unittest.TestCase):
    """`_invitation_status` / `_is_onboarded` pure-function matrix."""

    def test_active_account(self):
        admin = SuperAdmin(is_active=True)
        self.assertEqual(service._invitation_status(admin, _fake_inv()),
                         c.USER_STATUS_ACTIVE)

    def test_pending_invite_is_invited(self):
        admin = SuperAdmin(is_active=False)
        self.assertEqual(service._invitation_status(admin, _fake_inv()),
                         c.USER_STATUS_INVITED)

    def test_expired_unaccepted_invite_is_expired(self):
        admin = SuperAdmin(is_active=False)
        self.assertEqual(service._invitation_status(admin, _fake_inv(expired=True)),
                         c.USER_STATUS_EXPIRED)

    def test_revoked_unaccepted_invite_is_expired(self):
        admin = SuperAdmin(is_active=False)
        self.assertEqual(service._invitation_status(admin, _fake_inv(revoked=True)),
                         c.USER_STATUS_EXPIRED)

    def test_accepted_then_deactivated_is_inactive(self):
        admin = SuperAdmin(is_active=False)
        self.assertEqual(service._invitation_status(admin, _fake_inv(accepted=True)),
                         c.USER_STATUS_INACTIVE)

    def test_legacy_no_invite_deactivated_is_inactive(self):
        # A seeded/manual admin (no invitation row) that was deactivated must be
        # reactivatable, not mislabelled as an expired invite.
        admin = SuperAdmin(is_active=False)
        self.assertEqual(service._invitation_status(admin, None),
                         c.USER_STATUS_INACTIVE)

    def test_is_onboarded_matrix(self):
        self.assertTrue(service._is_onboarded(None))                  # legacy/seeded
        self.assertTrue(service._is_onboarded(_fake_inv(accepted=True)))
        self.assertFalse(service._is_onboarded(_fake_inv()))          # pending
        self.assertFalse(service._is_onboarded(_fake_inv(expired=True)))


class LifecycleGuardTests(unittest.TestCase):
    """DB-backed guards on set_user_active / delete_pending_user / resend_invite."""

    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        for t in _TABLES:
            t.create(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()

    # ── helpers ──────────────────────────────────────────────────────────────
    def _admin(self, *, active, email="u@co.com"):
        a = SuperAdmin(email=email, name="U",
                       hashed_password=SuperAdmin.hash_password("x"), is_active=active)
        self.db.add(a)
        self.db.commit()
        self.db.refresh(a)
        return a

    def _invite(self, admin_id, *, accepted=False, revoked=False, token="t"):
        now = datetime.utcnow()
        inv = AdminInvitation(
            admin_id=admin_id, email="u@co.com", token_hash=token,
            expires_at=now + timedelta(days=3),
            accepted_at=now if accepted else None, is_revoked=revoked,
        )
        self.db.add(inv)
        self.db.commit()
        return inv

    # ── set_user_active ──────────────────────────────────────────────────────
    def test_activate_pending_user_blocked(self):
        a = self._admin(active=False)
        self._invite(a.id)  # pending, never accepted
        with self.assertRaises(HTTPException) as ctx:
            service.set_user_active(self.db, a.id, True, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_reactivate_accepted_user_allowed(self):
        a = self._admin(active=False)
        self._invite(a.id, accepted=True)
        out = service.set_user_active(self.db, a.id, True, actor_id=99, actor="t")
        self.assertEqual(out["status"], c.USER_STATUS_ACTIVE)

    def test_reactivate_legacy_no_invite_allowed(self):
        a = self._admin(active=False)  # no invitation row at all
        out = service.set_user_active(self.db, a.id, True, actor_id=99, actor="t")
        self.assertEqual(out["status"], c.USER_STATUS_ACTIVE)

    def test_noop_toggle_rejected(self):
        a = self._admin(active=True)
        with self.assertRaises(HTTPException) as ctx:
            service.set_user_active(self.db, a.id, True, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_cannot_deactivate_self(self):
        a = self._admin(active=True)
        with self.assertRaises(HTTPException) as ctx:
            service.set_user_active(self.db, a.id, False, actor_id=a.id, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    # ── delete_pending_user ──────────────────────────────────────────────────
    def test_delete_pending_invited_user_ok(self):
        a = self._admin(active=False)
        self._invite(a.id)  # never accepted
        service.delete_pending_user(self.db, a.id, actor_id=99, actor="t")
        self.assertIsNone(repo.get_admin(self.db, a.id))

    def test_delete_accepted_deactivated_user_blocked(self):
        a = self._admin(active=False)
        self._invite(a.id, accepted=True)
        with self.assertRaises(HTTPException) as ctx:
            service.delete_pending_user(self.db, a.id, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIsNotNone(repo.get_admin(self.db, a.id))

    def test_delete_active_user_blocked(self):
        a = self._admin(active=True)
        with self.assertRaises(HTTPException) as ctx:
            service.delete_pending_user(self.db, a.id, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_delete_default_superadmin_blocked(self):
        a = self._admin(active=False, email=c.DEFAULT_SUPERADMIN_EMAIL)
        self._invite(a.id)
        with self.assertRaises(HTTPException) as ctx:
            service.delete_pending_user(self.db, a.id, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    # ── resend_invite ────────────────────────────────────────────────────────
    def test_resend_blocked_for_accepted_user(self):
        a = self._admin(active=False)
        self._invite(a.id, accepted=True)
        with self.assertRaises(HTTPException) as ctx:
            service.resend_invite(self.db, a.id, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_resend_blocked_for_active_user(self):
        a = self._admin(active=True)
        with self.assertRaises(HTTPException) as ctx:
            service.resend_invite(self.db, a.id, actor_id=99, actor="t")
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
