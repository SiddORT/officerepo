"""Superadmin CRUD for Industry Master (platform-level reference data)."""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.industry_master.models import IndustryMaster
from backend.shared.response import ApiResponse

router = APIRouter()


class IndustryCreate(BaseModel):
    name: str
    sort_order: int = 0


class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


def _to_dict(r: IndustryMaster) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "sort_order": r.sort_order,
        "is_active": r.is_active,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
def list_industries(
    db: Session = Depends(get_platform_db),
    _: dict = Depends(require_superadmin),
):
    rows = db.query(IndustryMaster).order_by(IndustryMaster.sort_order, IndustryMaster.name).all()
    return ApiResponse.ok([_to_dict(r) for r in rows]).model_dump()


@router.post("")
def create_industry(
    body: IndustryCreate,
    db: Session = Depends(get_platform_db),
    _: dict = Depends(require_superadmin),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required.")
    exists = db.query(IndustryMaster).filter(IndustryMaster.name == name).first()
    if exists:
        raise HTTPException(status_code=409, detail="Industry with this name already exists.")
    row = IndustryMaster(name=name, sort_order=body.sort_order)
    db.add(row)
    db.commit()
    db.refresh(row)
    return ApiResponse.ok(_to_dict(row), "Industry created.").model_dump()


@router.patch("/{industry_id}")
def update_industry(
    industry_id: int,
    body: IndustryUpdate,
    db: Session = Depends(get_platform_db),
    _: dict = Depends(require_superadmin),
):
    row = db.query(IndustryMaster).filter(IndustryMaster.id == industry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Industry not found.")
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty.")
        dup = db.query(IndustryMaster).filter(
            IndustryMaster.name == name, IndustryMaster.id != industry_id
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail="Another industry with this name already exists.")
        row.name = name
    if body.sort_order is not None:
        row.sort_order = body.sort_order
    if body.is_active is not None:
        row.is_active = body.is_active
    db.commit()
    db.refresh(row)
    return ApiResponse.ok(_to_dict(row), "Industry updated.").model_dump()


@router.delete("/{industry_id}")
def delete_industry(
    industry_id: int,
    db: Session = Depends(get_platform_db),
    _: dict = Depends(require_superadmin),
):
    row = db.query(IndustryMaster).filter(IndustryMaster.id == industry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Industry not found.")
    db.delete(row)
    db.commit()
    return ApiResponse.ok(None, "Industry deleted.").model_dump()
