"""
Repository layer — superadmin general preferences.

Thin DB adapter: no business logic, no commits (callers manage transactions).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from backend.app.modules.auth.preferences_constants import DEFAULTS
from backend.app.modules.auth.preferences_model import SuperAdminPreferences


def get(db: Session, admin_id: int) -> SuperAdminPreferences | None:
    return (
        db.query(SuperAdminPreferences)
        .filter(SuperAdminPreferences.admin_id == admin_id)
        .first()
    )


def get_or_create(db: Session, admin_id: int) -> SuperAdminPreferences:
    """Return existing preferences or create a default row (flushed, not committed)."""
    prefs = get(db, admin_id)
    if prefs is None:
        prefs = SuperAdminPreferences(admin_id=admin_id, **DEFAULTS)
        db.add(prefs)
        db.flush()
    return prefs


def save(db: Session, prefs: SuperAdminPreferences) -> SuperAdminPreferences:
    db.add(prefs)
    db.flush()
    return prefs
