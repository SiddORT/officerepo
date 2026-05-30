"""
Schema layer — Pydantic request/response models with validation & sanitization.
"""
import re
from typing import Optional
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
_MULTISPACE_RE = re.compile(r"\s{2,}")


def _clean(v: Optional[str]) -> str:
    """Trim and collapse runs of consecutive whitespace into a single space."""
    return _MULTISPACE_RE.sub(" ", (v or "").strip())


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

    # Consent (privacy / GDPR)
    consent_given: bool = False
    marketing_consent: bool = False

    # Spam protection
    website_url: Optional[str] = None       # honeypot — must stay empty
    turnstile_token: Optional[str] = None   # Cloudflare Turnstile response token

    # Metadata (client-provided; server-side values take precedence)
    referrer_url: Optional[str] = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v):
        v = _clean(v)
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
        v = _clean(v)
        if not v:
            raise ValueError("Phone number is required.")
        if not _PHONE_RE.match(v):
            raise ValueError("Enter a valid phone number.")
        return v

    @field_validator("company_name")
    @classmethod
    def validate_company_name(cls, v):
        v = _clean(v)
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
        v = _clean(v)
        if not v:
            raise ValueError("Message is required.")
        if not (MESSAGE_MIN_LEN <= len(v) <= MESSAGE_MAX_LEN):
            raise ValueError(f"Message must be between {MESSAGE_MIN_LEN} and {MESSAGE_MAX_LEN} characters.")
        return _no_xss(v, "Message")

    @field_validator("consent_given")
    @classmethod
    def validate_consent(cls, v):
        if v is not True:
            raise ValueError("You must agree to the privacy terms before submitting.")
        return v

    @field_validator("referrer_url")
    @classmethod
    def validate_referrer_url(cls, v):
        if not v:
            return None
        v = v.strip()[:1024]
        return v or None
