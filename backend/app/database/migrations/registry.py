"""Central registry of all platform schema migrations.

Rules
-----
* Every schema change MUST be added here as a new Migration — never add raw
  ALTER statements directly to main.py or any other module.
* Keys are permanent identifiers — never rename or reuse a key once it has
  been committed to a live database (the key is what proves "this ran").
* SQL must be idempotent: use IF NOT EXISTS / IF EXISTS so re-runs are safe.
* Order matters: migrations execute in list order; place dependencies before
  the statements that rely on them.

Alembic migration path
----------------------
When Alembic is adopted, each Migration here becomes a revision file.
The registry can then be retired in favour of Alembic's revision chain,
while keeping schema_migrations as the persistent audit table (Alembic's
alembic_version table records the HEAD; schema_migrations records timing
and per-statement outcomes for every run).
"""

from backend.app.database.migrations.service import Migration

MIGRATIONS: list[Migration] = [

    # ── enquiries: GDPR-aware lead capture (encryption, consent, compliance) ──

    Migration(
        key="enquiries_add_enquiry_number",
        name="enquiries: add enquiry_number (ENQ-YYYYMMDD-XXXXXXXX reference)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS enquiry_number VARCHAR(40)",
    ),
    Migration(
        key="enquiries_add_email_encrypted",
        name="enquiries: add email_encrypted (Fernet PII at-rest encryption)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS email_encrypted TEXT",
    ),
    Migration(
        key="enquiries_add_phone_encrypted",
        name="enquiries: add phone_encrypted (Fernet PII at-rest encryption)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS phone_encrypted TEXT",
    ),
    Migration(
        key="enquiries_add_message_encrypted",
        name="enquiries: add message_encrypted (Fernet PII at-rest encryption)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS message_encrypted TEXT",
    ),
    Migration(
        key="enquiries_add_dedupe_hash",
        name="enquiries: add dedupe_hash (HMAC blind index for duplicate detection)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS dedupe_hash VARCHAR(64)",
    ),
    Migration(
        key="enquiries_add_consent_given",
        name="enquiries: add consent_given (GDPR explicit consent flag)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE",
    ),
    Migration(
        key="enquiries_add_consent_timestamp",
        name="enquiries: add consent_timestamp (when consent was recorded)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_privacy_policy_version",
        name="enquiries: add privacy_policy_version (policy version at consent time)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS privacy_policy_version VARCHAR(20)",
    ),
    Migration(
        key="enquiries_add_marketing_consent",
        name="enquiries: add marketing_consent (opt-in marketing flag)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE",
    ),
    Migration(
        key="enquiries_add_marketing_consent_timestamp",
        name="enquiries: add marketing_consent_timestamp",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS marketing_consent_timestamp TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_referrer_url",
        name="enquiries: add referrer_url (HTTP Referer at submission time)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS referrer_url VARCHAR(1024)",
    ),
    Migration(
        key="enquiries_add_retention_until",
        name="enquiries: add retention_until (GDPR data-retention expiry date)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS retention_until TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_deletion_requested",
        name="enquiries: add deletion_requested (right-to-erasure flag)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT FALSE",
    ),

    # ── enquiries: superadmin inbox workflow ──────────────────────────────────

    Migration(
        key="enquiries_add_assigned_to",
        name="enquiries: add assigned_to (superadmin user id)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS assigned_to INTEGER",
    ),
    Migration(
        key="enquiries_add_assigned_at",
        name="enquiries: add assigned_at (assignment timestamp)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_is_spam",
        name="enquiries: add is_spam (spam classification flag)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT FALSE",
    ),
    Migration(
        key="enquiries_add_spam_marked_at",
        name="enquiries: add spam_marked_at (when marked spam)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS spam_marked_at TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_converted_lead_id",
        name="enquiries: add converted_lead_id (Lead UUID reverse link)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS converted_lead_id VARCHAR(36)",
    ),
    Migration(
        key="enquiries_add_converted_at",
        name="enquiries: add converted_at (when converted to a Lead)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP",
    ),
    Migration(
        key="enquiries_add_closed_at",
        name="enquiries: add closed_at (when inbox status set to Closed)",
        sql="ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP",
    ),

    # ── enquiries: indexes ────────────────────────────────────────────────────

    Migration(
        key="enquiries_idx_assigned_to",
        name="enquiries: index on assigned_to",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_assigned_to ON enquiries (assigned_to)",
    ),
    Migration(
        key="enquiries_idx_is_spam",
        name="enquiries: index on is_spam",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_is_spam ON enquiries (is_spam)",
    ),
    Migration(
        key="enquiries_idx_converted_lead_id",
        name="enquiries: index on converted_lead_id",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_converted_lead_id ON enquiries (converted_lead_id)",
    ),
    Migration(
        key="enquiries_idx_status_spam",
        name="enquiries: composite index on (status, is_spam) for inbox filters",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_status_spam ON enquiries (status, is_spam)",
    ),
    Migration(
        key="enquiries_idx_enquiry_number",
        name="enquiries: unique index on enquiry_number",
        sql="CREATE UNIQUE INDEX IF NOT EXISTS ix_enquiries_enquiry_number ON enquiries (enquiry_number)",
    ),
    Migration(
        key="enquiries_idx_dedupe_hash",
        name="enquiries: index on dedupe_hash",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_dedupe_hash ON enquiries (dedupe_hash)",
    ),
    Migration(
        key="enquiries_idx_dedupe_created",
        name="enquiries: composite index on (dedupe_hash, created_at) for 24h window dedup",
        sql="CREATE INDEX IF NOT EXISTS ix_enquiries_dedupe_created ON enquiries (dedupe_hash, created_at)",
    ),

    # ── enquiries: drop legacy plaintext PII columns ──────────────────────────

    Migration(
        key="enquiries_drop_work_email",
        name="enquiries: drop plaintext work_email (replaced by email_encrypted)",
        sql="ALTER TABLE enquiries DROP COLUMN IF EXISTS work_email",
    ),
    Migration(
        key="enquiries_drop_phone_number",
        name="enquiries: drop plaintext phone_number (replaced by phone_encrypted)",
        sql="ALTER TABLE enquiries DROP COLUMN IF EXISTS phone_number",
    ),
    Migration(
        key="enquiries_drop_message",
        name="enquiries: drop plaintext message (replaced by message_encrypted)",
        sql="ALTER TABLE enquiries DROP COLUMN IF EXISTS message",
    ),

    # ── leads ─────────────────────────────────────────────────────────────────

    Migration(
        key="leads_add_country_code",
        name="leads: add country_code (phone dial prefix, plaintext)",
        sql="ALTER TABLE leads ADD COLUMN IF NOT EXISTS country_code VARCHAR(8)",
    ),
    Migration(
        key="leads_add_score_label_override",
        name="leads: add score_label_override (manual Hot/Warm/Cold override; null = auto)",
        sql="ALTER TABLE leads ADD COLUMN IF NOT EXISTS score_label_override VARCHAR(10)",
    ),

    # ── lead_activities ───────────────────────────────────────────────────────

    Migration(
        key="lead_activities_add_next_action",
        name="lead_activities: add next_action (free-text follow-up description)",
        sql="ALTER TABLE lead_activities ADD COLUMN IF NOT EXISTS next_action TEXT",
    ),

    # ── leads / lead_conversions: Lead→Client UUID reverse link ───────────────

    Migration(
        key="leads_add_converted_client_uuid",
        name="leads: add converted_client_uuid (Client UUID; legacy INTEGER column incompatible)",
        sql="ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_uuid VARCHAR(36)",
    ),
    Migration(
        key="lead_conversions_add_client_uuid",
        name="lead_conversions: add client_uuid (Client UUID on the conversion record)",
        sql="ALTER TABLE lead_conversions ADD COLUMN IF NOT EXISTS client_uuid VARCHAR(36)",
    ),

    # ── superadmins: Settings → Profile editable fields ──────────────────────

    Migration(
        key="superadmins_add_phone",
        name="superadmins: add phone (editable from Settings → Profile)",
        sql="ALTER TABLE superadmins ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
    ),
    Migration(
        key="superadmins_add_updated_at",
        name="superadmins: add updated_at (profile last-modified timestamp)",
        sql="ALTER TABLE superadmins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
    ),
]
