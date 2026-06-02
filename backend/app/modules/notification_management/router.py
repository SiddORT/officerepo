"""Router — Notification Management (superadmin)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.deps import require_superadmin
from backend.app.database.platform import get_platform_db
from backend.app.modules.notification_management import service
from backend.app.modules.notification_management.constants import ALL_CHANNELS
from backend.app.modules.notification_management.schemas import (
    ChannelConfigUpdate, EventRuleUpdate, TemplateCreate, TemplateUpdate,
)
from backend.shared.response import ApiResponse

router = APIRouter()


# ── Channels ───────────────────────────────────────────────────────────────────

@router.get("/channels", summary="List all notification channels")
def list_channels(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.list_channels(db)
    return ApiResponse.ok(data).model_dump()


@router.get("/channels/{channel}", summary="Get channel config")
def get_channel(
    channel: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.get_channel(db, channel)
    return ApiResponse.ok(data).model_dump()


@router.put("/channels/{channel}", summary="Update channel config")
def update_channel(
    channel: str,
    payload: ChannelConfigUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_channel(
        db, channel, payload.is_enabled, payload.config,
        actor=admin.get("email", "system"),
    )
    return ApiResponse.ok(data, message="Channel configuration saved").model_dump()


@router.post("/channels/{channel}/test", summary="Test channel connection")
def test_channel(
    channel: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    result = service.test_channel(db, channel)
    msg = result.get("message", "")
    return ApiResponse.ok(result, message=msg).model_dump()


# ── Templates ──────────────────────────────────────────────────────────────────

@router.get("/templates", summary="List notification templates")
def list_templates(
    channel: Optional[str] = Query(None),
    active_only: bool = Query(False),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.list_templates(db, channel=channel, active_only=active_only)
    return ApiResponse.ok(data).model_dump()


@router.post("/templates", summary="Create notification template")
def create_template(
    payload: TemplateCreate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.create_template(db, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Template created").model_dump()


@router.get("/templates/{template_id}", summary="Get notification template")
def get_template(
    template_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.get_template(db, template_id)
    return ApiResponse.ok(data).model_dump()


@router.put("/templates/{template_id}", summary="Update notification template")
def update_template(
    template_id: str,
    payload: TemplateUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_template(db, template_id, payload, actor=admin.get("email", "system"))
    return ApiResponse.ok(data, message="Template updated").model_dump()


@router.delete("/templates/{template_id}", summary="Delete notification template")
def delete_template(
    template_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    service.delete_template(db, template_id, actor=admin.get("email", "system"))
    return ApiResponse.ok(None, message="Template deleted").model_dump()


# ── Event rules ────────────────────────────────────────────────────────────────

@router.get("/events", summary="List all notification event rules")
def list_event_rules(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.list_event_rules(db)
    return ApiResponse.ok(data).model_dump()


@router.put("/events/{event_name}/{channel}", summary="Update event rule")
def update_event_rule(
    event_name: str,
    channel: str,
    payload: EventRuleUpdate,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_superadmin),
):
    data = service.update_event_rule(
        db, event_name, channel, payload,
        actor=admin.get("email", "system"),
    )
    return ApiResponse.ok(data, message="Event rule updated").model_dump()


# ── Logs ───────────────────────────────────────────────────────────────────────

@router.get("/logs", summary="List notification delivery logs")
def list_logs(
    channel: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    event_name: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.list_logs(
        db, channel=channel, status=status,
        event_name=event_name, page=page, page_size=page_size,
    )
    return ApiResponse.ok(data).model_dump()


# ── Usage stats ────────────────────────────────────────────────────────────────

@router.get("/usage", summary="Notification usage statistics")
def get_usage(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_superadmin),
):
    data = service.get_usage(db)
    return ApiResponse.ok(data).model_dump()
