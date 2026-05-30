"""
Reusable validation / sanitization helpers for the Lead Management module.

Mirrors the backend validation standards: trim whitespace, collapse internal
runs of spaces, basic XSS/script-injection stripping, email & phone format
checks, and controlled-vocabulary checks. Kept framework-agnostic so both the
Pydantic schemas and the service layer can call them.
"""
from __future__ import annotations

import re
from typing import Optional

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^[+]?[0-9\s\-()]{7,20}$")

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
