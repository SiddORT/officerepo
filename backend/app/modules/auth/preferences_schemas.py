"""
Pydantic schemas for general preferences.

All fields are optional — PATCH semantics, only provided fields are written.
Each validator raises ValueError on invalid input (FastAPI converts to 422).
"""
from __future__ import annotations

import zoneinfo
from typing import Optional

from pydantic import BaseModel, validator

from backend.app.modules.auth.preferences_constants import (
    ALLOWED_DATE_FORMATS,
    ALLOWED_LANDING_PAGES,
    ALLOWED_LANGUAGES,
    ALLOWED_TABLE_PAGE_SIZES,
    ALLOWED_THEMES,
    ALLOWED_TIME_FORMATS,
    ALLOWED_WEEK_START_DAYS,
)


class PreferencesUpdateRequest(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    date_format: Optional[str] = None
    time_format: Optional[str] = None
    week_start_day: Optional[str] = None
    default_landing_page: Optional[str] = None
    table_page_size: Optional[int] = None

    @validator("theme")
    def _theme(cls, v: str) -> str:
        if v not in ALLOWED_THEMES:
            raise ValueError(f"Invalid theme. Allowed: {sorted(ALLOWED_THEMES)}")
        return v

    @validator("language")
    def _language(cls, v: str) -> str:
        if v not in ALLOWED_LANGUAGES:
            raise ValueError(f"Invalid language. Allowed: {sorted(ALLOWED_LANGUAGES)}")
        return v

    @validator("timezone")
    def _timezone(cls, v: str) -> str:
        try:
            zoneinfo.ZoneInfo(v)
        except Exception:
            raise ValueError(f"Invalid IANA timezone: {v!r}")
        return v

    @validator("date_format")
    def _date_format(cls, v: str) -> str:
        if v not in ALLOWED_DATE_FORMATS:
            raise ValueError(
                f"Invalid date format. Allowed: {sorted(ALLOWED_DATE_FORMATS)}"
            )
        return v

    @validator("time_format")
    def _time_format(cls, v: str) -> str:
        if v not in ALLOWED_TIME_FORMATS:
            raise ValueError(
                f"Invalid time format. Allowed: {sorted(ALLOWED_TIME_FORMATS)}"
            )
        return v

    @validator("week_start_day")
    def _week_start_day(cls, v: str) -> str:
        if v not in ALLOWED_WEEK_START_DAYS:
            raise ValueError(
                f"Invalid week start day. Allowed: {sorted(ALLOWED_WEEK_START_DAYS)}"
            )
        return v

    @validator("default_landing_page")
    def _landing_page(cls, v: str) -> str:
        if v not in ALLOWED_LANDING_PAGES:
            raise ValueError(
                f"Invalid landing page. Allowed: {sorted(ALLOWED_LANDING_PAGES)}"
            )
        return v

    @validator("table_page_size")
    def _table_page_size(cls, v: int) -> int:
        if v not in ALLOWED_TABLE_PAGE_SIZES:
            raise ValueError(
                f"Invalid page size. Allowed: {sorted(ALLOWED_TABLE_PAGE_SIZES)}"
            )
        return v
