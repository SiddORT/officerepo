"""billing_email encrypt and missing indexes

Revision ID: a1b2c3d4e5f6
Revises: c4e495a6b65e
Create Date: 2026-06-01

Changes
-------
1. client_billing_profiles — rename billing_email (plaintext String(255)) to
   billing_email_encrypted (Text). Existing values are re-encrypted in-place
   using the shared Fernet helper so no PII is ever stored plaintext after
   this migration completes.

2. client_contacts — add index on is_primary (used in list_contacts ORDER BY
   and get_primary_contact filter).

3. client_domains — add index on is_primary (used in list_domains ORDER BY).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "a1b2c3d4e5f6"
down_revision = "c4e495a6b65e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Encrypt billing_email ─────────────────────────────────────────────
    # Add the encrypted column alongside the old one so we can migrate data
    # before dropping the source.
    op.add_column(
        "client_billing_profiles",
        sa.Column("billing_email_encrypted", sa.Text(), nullable=True),
    )

    bind = op.get_bind()

    # Encrypt any existing plaintext values row-by-row.
    rows = bind.execute(
        sa.text("SELECT id, billing_email FROM client_billing_profiles WHERE billing_email IS NOT NULL AND billing_email != ''")
    ).fetchall()

    if rows:
        from backend.shared.security.encryption import encrypt_value
        for row_id, email in rows:
            encrypted = encrypt_value(email)
            bind.execute(
                sa.text(
                    "UPDATE client_billing_profiles SET billing_email_encrypted = :enc WHERE id = :id"
                ),
                {"enc": encrypted, "id": row_id},
            )

    # Drop the old plaintext column.
    op.drop_column("client_billing_profiles", "billing_email")

    # ── 2. Index on client_contacts.is_primary ───────────────────────────────
    op.create_index(
        "ix_client_contacts_is_primary",
        "client_contacts",
        ["is_primary"],
    )

    # ── 3. Index on client_domains.is_primary ────────────────────────────────
    op.create_index(
        "ix_client_domains_is_primary",
        "client_domains",
        ["is_primary"],
    )


def downgrade() -> None:
    # Restore the plaintext column (values are lost — no reverse decryption).
    op.add_column(
        "client_billing_profiles",
        sa.Column("billing_email", sa.String(255), nullable=True),
    )
    op.drop_column("client_billing_profiles", "billing_email_encrypted")

    op.drop_index("ix_client_contacts_is_primary", table_name="client_contacts")
    op.drop_index("ix_client_domains_is_primary", table_name="client_domains")
