"""add email_hash to client_admin_users

Revision ID: e1fb35631a4e
Revises: 5940938b0c7f
Create Date: 2026-06-29 13:37:07.935848

"""
from typing import Sequence, Union
import hashlib

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


revision: str = 'e1fb35631a4e'
down_revision: Union[str, None] = '5940938b0c7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── asset_categories ──────────────────────────────────────────────────────
    # Autogenerate emitted drop_constraint calls that fail on databases which
    # were seeded with unique INDEXES (ix_*) instead of unique CONSTRAINTS (*_key).
    # Use IF EXISTS so the migration is safe on both schema variants.
    conn.execute(text(
        "ALTER TABLE asset_categories "
        "DROP CONSTRAINT IF EXISTS asset_categories_category_code_key"
    ))
    conn.execute(text(
        "ALTER TABLE asset_categories "
        "DROP CONSTRAINT IF EXISTS asset_categories_category_name_key"
    ))

    # Rebuild the indexes (drop-then-recreate converts non-unique → unique).
    # IF EXISTS / IF NOT EXISTS guards make this re-runnable.
    conn.execute(text("DROP INDEX IF EXISTS ix_asset_categories_category_code"))
    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_asset_categories_category_code "
        "ON asset_categories (category_code)"
    ))
    conn.execute(text("DROP INDEX IF EXISTS ix_asset_categories_category_name"))
    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_asset_categories_category_name "
        "ON asset_categories (category_name)"
    ))

    # ── asset_masters ─────────────────────────────────────────────────────────
    conn.execute(text(
        "ALTER TABLE asset_masters "
        "DROP CONSTRAINT IF EXISTS asset_masters_asset_code_key"
    ))

    conn.execute(text("DROP INDEX IF EXISTS ix_asset_masters_asset_code"))
    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_asset_masters_asset_code "
        "ON asset_masters (asset_code)"
    ))

    # Plain (non-unique) index — safe to add if absent.
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_asset_masters_sub_category_id "
        "ON asset_masters (sub_category_id)"
    ))

    # ── client_admin_users — email_hash column ────────────────────────────────
    # Add column if it doesn't already exist (idempotent on re-run).
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'client_admin_users' AND column_name = 'email_hash'"
    ))
    if result.fetchone() is None:
        op.add_column('client_admin_users', sa.Column('email_hash', sa.String(length=64), nullable=True))

    # Backfill email_hash for existing users (decrypt + SHA-256).
    # Done BEFORE creating the unique index so we can detect and skip duplicates gracefully.
    try:
        from backend.shared.security.encryption import decrypt_value
        rows = conn.execute(
            text(
                "SELECT id, email_encrypted FROM client_admin_users "
                "WHERE email_hash IS NULL AND is_deleted = false AND email_encrypted IS NOT NULL"
            )
        ).fetchall()
        seen_hashes: set = set()
        for row in rows:
            uid, enc = row[0], row[1]
            try:
                email = decrypt_value(enc)
                h = hashlib.sha256(email.strip().lower().encode()).hexdigest()
                if h in seen_hashes:
                    continue  # skip duplicate — global uniqueness violation; leave hash NULL
                seen_hashes.add(h)
                conn.execute(
                    text("UPDATE client_admin_users SET email_hash = :h WHERE id = :uid"),
                    {"h": h, "uid": uid},
                )
            except Exception:
                pass  # if decrypt fails, leave hash NULL — admin can fix manually
    except ImportError:
        pass  # encryption helper not available in this env — skip backfill

    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_client_admin_users_email_hash "
        "ON client_admin_users (email_hash)"
    ))


def downgrade() -> None:
    conn = op.get_bind()

    conn.execute(text("DROP INDEX IF EXISTS ix_client_admin_users_email_hash"))

    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'client_admin_users' AND column_name = 'email_hash'"
    ))
    if result.fetchone() is not None:
        op.drop_column('client_admin_users', 'email_hash')

    conn.execute(text("DROP INDEX IF EXISTS ix_asset_masters_sub_category_id"))
    conn.execute(text("DROP INDEX IF EXISTS ix_asset_masters_asset_code"))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_asset_masters_asset_code "
        "ON asset_masters (asset_code)"
    ))

    conn.execute(text("DROP INDEX IF EXISTS ix_asset_categories_category_name"))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_asset_categories_category_name "
        "ON asset_categories (category_name)"
    ))
    conn.execute(text("DROP INDEX IF EXISTS ix_asset_categories_category_code"))
    conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_asset_categories_category_code "
        "ON asset_categories (category_code)"
    ))
