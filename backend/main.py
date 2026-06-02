import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone as _tz

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from backend.app.config.settings import settings
from backend.app.core.cors import build_cors_kwargs
from backend.app.core.cors_monitor import make_cors_rejection_logger
from backend.app.core.secret_rotation_monitor import run_monitor
from backend.app.core.security_headers import add_security_headers
from backend.app.database.platform import Base, engine, SessionLocal

# Platform models (import to register with metadata)
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.platform.config.models import PlatformConfig
from backend.app.modules.enquiry.models import Enquiry, EnquiryNote, EnquiryActivity
from backend.app.modules.lead_management.models import (
    Lead, LeadActivity, LeadSpokesperson, LeadDemo, LeadFollowup, LeadNote,
    LeadDocument, LeadProposal, LeadNegotiation, LeadConversion,
)
from backend.app.modules.client_management.models import (
    Client, ClientContact, ClientBillingProfile, ClientDbConnection,
    ClientSubscription, ClientModule, ClientDocument, ClientActivityLog,
    ClientDomain, ClientAdminUser,
)
from backend.shared.audit.models import AuditLog
from backend.app.modules.cors_report.models import CorsRejection
from backend.app.modules.rbac.models import (
    Permission, Role, RolePermission, AdminRole, AdminInvitation,
)
from backend.app.modules.organization.models import OrganizationSettings  # noqa: F401
from backend.app.modules.auth.preferences_model import SuperAdminPreferences  # noqa: F401
from backend.app.modules.currency_management.models import (
    Currency, CurrencyRate, CurrencyRateHistory, CurrencySyncLog,
)
from backend.app.modules.notification_management.models import (  # noqa: F401
    NotificationChannelConfig, NotificationTemplate,
    NotificationEventRule, NotificationLog,
)
from backend.app.database.migrations.model import SchemaMigration  # noqa: F401 (registers with metadata)

# Alembic — programmatic migration runner
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command

# Routers
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.rbac.router import router as rbac_router

# RBAC seeding + permission-denied envelope handler
from backend.app.modules.rbac.service import seed_rbac
from backend.app.core.permissions import PermissionDenied
from backend.app.modules.csp_report.router import router as csp_report_router
from backend.app.modules.cors_report.router import router as cors_report_router
from backend.app.modules.enquiry.router import router as enquiry_router
from backend.app.modules.enquiry.admin_router import router as enquiry_admin_router
from backend.app.modules.lead_management.router import router as lead_router
from backend.app.modules.client_management.router import router as client_router
from backend.app.modules.currency_management.router import router as currency_router
from backend.app.modules.organization.router import router as org_router
from backend.app.modules.notification_management.router import router as notif_router
from backend.app.modules.security_settings.router import router as security_settings_router
from backend.app.modules.testing.database_provisioning.router import router as db_provisioning_router
from backend.app.platform.superadmin.rotation_router import router as rotation_router
from backend.app.platform.superadmin.rotation_status_router import router as rotation_status_router

_startup_log = logging.getLogger(__name__)

_ROTATION_TS_KEY = "previous_secret_issued_at"


# ---------------------------------------------------------------------------
# Database bootstrap helpers.
#
# None of these run at import time. They are invoked by init_database(), which
# in turn runs from the application lifespan startup (or can be called
# explicitly against a test database). This lets the genuine app object be
# imported and exercised in tests without any DB side-effects.
# ---------------------------------------------------------------------------

def _run_migrations() -> None:
    """Run all pending Alembic migrations up to HEAD, logging each to schema_migrations.

    Migration files live in alembic/versions/. To create a new migration
    after changing a SQLAlchemy model run:

        alembic revision --autogenerate -m "short description"

    Then commit the generated file. Alembic applies it automatically on the
    next application startup (or deploy).

    Audit logging
    -------------
    Each pending migration is executed individually so we can record a
    schema_migrations row per revision (SUCCESS / FAILED).  Alembic's own
    alembic_version table remains the authoritative schema-version pointer.

    Fresh-database bootstrap
    ------------------------
    On a brand-new deployment the alembic_version table does not exist, so
    ``alembic upgrade head`` would fail because the migration chain begins with
    ALTER TABLE / CREATE INDEX statements that assume the base tables already
    exist. Instead we detect this case, create all tables via SQLAlchemy
    (idempotent on existing DBs) and stamp the HEAD revision so that subsequent
    startups run the normal upgrade path. No audit rows are written for the
    bootstrap — all migrations are considered already applied.
    """
    import time
    from datetime import timezone as _tz_utc
    from sqlalchemy import inspect as _inspect
    from alembic.script import ScriptDirectory
    from alembic.runtime.migration import MigrationContext
    from backend.app.database.migrations.audit import record as _audit_record

    cfg = AlembicConfig("alembic.ini")
    insp = _inspect(engine)

    if not insp.has_table("alembic_version"):
        _startup_log.info("Alembic: fresh database detected. Creating schema via SQLAlchemy then stamping HEAD.")
        Base.metadata.create_all(bind=engine)
        alembic_command.stamp(cfg, "head")
        _startup_log.info("Alembic: fresh database bootstrapped and stamped at HEAD.")
        return

    # ── Determine pending migrations ─────────────────────────────────────────
    script = ScriptDirectory.from_config(cfg)

    with engine.connect() as _conn:
        _ctx = MigrationContext.configure(_conn)
        current_rev = _ctx.get_current_revision()

    # walk_revisions() with no args returns all revisions newest→oldest; reverse for upgrade order
    all_revs = list(script.walk_revisions())
    all_revs.reverse()

    if current_rev is None:
        pending = all_revs
    else:
        _idx = next((i for i, r in enumerate(all_revs) if r.revision == current_rev), None)
        pending = all_revs[_idx + 1:] if _idx is not None else all_revs

    if not pending:
        _startup_log.info("Alembic migrations: up to date at HEAD.")
        return

    # ── Metadata for audit rows ───────────────────────────────────────────────
    _db_name = engine.url.database or "unknown"
    _app_version = os.environ.get("APP_VERSION") or None

    # ── Apply each pending migration and log the outcome ─────────────────────
    for rev in pending:
        _started = datetime.now(tz=_tz_utc.utc)
        _t0 = time.perf_counter()
        try:
            alembic_command.upgrade(cfg, rev.revision)
            _elapsed_ms = round((time.perf_counter() - _t0) * 1000, 2)
            _completed = datetime.now(tz=_tz_utc.utc)
            _startup_log.info(
                "Alembic: applied %s (%s) in %.0f ms",
                rev.revision, rev.doc or "", _elapsed_ms,
            )
            _audit_record(
                engine,
                migration_version=rev.revision,
                migration_name=rev.doc or "",
                database_name=_db_name,
                status="SUCCESS",
                started_at=_started,
                completed_at=_completed,
                execution_time_ms=_elapsed_ms,
                application_version=_app_version,
            )
        except Exception as _exc:
            _elapsed_ms = round((time.perf_counter() - _t0) * 1000, 2)
            _completed = datetime.now(tz=_tz_utc.utc)
            _startup_log.error(
                "Alembic: migration %s (%s) FAILED: %s",
                rev.revision, rev.doc or "", _exc,
            )
            _audit_record(
                engine,
                migration_version=rev.revision,
                migration_name=rev.doc or "",
                database_name=_db_name,
                status="FAILED",
                started_at=_started,
                completed_at=_completed,
                execution_time_ms=_elapsed_ms,
                error_message=str(_exc),
                application_version=_app_version,
            )
            raise

    _startup_log.info("Alembic migrations: all %d pending migration(s) applied.", len(pending))


def _upsert_platform_config(db, key: str, value: str) -> None:
    """Insert or update a single key in platform_config."""
    row = db.query(PlatformConfig).filter(PlatformConfig.key == key).first()
    if row:
        row.value = value
        row.updated_at = datetime.now(tz=_tz.utc)
    else:
        row = PlatformConfig(key=key, value=value)
        db.add(row)
    db.commit()


def sync_rotation_timestamp_with_db() -> None:
    """
    Synchronise the grace-period origin timestamp between the environment and
    the platform_config table so the clock survives application restarts.

    Two scenarios are handled:

    1. Env var IS set (not a fallback):
       The timestamp from PREVIOUS_SECRET_ISSUED_AT is authoritative.
       Upsert it into platform_config so that if the env var is later removed
       (e.g. after a key rotation cleanup), the DB value keeps the anchor stable.

    2. Env var is NOT set (fallback was used):
       Look up the timestamp in platform_config and apply it to settings so
       the grace-period clock does not reset on every restart.
       If the DB also has no value, emit the "startup-time fallback" warning
       to let operators know the expiry is unstable.
    """
    has_previous = bool(
        settings.PREVIOUS_JWT_SECRET or settings.PREVIOUS_REFRESH_SECRET
    )
    if not has_previous:
        return

    db = SessionLocal()
    try:
        if not settings._previous_secret_origin_is_fallback:
            # Env var was set and parsed successfully — persist to DB.
            iso_value = settings.PREVIOUS_SECRET_ISSUED_AT.strip()
            _upsert_platform_config(db, _ROTATION_TS_KEY, iso_value)
            _startup_log.info(
                "secret rotation: persisted grace-period origin to platform_config "
                "(%s=%r)", _ROTATION_TS_KEY, iso_value
            )
        else:
            # Env var absent — try the DB.
            row = db.query(PlatformConfig).filter(
                PlatformConfig.key == _ROTATION_TS_KEY
            ).first()
            if row and row.value:
                applied = settings.apply_db_rotation_timestamp(row.value)
                if applied:
                    _startup_log.info(
                        "secret rotation: grace-period origin loaded from "
                        "platform_config (%s=%r)", _ROTATION_TS_KEY, row.value
                    )
                    return

            # Neither env var nor DB has a value — warn that the clock is unstable.
            _startup_log.warning(
                "PREVIOUS_JWT_SECRET / PREVIOUS_REFRESH_SECRET are set but "
                "PREVIOUS_SECRET_ISSUED_AT is missing and platform_config has no "
                "stored value. The grace-period clock will start from application "
                "startup time and reset on every restart. Set "
                "PREVIOUS_SECRET_ISSUED_AT or store the timestamp in "
                "platform_config (key=%r) to get a stable expiry time.",
                _ROTATION_TS_KEY,
            )
    except Exception as exc:
        _startup_log.warning(
            "Could not sync rotation timestamp with platform_config: %s. "
            "Falling back to application startup time.",
            exc,
        )
    finally:
        db.close()


def seed_default_data():
    """Seed a default superadmin on first run."""
    db = SessionLocal()
    try:
        admin = db.query(SuperAdmin).filter(SuperAdmin.email == "admin@officerepo.com").first()
        if not admin:
            admin = SuperAdmin(
                email="admin@officerepo.com",
                hashed_password=SuperAdmin.hash_password("admin123"),
                name="Super Admin",
            )
            db.add(admin)

        db.commit()
        print("Default data seeded: superadmin (admin@officerepo.com / admin123).")
    except Exception as e:
        db.rollback()
        print(f"Seed error: {e}")
    finally:
        db.close()


def init_database() -> None:
    """Run every database side-effect needed to bring the app online.

    Applies all pending Alembic migrations (which creates tables + applies
    schema changes), synchronises the secret-rotation timestamp, and seeds
    the default superadmin. Safe to call repeatedly — Alembic is idempotent.
    This is intentionally NOT executed at module import — it runs from the
    application lifespan startup (see ``create_app``) or can be called
    explicitly against a test database.
    """
    _run_migrations()
    sync_rotation_timestamp_with_db()
    seed_default_data()
    _seed_rbac_data()


def _seed_rbac_data() -> None:
    """Seed the RBAC permission catalog + built-in Superadmin role."""
    db = SessionLocal()
    try:
        seed_rbac(db)
        print("RBAC seeded: permission catalog + built-in Superadmin role.")
    except Exception as e:
        print(f"RBAC seed error: {e}")
    finally:
        db.close()


def create_app(app_settings=settings) -> FastAPI:
    """Build and return the configured FastAPI application.

    Wires routers, middleware, and static mounts but performs NO database
    side-effects at construction time. The DB bootstrap (``init_database``)
    runs from the lifespan startup hook, so importing this module — or calling
    ``create_app`` — never touches the database. Tests can therefore boot the
    genuine app object directly (without entering the lifespan) and exercise
    the real middleware stack against any settings they choose.
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # DB bootstrap happens here (startup), not at import time.
        init_database()
        monitor_task = asyncio.create_task(run_monitor(app_settings))
        try:
            yield
        finally:
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass

    app = FastAPI(
        title="Office Repo API",
        description="Lead Management & Sales Pipeline platform (superadmin CRM + public enquiries).",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS — wildcard only in development; restricted to ALLOWED_ORIGINS plus the
    # officerepo.com subdomain regex in all other environments. The policy itself
    # lives in backend/app/core/cors.py so the app and tests can't drift apart.
    app.add_middleware(
        CORSMiddleware,
        **build_cors_kwargs(app_settings.ENVIRONMENT, app_settings.ALLOWED_ORIGINS),
    )

    # Content-Security-Policy — policy and middleware live in security_headers.py
    # so tests can import the real constants without triggering DB side-effects.
    app.middleware("http")(add_security_headers)

    # CORS rejection monitor — logs (and optionally alerts on) browser requests
    # whose Origin is blocked by the CORS policy, so a misconfigured ALLOWED_ORIGINS
    # entry or typo'd subdomain is diagnosable instead of failing silently in the
    # browser. No-op in development (wildcard CORS rejects nothing).
    app.middleware("http")(make_cors_rejection_logger(app_settings))

    prefix = app_settings.API_V1_PREFIX

    # CSP violation reporting
    app.include_router(csp_report_router, prefix=f"{prefix}", tags=["security"])

    # CORS rejection panel (superadmin) — recently blocked cross-origin requests
    app.include_router(cors_report_router, prefix=f"{prefix}/superadmin", tags=["superadmin - security"])

    # Permission-denied → standard ApiResponse envelope (403). Scoped to the
    # custom PermissionDenied exception so existing HTTPException error shapes
    # (consumed as `error.response.data.detail` on the frontend) are unaffected.
    from fastapi.responses import JSONResponse

    @app.exception_handler(PermissionDenied)
    async def _permission_denied_handler(request, exc: PermissionDenied):
        from backend.shared.response import ApiResponse
        body = ApiResponse.fail(
            message="You do not have permission to perform this action.",
            errors=[f"missing_permission:{exc.permission}"],
        ).model_dump()
        return JSONResponse(status_code=403, content=body)

    # Auth (superadmin login)
    app.include_router(auth_router, prefix=f"{prefix}/auth", tags=["auth"])

    # RBAC — roles & permissions management (superadmin, permission-guarded)
    app.include_router(rbac_router, prefix=f"{prefix}/superadmin/rbac", tags=["rbac"])

    # Superadmin — secret rotation
    app.include_router(rotation_router, prefix=f"{prefix}/superadmin", tags=["superadmin - secrets"])
    app.include_router(rotation_status_router, prefix=f"{prefix}/superadmin", tags=["superadmin - rotation"])

    # Lead Management & Sales Pipeline Module (superadmin CRM)
    app.include_router(lead_router, prefix=f"{prefix}/superadmin/leads", tags=["lead management"])

    # Client Management Module (superadmin — Client IS the tenant)
    app.include_router(client_router, prefix=f"{prefix}/superadmin/clients", tags=["client management"])

    # Currency Management Module (superadmin — global platform settings)
    app.include_router(currency_router, prefix=f"{prefix}/superadmin/currencies", tags=["currency management"])
    app.include_router(org_router, prefix=f"{prefix}/superadmin/organization", tags=["organization settings"])

    # Notification Management (superadmin — channel configs, templates, event rules, logs)
    app.include_router(notif_router, prefix=f"{prefix}/superadmin/notifications", tags=["notifications"])
    app.include_router(security_settings_router, prefix=f"{prefix}/superadmin", tags=["security settings"])

    # Enquiry Inbox (superadmin CRM)
    app.include_router(enquiry_admin_router, prefix=f"{prefix}/superadmin/enquiries", tags=["enquiry inbox"])

    # Public marketing site — enquiry / contact form (no auth)
    app.include_router(enquiry_router, prefix=f"{prefix}/public/enquiries", tags=["public - enquiries"])

    # [TESTING ONLY] Database provisioning capability check — superadmin JWT required
    app.include_router(db_provisioning_router, prefix=f"{prefix}", tags=["[TESTING] database provisioning"])

    # Serve uploaded files statically
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    os.makedirs(uploads_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    @app.get("/", tags=["root"])
    def root():
        dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend-web", "dist"))
        index = os.path.join(dist, "index.html")
        if os.path.isfile(index):
            return FileResponse(index)
        return {
            "app": "Office Repo",
            "version": "1.0.0",
            "docs": "/docs",
            "api_prefix": prefix,
        }

    @app.get("/health", tags=["root"])
    def health():
        return {"status": "ok"}

    # Serve compiled React frontend in production
    frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend-web", "dist"))
    if os.path.isdir(frontend_dist):
        index_html = os.path.join(frontend_dist, "index.html")

        app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_spa(full_path: str):
            if full_path.startswith("api/") or full_path in ("docs", "openapi.json", "redoc"):
                from fastapi import HTTPException
                raise HTTPException(status_code=404)
            return FileResponse(index_html)

    return app


app = create_app()
