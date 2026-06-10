"""Service layer — Asset Management Setup. Business logic + validation."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.asset_management import constants as c
from backend.app.modules.asset_management import repository as repo
from backend.app.modules.asset_management.models import (
    AssetCategory, AssetSubCategory, AssetMaster,
)
from backend.shared.audit.audit_logger import record_audit


# ── Dict helpers ──────────────────────────────────────────────────────────────

def _cat_dict(cat: AssetCategory, sub_count: int = 0) -> Dict[str, Any]:
    return {
        "id": cat.id,
        "category_code": cat.category_code,
        "category_name": cat.category_name,
        "description": cat.description,
        "icon": cat.icon,
        "display_order": cat.display_order,
        "is_active": cat.is_active,
        "sub_category_count": sub_count,
        "created_at": cat.created_at,
        "updated_at": cat.updated_at,
    }


def _subcat_dict(sc: AssetSubCategory, category_name: Optional[str] = None
                 ) -> Dict[str, Any]:
    return {
        "id": sc.id,
        "sub_category_code": sc.sub_category_code,
        "sub_category_name": sc.sub_category_name,
        "category_id": sc.category_id,
        "category_name": category_name,
        "description": sc.description,
        "is_active": sc.is_active,
        "created_at": sc.created_at,
        "updated_at": sc.updated_at,
    }


def _master_dict(m: AssetMaster, category_name: Optional[str] = None,
                 sub_category_name: Optional[str] = None) -> Dict[str, Any]:
    return {
        "id": m.id,
        "asset_code": m.asset_code,
        "asset_name": m.asset_name,
        "category_id": m.category_id,
        "category_name": category_name,
        "sub_category_id": m.sub_category_id,
        "sub_category_name": sub_category_name,
        "brand": m.brand,
        "model_number": m.model_number,
        "manufacturer": m.manufacturer,
        "specifications": m.specifications,
        "warranty_period_months": m.warranty_period_months,
        "asset_image_url": m.asset_image_url,
        "purchase_cost": float(m.purchase_cost) if m.purchase_cost is not None else None,
        "expected_life_years": m.expected_life_years,
        "depreciation_applicable": m.depreciation_applicable,
        "serial_number_required": m.serial_number_required,
        "warranty_tracking_enabled": m.warranty_tracking_enabled,
        "maintenance_tracking_enabled": m.maintenance_tracking_enabled,
        "is_active": m.is_active,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    }


def _category_map(db: Session, ids: set) -> Dict[str, str]:
    if not ids:
        return {}
    rows = db.query(AssetCategory.id, AssetCategory.category_name)\
             .filter(AssetCategory.id.in_(ids)).all()
    return {r.id: r.category_name for r in rows}


def _subcat_map(db: Session, ids: set) -> Dict[str, str]:
    if not ids:
        return {}
    rows = db.query(AssetSubCategory.id, AssetSubCategory.sub_category_name)\
             .filter(AssetSubCategory.id.in_(ids)).all()
    return {r.id: r.sub_category_name for r in rows}


# ── Asset Categories ──────────────────────────────────────────────────────────

def list_categories(db: Session, **kwargs) -> Dict:
    rows, total = repo.list_categories(db, **kwargs)
    result = [
        _cat_dict(r, repo.count_sub_categories_for_category(db, r.id))
        for r in rows
    ]
    return {"data": result, "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 20)}


def get_category(db: Session, category_id: str) -> Dict:
    cat = repo.get_category(db, category_id)
    if not cat:
        raise HTTPException(404, "Asset category not found.")
    return _cat_dict(cat, repo.count_sub_categories_for_category(db, category_id))


def create_category(db: Session, payload, actor_id: Optional[int],
                    actor_email: Optional[str]) -> Dict:
    data = payload.model_dump(exclude_none=True)
    if repo.get_category_by_code(db, data["category_code"]):
        raise HTTPException(409, f"Category code '{data['category_code']}' already exists.")
    if repo.get_category_by_name(db, data["category_name"]):
        raise HTTPException(409, f"Category name '{data['category_name']}' already exists.")
    data["created_by"] = actor_id
    cat = repo.create_category(db, data)
    record_audit(db, action=c.ACTION_CATEGORY_CREATED, entity_type="asset_category",
                 entity_id=cat.id, actor=actor_email,
                 metadata={"category_code": cat.category_code, "category_name": cat.category_name})
    db.commit()
    return _cat_dict(cat)


def update_category(db: Session, category_id: str, payload, actor_id: Optional[int],
                    actor_email: Optional[str]) -> Dict:
    cat = repo.get_category(db, category_id)
    if not cat:
        raise HTTPException(404, "Asset category not found.")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "category_code" in data:
        if repo.get_category_by_code(db, data["category_code"], exclude_id=category_id):
            raise HTTPException(409, f"Category code '{data['category_code']}' already exists.")
    if "category_name" in data:
        if repo.get_category_by_name(db, data["category_name"], exclude_id=category_id):
            raise HTTPException(409, f"Category name '{data['category_name']}' already exists.")
    old = {"category_code": cat.category_code, "category_name": cat.category_name,
           "is_active": cat.is_active}
    cat = repo.update_category(db, cat, data)
    record_audit(db, action=c.ACTION_CATEGORY_UPDATED, entity_type="asset_category",
                 entity_id=category_id, actor=actor_email,
                 metadata={"old": old, "new": data})
    db.commit()
    return _cat_dict(cat)


def set_category_status(db: Session, category_id: str, activate: bool,
                        actor_email: Optional[str]) -> Dict:
    cat = repo.get_category(db, category_id)
    if not cat:
        raise HTTPException(404, "Asset category not found.")
    if cat.is_active == activate:
        return _cat_dict(cat)
    cat = repo.update_category(db, cat, {"is_active": activate})
    action = c.ACTION_CATEGORY_ACTIVATED if activate else c.ACTION_CATEGORY_DEACTIVATED
    record_audit(db, action=action, entity_type="asset_category",
                 entity_id=category_id, actor=actor_email)
    db.commit()
    return _cat_dict(cat)


# ── Asset Sub-Categories ──────────────────────────────────────────────────────

def list_sub_categories(db: Session, **kwargs) -> Dict:
    rows, total = repo.list_sub_categories(db, **kwargs)
    cat_ids = {r.category_id for r in rows if r.category_id}
    cat_names = _category_map(db, cat_ids)
    result = [_subcat_dict(r, cat_names.get(r.category_id)) for r in rows]
    return {"data": result, "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 50)}


def get_sub_category(db: Session, sub_cat_id: str) -> Dict:
    sc = repo.get_sub_category(db, sub_cat_id)
    if not sc:
        raise HTTPException(404, "Asset sub-category not found.")
    cat_names = _category_map(db, {sc.category_id})
    return _subcat_dict(sc, cat_names.get(sc.category_id))


def create_sub_category(db: Session, payload, actor_id: Optional[int],
                        actor_email: Optional[str]) -> Dict:
    data = payload.model_dump(exclude_none=True)
    cat = repo.get_category(db, data["category_id"])
    if not cat:
        raise HTTPException(404, "Asset category not found.")
    if repo.get_sub_cat_by_code(db, data["category_id"], data["sub_category_code"]):
        raise HTTPException(409, f"Sub-category code '{data['sub_category_code']}' "
                                 "already exists in this category.")
    if repo.get_sub_cat_by_name(db, data["category_id"], data["sub_category_name"]):
        raise HTTPException(409, f"Sub-category name '{data['sub_category_name']}' "
                                 "already exists in this category.")
    data["created_by"] = actor_id
    sc = repo.create_sub_category(db, data)
    record_audit(db, action=c.ACTION_SUBCAT_CREATED, entity_type="asset_sub_category",
                 entity_id=sc.id, actor=actor_email,
                 metadata={"sub_category_code": sc.sub_category_code,
                            "sub_category_name": sc.sub_category_name,
                            "category_id": sc.category_id})
    db.commit()
    cat_names = _category_map(db, {sc.category_id})
    return _subcat_dict(sc, cat_names.get(sc.category_id))


def update_sub_category(db: Session, sub_cat_id: str, payload, actor_id: Optional[int],
                        actor_email: Optional[str]) -> Dict:
    sc = repo.get_sub_category(db, sub_cat_id)
    if not sc:
        raise HTTPException(404, "Asset sub-category not found.")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    effective_cat_id = data.get("category_id", sc.category_id)
    if "category_id" in data and data["category_id"] != sc.category_id:
        if not repo.get_category(db, data["category_id"]):
            raise HTTPException(404, "Target asset category not found.")
    if "sub_category_code" in data:
        if repo.get_sub_cat_by_code(db, effective_cat_id, data["sub_category_code"],
                                    exclude_id=sub_cat_id):
            raise HTTPException(409, f"Sub-category code '{data['sub_category_code']}' "
                                     "already exists in this category.")
    if "sub_category_name" in data:
        if repo.get_sub_cat_by_name(db, effective_cat_id, data["sub_category_name"],
                                    exclude_id=sub_cat_id):
            raise HTTPException(409, f"Sub-category name '{data['sub_category_name']}' "
                                     "already exists in this category.")
    sc = repo.update_sub_category(db, sc, data)
    record_audit(db, action=c.ACTION_SUBCAT_UPDATED, entity_type="asset_sub_category",
                 entity_id=sub_cat_id, actor=actor_email, metadata={"updated": data})
    db.commit()
    cat_names = _category_map(db, {sc.category_id})
    return _subcat_dict(sc, cat_names.get(sc.category_id))


def set_sub_category_status(db: Session, sub_cat_id: str, activate: bool,
                            actor_email: Optional[str]) -> Dict:
    sc = repo.get_sub_category(db, sub_cat_id)
    if not sc:
        raise HTTPException(404, "Asset sub-category not found.")
    if sc.is_active == activate:
        cat_names = _category_map(db, {sc.category_id})
        return _subcat_dict(sc, cat_names.get(sc.category_id))
    sc = repo.update_sub_category(db, sc, {"is_active": activate})
    action = c.ACTION_SUBCAT_ACTIVATED if activate else c.ACTION_SUBCAT_DEACTIVATED
    record_audit(db, action=action, entity_type="asset_sub_category",
                 entity_id=sub_cat_id, actor=actor_email)
    db.commit()
    cat_names = _category_map(db, {sc.category_id})
    return _subcat_dict(sc, cat_names.get(sc.category_id))


# ── Asset Masters ─────────────────────────────────────────────────────────────

def list_asset_masters(db: Session, **kwargs) -> Dict:
    rows, total = repo.list_asset_masters(db, **kwargs)
    cat_ids = {r.category_id for r in rows if r.category_id}
    sc_ids = {r.sub_category_id for r in rows if r.sub_category_id}
    cat_names = _category_map(db, cat_ids)
    sc_names = _subcat_map(db, sc_ids)
    result = [
        _master_dict(r, cat_names.get(r.category_id), sc_names.get(r.sub_category_id))
        for r in rows
    ]
    return {"data": result, "total": total,
            "page": kwargs.get("page", 1), "page_size": kwargs.get("page_size", 20)}


def get_asset_master(db: Session, master_id: str) -> Dict:
    m = repo.get_asset_master(db, master_id)
    if not m:
        raise HTTPException(404, "Asset master not found.")
    cat_names = _category_map(db, {m.category_id})
    sc_names = _subcat_map(db, {m.sub_category_id} if m.sub_category_id else set())
    return _master_dict(m, cat_names.get(m.category_id),
                        sc_names.get(m.sub_category_id) if m.sub_category_id else None)


def create_asset_master(db: Session, payload, actor_id: Optional[int],
                        actor_email: Optional[str]) -> Dict:
    data = payload.model_dump()
    if repo.get_master_by_code(db, data["asset_code"]):
        raise HTTPException(409, f"Asset code '{data['asset_code']}' already exists.")
    if not repo.get_category(db, data["category_id"]):
        raise HTTPException(404, "Asset category not found.")
    if data.get("sub_category_id"):
        if not repo.get_sub_category(db, data["sub_category_id"]):
            raise HTTPException(404, "Asset sub-category not found.")
    data["created_by"] = actor_id
    m = repo.create_asset_master(db, data)
    record_audit(db, action=c.ACTION_MASTER_CREATED, entity_type="asset_master",
                 entity_id=m.id, actor=actor_email,
                 metadata={"asset_code": m.asset_code, "asset_name": m.asset_name})
    db.commit()
    return get_asset_master(db, m.id)


def update_asset_master(db: Session, master_id: str, payload, actor_id: Optional[int],
                        actor_email: Optional[str]) -> Dict:
    m = repo.get_asset_master(db, master_id)
    if not m:
        raise HTTPException(404, "Asset master not found.")
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "asset_code" in data:
        if repo.get_master_by_code(db, data["asset_code"], exclude_id=master_id):
            raise HTTPException(409, f"Asset code '{data['asset_code']}' already exists.")
    if "category_id" in data and not repo.get_category(db, data["category_id"]):
        raise HTTPException(404, "Asset category not found.")
    if "sub_category_id" in data and data["sub_category_id"]:
        if not repo.get_sub_category(db, data["sub_category_id"]):
            raise HTTPException(404, "Asset sub-category not found.")
    repo.update_asset_master(db, m, data)
    record_audit(db, action=c.ACTION_MASTER_UPDATED, entity_type="asset_master",
                 entity_id=master_id, actor=actor_email, metadata={"updated": data})
    db.commit()
    return get_asset_master(db, master_id)


def set_asset_master_status(db: Session, master_id: str, activate: bool,
                            actor_email: Optional[str]) -> Dict:
    m = repo.get_asset_master(db, master_id)
    if not m:
        raise HTTPException(404, "Asset master not found.")
    if m.is_active == activate:
        return get_asset_master(db, master_id)
    repo.update_asset_master(db, m, {"is_active": activate})
    action = c.ACTION_MASTER_ACTIVATED if activate else c.ACTION_MASTER_DEACTIVATED
    record_audit(db, action=action, entity_type="asset_master",
                 entity_id=master_id, actor=actor_email)
    db.commit()
    return get_asset_master(db, master_id)


# ── Meta Options ─────────────────────────────────────────────────────────────

def get_meta_options(db: Session) -> Dict:
    cats, _ = repo.list_categories(db, status="Active", page=1, page_size=500)
    subcats, _ = repo.list_sub_categories(db, status="Active", page=1, page_size=500)
    return {
        "categories": [{"id": c.id, "category_code": c.category_code,
                         "category_name": c.category_name, "icon": c.icon}
                        for c in cats],
        "sub_categories": [{"id": s.id, "sub_category_code": s.sub_category_code,
                              "sub_category_name": s.sub_category_name,
                              "category_id": s.category_id}
                            for s in subcats],
        "statuses": c.ASSET_STATUSES,
    }


# ── Platform seeding (called on startup) ──────────────────────────────────────

def seed_asset_defaults(db: Session) -> None:
    """Idempotently seed default categories, sub-categories, and asset masters."""
    from backend.app.modules.asset_management.constants import (
        DEFAULT_CATEGORIES, DEFAULT_SUB_CATEGORIES, DEFAULT_ASSET_MASTERS,
    )
    cat_code_map: Dict[str, str] = {}
    for cat_def in DEFAULT_CATEGORIES:
        existing = repo.get_category_by_code(db, cat_def["category_code"])
        if existing:
            cat_code_map[cat_def["category_code"]] = existing.id
        else:
            obj = repo.create_category(db, cat_def)
            cat_code_map[cat_def["category_code"]] = obj.id

    sc_code_map: Dict[str, str] = {}
    for sc_def in DEFAULT_SUB_CATEGORIES:
        cat_id = cat_code_map.get(sc_def["category_code"])
        if not cat_id:
            continue
        existing = repo.get_sub_cat_by_code(db, cat_id, sc_def["sub_category_code"])
        if existing:
            sc_code_map[sc_def["sub_category_code"]] = existing.id
        else:
            payload = {
                "sub_category_code": sc_def["sub_category_code"],
                "sub_category_name": sc_def["sub_category_name"],
                "category_id": cat_id,
            }
            obj = repo.create_sub_category(db, payload)
            sc_code_map[sc_def["sub_category_code"]] = obj.id

    for am_def in DEFAULT_ASSET_MASTERS:
        if repo.get_master_by_code(db, am_def["asset_code"]):
            continue
        cat_id = cat_code_map.get(am_def["category_code"])
        if not cat_id:
            continue
        sc_id = sc_code_map.get(am_def["sub_category_code"]) if am_def.get("sub_category_code") else None
        payload = {k: v for k, v in am_def.items()
                   if k not in ("category_code", "sub_category_code")}
        payload["category_id"] = cat_id
        payload["sub_category_id"] = sc_id
        repo.create_asset_master(db, payload)

    db.commit()
