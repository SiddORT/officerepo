"""
Schema layer — Pydantic request/response models for RBAC.
Input is trimmed/validated at the boundary before reaching the service.
"""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from backend.app.modules.rbac import constants as c


class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=c.ROLE_NAME_MIN_LEN, max_length=c.ROLE_NAME_MAX_LEN)
    description: Optional[str] = Field(None, max_length=c.ROLE_DESC_MAX_LEN)
    permission_ids: List[str] = Field(default_factory=list)

    @field_validator("name")
    @classmethod
    def _trim_name(cls, v: str) -> str:
        v = (v or "").strip()
        if len(v) < c.ROLE_NAME_MIN_LEN:
            raise ValueError("Role name is too short.")
        return v

    @field_validator("description")
    @classmethod
    def _trim_desc(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        return v or None


class RoleUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=c.ROLE_NAME_MIN_LEN, max_length=c.ROLE_NAME_MAX_LEN)
    description: Optional[str] = Field(None, max_length=c.ROLE_DESC_MAX_LEN)
    permission_ids: Optional[List[str]] = None

    @field_validator("name")
    @classmethod
    def _trim_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < c.ROLE_NAME_MIN_LEN:
            raise ValueError("Role name is too short.")
        return v

    @field_validator("description")
    @classmethod
    def _trim_desc(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.strip() or None


class AssignRolesRequest(BaseModel):
    """Full-replace set of role ids for an admin account."""
    role_ids: List[str] = Field(default_factory=list)


class InviteUserRequest(BaseModel):
    """Invite a new admin: creates an inactive account + an invitation link."""
    email: str = Field(..., max_length=c.USER_NAME_MAX_LEN)
    name: Optional[str] = Field(None, max_length=c.USER_NAME_MAX_LEN)
    role_ids: List[str] = Field(default_factory=list)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        v = (v or "").strip().lower()
        if not v or "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("A valid email address is required.")
        return v

    @field_validator("name")
    @classmethod
    def _trim_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.strip() or None


class SetActiveRequest(BaseModel):
    is_active: bool


class AcceptInvitationRequest(BaseModel):
    """Public — set a password against a valid invitation token."""
    password: str = Field(..., min_length=c.PASSWORD_MIN_LEN, max_length=c.PASSWORD_MAX_LEN)
