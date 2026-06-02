"""Pydantic schemas for Notification Management."""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, field_validator

from backend.app.modules.notification_management.constants import (
    ALL_CHANNELS, ALL_PRIORITIES, ALL_LOG_STATUSES,
    PRIORITY_NORMAL,
)


# ── Channel config ─────────────────────────────────────────────────────────────

class ChannelConfigUpdate(BaseModel):
    """Generic channel config update — accepts any dict of settings."""
    is_enabled: bool = False
    config: dict[str, Any] = {}


class ChannelConfigResponse(BaseModel):
    channel: str
    label: str
    is_enabled: bool
    config: dict[str, Any]          # sensitive fields already masked


# ── Templates ─────────────────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    channel: str
    name: str
    slug: str
    subject: Optional[str] = None
    body: str
    variables: Optional[list[str]] = None
    is_active: bool = True

    @field_validator("channel", mode="before")
    @classmethod
    def validate_channel(cls, v: str) -> str:
        if v not in ALL_CHANNELS:
            raise ValueError(f"channel must be one of {ALL_CHANNELS}")
        return v

    @field_validator("name", "slug", "body", mode="before")
    @classmethod
    def strip_required(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v

    @field_validator("slug", mode="after")
    @classmethod
    def slugify(cls, v: str) -> str:
        import re
        v = re.sub(r"[^a-z0-9_]", "_", v.lower()).strip("_")
        if not v:
            raise ValueError("slug must contain at least one alphanumeric character")
        return v


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    variables: Optional[list[str]] = None
    is_active: Optional[bool] = None

    @field_validator("name", "body", mode="before")
    @classmethod
    def strip_if_present(cls, v):
        if isinstance(v, str):
            return v.strip() or None
        return v


class TemplateResponse(BaseModel):
    id: str
    channel: str
    name: str
    slug: str
    subject: Optional[str]
    body: str
    variables: list[str]
    is_active: bool
    is_system: bool
    created_at: Optional[str]
    updated_at: Optional[str]


# ── Event rules ────────────────────────────────────────────────────────────────

class EventRuleUpdate(BaseModel):
    is_enabled: bool
    template_id: Optional[str] = None
    recipient_type: str = "admin"
    priority: str = PRIORITY_NORMAL

    @field_validator("priority", mode="before")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in ALL_PRIORITIES:
            raise ValueError(f"priority must be one of {ALL_PRIORITIES}")
        return v


class EventRuleResponse(BaseModel):
    event_name: str
    event_label: str
    channel: str
    template_id: Optional[str]
    template_name: Optional[str]
    is_enabled: bool
    recipient_type: str
    priority: str


# ── Logs ───────────────────────────────────────────────────────────────────────

class LogListResponse(BaseModel):
    items: list[dict]
    total: int
    page: int
    page_size: int


# ── Usage stats ────────────────────────────────────────────────────────────────

class UsageStats(BaseModel):
    email: dict
    sms: dict
    whatsapp: dict
    push: dict
