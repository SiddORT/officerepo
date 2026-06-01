"""
Repository layer — Auth / SuperAdmin account.

Raw DB queries only. No business logic, no JWT operations, no HTTP concerns.
"""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from backend.app.platform.superadmin.models import SuperAdmin


def get_active_by_email(db: Session, email: str) -> Optional[SuperAdmin]:
    """Find an active superadmin by email (case-sensitive)."""
    return (
        db.query(SuperAdmin)
        .filter(SuperAdmin.email == email, SuperAdmin.is_active.is_(True))
        .first()
    )


def get_by_id(db: Session, admin_id: int) -> Optional[SuperAdmin]:
    """Find a superadmin by primary key (no is_active filter)."""
    return db.query(SuperAdmin).filter(SuperAdmin.id == admin_id).first()


def save(db: Session, admin: SuperAdmin) -> SuperAdmin:
    """Commit pending changes on an admin row and refresh from DB."""
    db.commit()
    db.refresh(admin)
    return admin
