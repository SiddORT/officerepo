"""
Service layer — business logic for RBAC.

Responsibilities:
  - Startup seeding: permission catalog, the built-in Superadmin role (holding
    every permission, non-deletable), and assigning it to the default superadmin.
  - Effective-permission resolution (per-request): the union of the permissions
    granted by an admin's roles. Holding a *system* role grants FULL_ACCESS.
  - CRUD for roles + their permission sets, and admin↔role assignment.
  - Audit logging for every mutation; standardized DTOs.
"""
from __future__ import annotations

from typing import List, Optional, Set

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.rbac import constants as c
from backend.app.modules.rbac import repository as repo
from backend.app.modules.rbac.models import Role, Permission
from backend.app.modules.rbac.schemas import (
    RoleCreateRequest, RoleUpdateRequest, AssignRolesRequest,
)
from backend.shared.audit.audit_logger import record_audit


# ════════════════════════════════════════════════════════════════════════════
# Seeding (idempotent — safe to run on every startup)
# ════════════════════════════════════════════════════════════════════════════
def seed_rbac(db: Session) -> None:
    """Seed the permission catalog, the system Superadmin role and its mapping.

    1. Insert any catalog permissions that don't exist yet (by name).
    2. Ensure the built-in non-deletable "Superadmin" role exists.
    3. Re-sync that role to hold *every* permission (so new catalog entries are
       picked up automatically).
    4. Assign the system role to the default superadmin account.
    """
    try:
        # 1. Permissions
        for name, module, description in c.PERMISSION_CATALOG:
            existing = repo.get_permission_by_name(db, name)
            if not existing:
                repo.create_permission(db, name=name, module=module, description=description)
            else:
                # Keep module/description in sync with the catalog.
                if existing.module != module or existing.description != description:
                    existing.module = module
                    existing.description = description
        db.flush()

        # 2. System role
        system_role = repo.get_system_role(db, c.SYSTEM_SUPERADMIN_ROLE)
        if not system_role:
            system_role = repo.create_role(
                db,
                name=c.SYSTEM_SUPERADMIN_ROLE,
                description=c.SYSTEM_SUPERADMIN_DESCRIPTION,
                is_system=True,
            )
            db.flush()

        # 3. Re-sync: system role holds every permission.
        held = set(repo.list_role_permission_ids(db, system_role.id))
        for pid in repo.all_permission_ids(db):
            if pid not in held:
                repo.add_role_permission(db, system_role.id, pid)

        # 4. Assign the system role to the default superadmin.
        admin = repo.get_admin_by_email(db, c.DEFAULT_SUPERADMIN_EMAIL)
        if admin:
            current = set(repo.list_admin_role_ids(db, admin.id))
            if system_role.id not in current:
                repo.add_admin_role(db, admin.id, system_role.id, created_by=None)

        db.commit()
    except Exception:
        db.rollback()
        raise


# ════════════════════════════════════════════════════════════════════════════
# Permission resolution (per-request)
# ════════════════════════════════════════════════════════════════════════════
def resolve_effective_permissions(db: Session, admin_id: Optional[int]) -> Set[str]:
    """Return the set of permission names the admin effectively holds.

    Holding any *system* role short-circuits to ``{FULL_ACCESS}`` so the
    built-in superadmin always passes every check (and automatically gains any
    newly-added permission). Resolution is done per-request from the DB so that
    revoking a role takes effect immediately (permissions are NOT baked into the
    JWT).
    """
    if admin_id is None:
        return set()
    if repo.admin_has_system_role(db, admin_id):
        return {c.FULL_ACCESS}
    return set(repo.effective_permission_names(db, admin_id))


def has_permission(perms: Set[str], permission: str) -> bool:
    return c.FULL_ACCESS in perms or permission in perms


def permissions_for_client(db: Session, admin_id: Optional[int]) -> List[str]:
    """Permissions list shaped for the frontend (``["*"]`` => full access)."""
    perms = resolve_effective_permissions(db, admin_id)
    if c.FULL_ACCESS in perms:
        return [c.FULL_ACCESS]
    return sorted(perms)


# ════════════════════════════════════════════════════════════════════════════
# DTO helpers
# ════════════════════════════════════════════════════════════════════════════
def _permission_to_dict(p: Permission) -> dict:
    return {
        "id": p.id,
        "name": p.name,
        "module": p.module,
        "module_label": c.MODULE_LABELS.get(p.module, p.module),
        "description": p.description,
    }


def _role_to_summary(role: Role, perm_count: int, admin_count: int) -> dict:
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permission_count": perm_count,
        "admin_count": admin_count,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


def _role_to_detail(db: Session, role: Role) -> dict:
    perm_ids = repo.list_role_permission_ids(db, role.id)
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system": role.is_system,
        "permission_ids": perm_ids,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


# ════════════════════════════════════════════════════════════════════════════
# Permission catalog
# ════════════════════════════════════════════════════════════════════════════
def list_permissions_grouped(db: Session) -> dict:
    """Permission catalog grouped by module for the toggle UI."""
    perms = repo.list_permissions(db)
    groups: dict = {}
    order: List[str] = []
    for p in perms:
        if p.module not in groups:
            groups[p.module] = {
                "module": p.module,
                "module_label": c.MODULE_LABELS.get(p.module, p.module),
                "permissions": [],
            }
            order.append(p.module)
        groups[p.module]["permissions"].append(_permission_to_dict(p))
    return {
        "modules": [groups[m] for m in order],
        "flat": [_permission_to_dict(p) for p in perms],
    }


# ════════════════════════════════════════════════════════════════════════════
# Roles
# ════════════════════════════════════════════════════════════════════════════
def list_roles(db: Session, *, page: int, page_size: int, sort_by: str, sort_dir: str,
               search: Optional[str]) -> dict:
    items, total = repo.list_roles(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir, search=search,
    )
    ids = [r.id for r in items]
    perm_counts = repo.permission_count_by_role(db, ids)
    admin_counts = repo.role_assignment_counts(db, ids)
    return {
        "items": [
            _role_to_summary(r, perm_counts.get(r.id, 0), admin_counts.get(r.id, 0))
            for r in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_role_detail(db: Session, role_id: str) -> dict:
    role = repo.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    return _role_to_detail(db, role)


def _validate_permission_ids(db: Session, permission_ids: List[str]) -> List[str]:
    unique = list(dict.fromkeys(permission_ids or []))
    if not unique:
        return []
    found = repo.get_permissions_by_ids(db, unique)
    found_ids = {p.id for p in found}
    missing = [pid for pid in unique if pid not in found_ids]
    if missing:
        raise HTTPException(status_code=400, detail="One or more permissions are invalid.")
    return unique


def create_role(db: Session, payload: RoleCreateRequest, *, actor_id: int, actor: str) -> dict:
    if repo.get_role_by_name(db, payload.name, include_deleted=False):
        raise HTTPException(status_code=409, detail="A role with that name already exists.")

    perm_ids = _validate_permission_ids(db, payload.permission_ids)
    role = repo.create_role(
        db, name=payload.name, description=payload.description, created_by=actor_id,
    )
    for pid in perm_ids:
        repo.add_role_permission(db, role.id, pid)

    record_audit(
        db, c.AUDIT_ROLE_CREATED, c.AUDIT_ENTITY_ROLE, role.id, actor=actor,
        metadata={"name": role.name, "permission_count": len(perm_ids)},
    )
    db.commit()
    return _role_to_detail(db, role)


def update_role(db: Session, role_id: str, payload: RoleUpdateRequest, *,
                actor_id: int, actor: str) -> dict:
    role = repo.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if role.is_system:
        # System role is fully managed by the platform — no edits permitted.
        raise HTTPException(status_code=400, detail="The built-in Superadmin role cannot be modified.")

    changed_fields = []
    if payload.name is not None and payload.name != role.name:
        clash = repo.get_role_by_name(db, payload.name, include_deleted=False)
        if clash and clash.id != role.id:
            raise HTTPException(status_code=409, detail="A role with that name already exists.")
        role.name = payload.name
        changed_fields.append("name")

    if payload.description is not None and payload.description != role.description:
        role.description = payload.description
        changed_fields.append("description")

    permissions_changed = False
    if payload.permission_ids is not None:
        perm_ids = _validate_permission_ids(db, payload.permission_ids)
        repo.clear_role_permissions(db, role.id)
        for pid in perm_ids:
            repo.add_role_permission(db, role.id, pid)
        permissions_changed = True

    db.flush()

    if changed_fields:
        record_audit(
            db, c.AUDIT_ROLE_UPDATED, c.AUDIT_ENTITY_ROLE, role.id, actor=actor,
            metadata={"fields": changed_fields},
        )
    if permissions_changed:
        record_audit(
            db, c.AUDIT_ROLE_PERMISSIONS_CHANGED, c.AUDIT_ENTITY_ROLE, role.id, actor=actor,
            metadata={"permission_count": len(payload.permission_ids or [])},
        )
    db.commit()
    return _role_to_detail(db, role)


def delete_role(db: Session, role_id: str, *, actor_id: int, actor: str) -> None:
    role = repo.get_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role.is_system:
        raise HTTPException(status_code=400, detail="The built-in Superadmin role cannot be deleted.")

    from datetime import datetime
    from backend.app.modules.rbac.models import AdminRole

    role.is_deleted = True
    role.deleted_at = datetime.utcnow()
    # Remove the role's permission grants and any active assignments so the
    # revocation takes effect immediately for every admin holding it.
    repo.clear_role_permissions(db, role.id)
    db.query(AdminRole).filter(AdminRole.role_id == role.id).delete(synchronize_session=False)
    db.flush()

    record_audit(
        db, c.AUDIT_ROLE_DELETED, c.AUDIT_ENTITY_ROLE, role.id, actor=actor,
        metadata={"name": role.name},
    )
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# Admin ↔ Role assignment
# ════════════════════════════════════════════════════════════════════════════
def list_admins_with_roles(db: Session) -> List[dict]:
    admins = repo.list_admins(db)
    out = []
    for a in admins:
        role_ids = repo.list_admin_role_ids(db, a.id)
        out.append({
            "id": a.id,
            "email": a.email,
            "name": a.name,
            "is_active": a.is_active,
            "role_ids": role_ids,
        })
    return out


def assign_roles(db: Session, admin_id: int, payload: AssignRolesRequest, *,
                 actor_id: int, actor: str) -> dict:
    admin = repo.get_admin(db, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin account not found.")

    requested = list(dict.fromkeys(payload.role_ids or []))
    # Validate every requested role exists (non-deleted).
    valid_ids = []
    for rid in requested:
        role = repo.get_role(db, rid)
        if not role:
            raise HTTPException(status_code=400, detail="One or more roles are invalid.")
        valid_ids.append(rid)

    # Preserve any system role the admin already holds (full access is managed by
    # the platform and not exposed as a togglable assignment in the UI).
    from backend.app.modules.rbac.models import AdminRole, Role as RoleModel
    existing_system = (
        db.query(AdminRole.role_id)
        .join(RoleModel, RoleModel.id == AdminRole.role_id)
        .filter(AdminRole.admin_id == admin_id, RoleModel.is_system.is_(True))
        .all()
    )
    final_ids = list(dict.fromkeys([r[0] for r in existing_system] + valid_ids))

    repo.clear_admin_roles(db, admin_id)
    for rid in final_ids:
        repo.add_admin_role(db, admin_id, rid, created_by=actor_id)

    record_audit(
        db, c.AUDIT_ROLES_ASSIGNED, c.AUDIT_ENTITY_ADMIN_ROLES, str(admin_id), actor=actor,
        metadata={"role_count": len(final_ids)},
    )
    db.commit()
    return {
        "id": admin.id,
        "email": admin.email,
        "name": admin.name,
        "is_active": admin.is_active,
        "role_ids": repo.list_admin_role_ids(db, admin_id),
    }
