"""
Client Management models — platform-level (superadmin CRM).

Office Repo is a multi-tenant SaaS platform where the **Client IS the tenant**:
one entity, modeled with a database-per-client architecture. The DB connection,
domains and admin-user rows are records now; actual provisioning is deferred
(``database_status`` starts "Not Provisioned").

Design notes:
- UUID (String(36)) primary keys per spec; child tables FK to ``clients.id``.
- Contact / admin PII (email, phone) and the tenant DB password are stored
  ENCRYPTED at rest (Fernet tokens), mirroring the lead/enquiry modules.
- Every table carries created_at; mutable tables also carry updated_at and the
  audit/soft-delete columns (created_by, is_deleted, deleted_at) per DB standards.
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Date, Index, ForeignKey,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Client(Base):
    """The master tenant record. One Client == one organization == one tenant."""
    __tablename__ = "clients"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_code = Column(String(40), unique=True, nullable=False, index=True)

    company_name = Column(String(150), nullable=False, index=True)
    legal_name = Column(String(200), nullable=True)
    industry = Column(String(120), nullable=True)
    website = Column(String(255), nullable=True)
    company_size = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    timezone = Column(String(60), nullable=True)

    status = Column(String(30), nullable=False, default="Prospective", index=True)

    # Provenance — link back to the originating lead (prevents double conversion)
    lead_id = Column(String(36), nullable=True, index=True)
    converted_from_lead = Column(Boolean, nullable=False, default=False)

    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_clients_status_deleted", "status", "is_deleted"),
    )


class ClientContact(Base):
    """A point of contact for a client. PII (email, phone) encrypted at rest."""
    __tablename__ = "client_contacts"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    contact_type = Column(String(40), nullable=False, default="Primary")
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=True)
    designation = Column(String(120), nullable=True)

    email_encrypted = Column(Text, nullable=True)
    phone_encrypted = Column(Text, nullable=True)
    country_code = Column(String(8), nullable=True)

    is_primary = Column(Boolean, nullable=False, default=False, index=True)

    created_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientBillingProfile(Base):
    """1:1 commercial / billing details for a client (the Commercials tab).

    Bank details are folded in here (Finance-only in a future role model) rather
    than a separate table, since the platform currently has only the superadmin
    role and the Commercials tab surfaces both billing and bank fields together.
    """
    __tablename__ = "client_billing_profiles"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    gst_number = Column(String(30), nullable=True)
    pan_number = Column(String(20), nullable=True)
    tax_registration_number = Column(String(60), nullable=True)
    # PII — encrypted at rest (Fernet token), decrypted only in service responses.
    billing_email_encrypted = Column(Text, nullable=True)
    payment_terms = Column(String(60), nullable=True)
    currency_code = Column(String(8), nullable=True)

    billing_address_1 = Column(String(255), nullable=True)
    billing_address_2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)

    # Bank details (Finance scope in a future role model)
    bank_account_name = Column(String(150), nullable=True)
    bank_account_number = Column(String(64), nullable=True)
    bank_name = Column(String(150), nullable=True)
    bank_branch_name = Column(String(150), nullable=True)
    bank_ifsc_code = Column(String(20), nullable=True)
    bank_swift_code = Column(String(20), nullable=True)
    bank_iban = Column(String(40), nullable=True)
    bank_upi_id = Column(String(80), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientDbConnection(Base):
    """1:1 tenant database configuration. DB-per-client; provisioning deferred."""
    __tablename__ = "client_db_connections"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    database_name = Column(String(120), nullable=True)
    database_host = Column(String(255), nullable=True)
    database_port = Column(Integer, nullable=True)
    database_username = Column(String(120), nullable=True)
    # Secret — encrypted at rest (Fernet token), never plaintext.
    database_password_encrypted = Column(Text, nullable=True)
    database_status = Column(String(30), nullable=False, default="Not Provisioned")
    provisioned_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientSubscription(Base):
    """1:1 current subscription placeholder. Expanded in a future billing build."""
    __tablename__ = "client_subscriptions"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    plan_name = Column(String(120), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    billing_cycle = Column(String(30), nullable=True)
    user_limit = Column(Integer, nullable=True)
    storage_limit = Column(String(40), nullable=True)
    status = Column(String(30), nullable=False, default="Inactive")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientModule(Base):
    """One row per assignable module; toggled on/off per client."""
    __tablename__ = "client_modules"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    module_name = Column(String(80), nullable=False)
    is_enabled = Column(Boolean, nullable=False, default=False)
    enabled_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientDocument(Base):
    """Client documents — stored PRIVATE; DB keeps only the rootless storage key."""
    __tablename__ = "client_documents"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    document_type = Column(String(40), nullable=False, default="Other")
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    uploaded_by = Column(Integer, nullable=True)

    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClientActivityLog(Base):
    """Client-facing activity timeline (created/updated/module enabled/etc.)."""
    __tablename__ = "client_activity_logs"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    action = Column(String(60), nullable=False)
    remarks = Column(Text, nullable=True)
    performed_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ClientDomain(Base):
    """Tenant domains — one primary subdomain (e.g. acme.officerepo.com) + custom."""
    __tablename__ = "client_domains"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    domain_type = Column(String(30), nullable=False, default="custom")
    subdomain = Column(String(120), nullable=True)
    custom_domain = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=False, index=True)
    is_primary = Column(Boolean, nullable=False, default=False, index=True)

    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ClientAdminUser(Base):
    """The first/admin user for a client tenant. PII encrypted at rest."""
    __tablename__ = "client_admin_users"

    id = Column(String(36), primary_key=True, default=_uuid)
    client_id = Column(String(36), ForeignKey("clients.id"), nullable=False, index=True)

    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=True)
    email_encrypted = Column(Text, nullable=True)
    email_hash = Column(String(64), nullable=True, index=True, unique=True)
    phone_encrypted = Column(Text, nullable=True)
    country_code = Column(String(8), nullable=True)
    status = Column(String(30), nullable=False, default="Placeholder")

    display_name = Column(String(150), nullable=True)
    profile_picture_url = Column(Text, nullable=True)
    last_login = Column(DateTime, nullable=True)

    password_hash = Column(Text, nullable=True)
    invite_token_hash = Column(Text, nullable=True)
    invite_expires_at = Column(DateTime, nullable=True)
    invite_accepted_at = Column(DateTime, nullable=True)

    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
