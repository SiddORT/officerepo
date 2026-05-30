"""
Tests for the CORS blocked-origin panel (cors_report module).

Covers the persistence + surfacing path that backs the admin panel:

  - ``record_rejection_event`` / ``repository.upsert_rejection`` keep exactly
    one row per origin, increment ``hit_count`` on repeat hits, and refresh the
    sampled ``last_method`` / ``last_path`` / ``last_seen_at``.
  - The stored ``origin`` is the masked/truncated value (never the raw,
    attacker-controlled Origin header).
  - ``GET /api/v1/superadmin/cors-rejections`` is guarded by the superadmin JWT
    (rejected without a token, 401 for an invalid token, 403 for a non-superadmin
    role, 200 for a superadmin) and returns the correct totals + most-recent-first
    ordering.

The tests use an in-memory SQLite database (shared across sessions via
``StaticPool``) so they run without a real PostgreSQL instance, mirroring the
pattern in ``test_enquiry_spam_controls.py``.
"""
import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure the repo root is on sys.path so `backend.*` imports resolve.
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from backend.app.core.cors import MAX_LOGGED_ORIGIN_LEN, mask_origin  # noqa: E402
from backend.app.database.platform import get_platform_db  # noqa: E402
from backend.app.modules.cors_report import repository, service  # noqa: E402
from backend.app.modules.cors_report.models import CorsRejection  # noqa: E402
from backend.app.modules.cors_report.router import router as cors_report_router  # noqa: E402


_JWT_SECRET = "test-jwt-secret-cors-panel"


def _make_token(role: str = "superadmin") -> str:
    payload = {
        "user_id": 1,
        "role": role,
        "email": "admin@officerepo.com",
        "type": "access",
        "exp": datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm="HS256")


def _build_engine_and_session():
    """Return (engine, sessionmaker) backed by a single shared in-memory DB."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    CorsRejection.__table__.create(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    return engine, Session


# ── repository / service layer ────────────────────────────────────────────────


class TestRecordRejectionEvent(unittest.TestCase):
    """``upsert_rejection`` aggregates per origin; ``record_rejection_event``
    masks the origin and is self-contained (opens/closes its own session)."""

    def setUp(self):
        self.engine, self.Session = _build_engine_and_session()
        self.db = self.Session()
        # record_rejection_event opens its own SessionLocal() — point it at the
        # shared in-memory engine so the rows land in the same database.
        self._patcher = patch.object(service, "SessionLocal", self.Session)
        self._patcher.start()

    def tearDown(self):
        self._patcher.stop()
        self.db.close()
        self.engine.dispose()

    def test_upsert_creates_one_row_per_origin(self):
        repository.upsert_rejection(self.db, "https://evil.example.com", "GET", "/api/x")
        rows = self.db.query(CorsRejection).all()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].origin, "https://evil.example.com")
        self.assertEqual(rows[0].hit_count, 1)
        self.assertEqual(rows[0].last_method, "GET")
        self.assertEqual(rows[0].last_path, "/api/x")
        self.assertIsNotNone(rows[0].first_seen_at)
        self.assertIsNotNone(rows[0].last_seen_at)

    def test_repeated_origin_increments_and_updates_sample(self):
        repository.upsert_rejection(self.db, "https://evil.example.com", "GET", "/first")
        first = self.db.query(CorsRejection).one()
        first_seen = first.first_seen_at

        repository.upsert_rejection(self.db, "https://evil.example.com", "POST", "/second")
        repository.upsert_rejection(self.db, "https://evil.example.com", "PATCH", "/third")

        rows = self.db.query(CorsRejection).all()
        # Still a single row for the origin.
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row.hit_count, 3)
        # Most-recent method/path become the stored sample.
        self.assertEqual(row.last_method, "PATCH")
        self.assertEqual(row.last_path, "/third")
        # first_seen is preserved; last_seen advances (>=) on each hit.
        self.assertEqual(row.first_seen_at, first_seen)
        self.assertGreaterEqual(row.last_seen_at, first_seen)

    def test_distinct_origins_get_separate_rows(self):
        repository.upsert_rejection(self.db, "https://a.example.com", "GET", "/a")
        repository.upsert_rejection(self.db, "https://b.example.com", "GET", "/b")
        repository.upsert_rejection(self.db, "https://a.example.com", "GET", "/a2")

        distinct, total = repository.totals(self.db)
        self.assertEqual(distinct, 2)
        self.assertEqual(total, 3)

    def test_record_rejection_event_masks_origin(self):
        raw = "https://evil.example.com/" + ("x" * 300)
        service.record_rejection_event(raw, "GET", "/api/leads")

        rows = self.db.query(CorsRejection).all()
        self.assertEqual(len(rows), 1)
        stored = rows[0].origin
        # The raw, attacker-controlled value is never persisted verbatim.
        self.assertNotEqual(stored, raw)
        self.assertEqual(stored, mask_origin(raw))
        self.assertTrue(stored.endswith("...(truncated)"))
        self.assertLessEqual(len(stored), MAX_LOGGED_ORIGIN_LEN + len("...(truncated)"))

    def test_record_rejection_event_never_raises_on_db_error(self):
        # A failure while persisting must be swallowed so it can never bubble
        # up into request handling (the guard wraps the upsert call).
        with patch.object(
            repository, "upsert_rejection", side_effect=RuntimeError("boom")
        ):
            self.assertIsNone(
                service.record_rejection_event("https://x.example.com", "GET", "/")
            )
        # No partial row was persisted.
        self.assertEqual(self.db.query(CorsRejection).count(), 0)


# ── service.get_rejections + HTTP endpoint ────────────────────────────────────


class TestCorsRejectionsEndpoint(unittest.TestCase):
    """``GET /api/v1/superadmin/cors-rejections`` auth guard + payload shape."""

    def setUp(self):
        self.engine, self.Session = _build_engine_and_session()

        app = FastAPI()
        app.include_router(cors_report_router, prefix="/api/v1/superadmin")

        def _override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_platform_db] = _override_db
        self.app = app
        self.client = TestClient(app, raise_server_exceptions=False)

        # Decode tokens with our test secret (no real settings singleton).
        def _fake_decode(token):
            return jwt.decode(token, _JWT_SECRET, algorithms=["HS256"])

        self._decode_patch = patch(
            "backend.app.core.deps.decode_access_token", side_effect=_fake_decode
        )
        self._decode_patch.start()

    def tearDown(self):
        self._decode_patch.stop()
        self.engine.dispose()

    def _seed(self, origin, method, path, last_seen_at):
        """Insert one rejection row with an explicit last_seen_at for ordering."""
        db = self.Session()
        try:
            row = CorsRejection(
                origin=origin,
                hit_count=1,
                last_method=method,
                last_path=path,
                first_seen_at=last_seen_at,
                last_seen_at=last_seen_at,
            )
            db.add(row)
            db.commit()
        finally:
            db.close()

    # ── auth guard ────────────────────────────────────────────────────────────

    def test_no_token_is_rejected(self):
        resp = self.client.get("/api/v1/superadmin/cors-rejections")
        # HTTPBearer rejects a missing credential before the handler runs.
        self.assertIn(resp.status_code, (401, 403))
        self.assertNotEqual(resp.status_code, 200)

    def test_invalid_token_returns_401(self):
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections",
            headers={"Authorization": "Bearer not.a.valid.jwt"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_non_superadmin_role_returns_403(self):
        token = _make_token(role="admin")
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 403)

    def test_superadmin_returns_200(self):
        token = _make_token(role="superadmin")
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 200)

    # ── payload shape: totals + ordering ──────────────────────────────────────

    def test_returns_totals_and_most_recent_first_ordering(self):
        base = datetime(2026, 5, 30, 12, 0, 0)
        # b is the most recently seen, then c, then a.
        self._seed("https://a.example.com", "GET", "/a", base)
        self._seed("https://b.example.com", "POST", "/b", base + timedelta(minutes=10))
        self._seed("https://c.example.com", "GET", "/c", base + timedelta(minutes=5))

        token = _make_token(role="superadmin")
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()

        self.assertEqual(body["distinct_origins"], 3)
        self.assertEqual(body["total_hits"], 3)

        origins = [item["origin"] for item in body["items"]]
        self.assertEqual(
            origins,
            [
                "https://b.example.com",
                "https://c.example.com",
                "https://a.example.com",
            ],
        )

    def test_limit_query_param_caps_results(self):
        base = datetime(2026, 5, 30, 12, 0, 0)
        for i in range(5):
            self._seed(
                f"https://o{i}.example.com", "GET", f"/{i}", base + timedelta(minutes=i)
            )

        token = _make_token(role="superadmin")
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections?limit=2",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        # limit caps the items list but totals still reflect everything.
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(body["distinct_origins"], 5)
        self.assertEqual(body["total_hits"], 5)

    def test_endpoint_exposes_masked_origin_not_raw(self):
        raw = "https://evil.example.com/" + ("y" * 300)
        # Persist through the real service path (which masks the origin).
        with patch.object(service, "SessionLocal", self.Session):
            service.record_rejection_event(raw, "GET", "/api/secret")

        token = _make_token(role="superadmin")
        resp = self.client.get(
            "/api/v1/superadmin/cors-rejections",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(resp.status_code, 200)
        origins = [item["origin"] for item in resp.json()["items"]]
        self.assertIn(mask_origin(raw), origins)
        self.assertNotIn(raw, origins)


if __name__ == "__main__":
    unittest.main()
