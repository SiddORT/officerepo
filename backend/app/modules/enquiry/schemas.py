"""
Schema layer — Pydantic request/response models with validation & sanitization.
"""
import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, field_validator

from backend.app.modules.enquiry.constants import (
    INTERESTED_MODULES,
    MESSAGE_MIN_LEN,
    MESSAGE_MAX_LEN,
    NAME_MIN_LEN,
    NAME_MAX_LEN,
    COMPANY_MIN_LEN,
    COMPANY_MAX_LEN,
)

# Blocks angle brackets / known XSS payload markers in free-text fields.
# (SQL injection is prevented by the ORM's parameterized queries.)
_XSS_RE = re.compile(r"<|>|javascript:|on\w+\s*=", re.IGNORECASE)
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")
_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z\s.\-']*$")


def _no_xss(v: str, field: str) -> str:
    if _XSS_RE.search(v):
        raise ValueError(f"{field} contains invalid or unsafe characters.")
    return v


class EnquiryCreateRequest(BaseModel):
    full_name: str
    work_email: str
    phone_number: str
    company_name: str
    interested_module: Optional[str] = None
    message: str

    # Spam protection
    honeypot: Optional[str] = None          # hidden field — must stay empty
    turnstile_token: Optional[str] = None   # Cloudflare Turnstile response token

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Full name is required.")
        if not (NAME_MIN_LEN <= len(v) <= NAME_MAX_LEN):
            raise ValueError(f"Full name must be between {NAME_MIN_LEN} and {NAME_MAX_LEN} characters.")
        if not _NAME_RE.match(v):
            raise ValueError("Full name may only contain letters, spaces, hyphens, periods and apostrophes.")
        return v

    @field_validator("work_email")
    @classmethod
    def validate_work_email(cls, v):
        v = (v or "").strip().lower()
        if not v:
            raise ValueError("Work email is required.")
        if len(v) > 255 or not _EMAIL_RE.match(v):
            raise ValueError("Enter a valid work email address.")
        return v

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Phone number is required.")
        if not _PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number.")
        return v

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Company name is required.")
        if not (COMPANY_MIN_LEN <= len(v) <= COMPANY_MAX_LEN):
            raise ValueError(f"Company name must be between {COMPANY_MIN_LEN} and {COMPANY_MAX_LEN} characters.")
        return _no_xss(v, "Company name")

    @field_validator("interested_module")
    @classmethod
    def validate_interested_module(cls, v):
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if v not in INTERESTED_MODULES:
            raise ValueError("Select a valid module of interest.")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Message is required.")
        if not (MESSAGE_MIN_LEN <= len(v) <= MESSAGE_MAX_LEN):
            raise ValueError(f"Message must be between {MESSAGE_MIN_LEN} and {MESSAGE_MAX_LEN} characters.")
        return _no_xss(v, "Message")


class EnquiryResponse(BaseModel):
    id: int
    full_name: str
    work_email: str
    phone_number: str
    company_name: str
    interested_module: Optional[str] = None
    message: str
    source: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
