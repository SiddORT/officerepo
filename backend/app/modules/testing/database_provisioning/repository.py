import logging

from sqlalchemy import create_engine, text
from sqlalchemy.exc import ProgrammingError

from backend.app.config.settings import settings

logger = logging.getLogger(__name__)

_AUTOCOMMIT_ENGINE = None


def _engine():
    global _AUTOCOMMIT_ENGINE
    if _AUTOCOMMIT_ENGINE is None:
        _AUTOCOMMIT_ENGINE = create_engine(
            settings.PLATFORM_DB_URL,
            isolation_level="AUTOCOMMIT",
            pool_pre_ping=True,
        )
    return _AUTOCOMMIT_ENGINE


def db_exists(database_name: str) -> bool:
    with _engine().connect() as conn:
        row = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": database_name},
        ).fetchone()
        return row is not None


def create_database(database_name: str) -> None:
    safe = _safe_identifier(database_name)
    with _engine().connect() as conn:
        conn.execute(text(f'CREATE DATABASE "{safe}"'))
    logger.info("DB_PROVISION | created | %s", database_name)


def drop_database(database_name: str) -> None:
    safe = _safe_identifier(database_name)
    with _engine().connect() as conn:
        conn.execute(
            text(
                f'SELECT pg_terminate_backend(pid) '
                f'FROM pg_stat_activity WHERE datname = :name AND pid <> pg_backend_pid()'
            ),
            {"name": database_name},
        )
        conn.execute(text(f'DROP DATABASE "{safe}"'))
    logger.info("DB_PROVISION | dropped | %s", database_name)


def list_databases() -> list[str]:
    with _engine().connect() as conn:
        rows = conn.execute(
            text("SELECT datname FROM pg_database ORDER BY datname")
        ).fetchall()
        return [r[0] for r in rows]


def _safe_identifier(name: str) -> str:
    import re
    if not re.fullmatch(r"[a-z][a-z0-9_]*", name):
        raise ValueError(f"Unsafe identifier: {name!r}")
    return name
