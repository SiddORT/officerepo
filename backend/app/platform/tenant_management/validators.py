"""
Reusable validation helpers for the Tenant Management module.
"""
import re
from typing import Optional


_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
_PHONE_RE = re.compile(r"^\+?[0-9\s\-().]{7,20}$")
_URL_RE = re.compile(
    r"^(https?://)?"
    r"([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}"
    r"(:\d+)?(/[^\s]*)?$"
)
_TENANT_CODE_RE = re.compile(r"^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$")
_SUBDOMAIN_RE = re.compile(r"^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$")
_UNSAFE_RE = re.compile(r"[<>\"'`;\\]|script|SELECT|INSERT|UPDATE|DELETE|DROP|--", re.IGNORECASE)


class ValidationError(ValueError):
    def __init__(self, field: str, message: str):
        self.field = field
        self.message = message
        super().__init__(f"{field}: {message}")


def trim(value: Optional[str]) -> Optional[str]:
    return value.strip() if isinstance(value, str) else value


def require(value: Optional[str], field: str) -> str:
    v = trim(value)
    if not v:
        raise ValidationError(field, f"{field} is required.")
    return v


def max_len(value: str, field: str, limit: int) -> str:
    if len(value) > limit:
        raise ValidationError(field, f"{field} must be at most {limit} characters.")
    return value


def min_len(value: str, field: str, minimum: int) -> str:
    if len(value) < minimum:
        raise ValidationError(field, f"{field} must be at least {minimum} characters.")
    return value


def validate_email(value: str, field: str = "company_email") -> str:
    v = require(value, field)
    if not _EMAIL_RE.match(v):
        raise ValidationError(field, "Enter a valid email address.")
    return v.lower()


def validate_phone(value: Optional[str], field: str = "contact_number") -> Optional[str]:
    if not value or not value.strip():
        return None
    v = value.strip()
    if not _PHONE_RE.match(v):
        raise ValidationError(field, "Enter a valid phone number (7–20 digits, optional +, spaces, dashes).")
    return v


def validate_url(value: Optional[str], field: str = "company_website") -> Optional[str]:
    if not value or not value.strip():
        return None
    v = value.strip()
    if not _URL_RE.match(v):
        raise ValidationError(field, "Enter a valid URL (e.g. https://example.com).")
    return v


def validate_tenant_code(value: str, field: str = "tenant_code") -> str:
    v = require(value, field).lower().strip()
    if not _TENANT_CODE_RE.match(v):
        raise ValidationError(
            field,
            "Tenant code must be 3–50 lowercase letters, digits, or hyphens and cannot start/end with a hyphen.",
        )
    return v


def validate_subdomain(value: str, field: str = "subdomain") -> str:
    v = require(value, field).lower().strip()
    if not _SUBDOMAIN_RE.match(v):
        raise ValidationError(field, "Subdomain must be lowercase letters, digits, or hyphens (max 63 chars).")
    return v


def sanitize(value: Optional[str], field: str = "field") -> Optional[str]:
    if value is None:
        return None
    v = trim(value) or ""
    if _UNSAFE_RE.search(v):
        raise ValidationError(field, f"{field} contains invalid or potentially unsafe characters.")
    return v


def validate_db_port(value: Optional[int], field: str = "db_port") -> int:
    port = value or 5432
    if not (1 <= port <= 65535):
        raise ValidationError(field, "Port must be between 1 and 65535.")
    return port
