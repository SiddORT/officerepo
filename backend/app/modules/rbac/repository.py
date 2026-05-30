"""
Repository layer — pure DB queries for RBAC. No business logic here.
Reads exclude soft-deleted roles unless explicitly noted.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from datetime import datetime

from backend.app.modules.rbac.models import (
    Permission, Role, RolePermission, AdminRole, AdminInvitation,
)
from backend.app.platform.superadmin.models import SuperAdmin


# ── Permissions ──────────────────────────────────────────────────────────────
def list_permissions(db: Session) -> List[Permission]:
    return db.query(Permission).order_by(Permission.module, Permission.name).all()


def get_permission_by_name(db: Session, name: str) -> Optional[Permission]:
    return db.query(Permission).filter(Permission.name == name).first()


def create_permission(db: Session, *, name: str, module: str, description: Optional[str]) -> Permission:
    perm = Permission(name=name, module=module, description=description)
    db.add(perm)
    db.flush()
    return perm


def get_permissions_by_ids(db: Session, ids: List[str]) -> List[Permission]:
    if not ids:
        return []
    return db.query(Permission).filter(Permission.id.in_(ids)).all()


def all_permission_ids(db: Session) -> List[str]:
    return [row.id for row in db.query(Permission.id).all()]


# ── Roles ────────────────────────────────────────────────────────────────────
def get_role(db: Session, role_id: str, *, include_deleted: bool = False) -> Optional[Role]:
    q = db.query(Role).filter(Role.id == role_id)
    if not include_deleted:
        q = q.filter(Role.is_deleted.is_(False))
    return q.first()


def get_role_by_name(db: Session, name: str, *, include_deleted: bool = False) -> Optional[Role]:
    q = db.query(Role).filter(func.lower(Role.name) == name.strip().lower())
    if not include_deleted:
        q = q.filter(Role.is_deleted.is_(False))
    return q.first()


def get_system_role(db: Session, name: str) -> Optional[Role]:
    return db.query(Role).filter(Role.name == name, Role.is_system.is_(True)).first()


def create_role(
    db: Session, *, name: str, description: Optional[str],
    is_system: bool = False, created_by: Optional[int] = None,
) -> Role:
    role = Role(name=name, description=description, is_system=is_system, created_by=created_by)
    db.add(role)
    db.flush()
    return role


def list_roles(
    db: Session, *, page: int, page_size: int, sort_by: str, sort_dir: str,
    search: Optional[str] = None,
) -> Tuple[List[Role], int]:
    q = db.query(Role).filter(Role.is_deleted.is_(False))
    if search:
        like = f"%{search.strip()}%"
        q = q.filter((Role.name.ilike(like)) | (Role.description.ilike(like)))

    total = q.count()
    sort_col = getattr(Role, sort_by, Role.created_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ── Role ↔ Permission ────────────────────────────────────────────────────────
def list_role_permission_ids(db: Session, role_id: str) -> List[str]:
    rows = db.query(RolePermission.permission_id).filter(RolePermission.role_id == role_id).all()
    return [r[0] for r in rows]


def add_role_permission(db: Session, role_id: str, permission_id: str) -> None:
    db.add(RolePermission(role_id=role_id, permission_id=permission_id))
    db.flush()


def clear_role_permissions(db: Session, role_id: str) -> None:
    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete(synchronize_session=False)
    db.flush()


def permission_count_by_role(db: Session, role_ids: List[str]) -> dict:
    if not role_ids:
        return {}
    rows = (
        db.query(RolePermission.role_id, func.count(RolePermission.id))
        .filter(RolePermission.role_id.in_(role_ids))
        .group_by(RolePermission.role_id)
        .all()
    )
    return {rid: count for rid, count in rows}


# ── Admin ↔ Role ─────────────────────────────────────────────────────────────
def list_admin_role_ids(db: Session, admin_id: int) -> List[str]:
    rows = (
        db.query(AdminRole.role_id)
        .join(Role, Role.id == AdminRole.role_id)
        .filter(AdminRole.admin_id == admin_id, Role.is_deleted.is_(False))
        .all()
    )
    return [r[0] for r in rows]


def admin_has_system_role(db: Session, admin_id: int) -> bool:
    return (
        db.query(AdminRole.id)
        .join(Role, Role.id == AdminRole.role_id)
        .filter(
            AdminRole.admin_id == admin_id,
            Role.is_system.is_(True),
            Role.is_deleted.is_(False),
        )
        .first()
        is not None
    )


def effective_permission_names(db: Session, admin_id: int) -> List[str]:
    """Union of all permission names granted by the admin's (non-deleted) roles."""
    rows = (
        db.query(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(AdminRole, AdminRole.role_id == Role.id)
        .filter(AdminRole.admin_id == admin_id, Role.is_deleted.is_(False))
        .distinct()
        .all()
    )
    return [r[0] for r in rows]


def add_admin_role(db: Session, admin_id: int, role_id: str, created_by: Optional[int]) -> None:
    db.add(AdminRole(admin_id=admin_id, role_id=role_id, created_by=created_by))
    db.flush()


def clear_admin_roles(db: Session, admin_id: int) -> None:
    db.query(AdminRole).filter(AdminRole.admin_id == admin_id).delete(synchronize_session=False)
    db.flush()


def role_assignment_counts(db: Session, role_ids: List[str]) -> dict:
    if not role_ids:
        return {}
    rows = (
        db.query(AdminRole.role_id, func.count(AdminRole.id))
        .filter(AdminRole.role_id.in_(role_ids))
        .group_by(AdminRole.role_id)
        .all()
    )
    return {rid: count for rid, count in rows}


# ── Admin accounts (for the assignment UI) ───────────────────────────────────
def list_admins(db: Session) -> List[SuperAdmin]:
    return db.query(SuperAdmin).order_by(SuperAdmin.id).all()


def get_admin(db: Session, admin_id: int) -> Optional[SuperAdmin]:
    return db.query(SuperAdmin).filter(SuperAdmin.id == admin_id).first()


def get_admin_by_email(db: Session, email: str) -> Optional[SuperAdmin]:
    return db.query(SuperAdmin).filter(SuperAdmin.email == email).first()


def create_admin(
    db: Session, *, email: str, name: Optional[str], hashed_password: str,
    is_active: bool = True,
) -> SuperAdmin:
    admin = SuperAdmin(
        email=email, name=name, hashed_password=hashed_password, is_active=is_active,
    )
    db.add(admin)
    db.flush()
    return admin


def set_admin_active(db: Session, admin: SuperAdmin, is_active: bool) -> SuperAdmin:
    admin.is_active = is_active
    db.flush()
    return admin


def set_admin_password(db: Session, admin: SuperAdmin, hashed_password: str) -> SuperAdmin:
    admin.hashed_password = hashed_password
    db.flush()
    return admin


def delete_admin(db: Session, admin: SuperAdmin) -> None:
    db.query(AdminRole).filter(AdminRole.admin_id == admin.id).delete(synchronize_session=False)
    db.query(AdminInvitation).filter(AdminInvitation.admin_id == admin.id).delete(synchronize_session=False)
    db.delete(admin)
    db.flush()


# ── Invitations ──────────────────────────────────────────────────────────────
def create_invitation(
    db: Session, *, admin_id: int, email: str, token_hash: str,
    expires_at: datetime, created_by: Optional[int],
) -> AdminInvitation:
    inv = AdminInvitation(
        admin_id=admin_id, email=email, token_hash=token_hash,
        expires_at=expires_at, created_by=created_by,
    )
    db.add(inv)
    db.flush()
    return inv


def get_invitation_by_token_hash(db: Session, token_hash: str) -> Optional[AdminInvitation]:
    return (
        db.query(AdminInvitation)
        .filter(AdminInvitation.token_hash == token_hash)
        .first()
    )


def revoke_open_invitations(db: Session, admin_id: int) -> None:
    (
        db.query(AdminInvitation)
        .filter(
            AdminInvitation.admin_id == admin_id,
            AdminInvitation.accepted_at.is_(None),
            AdminInvitation.is_revoked.is_(False),
        )
        .update({AdminInvitation.is_revoked: True}, synchronize_session=False)
    )
    db.flush()


def latest_invitations_by_admin(db: Session, admin_ids: List[int]) -> dict:
    """Return {admin_id: most-recent AdminInvitation} for the given admins."""
    if not admin_ids:
        return {}
    rows = (
        db.query(AdminInvitation)
        .filter(AdminInvitation.admin_id.in_(admin_ids))
        .order_by(AdminInvitation.admin_id, AdminInvitation.created_at.desc())
        .all()
    )
    latest: dict = {}
    for row in rows:
        if row.admin_id not in latest:
            latest[row.admin_id] = row
    return latest
