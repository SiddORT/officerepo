import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.app.config.settings import settings
from backend.app.core.cors import build_cors_kwargs
from backend.app.core.cors_monitor import make_cors_rejection_logger
from backend.app.core.secret_rotation_monitor import run_monitor
from backend.app.core.security_headers import CSP_POLICY, CSP_EXEMPT_PATHS, add_security_headers
from backend.app.database.platform import Base, engine, SessionLocal

# Platform models (import to register with metadata)
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.platform.config.models import PlatformConfig
from backend.app.modules.enquiry.models import Enquiry, EnquiryNote, EnquiryActivity
from backend.app.modules.lead_management.models import (
    Lead, LeadActivity, LeadSpokesperson, LeadDemo, LeadFollowup, LeadNote,
    LeadDocument, LeadProposal, LeadNegotiation, LeadConversion,
)
from backend.shared.audit.models import AuditLog
from backend.app.modules.cors_report.models import CorsRejection

# Routers
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.csp_report.router import router as csp_report_router
from backend.app.modules.cors_report.router import router as cors_report_router
from backend.app.modules.enquiry.router import router as enquiry_router
from backend.app.modules.enquiry.admin_router import router as enquiry_admin_router
from backend.app.modules.lead_management.router import router as lead_router
from backend.app.platform.superadmin.rotation_router import router as rotation_router
from backend.app.platform.superadmin.rotation_status_router import router as rotation_status_router

# Create all platform tables (new tables only; existing are not altered)
Base.metadata.create_all(bind=engine)


def run_schema_migrations():
    """
    Idempotent ALTER TABLE migrations — safely adds new columns to existing tables.
    Uses IF NOT EXISTS so it is safe to run on every startup.
    """
    migrations = [
        # enquiries — GDPR/privacy-aware lead capture (encryption, consent, compliance)
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS enquiry_number VARCHAR(40)",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS email_encrypted TEXT",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS phone_encrypted TEXT",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS message_encrypted TEXT",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS dedupe_hash VARCHAR(64)",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(20)",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS marketing_consent_timestamp TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS referrer_url VARCHAR(1024)",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT FALSE",
        # enquiries — superadmin inbox workflow (assignment, spam, convert traceability)
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS assigned_to INTEGER",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT FALSE",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS spam_marked_at TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS converted_lead_id VARCHAR(36)",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP",
        "ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_assigned_to ON enquiries (assigned_to)",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_is_spam ON enquiries (is_spam)",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_converted_lead_id ON enquiries (converted_lead_id)",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_status_spam ON enquiries (status, is_spam)",
        # Drop legacy plaintext PII columns (replaced by encrypted equivalents)
        "ALTER TABLE enquiries DROP COLUMN IF EXISTS work_email",
        "ALTER TABLE enquiries DROP COLUMN IF EXISTS phone_number",
        "ALTER TABLE enquiries DROP COLUMN IF EXISTS message",
        # Indexes for enquiry_number (unique) and dedupe lookups
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_enquiries_enquiry_number ON enquiries (enquiry_number)",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_dedupe_hash ON enquiries (dedupe_hash)",
        "CREATE INDEX IF NOT EXISTS ix_enquiries_dedupe_created ON enquiries (dedupe_hash, created_at)",

        # leads — phone country code + manual score override
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code VARCHAR(8)",
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_label_override VARCHAR(10)",
        # lead_activities — richer free-text next action
        "ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS next_action TEXT",
    ]
    try:
        with engine.connect() as conn:
            for sql in migrations:
                try:
                    conn.execute(text(sql))
                except Exception as e:
                    print(f"  Migration skipped ({e}): {sql[:60]}...")
            conn.commit()
        print("Schema migrations applied.")
    except Exception as e:
        print(f"Migration error: {e}")


run_schema_migrations()


import logging as _startup_logger

_startup_log = _startup_logger.getLogger(__name__)

_ROTATION_TS_KEY = "previous_secret_issued_at"


def _upsert_platform_config(db, key: str, value: str) -> None:
    """Insert or update a single key in platform_config."""
    from datetime import datetime, timezone as _tz
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


sync_rotation_timestamp_with_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    monitor_task = asyncio.create_task(run_monitor(settings))
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
    **build_cors_kwargs(settings.ENVIRONMENT, settings.ALLOWED_ORIGINS),
)

# Content-Security-Policy — policy and middleware live in security_headers.py
# so tests can import the real constants without triggering DB side-effects.
app.middleware("http")(add_security_headers)

# CORS rejection monitor — logs (and optionally alerts on) browser requests
# whose Origin is blocked by the CORS policy, so a misconfigured ALLOWED_ORIGINS
# entry or typo'd subdomain is diagnosable instead of failing silently in the
# browser. No-op in development (wildcard CORS rejects nothing).
app.middleware("http")(make_cors_rejection_logger(settings))


PREFIX = settings.API_V1_PREFIX

# CSP violation reporting
app.include_router(csp_report_router, prefix=f"{PREFIX}", tags=["security"])

# CORS rejection panel (superadmin) — recently blocked cross-origin requests
app.include_router(cors_report_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - security"])

# Auth (superadmin login)
app.include_router(auth_router, prefix=f"{PREFIX}/auth", tags=["auth"])

# Superadmin — secret rotation
app.include_router(rotation_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - secrets"])
app.include_router(rotation_status_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - rotation"])

# Lead Management & Sales Pipeline Module (superadmin CRM)
app.include_router(lead_router, prefix=f"{PREFIX}/superadmin/leads", tags=["lead management"])

# Enquiry Inbox (superadmin CRM)
app.include_router(enquiry_admin_router, prefix=f"{PREFIX}/superadmin/enquiries", tags=["enquiry inbox"])

# Public marketing site — enquiry / contact form (no auth)
app.include_router(enquiry_router, prefix=f"{PREFIX}/public/enquiries", tags=["public - enquiries"])

# Serve uploaded files statically
_uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(_uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads_dir), name="uploads")


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
        "api_prefix": PREFIX,
    }


@app.get("/health", tags=["root"])
def health():
    return {"status": "ok"}


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


seed_default_data()

# Serve compiled React frontend in production
_frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend-web", "dist"))
if os.path.isdir(_frontend_dist):
    _index_html = os.path.join(_frontend_dist, "index.html")

    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path in ("docs", "openapi.json", "redoc"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        return FileResponse(_index_html)
