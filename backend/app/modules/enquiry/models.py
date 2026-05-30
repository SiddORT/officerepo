"""
Enquiry model — public website contact/enquiry submissions.
Platform-level (no tenant scope): leads come from the public marketing site.

Personal data (email, phone, message) is stored ENCRYPTED at rest. A keyed
``dedupe_hash`` (blind index over email+company) enables duplicate detection
without making the encrypted values queryable.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Index
from datetime import datetime

from backend.app.database.platform import Base


class Enquiry(Base):
    __tablename__ = "enquiries"

    id = Column(Integer, primary_key=True, index=True)

    # Human-readable reference, e.g. ENQ-20260530-1A2B3C4D
    enquiry_number = Column(String(40), unique=True, nullable=False, index=True)

    # Non-sensitive identifying fields (stored in plaintext)
    full_name = Column(String(100), nullable=False)
    company_name = Column(String(150), nullable=False)

    # Encrypted personal data (Fernet tokens — never plaintext at rest)
    email_encrypted = Column(Text, nullable=False)
    phone_encrypted = Column(Text, nullable=False)
    message_encrypted = Column(Text, nullable=False)

    # Blind index (keyed HMAC of email|company) for duplicate detection
    dedupe_hash = Column(String(64), nullable=True, index=True)

    interested_module = Column(String(50), nullable=True)

    # Defaults requested by the business
    source = Column(String(50), nullable=False, default="Website")
    status = Column(String(30), nullable=False, default="New", index=True)

    # Consent tracking (privacy / GDPR)
    consent_given = Column(Boolean, nullable=False, default=False)
    consent_timestamp = Column(DateTime, nullable=True)
    privacy_policy_version = Column(String(20), nullable=True)

    # Marketing consent — tracked separately from enquiry consent
    marketing_consent = Column(Boolean, nullable=False, default=False)
    marketing_consent_timestamp = Column(DateTime, nullable=True)

    # Spam-protection / audit metadata
    ip_address = Column(String(64), nullable=True, index=True)
    user_agent = Column(String(512), nullable=True)
    referrer_url = Column(String(1024), nullable=True)

    # Compliance / retention readiness (right-to-be-forgotten, retention policy)
    retention_until = Column(DateTime, nullable=True)
    deletion_requested = Column(Boolean, nullable=False, default=False)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_enquiries_ip_created", "ip_address", "created_at"),
        Index("ix_enquiries_dedupe_created", "dedupe_hash", "created_at"),
    )
