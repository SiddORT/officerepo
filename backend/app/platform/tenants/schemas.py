from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TenantCreate(BaseModel):
    name: str
    slug: str
    db_url: Optional[str] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_suspended: Optional[bool] = None


class TenantDbConnectionCreate(BaseModel):
    db_url: str


class TenantIdpConfigCreate(BaseModel):
    provider: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    metadata_url: Optional[str] = None
    is_active: bool = False


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    is_suspended: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TenantDetailResponse(TenantResponse):
    has_db: bool
    has_idp: bool
    subscription_status: Optional[str]
