"""
OrganizationSettings — singleton row that stores platform-level org identity.

One row is ever created (id = "default"). All mutations go through the service
layer which upserts this row and writes a masked audit entry.
"""
from datetime import datetime

from sqlalchemy import Column, String, DateTime

from backend.app.database.platform import Base


class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    id = Column(String(36), primary_key=True, default="default")

    org_name = Column(String(255), nullable=False, default="")
    legal_entity_name = Column(String(255), nullable=False, default="")
    org_code = Column(String(100), nullable=False, default="")
    website = Column(String(500), nullable=True)
    gst_number = Column(String(50), nullable=True)
    company_registration_number = Column(String(100), nullable=True)
    support_email = Column(String(255), nullable=False, default="")
    sales_email = Column(String(255), nullable=True)
    billing_email = Column(String(255), nullable=True)
    support_phone = Column(String(30), nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255), nullable=True)
