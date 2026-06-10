"""SQLAlchemy models for Client Portal User Management.

These tables live in each CLIENT'S OWN DATABASE — not the platform DB.
They are registered with ClientBase (not the platform Base), so Alembic
will NOT manage them via the normal platform migrations.

Schema is provisioned via  backend.app.database.client_db.provision_portal_schema()
when a client database is created.

Cross-database foreign keys are NOT possible in PostgreSQL, so all references
to platform-DB tables (clients, client_admin_users) are plain String columns.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Index, Integer, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Client Roles ───────────────────────────────────────────────────────────────

class ClientRole(ClientBase):
    """Workspace-scoped roles (Super Admin, Admin, Manager, Employee, custom)."""
    __tablename__ = "client_roles"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)   # platform DB ref (no FK)
    name        = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, nullable=False, default=False)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_client_roles_client_name", "client_id", "name", unique=True),
    )


# ── User ↔ Role join table ─────────────────────────────────────────────────────

class ClientUserRole(ClientBase):
    """Many-to-many: portal admin users ↔ workspace roles."""
    __tablename__ = "client_user_roles"

    user_id     = Column(String(36), primary_key=True)   # platform DB ref (no FK)
    role_id     = Column(String(36), primary_key=True)   # same client DB
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Permission catalog ─────────────────────────────────────────────────────────

class ClientPermission(ClientBase):
    """Workspace permission catalog — one row per permission name.

    Seeded on first roles call; keyed by (client_id, name) so each workspace
    gets its own copy (future custom permissions possible).
    """
    __tablename__ = "client_permissions"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), nullable=False, index=True)
    name        = Column(String(120), nullable=False)        # e.g. "user.invite"
    description = Column(Text, nullable=True)
    module      = Column(String(60), nullable=False)         # grouping key
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_client_permissions_client_name", "client_id", "name", unique=True),
    )


# ── Role ↔ Permission join table ──────────────────────────────────────────────

class ClientRolePermission(ClientBase):
    """Many-to-many: workspace roles ↔ permissions."""
    __tablename__ = "client_role_permissions"

    role_id       = Column(String(36), primary_key=True)   # FK client_roles.id
    permission_id = Column(String(36), primary_key=True)   # FK client_permissions.id
    granted_at    = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Login Logs ─────────────────────────────────────────────────────────────────

class ClientLoginLog(ClientBase):
    """Immutable audit log of login / logout / reset events."""
    __tablename__ = "client_login_logs"

    id           = Column(Integer, primary_key=True, autoincrement=True)
    client_id    = Column(String(36), nullable=False, index=True)
    user_id      = Column(String(36), nullable=True, index=True)   # platform DB ref
    event_type   = Column(String(30), nullable=False)
    email        = Column(String(320), nullable=True)
    ip_address   = Column(String(45), nullable=True)
    device_info  = Column(String(255), nullable=True)
    browser_info = Column(String(255), nullable=True)
    user_agent   = Column(Text, nullable=True)
    created_at   = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ── User Sessions ──────────────────────────────────────────────────────────────

class ClientUserSession(ClientBase):
    """One row per portal login; tracks active and past sessions."""
    __tablename__ = "client_user_sessions"

    id               = Column(String(36), primary_key=True, default=_uuid)
    client_id        = Column(String(36), nullable=False, index=True)
    user_id          = Column(String(36), nullable=False, index=True)   # platform DB ref
    jti              = Column(String(64), nullable=False, unique=True, index=True)
    ip_address       = Column(String(45), nullable=True)
    device_info      = Column(String(255), nullable=True)
    browser_info     = Column(String(255), nullable=True)
    user_agent       = Column(Text, nullable=True)
    login_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at       = Column(DateTime, nullable=True)
    is_active        = Column(Boolean, nullable=False, default=True)
    logged_out_at    = Column(DateTime, nullable=True)


# ── Portal Activity Logs ───────────────────────────────────────────────────────

class ClientPortalActivityLog(ClientBase):
    """Audit log for user-management actions within a client workspace."""
    __tablename__ = "client_portal_activity_logs"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    client_id      = Column(String(36), nullable=False, index=True)
    actor_id       = Column(String(36), nullable=True, index=True)      # platform DB ref
    target_user_id = Column(String(36), nullable=True)                  # platform DB ref
    action         = Column(String(80), nullable=False)
    ip_address     = Column(String(45), nullable=True)
    extra          = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
