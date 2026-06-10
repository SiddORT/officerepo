"""Repository layer — Asset Management Setup. Pure DB queries, no business logic."""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.modules.asset_management.models import (
    AssetCategory, AssetSubCategory, AssetMaster,
)


# ── Asset Categories ──────────────────────────────────────────────────────────

def list_categories(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[AssetCategory], int]:
    q = db.query(AssetCategory)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AssetCategory.category_name.ilike(like),
            AssetCategory.category_code.ilike(like),
        ))
    if status == "Active":
        q = q.filter(AssetCategory.is_active.is_(True))
    elif status == "Inactive":
        q = q.filter(AssetCategory.is_active.is_(False))
    total = q.count()
    rows = q.order_by(AssetCategory.display_order, AssetCategory.category_name)\
             .offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_category(db: Session, category_id: str) -> Optional[AssetCategory]:
    return db.query(AssetCategory).filter(AssetCategory.id == category_id).first()


def get_category_by_code(db: Session, code: str, exclude_id: Optional[str] = None
                         ) -> Optional[AssetCategory]:
    q = db.query(AssetCategory).filter(
        func.upper(AssetCategory.category_code) == code.strip().upper()
    )
    if exclude_id:
        q = q.filter(AssetCategory.id != exclude_id)
    return q.first()


def get_category_by_name(db: Session, name: str, exclude_id: Optional[str] = None
                         ) -> Optional[AssetCategory]:
    q = db.query(AssetCategory).filter(
        func.upper(AssetCategory.category_name) == name.strip().upper()
    )
    if exclude_id:
        q = q.filter(AssetCategory.id != exclude_id)
    return q.first()


def create_category(db: Session, data: dict) -> AssetCategory:
    obj = AssetCategory(**data)
    db.add(obj)
    db.flush()
    return obj


def update_category(db: Session, obj: AssetCategory, data: dict) -> AssetCategory:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def count_sub_categories_for_category(db: Session, category_id: str) -> int:
    return db.query(AssetSubCategory)\
             .filter(AssetSubCategory.category_id == category_id,
                     AssetSubCategory.is_active.is_(True)).count()


# ── Asset Sub-Categories ──────────────────────────────────────────────────────

def list_sub_categories(
    db: Session,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> Tuple[List[AssetSubCategory], int]:
    q = db.query(AssetSubCategory)
    if category_id:
        q = q.filter(AssetSubCategory.category_id == category_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AssetSubCategory.sub_category_name.ilike(like),
            AssetSubCategory.sub_category_code.ilike(like),
        ))
    if status == "Active":
        q = q.filter(AssetSubCategory.is_active.is_(True))
    elif status == "Inactive":
        q = q.filter(AssetSubCategory.is_active.is_(False))
    total = q.count()
    rows = q.order_by(AssetSubCategory.sub_category_name)\
             .offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_sub_category(db: Session, sub_cat_id: str) -> Optional[AssetSubCategory]:
    return db.query(AssetSubCategory)\
             .filter(AssetSubCategory.id == sub_cat_id).first()


def get_sub_cat_by_code(db: Session, category_id: str, code: str,
                        exclude_id: Optional[str] = None) -> Optional[AssetSubCategory]:
    q = db.query(AssetSubCategory).filter(
        AssetSubCategory.category_id == category_id,
        func.upper(AssetSubCategory.sub_category_code) == code.strip().upper(),
    )
    if exclude_id:
        q = q.filter(AssetSubCategory.id != exclude_id)
    return q.first()


def get_sub_cat_by_name(db: Session, category_id: str, name: str,
                        exclude_id: Optional[str] = None) -> Optional[AssetSubCategory]:
    q = db.query(AssetSubCategory).filter(
        AssetSubCategory.category_id == category_id,
        func.upper(AssetSubCategory.sub_category_name) == name.strip().upper(),
    )
    if exclude_id:
        q = q.filter(AssetSubCategory.id != exclude_id)
    return q.first()


def create_sub_category(db: Session, data: dict) -> AssetSubCategory:
    obj = AssetSubCategory(**data)
    db.add(obj)
    db.flush()
    return obj


def update_sub_category(db: Session, obj: AssetSubCategory, data: dict
                        ) -> AssetSubCategory:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush()
    return obj


def count_masters_for_sub_category(db: Session, sub_category_id: str) -> int:
    return db.query(AssetMaster)\
             .filter(AssetMaster.sub_category_id == sub_category_id,
                     AssetMaster.is_active.is_(True)).count()


# ── Asset Masters ─────────────────────────────────────────────────────────────

def list_asset_masters(
    db: Session,
    category_id: Optional[str] = None,
    sub_category_id: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[AssetMaster], int]:
    q = db.query(AssetMaster)
    if category_id:
        q = q.filter(AssetMaster.category_id == category_id)
    if sub_category_id:
        q = q.filter(AssetMaster.sub_category_id == sub_category_id)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            AssetMaster.asset_name.ilike(like),
            AssetMaster.asset_code.ilike(like),
            AssetMaster.brand.ilike(like),
            AssetMaster.model_number.ilike(like),
        ))
    if status == "Active":
        q = q.filter(AssetMaster.is_active.is_(True))
    elif status == "Inactive":
        q = q.filter(AssetMaster.is_active.is_(False))
    total = q.count()
    rows = q.order_by(AssetMaster.asset_name)\
             .offset((page - 1) * page_size).limit(page_size).all()
    return rows, total


def get_asset_master(db: Session, master_id: str) -> Optional[AssetMaster]:
    return db.query(AssetMaster).filter(AssetMaster.id == master_id).first()


def get_master_by_code(db: Session, code: str,
                       exclude_id: Optional[str] = None) -> Optional[AssetMaster]:
    q = db.query(AssetMaster).filter(
        func.upper(AssetMaster.asset_code) == code.strip().upper()
    )
    if exclude_id:
        q = q.filter(AssetMaster.id != exclude_id)
    return q.first()


def create_asset_master(db: Session, data: dict) -> AssetMaster:
    obj = AssetMaster(**data)
    db.add(obj)
    db.flush()
    return obj


def update_asset_master(db: Session, obj: AssetMaster, data: dict) -> AssetMaster:
    for k, v in data.items():
        setattr(obj, k, v)
    db.flush()
    return obj
