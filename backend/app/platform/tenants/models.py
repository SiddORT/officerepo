from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database.platform import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    is_suspended = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    domains = relationship("TenantDomain", back_populates="tenant", cascade="all, delete-orphan")
    db_connection = relationship("TenantDbConnection", back_populates="tenant", uselist=False, cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="tenant", uselist=False)
    idp_config = relationship("TenantIdpConfig", back_populates="tenant", uselist=False, cascade="all, delete-orphan")
    feature_flags = relationship("FeatureFlag", back_populates="tenant", cascade="all, delete-orphan")


class TenantDomain(Base):
    __tablename__ = "tenant_domains"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    domain = Column(String(255), unique=True, nullable=False, index=True)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="domains")


class TenantDbConnection(Base):
    __tablename__ = "tenant_db_connections"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False)
    db_url = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="db_connection")


class TenantIdpConfig(Base):
    __tablename__ = "tenant_idp_configs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), unique=True, nullable=False)
    provider = Column(String(50), nullable=False)  # google, azure, okta, saml
    client_id = Column(String(500))
    client_secret = Column(Text)
    metadata_url = Column(Text)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="idp_config")
