"""SQLAlchemy models for Client Portal User Management.

All tables are scoped to client_id (platform DB, multi-tenant by column).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Index,
)
from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Client Roles ──────────────────────────────────────────────────────────────

class ClientRole(Base):
    """Workspace-scoped roles (Super Admin, Admin, Manager, Employee, custom)."""
    __tablename__ = "client_roles"

    id          = Column(String(36), primary_key=True, default=_uuid)
    client_id   = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_system_role = Column(Boolean, nullable=False, default=False)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_client_roles_client_name", "client_id", "name", unique=True),
    )


# ── User ↔ Role join table ────────────────────────────────────────────────────

class ClientUserRole(Base):
    """Many-to-many: client admin users ↔ client roles."""
    __tablename__ = "client_user_roles"

    user_id     = Column(String(36), ForeignKey("client_admin_users.id"), primary_key=True)
    role_id     = Column(String(36), ForeignKey("client_roles.id"), primary_key=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ── Login Logs ────────────────────────────────────────────────────────────────

class ClientLoginLog(Base):
    """Immutable audit log of login/logout/reset events per client workspace."""
    __tablename__ = "client_login_logs"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    client_id   = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)
    user_id     = Column(String(36), ForeignKey("client_admin_users.id"), nullable=True, index=True)
    event_type  = Column(String(30), nullable=False)
    email       = Column(String(320), nullable=True)
    ip_address  = Column(String(45), nullable=True)
    device_info = Column(String(255), nullable=True)
    browser_info = Column(String(255), nullable=True)
    user_agent  = Column(Text, nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


# ── User Sessions ─────────────────────────────────────────────────────────────

class ClientUserSession(Base):
    """Tracks active and past portal sessions (one row per login)."""
    __tablename__ = "client_user_sessions"

    id               = Column(String(36), primary_key=True, default=_uuid)
    client_id        = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)
    user_id          = Column(String(36), ForeignKey("client_admin_users.id"), nullable=False, index=True)
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


# ── Portal Activity Logs ──────────────────────────────────────────────────────

class ClientPortalActivityLog(Base):
    """Audit log for user-management actions within a client workspace."""
    __tablename__ = "client_portal_activity_logs"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    client_id      = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)
    actor_id       = Column(String(36), ForeignKey("client_admin_users.id"), nullable=True, index=True)
    target_user_id = Column(String(36), ForeignKey("client_admin_users.id"), nullable=True)
    action         = Column(String(80), nullable=False)
    ip_address     = Column(String(45), nullable=True)
    extra          = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
