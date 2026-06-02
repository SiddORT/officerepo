"""Alembic environment — Office Repo platform database.

DATABASE_URL is taken from the environment (set automatically by Replit,
or via .env for self-hosting). The alembic.ini sqlalchemy.url is only a
placeholder; it is always overridden here.

All SQLAlchemy models must be imported below so that Base.metadata is
fully populated before autogenerate runs.
"""

import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Model imports — must stay in sync with main.py ──────────────────────────
from backend.app.database.platform import Base  # noqa: F401

import backend.app.platform.superadmin.models  # noqa: F401
import backend.app.platform.config.models  # noqa: F401
import backend.app.modules.rbac.models  # noqa: F401
import backend.app.modules.enquiry.models  # noqa: F401
import backend.app.modules.lead_management.models  # noqa: F401
import backend.app.modules.client_management.models  # noqa: F401
import backend.app.modules.cors_report.models  # noqa: F401
import backend.app.modules.currency_management.models  # noqa: F401
import backend.app.modules.organization.models  # noqa: F401
import backend.app.modules.auth.preferences_model  # noqa: F401
import backend.app.modules.notification_management.models  # noqa: F401
import backend.app.modules.security_settings.models  # noqa: F401
import backend.app.database.migrations.model  # noqa: F401  (schema_migrations audit table)
import backend.shared.audit.models  # noqa: F401
# ────────────────────────────────────────────────────────────────────────────

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Replit sets this automatically; for self-hosting copy .env.example to .env."
        )
    return url


def run_migrations_offline() -> None:
    """Run migrations without a live DB connection (generates SQL script)."""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    cfg = config.get_section(config.config_ini_section, {})
    cfg["sqlalchemy.url"] = get_url()

    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
