"""
Reusable platform-level audit log model.

Captures security/compliance-relevant events (record created, consent given,
etc.) without ever storing raw PII — callers are expected to mask sensitive
values via the helpers in ``audit_logger`` before persisting.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, JSON, Index

from backend.app.database.platform import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    action = Column(String(100), nullable=False, index=True)      # e.g. "enquiry.created"
    entity_type = Column(String(100), nullable=False, index=True)  # e.g. "enquiry"
    entity_id = Column(String(64), nullable=True, index=True)      # e.g. enquiry_number
    actor = Column(String(255), nullable=True)                     # who/what triggered it

    log_metadata = Column(JSON, nullable=True)                     # masked extra context

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
    )
