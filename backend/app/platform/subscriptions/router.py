from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app.platform.subscriptions.models import Plan, Subscription
from backend.app.platform.subscriptions.schemas import (
    PlanCreate, PlanResponse, SubscriptionCreate, SubscriptionResponse
)
from backend.app.database.platform import get_platform_db

router = APIRouter()


@router.get("/plans", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_platform_db)):
    return db.query(Plan).filter(Plan.is_active == True).all()


@router.post("/plans", response_model=PlanResponse, status_code=201)
def create_plan(payload: PlanCreate, db: Session = Depends(get_platform_db)):
    plan = Plan(**payload.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.post("/assign", response_model=SubscriptionResponse, status_code=201)
def assign_subscription(payload: SubscriptionCreate, db: Session = Depends(get_platform_db)):
    existing = db.query(Subscription).filter(Subscription.tenant_id == payload.tenant_id).first()
    if existing:
        existing.plan_id = payload.plan_id
        existing.billing_cycle = payload.billing_cycle
        db.commit()
        db.refresh(existing)
        return existing

    sub = Subscription(**payload.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.get("/tenant/{tenant_id}", response_model=SubscriptionResponse)
def get_tenant_subscription(tenant_id: int, db: Session = Depends(get_platform_db)):
    sub = db.query(Subscription).filter(Subscription.tenant_id == tenant_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    return sub
