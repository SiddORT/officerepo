"""Service layer — business logic for Organization Settings."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.organization import repository as repo
from backend.app.modules.organization.models import OrganizationSettings
from backend.app.modules.organization.schemas import OrganizationUpdateRequest
from backend.shared.audit.audit_logger import record_audit

ENTITY_TYPE = "organization_settings"
AUDIT_VIEWED = "org.settings.viewed"
AUDIT_UPDATED = "org.settings.updated"


def _to_dict(row: Optional[OrganizationSettings]) -> dict:
    if row is None:
        return {
            "id": "default",
            "org_name": "",
            "legal_entity_name": "",
            "org_code": "",
            "website": None,
            "gst_number": None,
            "company_registration_number": None,
            "support_email": "",
            "sales_email": None,
            "billing_email": None,
            "support_phone": None,
            "updated_at": None,
            "updated_by": None,
        }
    return {
        "id": row.id,
        "org_name": row.org_name,
        "legal_entity_name": row.legal_entity_name,
        "org_code": row.org_code,
        "website": row.website,
        "gst_number": row.gst_number,
        "company_registration_number": row.company_registration_number,
        "support_email": row.support_email,
        "sales_email": row.sales_email,
        "billing_email": row.billing_email,
        "support_phone": row.support_phone,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "updated_by": row.updated_by,
    }


def get_settings(db: Session, actor: str) -> dict:
    row = repo.get(db)
    record_audit(
        db,
        action=AUDIT_VIEWED,
        entity_type=ENTITY_TYPE,
        entity_id="default",
        actor=actor,
        metadata={"action": "view"},
    )
    return _to_dict(row)


def update_settings(db: Session, payload: OrganizationUpdateRequest, actor: str) -> dict:
    data = {
        "org_name": payload.org_name,
        "legal_entity_name": payload.legal_entity_name,
        "org_code": payload.org_code,
        "website": payload.website,
        "gst_number": payload.gst_number,
        "company_registration_number": payload.company_registration_number,
        "support_email": payload.support_email,
        "sales_email": payload.sales_email,
        "billing_email": payload.billing_email,
        "support_phone": payload.support_phone,
        "updated_by": actor,
    }
    row = repo.upsert(db, data)
    db.commit()
    db.refresh(row)

    record_audit(
        db,
        action=AUDIT_UPDATED,
        entity_type=ENTITY_TYPE,
        entity_id="default",
        actor=actor,
        metadata={
            "org_name": payload.org_name,
            "org_code": payload.org_code,
            "support_email": payload.support_email,
        },
    )
    db.commit()
    return _to_dict(row)
