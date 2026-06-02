import logging
from datetime import datetime, timezone

from sqlalchemy.exc import ProgrammingError

from backend.app.modules.testing.database_provisioning import repository as repo

logger = logging.getLogger(__name__)


def _log(action: str, database_name: str, actor: str, status: str, detail: str = "") -> None:
    logger.info(
        "DB_PROVISION | action=%s | db=%s | actor=%s | status=%s | ts=%s%s",
        action,
        database_name,
        actor,
        status,
        datetime.now(timezone.utc).isoformat(),
        f" | detail={detail}" if detail else "",
    )


def create_database(database_name: str, *, actor: str) -> dict:
    try:
        if repo.db_exists(database_name):
            _log("create", database_name, actor, "skipped_exists")
            return {"success": False, "database_name": database_name, "message": "Database already exists"}
        repo.create_database(database_name)
        _log("create", database_name, actor, "ok")
        return {"success": True, "database_name": database_name, "message": "Database created successfully"}
    except ProgrammingError as exc:
        msg = str(exc.orig) if exc.orig else str(exc)
        if "permission denied" in msg.lower():
            _log("create", database_name, actor, "error", "permission denied")
            return {"success": False, "database_name": database_name, "message": "Permission denied to create database"}
        _log("create", database_name, actor, "error", msg)
        return {"success": False, "database_name": database_name, "message": f"Error: {msg}"}
    except Exception as exc:
        _log("create", database_name, actor, "error", str(exc))
        return {"success": False, "database_name": database_name, "message": f"Unexpected error: {exc}"}


def drop_database(database_name: str, *, actor: str) -> dict:
    try:
        if not repo.db_exists(database_name):
            _log("drop", database_name, actor, "skipped_not_found")
            return {"success": False, "database_name": database_name, "message": "Database not found"}
        repo.drop_database(database_name)
        _log("drop", database_name, actor, "ok")
        return {"success": True, "database_name": database_name, "message": "Database dropped successfully"}
    except ProgrammingError as exc:
        msg = str(exc.orig) if exc.orig else str(exc)
        if "permission denied" in msg.lower():
            _log("drop", database_name, actor, "error", "permission denied")
            return {"success": False, "database_name": database_name, "message": "Permission denied to drop database"}
        _log("drop", database_name, actor, "error", msg)
        return {"success": False, "database_name": database_name, "message": f"Error: {msg}"}
    except Exception as exc:
        _log("drop", database_name, actor, "error", str(exc))
        return {"success": False, "database_name": database_name, "message": f"Unexpected error: {exc}"}


def list_databases(*, actor: str) -> dict:
    try:
        dbs = repo.list_databases()
        _log("list", "*", actor, "ok")
        return {"databases": dbs}
    except Exception as exc:
        _log("list", "*", actor, "error", str(exc))
        return {"databases": [], "error": str(exc)}
