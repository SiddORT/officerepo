from typing import Any, Dict, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.module_registry import repository as repo
from backend.app.modules.module_registry.schemas import ModuleCreate, ModuleUpdate
from backend.shared.audit.audit_logger import record_audit as _audit


def _to_dict(m) -> Dict[str, Any]:
    return repo._to_dict(m)


def list_modules(db: Session, *, active_only: bool = False) -> List[Dict]:
    return [_to_dict(m) for m in repo.list_modules(db, active_only=active_only)]


def get_module(db: Session, code: str) -> Dict:
    m = repo.get_by_code(db, code)
    if not m:
        raise HTTPException(status_code=404, detail=f"Module '{code}' not found")
    return _to_dict(m)


def create_module(db: Session, payload: ModuleCreate, actor: str) -> Dict:
    if repo.get_by_code(db, payload.code):
        raise HTTPException(status_code=409, detail=f"Module code '{payload.code}' already exists")
    if repo.get_by_name(db, payload.name):
        raise HTTPException(status_code=409, detail=f"Module name '{payload.name}' already exists")
    m = repo.create(db, payload.model_dump())
    db.commit()
    _audit(db, action="module.created", entity_type="module_master", entity_id=m.code,
           actor=actor, metadata={"code": m.code, "name": m.name})
    return _to_dict(m)


def update_module(db: Session, code: str, payload: ModuleUpdate, actor: str) -> Dict:
    m = repo.get_by_code(db, code)
    if not m:
        raise HTTPException(status_code=404, detail=f"Module '{code}' not found")
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "name" in updates and updates["name"] != m.name:
        if repo.get_by_name(db, updates["name"]):
            raise HTTPException(status_code=409, detail=f"Module name '{updates['name']}' already in use")
    old_vals = {k: getattr(m, k) for k in updates}
    m = repo.update(db, m, updates)
    db.commit()
    _audit(db, action="module.updated", entity_type="module_master", entity_id=code,
           actor=actor, metadata={"old": old_vals, "new": updates})
    return _to_dict(m)


def deactivate_module(db: Session, code: str, actor: str) -> Dict:
    m = repo.get_by_code(db, code)
    if not m:
        raise HTTPException(status_code=404, detail=f"Module '{code}' not found")
    if m.is_system_module:
        raise HTTPException(status_code=403, detail="System modules cannot be deactivated")
    m = repo.update(db, m, {"is_active": False})
    db.commit()
    _audit(db, action="module.deactivated", entity_type="module_master", entity_id=code,
           actor=actor, metadata={"code": code, "name": m.name})
    return _to_dict(m)


def seed_module_catalog(db: Session) -> None:
    """Idempotent upsert — insert new catalog rows and update mutable fields on existing ones."""
    from backend.app.modules.module_registry.constants import MODULE_CATALOG
    MUTABLE = {"name", "description", "route", "icon", "display_order",
               "is_system_module", "parent_module_code"}
    for entry in MODULE_CATALOG:
        existing = repo.get_by_code(db, entry["code"])
        if existing:
            updates = {k: v for k, v in entry.items() if k in MUTABLE and getattr(existing, k) != v}
            if updates:
                repo.update(db, existing, updates)
        else:
            repo.create(db, {**entry, "is_active": True})
    db.commit()
