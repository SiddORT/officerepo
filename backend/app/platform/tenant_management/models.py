"""
New tables added by the Tenant Management module.
Existing platform/tenants/models.py tables are extended via ALTER TABLE migration in main.py.
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.platform import Base


class TenantBranding(Base):
    __tablename__ = "tenant_branding"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False, index=True)
    primary_color = Column(String(20), default="#6366f1")
    theme_mode = Column(String(10), default="dark")       # dark | light
    logo_path = Column(String(500), nullable=True)
    favicon_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", foreign_keys=[tenant_id])


class TenantActivityLog(Base):
    __tablename__ = "tenant_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    action = Column(String(100), nullable=False)         # e.g. "tenant.created", "tenant.suspended"
    performed_by = Column(String(255), nullable=True)    # email of admin who performed the action
    log_metadata = Column(JSON, nullable=True)           # arbitrary extra context (renamed — 'metadata' is reserved by SQLAlchemy)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", foreign_keys=[tenant_id])
