"""
Reusable validation / sanitization helpers for the Client Management module.

Mirrors the backend validation standards: trim whitespace, collapse internal
runs of spaces, basic XSS/script-injection stripping, email/phone/URL format
checks, GST format check, and controlled-vocabulary checks. Kept
framework-agnostic so both the Pydantic schemas and the service layer can use it.
"""
from __future__ import annotations

import re
from typing import Optional

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^[+]?[0-9\s\-()]{7,20}$")
COUNTRY_CODE_RE = re.compile(r"^\+?[0-9]{1,4}$")
URL_RE = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.IGNORECASE)
# Indian GSTIN: 2-digit state code, 10-char PAN, entity digit, 'Z', checksum char.
GST_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$")
SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$")
DOMAIN_RE = re.compile(r"^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$")

# Strip the obvious script-injection vectors. Stored values are never rendered as
# raw HTML, but we sanitize defensively at the boundary anyway.
_SCRIPT_TAG_RE = re.compile(r"<\s*/?\s*script[^>]*>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_text(value: Optional[str], *, collapse_spaces: bool = True) -> Optional[str]:
    """Trim, strip HTML/script tags, and optionally collapse internal whitespace."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    text = _SCRIPT_TAG_RE.sub("", text)
    text = _TAG_RE.sub("", text)
    if collapse_spaces:
        text = _WHITESPACE_RE.sub(" ", text).strip()
    return text or None


def validate_email(value: Optional[str], *, required: bool = False, field: str = "email") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError(f"{field} is required.")
        return None
    cleaned = cleaned.lower()
    if not EMAIL_RE.match(cleaned):
        raise ValueError(f"{field} is not a valid email address.")
    if len(cleaned) > 255:
        raise ValueError(f"{field} must be at most 255 characters.")
    return cleaned


def validate_phone(value: Optional[str], *, required: bool = False, field: str = "phone") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError(f"{field} is required.")
        return None
    if not PHONE_RE.match(cleaned):
        raise ValueError(f"{field} is not a valid phone number.")
    return cleaned


def validate_country_code(value: Optional[str], *, field: str = "country_code") -> Optional[str]:
    """Normalize a dialing code to ``+NN`` form (e.g. ``1`` → ``+1``)."""
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        return None
    cleaned = cleaned.replace(" ", "")
    if not COUNTRY_CODE_RE.match(cleaned):
        raise ValueError(f"{field} must be a dialing code like +1 or +44.")
    if not cleaned.startswith("+"):
        cleaned = "+" + cleaned
    return cleaned


def validate_url(value: Optional[str], *, field: str = "website") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        return None
    if not URL_RE.match(cleaned):
        raise ValueError(f"{field} must be a valid URL starting with http:// or https://.")
    if len(cleaned) > 255:
        raise ValueError(f"{field} must be at most 255 characters.")
    return cleaned


def validate_gst(value: Optional[str], *, field: str = "gst_number") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        return None
    cleaned = cleaned.upper().replace(" ", "")
    if not GST_RE.match(cleaned):
        raise ValueError(f"{field} is not a valid 15-character GSTIN.")
    return cleaned


def validate_subdomain(value: Optional[str], *, field: str = "subdomain") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        return None
    cleaned = cleaned.lower()
    if not SUBDOMAIN_RE.match(cleaned):
        raise ValueError(f"{field} must be a valid subdomain label (letters, digits, hyphens).")
    return cleaned


def validate_domain(value: Optional[str], *, field: str = "custom_domain") -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        return None
    cleaned = cleaned.lower()
    if not DOMAIN_RE.match(cleaned):
        raise ValueError(f"{field} must be a valid domain name (e.g. acme.com).")
    return cleaned


def validate_choice(
    value: Optional[str],
    allowed: list[str],
    *,
    required: bool = False,
    field: str = "value",
) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError(f"{field} is required.")
        return None
    if cleaned not in allowed:
        raise ValueError(f"{field} must be one of: {', '.join(allowed)}.")
    return cleaned


def validate_length(
    value: Optional[str],
    *,
    field: str = "value",
    min_len: int = 0,
    max_len: int = 255,
    required: bool = False,
    collapse_spaces: bool = True,
) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=collapse_spaces)
    if not cleaned:
        if required:
            raise ValueError(f"{field} is required.")
        return None
    if len(cleaned) < min_len:
        raise ValueError(f"{field} must be at least {min_len} characters.")
    if len(cleaned) > max_len:
        raise ValueError(f"{field} must be at most {max_len} characters.")
    return cleaned
