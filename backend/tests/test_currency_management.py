"""
End-to-end tests for Currency Management.

Covers the invariants that were previously only verified by hand with curl:

  - create currency: persists the currency, seeds a 1:1 current rate, and writes
    one rate-history row + an audit entry
  - set-base: only ONE currency is the base at a time (promoting demotes the old
    base) and the change is audited
  - rate override: updating a rate appends a history row and flags the current
    rate as a manual override
  - soft delete: the base currency cannot be deleted
  - permission gating: the currency endpoints return 403 when the caller lacks the
    relevant ``currency.*`` permission, and pass once the permission is granted

Service-layer tests use an in-memory SQLite DB so they run without PostgreSQL.
Permission-gating tests drive the real FastAPI app through TestClient with the
platform-DB dependency overridden to the same in-memory engine.
"""
import os
import sys
import unittest

_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_ROOT_DIR = os.path.abspath(os.path.join(_BACKEND_DIR, ".."))
if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

from unittest.mock import patch  # noqa: E402

from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from backend.app.database.platform import Base  # noqa: E402
from backend.app.modules.currency_management import constants as c  # noqa: E402
from backend.app.modules.currency_management import repository as repo  # noqa: E402
from backend.app.modules.currency_management import service  # noqa: E402
from backend.app.modules.currency_management.models import (  # noqa: E402
    Currency, CurrencyRate, CurrencyRateHistory, CurrencySyncLog,
)
from backend.app.modules.currency_management.schemas import (  # noqa: E402
    CurrencyCreateRequest, RateUpdateRequest,
)
from backend.app.modules.currency_management import providers as providers_pkg  # noqa: E402
from backend.app.modules.currency_management.providers.base import (  # noqa: E402
    ExchangeRateProvider, ProviderResult,
)
from backend.app.modules.rbac.models import (  # noqa: E402
    Permission, Role, RolePermission, AdminRole,
)
from backend.app.platform.superadmin.models import SuperAdmin  # noqa: E402
from backend.shared.audit.models import AuditLog  # noqa: E402


_TABLES = [
    Currency.__table__, CurrencyRate.__table__, CurrencyRateHistory.__table__,
    CurrencySyncLog.__table__, AuditLog.__table__,
    SuperAdmin.__table__, Permission.__table__, Role.__table__,
    RolePermission.__table__, AdminRole.__table__,
]


def _audit_actions(db, action):
    return db.query(AuditLog).filter(AuditLog.action == action).all()


# ════════════════════════════════════════════════════════════════════════════
# Service-layer invariants
# ════════════════════════════════════════════════════════════════════════════
class CurrencyServiceTests(unittest.TestCase):
    """Business-logic invariants exercised directly against the service layer."""

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
    def _create(self, code, *, is_base=False, status=c.STATUS_ACTIVE, rate=None):
        payload = CurrencyCreateRequest(
            currency_code=code,
            currency_name=f"{code} Dollar",
            currency_symbol="$",
            country="Testland",
            is_base_currency=is_base,
            status=status,
            exchange_rate=rate,
        )
        return service.create_currency(self.db, payload, actor_id=1, actor="t@co.com")

    # ── create currency ──────────────────────────────────────────────────────
    def test_create_currency_persists_currency_rate_and_history(self):
        out = self._create("USD", is_base=True)
        self.assertEqual(out["currency_code"], "USD")
        self.assertTrue(out["is_base_currency"])

        # A 1:1 current rate row is seeded (base is always 1.0 against itself).
        rate = repo.get_rate(self.db, out["id"])
        self.assertIsNotNone(rate)
        self.assertEqual(rate.exchange_rate, 1.0)
        self.assertFalse(rate.is_manual_override)

        # The initial rate is journaled to history (old_rate is None).
        history, total = repo.list_rate_history(
            self.db, currency_id=out["id"], page=1, page_size=10,
        )
        self.assertEqual(total, 1)
        self.assertIsNone(history[0].old_rate)
        self.assertEqual(history[0].new_rate, 1.0)

    def test_create_currency_writes_audit_entry(self):
        out = self._create("USD")
        created = _audit_actions(self.db, c.AUDIT_CURRENCY_CREATED)
        self.assertEqual(len(created), 1)
        self.assertEqual(created[0].entity_id, out["id"])

    def test_create_base_currency_also_audits_base_change(self):
        self._create("USD", is_base=True)
        self.assertEqual(len(_audit_actions(self.db, c.AUDIT_BASE_CURRENCY_CHANGED)), 1)

    def test_duplicate_currency_code_rejected(self):
        self._create("USD")
        with self.assertRaises(HTTPException) as ctx:
            self._create("USD")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_non_base_currency_uses_supplied_initial_rate(self):
        out = self._create("EUR", rate=1.25)
        rate = repo.get_rate(self.db, out["id"])
        self.assertEqual(rate.exchange_rate, 1.25)

    # ── set base currency (single-base invariant) ────────────────────────────
    def test_set_base_promotes_one_and_demotes_previous(self):
        usd = self._create("USD", is_base=True)
        eur = self._create("EUR")

        service.set_base_currency(self.db, eur["id"], actor_id=1, actor="t@co.com")

        # Exactly one base currency, and it's the newly-promoted one.
        bases = (
            self.db.query(Currency)
            .filter(Currency.is_base_currency.is_(True), Currency.is_deleted.is_(False))
            .all()
        )
        self.assertEqual(len(bases), 1)
        self.assertEqual(bases[0].id, eur["id"])
        self.assertFalse(repo.get_currency(self.db, usd["id"]).is_base_currency)

    def test_set_base_writes_audit_entry_with_previous(self):
        self._create("USD", is_base=True)
        eur = self._create("EUR")
        service.set_base_currency(self.db, eur["id"], actor_id=1, actor="t@co.com")

        # create(USD base) => 1, promote(EUR) => 1  →  two base-change audits total.
        changes = _audit_actions(self.db, c.AUDIT_BASE_CURRENCY_CHANGED)
        self.assertEqual(len(changes), 2)
        self.assertEqual(changes[-1].log_metadata.get("previous"), "USD")

    def test_set_base_requires_active_currency(self):
        cur = self._create("EUR", status=c.STATUS_INACTIVE)
        with self.assertRaises(HTTPException) as ctx:
            service.set_base_currency(self.db, cur["id"], actor_id=1, actor="t@co.com")
        self.assertEqual(ctx.exception.status_code, 400)

    # ── rate override ────────────────────────────────────────────────────────
    def test_rate_override_appends_history_and_flags_override(self):
        eur = self._create("EUR", rate=1.10)

        service.update_rate(
            self.db, eur["id"],
            RateUpdateRequest(exchange_rate=1.42, rate_source=c.SOURCE_MANUAL, is_manual_override=True),
            actor_id=1, actor="t@co.com",
        )

        rate = repo.get_rate(self.db, eur["id"])
        self.assertEqual(rate.exchange_rate, 1.42)
        self.assertTrue(rate.is_manual_override)

        # Initial create row + the override row.
        history, total = repo.list_rate_history(
            self.db, currency_id=eur["id"], page=1, page_size=10, sort_by="changed_at", sort_dir="asc",
        )
        self.assertEqual(total, 2)
        self.assertEqual(history[-1].old_rate, 1.10)
        self.assertEqual(history[-1].new_rate, 1.42)
        self.assertTrue(history[-1].is_manual_override)

    def test_manual_override_uses_overridden_audit_action(self):
        eur = self._create("EUR", rate=1.10)
        service.update_rate(
            self.db, eur["id"],
            RateUpdateRequest(exchange_rate=1.42, is_manual_override=True),
            actor_id=1, actor="t@co.com",
        )
        self.assertEqual(len(_audit_actions(self.db, c.AUDIT_RATE_OVERRIDDEN)), 1)
        self.assertEqual(len(_audit_actions(self.db, c.AUDIT_RATE_UPDATED)), 0)

    def test_non_override_rate_update_uses_updated_audit_action(self):
        eur = self._create("EUR", rate=1.10)
        service.update_rate(
            self.db, eur["id"],
            RateUpdateRequest(exchange_rate=1.20, is_manual_override=False),
            actor_id=1, actor="t@co.com",
        )
        self.assertEqual(len(_audit_actions(self.db, c.AUDIT_RATE_UPDATED)), 1)
        rate = repo.get_rate(self.db, eur["id"])
        self.assertFalse(rate.is_manual_override)

    # ── soft delete guard ────────────────────────────────────────────────────
    def test_base_currency_cannot_be_deleted(self):
        usd = self._create("USD", is_base=True)
        with self.assertRaises(HTTPException) as ctx:
            service.delete_currency(self.db, usd["id"], actor_id=1, actor="t@co.com")
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertFalse(repo.get_currency(self.db, usd["id"]).is_deleted)

    def test_non_base_currency_can_be_soft_deleted(self):
        eur = self._create("EUR")
        service.delete_currency(self.db, eur["id"], actor_id=1, actor="t@co.com")
        # Soft-deleted rows are excluded from the standard reads.
        self.assertIsNone(repo.get_currency(self.db, eur["id"]))

    def test_base_currency_cannot_be_deactivated(self):
        usd = self._create("USD", is_base=True)
        with self.assertRaises(HTTPException) as ctx:
            service.set_status(self.db, usd["id"], c.STATUS_INACTIVE, actor_id=1, actor="t@co.com")
        self.assertEqual(ctx.exception.status_code, 400)


# ════════════════════════════════════════════════════════════════════════════
# Live sync (provider abstraction)
# ════════════════════════════════════════════════════════════════════════════
class _StubProvider(ExchangeRateProvider):
    """In-test provider that returns a canned rate map (and optional error)."""

    name = "Stub"

    def __init__(self, rates, error=None):
        self._rates = rates
        self._error = error
        self.calls = []

    def fetch_rates(self, base, symbols):
        self.calls.append((base, list(symbols)))
        return ProviderResult(base=base, rates=dict(self._rates),
                              fetched_symbols=list(self._rates.keys()), error=self._error)


class CurrencySyncTests(unittest.TestCase):
    """Live-sync orchestration in ``service.run_sync``."""

    _SOURCE = "Stub"

    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        for t in _TABLES:
            t.create(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self.db = self.Session()
        # Ensure each test starts from a clean provider registry.
        self._saved_registry = dict(providers_pkg._REGISTRY)
        providers_pkg._REGISTRY.clear()

    def tearDown(self):
        providers_pkg._REGISTRY.clear()
        providers_pkg._REGISTRY.update(self._saved_registry)
        self.db.close()

    # ── helpers ──────────────────────────────────────────────────────────────
    def _create(self, code, *, is_base=False, status=c.STATUS_ACTIVE, rate=None):
        payload = CurrencyCreateRequest(
            currency_code=code,
            currency_name=f"{code} Dollar",
            currency_symbol="$",
            country="Testland",
            is_base_currency=is_base,
            status=status,
            exchange_rate=rate,
        )
        return service.create_currency(self.db, payload, actor_id=1, actor="t@co.com")

    def _sync(self):
        return service.run_sync(self.db, sync_source=self._SOURCE, actor_id=1, actor="t@co.com")

    def _assert_one_log_and_audit(self, expected_status):
        logs = self.db.query(CurrencySyncLog).all()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0].sync_status, expected_status)
        audits = _audit_actions(self.db, c.AUDIT_SYNC_RUN)
        self.assertEqual(len(audits), 1)
        self.assertEqual(audits[0].entity_id, logs[0].id)
        return logs[0]

    # ── no base currency ─────────────────────────────────────────────────────
    def test_sync_without_base_currency_records_failed_log(self):
        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_FAILED)
        self.assertEqual(out["currencies_updated"], 0)
        self.assertIsNotNone(out["error_message"])
        log = self._assert_one_log_and_audit(c.SYNC_FAILED)
        self.assertIsNotNone(log.error_message)

    # ── no provider configured ───────────────────────────────────────────────
    def test_sync_without_configured_provider_records_failed_log(self):
        self._create("USD", is_base=True)
        self._create("EUR", rate=1.1)
        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_FAILED)
        self.assertEqual(out["currencies_updated"], 0)
        self.assertIn("Stub", out["error_message"])
        self._assert_one_log_and_audit(c.SYNC_FAILED)

    # ── full success ─────────────────────────────────────────────────────────
    def test_sync_with_provider_updates_rates_and_appends_history(self):
        self._create("USD", is_base=True)
        eur = self._create("EUR", rate=1.1)
        inr = self._create("INR", rate=80.0)
        providers_pkg.register_provider(
            self._SOURCE, _StubProvider({"EUR": 0.92, "INR": 83.5}),
        )

        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_SUCCESS)
        self.assertEqual(out["currencies_updated"], 2)
        self.assertIsNone(out["error_message"])

        self.assertEqual(repo.get_rate(self.db, eur["id"]).exchange_rate, 0.92)
        self.assertEqual(repo.get_rate(self.db, inr["id"]).exchange_rate, 83.5)
        # The synced rate is sourced from the provider and not a manual override.
        eur_rate = repo.get_rate(self.db, eur["id"])
        self.assertEqual(eur_rate.rate_source, self._SOURCE)
        self.assertFalse(eur_rate.is_manual_override)

        # Initial create row + one synced row per updated currency.
        _, eur_total = repo.list_rate_history(self.db, currency_id=eur["id"], page=1, page_size=10)
        self.assertEqual(eur_total, 2)
        self._assert_one_log_and_audit(c.SYNC_SUCCESS)

    # ── partial success (some symbols missing) ───────────────────────────────
    def test_sync_with_missing_rate_records_partial_success(self):
        self._create("USD", is_base=True)
        eur = self._create("EUR", rate=1.1)
        inr = self._create("INR", rate=80.0)
        providers_pkg.register_provider(
            self._SOURCE, _StubProvider({"EUR": 0.92}),  # INR omitted
        )

        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_PARTIAL)
        self.assertEqual(out["currencies_updated"], 1)
        self.assertEqual(repo.get_rate(self.db, eur["id"]).exchange_rate, 0.92)
        # INR keeps its original rate (no history appended).
        self.assertEqual(repo.get_rate(self.db, inr["id"]).exchange_rate, 80.0)
        _, inr_total = repo.list_rate_history(self.db, currency_id=inr["id"], page=1, page_size=10)
        self.assertEqual(inr_total, 1)
        self._assert_one_log_and_audit(c.SYNC_PARTIAL)

    # ── provider reports an error despite full coverage ──────────────────────
    def test_sync_full_coverage_with_provider_error_is_partial(self):
        self._create("USD", is_base=True)
        self._create("EUR", rate=1.1)
        providers_pkg.register_provider(
            self._SOURCE, _StubProvider({"EUR": 0.92}, error="stale upstream"),
        )

        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_PARTIAL)
        self.assertEqual(out["currencies_updated"], 1)
        self.assertEqual(out["error_message"], "stale upstream")
        self._assert_one_log_and_audit(c.SYNC_PARTIAL)


# ════════════════════════════════════════════════════════════════════════════
# Permission gating (router via TestClient)
# ════════════════════════════════════════════════════════════════════════════
_PREFIX = "/api/v1/superadmin/currencies"


class CurrencyPermissionGatingTests(unittest.TestCase):
    """The currency endpoints must enforce their ``currency.*`` permissions."""

    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        for t in _TABLES:
            t.create(bind=cls.engine)
        cls.Session = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)

        from backend.main import app
        from backend.app.database.platform import get_platform_db

        cls.app = app
        cls._dep = get_platform_db

        def _override_db():
            db = cls.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_platform_db] = _override_db
        cls.client = TestClient(app, raise_server_exceptions=False)

        # Seed two admins: one with NO roles (no permissions), one holding a
        # system role (full access / wildcard).
        db = cls.Session()
        try:
            no_perms = SuperAdmin(
                email="noperms@co.com", name="No Perms",
                hashed_password=SuperAdmin.hash_password("x"), is_active=True,
            )
            privileged = SuperAdmin(
                email="root@co.com", name="Root",
                hashed_password=SuperAdmin.hash_password("x"), is_active=True,
            )
            db.add_all([no_perms, privileged])
            db.commit()
            db.refresh(no_perms)
            db.refresh(privileged)
            cls.no_perms_id = no_perms.id
            cls.privileged_id = privileged.id

            system_role = Role(name="Superadmin", is_system=True)
            db.add(system_role)
            db.commit()
            db.refresh(system_role)
            db.add(AdminRole(admin_id=privileged.id, role_id=system_role.id))
            db.commit()
        finally:
            db.close()

    @classmethod
    def tearDownClass(cls):
        cls.app.dependency_overrides.pop(cls._dep, None)

    def _as(self, user_id):
        """Patch token decoding so requests authenticate as ``user_id``."""
        def _fake_decode(_token):
            return {"user_id": user_id, "role": "superadmin", "email": "x@co.com"}
        return patch("backend.app.core.permissions.decode_access_token", side_effect=_fake_decode)

    _HEADERS = {"Authorization": "Bearer test.token"}

    _BODY = {
        "currency_code": "GBP",
        "currency_name": "Pound Sterling",
        "currency_symbol": "£",
        "country": "United Kingdom",
    }

    def test_create_without_permission_returns_403(self):
        with self._as(self.no_perms_id):
            resp = self.client.post(_PREFIX, json=self._BODY, headers=self._HEADERS)
        self.assertEqual(resp.status_code, 403)

    def test_list_without_permission_returns_403(self):
        with self._as(self.no_perms_id):
            resp = self.client.get(_PREFIX, headers=self._HEADERS)
        self.assertEqual(resp.status_code, 403)

    def test_create_with_system_role_succeeds(self):
        with self._as(self.privileged_id):
            resp = self.client.post(_PREFIX, json=self._BODY, headers=self._HEADERS)
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["data"]["currency_code"], "GBP")

    def test_missing_token_is_rejected(self):
        resp = self.client.post(_PREFIX, json=self._BODY)
        self.assertIn(resp.status_code, (401, 403))


if __name__ == "__main__":
    unittest.main()
