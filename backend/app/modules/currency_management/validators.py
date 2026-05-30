"""
Reusable validation / sanitization helpers for the Currency Management module.

Mirrors the backend validation standards: trim whitespace, collapse internal
runs of spaces, basic XSS/script-injection stripping, controlled-vocabulary
checks, ISO 4217 code normalization, and numeric bounds. Kept framework-agnostic
so both the Pydantic schemas and the service layer can call them.
"""
from __future__ import annotations

import re
from typing import Optional

from backend.app.modules.currency_management import constants as c

_SCRIPT_TAG_RE = re.compile(r"<\s*/?\s*script[^>]*>", re.IGNORECASE)
_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")
_CURRENCY_CODE_RE = re.compile(r"^[A-Z]{3}$")


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


def validate_currency_code(value: Optional[str], *, required: bool = True) -> Optional[str]:
    """Uppercase, trim and validate an ISO 4217 alphabetic currency code."""
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError("Currency code is required.")
        return None
    cleaned = cleaned.upper().replace(" ", "")
    if not _CURRENCY_CODE_RE.match(cleaned):
        raise ValueError("Currency code must be a 3-letter ISO 4217 code (e.g. USD).")
    return cleaned


def validate_name(value: Optional[str], *, required: bool = True) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError("Currency name is required.")
        return None
    if len(cleaned) < c.CURRENCY_NAME_MIN_LEN:
        raise ValueError("Currency name is too short.")
    if len(cleaned) > c.CURRENCY_NAME_MAX_LEN:
        raise ValueError(f"Currency name must be at most {c.CURRENCY_NAME_MAX_LEN} characters.")
    return cleaned


def validate_symbol(value: Optional[str], *, required: bool = True) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=False)
    if cleaned:
        cleaned = cleaned.strip()
    if not cleaned:
        if required:
            raise ValueError("Currency symbol is required.")
        return None
    if len(cleaned) > c.CURRENCY_SYMBOL_MAX_LEN:
        raise ValueError(f"Currency symbol must be at most {c.CURRENCY_SYMBOL_MAX_LEN} characters.")
    return cleaned


def validate_country(value: Optional[str], *, required: bool = True) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError("Country is required.")
        return None
    if len(cleaned) < c.COUNTRY_MIN_LEN:
        raise ValueError("Country is too short.")
    if len(cleaned) > c.COUNTRY_MAX_LEN:
        raise ValueError(f"Country must be at most {c.COUNTRY_MAX_LEN} characters.")
    return cleaned


def validate_decimal_places(value, *, required: bool = True) -> Optional[int]:
    if value is None:
        if required:
            raise ValueError("Decimal places is required.")
        return None
    try:
        ivalue = int(value)
    except (TypeError, ValueError):
        raise ValueError("Decimal places must be a whole number.")
    if ivalue < c.DECIMAL_PLACES_MIN or ivalue > c.DECIMAL_PLACES_MAX:
        raise ValueError(
            f"Decimal places must be between {c.DECIMAL_PLACES_MIN} and {c.DECIMAL_PLACES_MAX}."
        )
    return ivalue


def validate_status(value: Optional[str], *, required: bool = True) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError("Status is required.")
        return None
    if cleaned not in c.CURRENCY_STATUSES:
        raise ValueError(f"Status must be one of: {', '.join(c.CURRENCY_STATUSES)}.")
    return cleaned


def validate_rate_source(value: Optional[str], *, required: bool = True) -> Optional[str]:
    cleaned = clean_text(value, collapse_spaces=True)
    if not cleaned:
        if required:
            raise ValueError("Rate source is required.")
        return None
    if cleaned not in c.RATE_SOURCES:
        raise ValueError(f"Rate source must be one of: {', '.join(c.RATE_SOURCES)}.")
    return cleaned


def validate_rate(value, *, required: bool = True) -> Optional[float]:
    if value is None:
        if required:
            raise ValueError("Exchange rate is required.")
        return None
    try:
        fvalue = float(value)
    except (TypeError, ValueError):
        raise ValueError("Exchange rate must be a number.")
    if fvalue <= c.RATE_MIN:
        raise ValueError("Exchange rate must be greater than 0.")
    if fvalue > c.RATE_MAX:
        raise ValueError("Exchange rate is too large.")
    return fvalue
