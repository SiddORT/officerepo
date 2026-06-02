"""
Service layer — superadmin general preferences.

Business logic: get/upsert with full audit trail. Each changed field is
logged with old + new values so the audit log is diff-level granular.
"""
from __future__ import annotations

from datetime import datetime, timezone as _tz

from sqlalchemy.orm import Session

from backend.app.modules.auth import preferences_repository as repo
from backend.app.modules.auth.preferences_constants import (
    ALLOWED_DATE_FORMATS,
    ALLOWED_LANDING_PAGES,
    ALLOWED_TABLE_PAGE_SIZES,
    ALLOWED_THEMES,
    ALLOWED_TIME_FORMATS,
    ALLOWED_WEEK_START_DAYS,
    LANGUAGE_LABELS,
    LANDING_PAGE_LABELS,
)
from backend.app.modules.auth.preferences_model import SuperAdminPreferences
from backend.app.modules.auth.preferences_schemas import PreferencesUpdateRequest
from backend.shared.audit.audit_logger import record_audit

_FIELDS = [
    "theme",
    "language",
    "timezone",
    "date_format",
    "time_format",
    "week_start_day",
    "default_landing_page",
    "table_page_size",
]


def _to_dict(prefs: SuperAdminPreferences) -> dict:
    return {
        "theme": prefs.theme,
        "language": prefs.language,
        "timezone": prefs.timezone,
        "date_format": prefs.date_format,
        "time_format": prefs.time_format,
        "week_start_day": prefs.week_start_day,
        "default_landing_page": prefs.default_landing_page,
        "table_page_size": prefs.table_page_size,
        "updated_at": prefs.updated_at.isoformat() if prefs.updated_at else None,
    }


def options() -> dict:
    """Return all allowed values + labels for the preferences form."""
    return {
        "themes": [
            {"value": "light", "label": "Light"},
            {"value": "dark", "label": "Dark"},
            {"value": "system", "label": "System"},
        ],
        "languages": [
            {"value": k, "label": v} for k, v in LANGUAGE_LABELS.items()
        ],
        "date_formats": sorted(ALLOWED_DATE_FORMATS),
        "time_formats": [
            {"value": "12h", "label": "12-Hour (1:00 PM)"},
            {"value": "24h", "label": "24-Hour (13:00)"},
        ],
        "week_start_days": [
            {"value": "monday", "label": "Monday"},
            {"value": "sunday", "label": "Sunday"},
            {"value": "saturday", "label": "Saturday"},
        ],
        "landing_pages": [
            {"value": k, "label": v} for k, v in LANDING_PAGE_LABELS.items()
        ],
        "table_page_sizes": sorted(ALLOWED_TABLE_PAGE_SIZES),
    }


def get_preferences(db: Session, admin_id: int) -> dict:
    prefs = repo.get_or_create(db, admin_id)
    db.commit()
    return _to_dict(prefs)


def update_preferences(
    db: Session,
    admin_id: int,
    payload: PreferencesUpdateRequest,
    actor_email: str,
) -> dict:
    prefs = repo.get_or_create(db, admin_id)

    changed: dict[str, dict] = {}
    fs = payload.model_fields_set

    for field in _FIELDS:
        if field not in fs:
            continue
        old_val = getattr(prefs, field)
        new_val = getattr(payload, field)
        if old_val != new_val:
            changed[field] = {"old": old_val, "new": new_val}
            setattr(prefs, field, new_val)

    prefs.updated_at = datetime.now(tz=_tz.utc).replace(tzinfo=None)
    repo.save(db, prefs)

    if changed:
        record_audit(
            db,
            action="preferences.updated",
            entity_type="superadmin_preferences",
            entity_id=str(admin_id),
            actor=actor_email,
            metadata={"changes": changed},
        )

    db.commit()
    return _to_dict(prefs)
