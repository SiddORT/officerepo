import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config.settings import settings
from backend.app.core.middleware import TenantMiddleware
from backend.app.database.platform import Base, engine

# Platform models (import to register with metadata)
from backend.app.platform.tenants.models import Tenant, TenantDomain, TenantDbConnection, TenantIdpConfig
from backend.app.platform.subscriptions.models import Plan, Subscription
from backend.app.platform.feature_flags.models import FeatureFlag
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.platform.mobile.models import MobileDeviceSession

# Routers
from backend.app.modules.auth.router import router as auth_router
from backend.app.modules.employee.router import router as employee_router
from backend.app.platform.tenants.router import router as tenants_router
from backend.app.platform.feature_flags.router import router as flags_router
from backend.app.platform.subscriptions.router import router as subscriptions_router

# Create all platform tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Office Repo API",
    description="Multi-tenant SaaS platform for HR, Assets & Billing management.",
    version="1.0.0",
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
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant resolver middleware
app.add_middleware(TenantMiddleware)

PREFIX = settings.API_V1_PREFIX

# Auth (superadmin + tenant login)
app.include_router(auth_router, prefix=f"{PREFIX}/auth", tags=["auth"])

# Superadmin
app.include_router(tenants_router, prefix=f"{PREFIX}/superadmin/tenants", tags=["superadmin - tenants"])
app.include_router(flags_router, prefix=f"{PREFIX}/superadmin", tags=["superadmin - feature flags"])
app.include_router(subscriptions_router, prefix=f"{PREFIX}/superadmin/subscriptions", tags=["superadmin - subscriptions"])

# Tenant-scoped modules
app.include_router(employee_router, prefix=f"{PREFIX}/tenant/employees", tags=["tenant - employees"])


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
    """Seed a default superadmin and sample plan on first run."""
    from backend.app.database.platform import SessionLocal
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
