"""
Temporary testing module — verifies whether the PostgreSQL user has
CREATE DATABASE / DROP DATABASE / LIST DATABASES privileges.

Superadmin-only, JWT-protected. Remove once the capability is confirmed.
"""
import re

from fastapi import APIRouter, Depends, Path

from backend.app.core.deps import require_superadmin
from backend.app.modules.testing.database_provisioning import service
from backend.app.modules.testing.database_provisioning.schemas import (
    CreateDatabaseRequest,
    DatabaseActionResponse,
    ListDatabasesResponse,
)

router = APIRouter(
    prefix="/testing/databases",
    tags=["[TESTING] database provisioning"],
)

_NAME_RE = re.compile(r"^[a-z][a-z0-9_]{2,62}$")


@router.get("", response_model=ListDatabasesResponse, summary="[TESTING] List all databases")
def list_databases(admin: dict = Depends(require_superadmin)):
    return service.list_databases(actor=admin.get("email", "unknown"))


@router.post("", response_model=DatabaseActionResponse, summary="[TESTING] Create a database")
def create_database(
    payload: CreateDatabaseRequest,
    admin: dict = Depends(require_superadmin),
):
    return service.create_database(payload.database_name, actor=admin.get("email", "unknown"))


@router.delete(
    "/{database_name}",
    response_model=DatabaseActionResponse,
    summary="[TESTING] Drop a database",
)
def drop_database(
    database_name: str = Path(..., min_length=3, max_length=63),
    admin: dict = Depends(require_superadmin),
):
    if not _NAME_RE.fullmatch(database_name):
        return DatabaseActionResponse(
            success=False,
            database_name=database_name,
            message="Invalid database name. Use lowercase letters, numbers, and underscores only.",
        )
    return service.drop_database(database_name, actor=admin.get("email", "unknown"))
