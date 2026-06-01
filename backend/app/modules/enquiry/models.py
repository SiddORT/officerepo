"""
Enquiry model — public website contact/enquiry submissions.
Platform-level (no tenant scope): leads come from the public marketing site.

Personal data (email, phone, message) is stored ENCRYPTED at rest. A keyed
``dedupe_hash`` (blind index over email+company) enables duplicate detection
without making the encrypted values queryable.

The superadmin Enquiry Inbox layers workflow on top: status management,
assignment, spam flagging, notes, an activity timeline (``EnquiryNote`` /
``EnquiryActivity`` child tables) and Convert-to-Lead with full traceability
(``converted_lead_id`` links the enquiry to the lead it spawned).
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Index, ForeignKey
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

    # ── Superadmin Inbox workflow ────────────────────────────────────────────
    # Assignment — superadmin user_id the enquiry is assigned to.
    assigned_to = Column(Integer, nullable=True, index=True)
    assigned_at = Column(DateTime, nullable=True)

    # Spam management (orthogonal to status so spam can be filtered independently).
    is_spam = Column(Boolean, nullable=False, default=False, index=True)
    spam_marked_at = Column(DateTime, nullable=True)

    # Convert-to-Lead traceability (Website Enquiry → Lead → Client).
    # Deliberate loose reference — no FK constraint because leads live in a
    # separate module; enforcing a DB FK would create a hard cross-module
    # dependency and complicate independent soft-deletes.
    converted_lead_id = Column(String(36), nullable=True, index=True)
    converted_at = Column(DateTime, nullable=True)

    closed_at = Column(DateTime, nullable=True)

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
        Index("ix_enquiries_status_spam", "status", "is_spam"),
    )


class EnquiryNote(Base):
    """Free-text internal note attached to an enquiry by a superadmin."""
    __tablename__ = "enquiry_notes"

    id = Column(Integer, primary_key=True, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class EnquiryActivity(Base):
    """Timeline event for an enquiry (status change, assignment, spam, note, convert)."""
    __tablename__ = "enquiry_activities"

    id = Column(Integer, primary_key=True, index=True)
    enquiry_id = Column(Integer, ForeignKey("enquiries.id"), nullable=False, index=True)
    activity_type = Column(String(40), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
