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
from backend.app.modules.currency_management import validators as v  # noqa: E402
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

    # ── invalid provider rates are skipped, never persisted ──────────────────
    def test_sync_skips_invalid_provider_rates(self):
        """Nonsensical provider numbers must not overwrite a stored rate.

        The provider returns one valid rate (EUR) and a battery of invalid ones
        (zero, negative, over RATE_MAX, NaN, +inf, non-numeric string). Only EUR
        is persisted; every other currency keeps its original rate and appends no
        history. The sync downgrades to Partial Success and the skip is logged.
        """
        self._create("USD", is_base=True)
        eur = self._create("EUR", rate=1.1)
        zero = self._create("ZAR", rate=18.0)
        neg = self._create("GBP", rate=0.8)
        huge = self._create("INR", rate=80.0)
        nan = self._create("JPY", rate=150.0)
        inf = self._create("AUD", rate=1.5)
        text = self._create("CAD", rate=1.35)

        providers_pkg.register_provider(
            self._SOURCE,
            _StubProvider({
                "EUR": 0.92,                  # valid — should persist
                "ZAR": 0,                     # zero
                "GBP": -3.5,                  # negative
                "INR": c.RATE_MAX + 1,        # over max
                "JPY": float("nan"),          # NaN
                "AUD": float("inf"),          # infinity
                "CAD": "not-a-number",        # non-numeric
            }),
        )

        out = self._sync()

        # Only the single valid currency was updated; sync is Partial.
        self.assertEqual(out["sync_status"], c.SYNC_PARTIAL)
        self.assertEqual(out["currencies_updated"], 1)
        self.assertEqual(repo.get_rate(self.db, eur["id"]).exchange_rate, 0.92)

        # Every invalid currency keeps its original rate untouched …
        originals = {
            zero["id"]: 18.0, neg["id"]: 0.8, huge["id"]: 80.0,
            nan["id"]: 150.0, inf["id"]: 1.5, text["id"]: 1.35,
        }
        for cid, original in originals.items():
            self.assertEqual(repo.get_rate(self.db, cid).exchange_rate, original)
            # … and no synced history row was appended (only the create row).
            _, total = repo.list_rate_history(self.db, currency_id=cid, page=1, page_size=10)
            self.assertEqual(total, 1)

        # The skip is surfaced in the sync log + the single audit entry.
        self.assertIsNotNone(out["error_message"])
        for code in ("ZAR", "GBP", "INR", "JPY", "AUD", "CAD"):
            self.assertIn(code, out["error_message"])
        self._assert_one_log_and_audit(c.SYNC_PARTIAL)

    def test_sync_with_only_invalid_rates_updates_nothing(self):
        """If every provider rate is invalid, nothing is persisted at all."""
        self._create("USD", is_base=True)
        eur = self._create("EUR", rate=1.1)
        inr = self._create("INR", rate=80.0)
        providers_pkg.register_provider(
            self._SOURCE, _StubProvider({"EUR": 0, "INR": -1}),
        )

        out = self._sync()
        self.assertEqual(out["sync_status"], c.SYNC_PARTIAL)
        self.assertEqual(out["currencies_updated"], 0)
        self.assertEqual(repo.get_rate(self.db, eur["id"]).exchange_rate, 1.1)
        self.assertEqual(repo.get_rate(self.db, inr["id"]).exchange_rate, 80.0)
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


# ════════════════════════════════════════════════════════════════════════════
# Request-level validation (schema → router → 422) via TestClient
# ════════════════════════════════════════════════════════════════════════════
class CurrencyRequestValidationTests(unittest.TestCase):
    """Malformed payloads must be rejected with 422 at the API edge.

    The validator unit tests prove the helpers reject bad input, but they don't
    confirm the full request path (Pydantic schema -> router -> 422 response)
    actually surfaces those rejections. A regression where a schema stops wiring
    a ``field_validator`` would slip past the helper tests; these drive the real
    FastAPI app to close that gap. Requests authenticate as a privileged admin so
    permission gating never masks a validation result.
    """

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

        # A single privileged admin (system role => wildcard permissions) so every
        # request reaches the schema/validation layer rather than being gated out.
        db = cls.Session()
        try:
            privileged = SuperAdmin(
                email="validator@co.com", name="Root",
                hashed_password=SuperAdmin.hash_password("x"), is_active=True,
            )
            db.add(privileged)
            db.commit()
            db.refresh(privileged)
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

    def setUp(self):
        self._auth = patch(
            "backend.app.core.permissions.decode_access_token",
            side_effect=lambda _t: {
                "user_id": self.privileged_id, "role": "superadmin", "email": "validator@co.com",
            },
        )
        self._auth.start()

    def tearDown(self):
        self._auth.stop()

    _HEADERS = {"Authorization": "Bearer test.token"}

    def _valid_body(self, **overrides):
        body = {
            "currency_code": "JPY",
            "currency_name": "Japanese Yen",
            "currency_symbol": "¥",
            "country": "Japan",
        }
        body.update(overrides)
        return body

    # ── create: malformed payloads are rejected (422) ────────────────────────
    def test_create_rejects_malformed_payloads(self):
        cases = {
            "bad_code": self._valid_body(currency_code="US"),
            "non_alpha_code": self._valid_body(currency_code="US1"),
            "rate_zero": self._valid_body(exchange_rate=0),
            "rate_negative": self._valid_body(exchange_rate=-5),
            "rate_over_max": self._valid_body(exchange_rate=c.RATE_MAX + 1),
            "decimal_places_high": self._valid_body(decimal_places=c.DECIMAL_PLACES_MAX + 1),
            "decimal_places_low": self._valid_body(decimal_places=c.DECIMAL_PLACES_MIN - 1),
            "invalid_status": self._valid_body(status="Pending"),
            "invalid_rate_source": self._valid_body(rate_source="Guess"),
            # Name made of nothing but markup strips to empty -> required error.
            "script_tag_name": self._valid_body(currency_name="<script></script>"),
            "name_too_short": self._valid_body(currency_name="A"),
        }
        for label, body in cases.items():
            with self.subTest(case=label):
                resp = self.client.post(_PREFIX, json=body, headers=self._HEADERS)
                self.assertEqual(resp.status_code, 422, msg=f"{label}: {resp.text}")

    # ── create: a clean payload is accepted and normalised ───────────────────
    def test_create_accepts_and_normalises_valid_payload(self):
        body = self._valid_body(currency_code="gbp", currency_name="  Pound   Sterling  ")
        resp = self.client.post(_PREFIX, json=body, headers=self._HEADERS)
        self.assertEqual(resp.status_code, 201, msg=resp.text)
        data = resp.json()["data"]
        # Lowercase code is stored uppercased; internal whitespace collapsed.
        self.assertEqual(data["currency_code"], "GBP")
        self.assertEqual(data["currency_name"], "Pound Sterling")

    # ── update: malformed payloads are rejected (422) ────────────────────────
    def test_update_rejects_malformed_payloads(self):
        created = self.client.post(
            _PREFIX, json=self._valid_body(currency_code="AUD"), headers=self._HEADERS,
        )
        self.assertEqual(created.status_code, 201, msg=created.text)
        currency_id = created.json()["data"]["id"]

        cases = {
            "invalid_status": {"status": "Pending"},
            "decimal_places_high": {"decimal_places": c.DECIMAL_PLACES_MAX + 1},
            "name_too_short": {"currency_name": "A"},
            "name_too_long": {"currency_name": "A" * (c.CURRENCY_NAME_MAX_LEN + 1)},
            "symbol_too_long": {"currency_symbol": "$" * (c.CURRENCY_SYMBOL_MAX_LEN + 1)},
        }
        for label, body in cases.items():
            with self.subTest(case=label):
                resp = self.client.patch(
                    f"{_PREFIX}/{currency_id}", json=body, headers=self._HEADERS,
                )
                self.assertEqual(resp.status_code, 422, msg=f"{label}: {resp.text}")

    # ── rate endpoint: bad rate is rejected (422) ────────────────────────────
    def test_update_rate_rejects_non_positive_rate(self):
        created = self.client.post(
            _PREFIX, json=self._valid_body(currency_code="CHF"), headers=self._HEADERS,
        )
        self.assertEqual(created.status_code, 201, msg=created.text)
        currency_id = created.json()["data"]["id"]

        for bad in (0, -1, c.RATE_MAX + 1):
            with self.subTest(rate=bad):
                resp = self.client.put(
                    f"{_PREFIX}/{currency_id}/rate",
                    json={"exchange_rate": bad}, headers=self._HEADERS,
                )
                self.assertEqual(resp.status_code, 422, msg=resp.text)


# ════════════════════════════════════════════════════════════════════════════
# Input validators (sanitisation layer)
# ════════════════════════════════════════════════════════════════════════════
class CurrencyValidatorTests(unittest.TestCase):
    """Direct unit tests for the currency input-sanitisation helpers."""

    # ── currency code (ISO 4217 normalisation) ───────────────────────────────
    def test_lowercase_code_is_uppercased(self):
        self.assertEqual(v.validate_currency_code("usd"), "USD")

    def test_code_whitespace_is_trimmed_and_uppercased(self):
        self.assertEqual(v.validate_currency_code("  eur  "), "EUR")

    def test_non_three_letter_code_rejected(self):
        for bad in ("US", "USDD", "US1", "12", "$$$"):
            with self.assertRaises(ValueError):
                v.validate_currency_code(bad)

    def test_required_code_missing_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_currency_code("", required=True)

    def test_optional_code_missing_returns_none(self):
        self.assertIsNone(v.validate_currency_code("", required=False))

    # ── exchange rate bounds ─────────────────────────────────────────────────
    def test_rate_zero_or_negative_rejected(self):
        for bad in (0, 0.0, -1, -0.0001):
            with self.assertRaises(ValueError):
                v.validate_rate(bad)

    def test_rate_over_max_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_rate(c.RATE_MAX + 1)

    def test_rate_non_numeric_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_rate("abc")

    def test_valid_rate_accepted(self):
        self.assertEqual(v.validate_rate(1.25), 1.25)

    def test_optional_rate_missing_returns_none(self):
        self.assertIsNone(v.validate_rate(None, required=False))

    # ── decimal places range ─────────────────────────────────────────────────
    def test_decimal_places_below_min_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_decimal_places(c.DECIMAL_PLACES_MIN - 1)

    def test_decimal_places_above_max_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_decimal_places(c.DECIMAL_PLACES_MAX + 1)

    def test_decimal_places_non_integer_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_decimal_places("two")

    def test_valid_decimal_places_accepted(self):
        self.assertEqual(v.validate_decimal_places(c.DECIMAL_PLACES_MAX), c.DECIMAL_PLACES_MAX)
        self.assertEqual(v.validate_decimal_places(c.DECIMAL_PLACES_MIN), c.DECIMAL_PLACES_MIN)

    # ── controlled vocabularies ──────────────────────────────────────────────
    def test_invalid_status_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_status("Pending")

    def test_valid_status_accepted(self):
        self.assertEqual(v.validate_status(c.STATUS_ACTIVE), c.STATUS_ACTIVE)

    def test_invalid_rate_source_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_rate_source("Guess")

    def test_valid_rate_source_accepted(self):
        self.assertEqual(v.validate_rate_source(c.SOURCE_MANUAL), c.SOURCE_MANUAL)

    # ── length bounds ────────────────────────────────────────────────────────
    def test_name_too_short_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_name("A")

    def test_name_too_long_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_name("A" * (c.CURRENCY_NAME_MAX_LEN + 1))

    def test_symbol_too_long_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_symbol("$" * (c.CURRENCY_SYMBOL_MAX_LEN + 1))

    def test_country_too_short_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_country("X")

    def test_country_too_long_rejected(self):
        with self.assertRaises(ValueError):
            v.validate_country("X" * (c.COUNTRY_MAX_LEN + 1))

    # ── XSS / HTML stripping ─────────────────────────────────────────────────
    def test_script_tag_stripped_from_name(self):
        cleaned = v.validate_name("US <script>alert(1)</script>Dollar")
        self.assertNotIn("<script>", cleaned)
        self.assertNotIn("</script>", cleaned)
        self.assertNotIn("<", cleaned)

    def test_html_tags_stripped_from_country(self):
        cleaned = v.validate_country("United <b>Kingdom</b>")
        self.assertEqual(cleaned, "United Kingdom")

    def test_clean_text_collapses_internal_whitespace(self):
        self.assertEqual(v.clean_text("United    States"), "United States")

    def test_clean_text_returns_none_for_tag_only_input(self):
        self.assertIsNone(v.clean_text("<br/>"))


if __name__ == "__main__":
    unittest.main()
