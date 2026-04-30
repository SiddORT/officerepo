from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from backend.app.platform.tenants.models import Tenant, TenantDbConnection, TenantIdpConfig
from backend.app.platform.tenants.schemas import (
    TenantCreate, TenantUpdate, TenantResponse, TenantDetailResponse,
    TenantDbConnectionCreate, TenantIdpConfigCreate
)
from backend.app.database.platform import get_platform_db
from backend.app.database.tenant import init_tenant_db

router = APIRouter()


@router.get("/", response_model=List[TenantResponse])
def list_tenants(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_platform_db),
):
    q = db.query(Tenant)
    if search:
        q = q.filter(
            (Tenant.name.ilike(f"%{search}%")) |
            (Tenant.slug.ilike(f"%{search}%"))
        )
    return q.offset((page - 1) * page_size).limit(page_size).all()


@router.get("/{tenant_id}", response_model=TenantDetailResponse)
def get_tenant(tenant_id: int, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantDetailResponse(
        **TenantResponse.model_validate(tenant).model_dump(),
        has_db=tenant.db_connection is not None,
        has_idp=tenant.idp_config is not None,
        subscription_status=tenant.subscription.status if tenant.subscription else None,
    )


@router.post("/", response_model=TenantResponse, status_code=201)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_platform_db)):
    existing = db.query(Tenant).filter(Tenant.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already exists")

    tenant = Tenant(name=payload.name, slug=payload.slug)
    db.add(tenant)
    db.flush()

    if payload.db_url:
        conn = TenantDbConnection(tenant_id=tenant.id, db_url=payload.db_url)
        db.add(conn)
        db.commit()
        db.refresh(tenant)
        try:
            init_tenant_db(payload.db_url)
        except Exception as e:
            pass
    else:
        db.commit()
        db.refresh(tenant)

    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(tenant_id: int, payload: TenantUpdate, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(tenant, field, val)
    db.commit()
    db.refresh(tenant)
    return tenant


@router.post("/{tenant_id}/activate")
def activate_tenant(tenant_id: int, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_active = True
    tenant.is_suspended = False
    db.commit()
    return {"message": f"Tenant '{tenant.slug}' activated"}


@router.post("/{tenant_id}/suspend")
def suspend_tenant(tenant_id: int, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.is_suspended = True
    db.commit()
    return {"message": f"Tenant '{tenant.slug}' suspended"}


@router.post("/{tenant_id}/db-connection")
def configure_db(tenant_id: int, payload: TenantDbConnectionCreate, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.db_connection:
        tenant.db_connection.db_url = payload.db_url
    else:
        conn = TenantDbConnection(tenant_id=tenant_id, db_url=payload.db_url)
        db.add(conn)
    db.commit()
    try:
        init_tenant_db(payload.db_url)
    except Exception:
        pass
    return {"message": "Database connection configured"}


@router.post("/{tenant_id}/idp-config")
def configure_idp(tenant_id: int, payload: TenantIdpConfigCreate, db: Session = Depends(get_platform_db)):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.idp_config:
        for field, val in payload.model_dump(exclude_unset=True).items():
            setattr(tenant.idp_config, field, val)
    else:
        idp = TenantIdpConfig(tenant_id=tenant_id, **payload.model_dump())
        db.add(idp)
    db.commit()
    return {"message": "IDP configuration saved"}
