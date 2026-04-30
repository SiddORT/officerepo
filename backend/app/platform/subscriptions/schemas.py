from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    max_users: int = 10


class PlanResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    price_monthly: float
    price_yearly: float
    max_users: int
    is_active: bool

    class Config:
        from_attributes = True


class SubscriptionCreate(BaseModel):
    tenant_id: int
    plan_id: int
    billing_cycle: str = "monthly"


class SubscriptionResponse(BaseModel):
    id: int
    tenant_id: int
    plan_id: int
    status: str
    billing_cycle: str
    starts_at: datetime
    ends_at: Optional[datetime]

    class Config:
        from_attributes = True
