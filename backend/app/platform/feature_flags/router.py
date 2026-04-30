from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from backend.app.platform.feature_flags.models import FeatureFlag
from backend.app.database.platform import get_platform_db

router = APIRouter()

AVAILABLE_MODULES = ["hrms", "assets", "billing", "attendance", "leave", "payroll"]


class FeatureFlagResponse(BaseModel):
    id: int
    tenant_id: int
    module: str
    is_enabled: bool

    class Config:
        from_attributes = True


class ToggleModuleRequest(BaseModel):
    module: str
    is_enabled: bool


@router.get("/{tenant_id}/features", response_model=List[FeatureFlagResponse])
def get_tenant_features(tenant_id: int, db: Session = Depends(get_platform_db)):
    return db.query(FeatureFlag).filter(FeatureFlag.tenant_id == tenant_id).all()


@router.post("/{tenant_id}/features")
def toggle_feature(tenant_id: int, payload: ToggleModuleRequest, db: Session = Depends(get_platform_db)):
    if payload.module not in AVAILABLE_MODULES:
        raise HTTPException(status_code=400, detail=f"Unknown module. Available: {AVAILABLE_MODULES}")

    flag = db.query(FeatureFlag).filter(
        FeatureFlag.tenant_id == tenant_id,
        FeatureFlag.module == payload.module,
    ).first()

    if flag:
        flag.is_enabled = payload.is_enabled
    else:
        flag = FeatureFlag(tenant_id=tenant_id, module=payload.module, is_enabled=payload.is_enabled)
        db.add(flag)

    db.commit()
    return {"message": f"Module '{payload.module}' {'enabled' if payload.is_enabled else 'disabled'} for tenant {tenant_id}"}


@router.get("/modules/available")
def list_available_modules():
    return {"modules": AVAILABLE_MODULES}
