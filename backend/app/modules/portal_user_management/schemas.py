"""Pydantic schemas for Client Portal User Management."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ── Users ─────────────────────────────────────────────────────────────────────

class UserRoleRead(BaseModel):
    id: str
    name: str
    is_system_role: bool

    class Config:
        from_attributes = True


class UserRead(BaseModel):
    id: str
    client_id: str
    first_name: str
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    status: str
    profile_picture_url: Optional[str] = None
    last_login: Optional[datetime] = None
    invite_accepted_at: Optional[datetime] = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    roles: List[UserRoleRead] = []

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    display_name: Optional[str] = Field(None, max_length=150)
    email: str = Field(..., description="Work email")
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    role_ids: List[str] = []


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    display_name: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    profile_picture_url: Optional[str] = None
    role_ids: Optional[List[str]] = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


# ── Roles ─────────────────────────────────────────────────────────────────────

class RoleRead(BaseModel):
    id: str
    client_id: str
    name: str
    description: Optional[str] = None
    is_system_role: bool
    is_active: bool
    user_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


# ── Login Logs ────────────────────────────────────────────────────────────────

class LoginLogRead(BaseModel):
    id: int
    client_id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    event_type: str
    email: Optional[str] = None
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    browser_info: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Sessions ──────────────────────────────────────────────────────────────────

class SessionRead(BaseModel):
    id: str
    client_id: str
    user_id: str
    user_name: Optional[str] = None
    jti: str
    ip_address: Optional[str] = None
    device_info: Optional[str] = None
    browser_info: Optional[str] = None
    login_at: datetime
    last_activity_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool
    logged_out_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Activity Logs ─────────────────────────────────────────────────────────────

class ActivityLogRead(BaseModel):
    id: int
    client_id: str
    actor_id: Optional[str] = None
    actor_name: Optional[str] = None
    target_user_id: Optional[str] = None
    target_user_name: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    extra: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Paginated wrappers ────────────────────────────────────────────────────────

class PaginatedUsers(BaseModel):
    data: List[UserRead]
    total: int
    page: int
    page_size: int


class PaginatedRoles(BaseModel):
    data: List[RoleRead]
    total: int


class PaginatedLoginLogs(BaseModel):
    data: List[LoginLogRead]
    total: int
    page: int
    page_size: int


class PaginatedSessions(BaseModel):
    data: List[SessionRead]
    total: int
    page: int
    page_size: int


class PaginatedActivityLogs(BaseModel):
    data: List[ActivityLogRead]
    total: int
    page: int
    page_size: int
