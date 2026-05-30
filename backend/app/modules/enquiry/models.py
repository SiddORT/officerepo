"""
Enquiry model — public website contact/enquiry submissions.
Platform-level (no tenant scope): leads come from the public marketing site.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Index
from datetime import datetime

from backend.app.database.platform import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String(100), nullable=False)
    work_email = Column(String(255), nullable=False, index=True)
    phone_number = Column(String(30), nullable=False)
    company_name = Column(String(150), nullable=False)
    interested_module = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)

    # Defaults requested by the business
    source = Column(String(50), nullable=False, default="Website")
    status = Column(String(30), nullable=False, default="New", index=True)

    # Spam-protection / audit metadata
    ip_address = Column(String(64), nullable=True, index=True)
    user_agent = Column(String(512), nullable=True)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_enquiries_ip_created", "ip_address", "created_at"),
    )
