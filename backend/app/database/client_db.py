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

from sqlalchemy import create_engine
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
    """Return a new SQLAlchemy Session connected to the client DB."""
    engine = _get_engine(url)
    factory = sessionmaker(bind=engine, autoflush=True, autocommit=False)
    return factory()


def provision_portal_schema(url: str) -> None:
    """Create all ClientBase tables on the client DB (idempotent — uses CREATE IF NOT EXISTS)."""
    # Import ensures models register themselves with ClientBase before create_all
    import backend.app.modules.portal_user_management.models  # noqa: F401
    engine = _get_engine(url)
    ClientBase.metadata.create_all(engine)
