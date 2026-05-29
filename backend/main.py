import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from backend.app.config.settings import settings
from backend.app.core.middleware import TenantMiddleware
from backend.app.core.secret_rotation_monitor import run_monitor
from backend.app.database.platform import Base, engine, SessionLocal

# Platform models (import to register with metadata)
from backend.app.platform.tenants.models import Tenant, TenantDomain, TenantDbConnection, TenantIdpConfig
from backend.app.platform.subscriptions.models import Plan, Subscription
from backend.app.platform.feature_flags.models import FeatureFlag
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.platform.mobile.models import MobileDeviceSession
from backend.app.platform.tenant_management.models import TenantBranding, TenantActivityLog

# Routers
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.csp_report.router import router as csp_report_router
from backend.app.modules.employee.router import router as employee_router
from backend.app.platform.tenants.router import router as tenants_router
from backend.app.platform.feature_flags.router import router as flags_router
from backend.app.platform.subscriptions.router import router as subscriptions_router
from backend.app.platform.tenant_management.router import router as tenant_mgmt_router
from backend.app.platform.superadmin.rotation_router import router as rotation_router

# Create all platform tables (new tables only; existing are not altered)
Base.metadata.create_all(bind=engine)


def run_schema_migrations():
    """
    Idempotent ALTER TABLE migrations — safely adds new columns to existing tables.
    Uses IF NOT EXISTS so it is safe to run on every startup.
    """
    migrations = [
        # tenants — extended fields
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_email VARCHAR(255)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_website VARCHAR(500)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'UTC'",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS region VARCHAR(100)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_path VARCHAR(500)",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by INTEGER",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP",

        # tenant_domains — subdomain / custom_domain split
        "ALTER TABLE tenant_domains ALTER COLUMN domain DROP NOT NULL",
        "ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_domain_key",
        "ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS subdomain VARCHAR(255)",
        "ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255)",

        # tenant_db_connections — structured credential fields
        "ALTER TABLE tenant_db_connections ALTER COLUMN db_url DROP NOT NULL",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_name VARCHAR(255)",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_host VARCHAR(255)",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_port INTEGER DEFAULT 5432",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_username VARCHAR(255)",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_password_encrypted TEXT",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS db_status VARCHAR(50) DEFAULT 'pending'",
        "ALTER TABLE tenant_db_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",

        # subscriptions — trial + limits
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan_name VARCHAR(100)",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 10",
        "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS storage_limit INTEGER DEFAULT 1024",
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
    description="Multi-tenant SaaS platform for HR, Assets & Billing management.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — wildcard only in development; restricted to ALLOWED_ORIGINS in all other environments
_is_restricted = settings.ENVIRONMENT.lower() != "development"
if _is_restricted:
    _cors_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
else:
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Tenant-ID"],
)

# Tenant resolver middleware
app.add_middleware(TenantMiddleware)

# Content-Security-Policy — applied to every response.
_CSP_POLICY = "; ".join([
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "report-uri /api/v1/csp-report",
])

_CSP_EXEMPT_PATHS = {"/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def add_csp_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path not in _CSP_EXEMPT_PATHS:
        response.headers["Content-Security-Policy"] = _CSP_POLICY
    return response


PREFIX = settings.API_V1_PREFIX

# CSP violation reporting
app.include_router(csp_report_router, prefix=f"{PREFIX}", tags=["security"])

# Auth (superadmin + tenant login)
app.include_router(auth_router, prefix=f"{PREFIX}/auth", tags=["auth"])

# Superadmin — legacy routes (keep for backward compat)
app.include_router(tenants_router, prefix=f"{PREFIX}/superadmin/tenants", tags=["superadmin - tenants (legacy)"])
app.include_router(flags_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - feature flags"])
app.include_router(subscriptions_router, prefix=f"{PREFIX}/superadmin/subscriptions", tags=["superadmin - subscriptions"])
app.include_router(rotation_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - secrets"])

# Tenant Management Module (new, full-featured)
app.include_router(tenant_mgmt_router, prefix=f"{PREFIX}/superadmin/manage/tenants", tags=["tenant management"])

# Tenant-scoped modules
app.include_router(employee_router, prefix=f"{PREFIX}/tenant/employees", tags=["tenant - employees"])

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
    """Seed a default superadmin and sample plans on first run."""
    db = SessionLocal()
    try:
        admin = db.query(SuperAdmin).filter(SuperAdmin.email == "admin@officerepo.io").first()
        if not admin:
            admin = SuperAdmin(
                email="admin@officerepo.io",
                hashed_password=SuperAdmin.hash_password("admin123"),
                name="Super Admin",
            )
            db.add(admin)

        plan = db.query(Plan).filter(Plan.name == "Starter").first()
        if not plan:
            plans = [
                Plan(name="Starter", price_monthly=29.0, price_yearly=290.0, max_users=25),
                Plan(name="Growth", price_monthly=99.0, price_yearly=990.0, max_users=100),
                Plan(name="Enterprise", price_monthly=299.0, price_yearly=2990.0, max_users=1000),
            ]
            db.add_all(plans)

        db.commit()
        print("Default data seeded: superadmin (admin@officerepo.io / admin123) and plans.")
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
