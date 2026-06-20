from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.modules.module_registry.models import ModuleMaster


def list_modules(db: Session, *, active_only: bool = False) -> List[ModuleMaster]:
    q = db.query(ModuleMaster)
    if active_only:
        q = q.filter(ModuleMaster.is_active.is_(True))
    return q.order_by(ModuleMaster.display_order, ModuleMaster.name).all()


def get_by_code(db: Session, code: str) -> Optional[ModuleMaster]:
    return db.get(ModuleMaster, code)


def get_by_name(db: Session, name: str) -> Optional[ModuleMaster]:
    return db.query(ModuleMaster).filter(ModuleMaster.name == name).first()


def create(db: Session, data: Dict[str, Any]) -> ModuleMaster:
    m = ModuleMaster(**data)
    db.add(m)
    db.flush()
    return m


def update(db: Session, module: ModuleMaster, updates: Dict[str, Any]) -> ModuleMaster:
    for k, v in updates.items():
        setattr(module, k, v)
    db.flush()
    return module


def get_enriched_map(db: Session) -> Dict[str, Dict]:
    """Return {module_name: module_dict} for fast lookups by display name."""
    rows = list_modules(db, active_only=False)
    return {r.name: _to_dict(r) for r in rows}


def _to_dict(m: ModuleMaster) -> Dict[str, Any]:
    return {
        "code": m.code,
        "name": m.name,
        "description": m.description,
        "route": m.route,
        "icon": m.icon,
        "display_order": m.display_order,
        "is_active": m.is_active,
        "is_system_module": m.is_system_module,
        "parent_module_code": m.parent_module_code,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }
