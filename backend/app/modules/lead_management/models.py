"""
Lead Management models — platform-level (superadmin CRM, no tenant scope).

Design notes:
- UUID (String(36)) primary keys per spec; child tables FK to ``leads.id``.
- Contact PII (email, phone) is stored ENCRYPTED at rest (Fernet tokens). A keyed
  ``dedupe_hash`` (blind index over email|company) enables duplicate detection
  without making the encrypted values queryable.
- Every table carries created_at; mutable tables also carry updated_at and the
  audit/soft-delete columns (created_by, is_deleted, deleted_at) per DB standards.
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Float, Date, Index, ForeignKey,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_number = Column(String(40), unique=True, nullable=False, index=True)

    # Company / non-sensitive identifying fields (plaintext)
    company_name = Column(String(150), nullable=False, index=True)
    contact_name = Column(String(120), nullable=False)

    # Encrypted PII (Fernet tokens — never plaintext at rest)
    email_encrypted = Column(Text, nullable=True)
    phone_encrypted = Column(Text, nullable=True)
    # Blind index (keyed HMAC of email|company) for duplicate detection
    dedupe_hash = Column(String(64), nullable=True, index=True)

    country_code = Column(String(8), nullable=True)
    designation = Column(String(120), nullable=True)
    website = Column(String(255), nullable=True)
    industry = Column(String(120), nullable=True)
    country = Column(String(100), nullable=True)
    company_size = Column(String(50), nullable=True)
    expected_user_count = Column(Integer, nullable=True)

    lead_source = Column(String(50), nullable=False, default="Manual Entry", index=True)
    lead_owner_id = Column(Integer, nullable=True, index=True)

    current_stage = Column(String(40), nullable=False, default="New", index=True)
    status = Column(String(30), nullable=False, default="Open", index=True)

    expected_revenue = Column(Float, nullable=True)
    expected_go_live_date = Column(Date, nullable=True)

    interested_modules = Column(Text, nullable=True)  # comma-separated module list

    # Conversion to client
    converted_to_client = Column(Boolean, nullable=False, default=False, index=True)
    converted_client_id = Column(Integer, nullable=True)  # legacy (unused; UUID below)
    # Deliberate loose reference — no FK constraint because clients live in a
    # separate module; enforcing a DB FK would create a hard cross-module
    # dependency and complicate independent soft-deletes.
    converted_client_uuid = Column(String(36), nullable=True, index=True)

    # Lead scoring
    lead_score = Column(Integer, nullable=False, default=0)
    lead_score_label = Column(String(10), nullable=False, default="Cold", index=True)
    # Manual Hot/Warm/Cold override — when set, takes precedence over the computed label
    score_label_override = Column(String(10), nullable=True)

    # Lost-lead analysis
    loss_reason = Column(String(60), nullable=True)
    competitor_name = Column(String(150), nullable=True)
    loss_remarks = Column(Text, nullable=True)

    # Conversion metric anchor dates
    first_contact_date = Column(DateTime, nullable=True)
    demo_date = Column(DateTime, nullable=True)
    proposal_date = Column(DateTime, nullable=True)
    won_date = Column(DateTime, nullable=True)
    conversion_date = Column(DateTime, nullable=True)

    # Provenance — link back to the originating enquiry (prevents double conversion)
    source_enquiry_id = Column(Integer, nullable=True, index=True)

    # Audit / soft delete
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_leads_stage_status", "current_stage", "status"),
        Index("ix_leads_dedupe_created", "dedupe_hash", "created_at"),
    )


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    activity_type = Column(String(40), nullable=False)
    activity_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    remarks = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    next_action_date = Column(DateTime, nullable=True)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadSpokesperson(Base):
    """Additional point-of-contact for a lead. PII (email, phone) encrypted at rest."""
    __tablename__ = "lead_spokespersons"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)

    name = Column(String(120), nullable=False)
    designation = Column(String(120), nullable=True)

    # Encrypted PII (Fernet tokens — never plaintext at rest)
    email_encrypted = Column(Text, nullable=True)
    phone_encrypted = Column(Text, nullable=True)
    country_code = Column(String(8), nullable=True)

    is_primary = Column(Boolean, nullable=False, default=False)

    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadDemo(Base):
    __tablename__ = "lead_demos"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    demo_date = Column(DateTime, nullable=False)
    demo_type = Column(String(40), nullable=True)
    conducted_by = Column(String(120), nullable=True)
    status = Column(String(30), nullable=False, default="Scheduled")
    feedback = Column(Text, nullable=True)
    interested_modules = Column(Text, nullable=True)
    expected_users = Column(Integer, nullable=True)
    next_steps = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadFollowup(Base):
    __tablename__ = "lead_followups"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    followup_date = Column(DateTime, nullable=False)
    followup_type = Column(String(40), nullable=True)
    priority = Column(String(20), nullable=False, default="Medium")
    remarks = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="Pending", index=True)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadDocument(Base):
    __tablename__ = "lead_documents"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    document_type = Column(String(100), nullable=False, default="Other")
    document_type_id = Column(String(36), ForeignKey("client_document_types.id"), nullable=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LeadProposal(Base):
    __tablename__ = "lead_proposals"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    proposal_version = Column(Integer, nullable=False, default=1)
    proposal_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    quoted_amount = Column(Float, nullable=True)
    modules_included = Column(Text, nullable=True)
    proposal_document_path = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="Draft")
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadNegotiation(Base):
    __tablename__ = "lead_negotiations"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    discussion_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    discussion_notes = Column(Text, nullable=True)
    expected_closure_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="Ongoing")
    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class LeadConversion(Base):
    """Immutable record snapshotting a Lead→Client conversion + its metrics."""
    __tablename__ = "lead_conversions"

    id = Column(String(36), primary_key=True, default=_uuid)
    lead_id = Column(String(36), ForeignKey("leads.id"), nullable=False, index=True)
    client_id = Column(Integer, nullable=True)  # legacy (unused; UUID below)
    client_uuid = Column(String(36), nullable=True, index=True)
    client_name = Column(String(255), nullable=True)
    subscription_id = Column(Integer, nullable=True)

    lead_age_days = Column(Integer, nullable=True)
    sales_cycle_days = Column(Integer, nullable=True)
    time_to_demo_days = Column(Integer, nullable=True)
    time_to_proposal_days = Column(Integer, nullable=True)
    time_to_conversion_days = Column(Integer, nullable=True)

    converted_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
