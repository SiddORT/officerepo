"""
Client DB — per-tenant PostgreSQL session factory and schema provisioner.

Architecture
  Platform DB  — stores ClientAdminUser, clients, billing, etc. (superadmin-managed)
  Client DB    — per-tenant PostgreSQL database that holds workspace operational data:
                 ClientRole, ClientUserRole, ClientLoginLog, ClientUserSession,
                 ClientPortalActivityLog (and future HR / Finance / Projects tables)

Public API
  ClientBase                     Declarative base for all client-DB models
  build_client_db_url(conn)      Build a postgresql:// URL from a ClientDbConnection row
  make_client_session(url)       Return a raw Session (caller must close)
  provision_portal_schema(url)   CREATE the portal tables on the client DB (idempotent)
"""
from __future__ import annotations

import threading
from typing import Dict

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# ── Declarative base for all client-DB tables ─────────────────────────────────
ClientBase = declarative_base()

# ── Thread-safe engine cache ───────────────────────────────────────────────────
_lock: threading.Lock = threading.Lock()
_engines: Dict[str, Engine] = {}


def _get_engine(url: str) -> Engine:
    with _lock:
        if url not in _engines:
            _engines[url] = create_engine(
                url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
            )
        return _engines[url]


def build_client_db_url(conn) -> str:
    """Build a postgresql:// URL from a ClientDbConnection ORM row.

    Since client databases are provisioned on the same PostgreSQL server as the
    platform DB (Replit built-in Postgres), we reuse the platform credentials
    and just swap the database name.
    """
    from backend.app.config.settings import settings
    from urllib.parse import urlparse

    base = settings.PLATFORM_DB_URL.replace("+psycopg2", "").replace("+asyncpg", "")
    p = urlparse(base)

    host = conn.database_host or p.hostname or "localhost"
    port = conn.database_port or p.port or 5432
    user = conn.database_username or p.username or "postgres"
    password = p.password or ""
    dbname = conn.database_name

    if password:
        return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
    return f"postgresql://{user}@{host}:{port}/{dbname}"


def make_client_session(url: str) -> Session:
    """Return a new SQLAlchemy Session connected to the client DB.

    Also runs column migrations once per URL per process so that existing
    client DBs pick up new columns without needing a full re-provision.
    """
    engine = _get_engine(url)
    if url not in _migrated:
        try:
            _migrate_columns(engine)
        except Exception:
            pass  # never block normal requests
        _migrated.add(url)
    factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)
    return factory()


# Track which URLs have already been provisioned in this process (avoids redundant
# create_all calls on every request while still catching new tables for old clients).
_provisioned: set = set()

# Track which URLs have had column migrations applied this process (once per URL).
_migrated: set = set()

# ── Column migrations for tables that may have been created before new columns were added ──
# Each entry: (table_name, column_name, column_definition)
_COLUMN_MIGRATIONS = [
    # Employee — country codes + resume
    ("employees", "mobile_country_code", "VARCHAR(10) DEFAULT '+91'"),
    ("employees", "alternate_mobile_country_code", "VARCHAR(10) DEFAULT '+91'"),
    ("employees", "resume_url", "VARCHAR(500)"),
    ("employees", "resume_filename", "VARCHAR(255)"),
    # EmployeeBankDetails — salary + TDS fields
    ("employee_bank_details", "account_type", "VARCHAR(30)"),
    ("employee_bank_details", "salary_credit_date", "INTEGER"),
    ("employee_bank_details", "salary_cycle", "VARCHAR(20)"),
    ("employee_bank_details", "pf_account_number", "VARCHAR(30)"),
    ("employee_bank_details", "pf_uan_number", "VARCHAR(30)"),
    ("employee_bank_details", "esi_number", "VARCHAR(30)"),
    ("employee_bank_details", "gratuity_applicable", "BOOLEAN DEFAULT FALSE"),
    ("employee_bank_details", "tds_applicable", "BOOLEAN DEFAULT FALSE"),
    ("employee_bank_details", "tds_percentage", "NUMERIC(5,2)"),
    ("employee_bank_details", "pan_linked_to_account", "BOOLEAN DEFAULT FALSE"),
    # EmployeeEmergencyContact — country codes
    ("employee_emergency_contacts", "mobile_country_code", "VARCHAR(10) DEFAULT '+91'"),
    ("employee_emergency_contacts", "alternate_country_code", "VARCHAR(10) DEFAULT '+91'"),
    # OrgDepartment — employee head + effective dates
    ("org_departments", "head_employee_id", "VARCHAR(36)"),
    ("org_departments", "head_effective_from", "DATE"),
    ("org_departments", "head_effective_to", "DATE"),
    # Employee — branch assignment + work mode
    ("employees", "branch_id", "VARCHAR(36)"),
    ("employees", "work_mode", "VARCHAR(50)"),
    # AttendanceRecord — WFH / location columns
    ("attendance_records", "location_type",      "VARCHAR(50) DEFAULT 'Office'"),
    ("attendance_records", "work_mode_snapshot", "VARCHAR(100)"),
    ("attendance_records", "device_info",        "TEXT"),
    # AttendancePolicy — WFH settings
    ("attendance_policies", "wfh_allowed",              "BOOLEAN DEFAULT TRUE"),
    ("attendance_policies", "max_wfh_days_per_month",   "INTEGER DEFAULT 10"),
    ("attendance_policies", "require_wfh_approval",     "BOOLEAN DEFAULT FALSE"),
    ("attendance_policies", "allow_hybrid_override",    "BOOLEAN DEFAULT TRUE"),
    # OrgCompany — industry classification + phone country code
    ("org_companies", "industry",            "VARCHAR(200)"),
    ("org_companies", "sub_industry",        "VARCHAR(200)"),
    ("org_companies", "phone_country_code",  "VARCHAR(10)"),
]


def _migrate_columns(engine: Engine) -> None:
    """Idempotently add any new columns that may be missing on pre-existing tables."""
    with engine.connect() as conn:
        for table, column, col_def in _COLUMN_MIGRATIONS:
            try:
                conn.execute(text(
                    f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_def}"
                ))
                conn.commit()
            except Exception:
                conn.rollback()


def provision_portal_schema(url: str, *, force: bool = False) -> None:
    """Create all ClientBase tables on the client DB (idempotent — uses CREATE IF NOT EXISTS).

    force=True bypasses the per-process cache so newly-enabled modules get their
    tables created even when the DB was provisioned earlier in this process.
    """
    if not force and url in _provisioned:
        return
    # Imports ensure models register themselves with ClientBase before create_all
    import backend.app.modules.portal_user_management.models  # noqa: F401
    import backend.app.modules.organization_management.models  # noqa: F401
    import backend.app.modules.employee_management.models  # noqa: F401
    import backend.app.modules.asset_management.inventory_models  # noqa: F401
    import backend.app.modules.asset_management.return_models  # noqa: F401
    import backend.app.modules.asset_management.transfer_models  # noqa: F401
    import backend.app.modules.asset_management.maintenance_models  # noqa: F401
    import backend.app.modules.employee_document_management.models  # noqa: F401
    import backend.app.modules.recruitment.models  # noqa: F401
    import backend.app.modules.interview.models  # noqa: F401
    import backend.app.modules.onboarding.models  # noqa: F401
    import backend.app.modules.attendance.models  # noqa: F401
    import backend.app.modules.leave_management.models  # noqa: F401
    import backend.app.modules.payroll_management.models  # noqa: F401
    import backend.app.modules.loan_management.models  # noqa: F401
    import backend.app.modules.expense_management.models  # noqa: F401
    import backend.app.modules.exit_management.models  # noqa: F401
    engine = _get_engine(url)
    existing = set(inspect(engine).get_table_names())
    new_tables = [
        t for t in ClientBase.metadata.sorted_tables
        if t.name not in existing
    ]
    if new_tables:
        ClientBase.metadata.create_all(engine, tables=new_tables)
    _migrate_columns(engine)
    _provisioned.add(url)
