"""Repository layer — DB queries for OrganizationSettings."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.organization.models import OrganizationSettings

SINGLETON_ID = "default"


def get(db: Session) -> Optional[OrganizationSettings]:
    return db.query(OrganizationSettings).filter(
        OrganizationSettings.id == SINGLETON_ID
    ).first()


def upsert(db: Session, data: dict) -> OrganizationSettings:
    row = get(db)
    if row is None:
        row = OrganizationSettings(id=SINGLETON_ID, **data)
        db.add(row)
    else:
        for k, v in data.items():
            setattr(row, k, v)
    db.flush()
    return row
