"""Pydantic schemas for Organization Settings."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, EmailStr, HttpUrl, field_validator


class OrganizationUpdateRequest(BaseModel):
    org_name: str
    legal_entity_name: str
    org_code: str
    website: Optional[str] = None
    gst_number: Optional[str] = None
    company_registration_number: Optional[str] = None
    support_email: str
    sales_email: Optional[str] = None
    billing_email: Optional[str] = None
    support_phone: Optional[str] = None

    @field_validator(
        "org_name", "legal_entity_name", "org_code", "support_email",
        mode="before",
    )
    @classmethod
    def strip_required(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("This field is required")
        return v

    @field_validator(
        "website", "gst_number", "company_registration_number",
        "sales_email", "billing_email", "support_phone",
        mode="before",
    )
    @classmethod
    def strip_optional(cls, v):
        if isinstance(v, str):
            v = v.strip() or None
        return v

    @field_validator("support_email", "sales_email", "billing_email", mode="after")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        if not re.match(pattern, v):
            raise ValueError(f"Invalid email address: {v}")
        return v.lower()

    @field_validator("website", mode="after")
    @classmethod
    def validate_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        import re
        pattern = r"^https?://.+"
        if not re.match(pattern, v, re.IGNORECASE):
            raise ValueError("Website must start with http:// or https://")
        return v


class OrganizationResponse(BaseModel):
    id: str
    org_name: str
    legal_entity_name: str
    org_code: str
    website: Optional[str]
    gst_number: Optional[str]
    company_registration_number: Optional[str]
    support_email: str
    sales_email: Optional[str]
    billing_email: Optional[str]
    support_phone: Optional[str]
    updated_at: Optional[str]
    updated_by: Optional[str]

    class Config:
        from_attributes = True
