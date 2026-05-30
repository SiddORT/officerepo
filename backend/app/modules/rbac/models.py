"""
RBAC models — platform-level (single platform, no tenant scope).

Tables:
- ``permissions``       — the canonical permission catalog (seeded on startup).
- ``roles``             — named bundles of permissions (soft-deletable).
- ``role_permissions``  — many-to-many role ↔ permission.
- ``admin_roles``       — many-to-many superadmin account ↔ role.

UUID (String(36)) primary keys per DB standards; every table carries
``created_at``; mutable tables also carry ``updated_at`` and (where applicable)
``created_by`` / soft-delete columns.
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, ForeignKey, UniqueConstraint, Index,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Permission(Base):
    """A single named permission, e.g. ``currency.override_rate``.

    The catalog is seeded from ``constants.PERMISSION_CATALOG`` on startup and is
    not user-editable (no soft-delete: removing a permission means removing it
    from the catalog + a migration).
    """
    __tablename__ = "permissions"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Role(Base):
    """A named bundle of permissions assignable to admin accounts."""
    __tablename__ = "roles"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(60), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)

    # Built-in roles (e.g. "Superadmin") cannot be deleted or have their
    # permission set edited — they are managed by the platform.
    is_system = Column(Boolean, nullable=False, default=False, index=True)

    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class RolePermission(Base):
    """Join table — which permissions a role grants."""
    __tablename__ = "role_permissions"

    id = Column(String(36), primary_key=True, default=_uuid)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False, index=True)
    permission_id = Column(String(36), ForeignKey("permissions.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
        Index("ix_role_permissions_role_perm", "role_id", "permission_id"),
    )


class AdminRole(Base):
    """Join table — which roles a superadmin account holds."""
    __tablename__ = "admin_roles"

    id = Column(String(36), primary_key=True, default=_uuid)
    admin_id = Column(Integer, ForeignKey("superadmins.id"), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False, index=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("admin_id", "role_id", name="uq_admin_role"),
        Index("ix_admin_roles_admin_role", "admin_id", "role_id"),
    )
