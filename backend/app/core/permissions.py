"""
Reusable permission-check guard for FastAPI endpoints.

``require_permission(name)`` returns a dependency that:
  1. validates the superadmin JWT (same contract as ``require_superadmin``), then
  2. resolves the admin's *effective* permissions from the DB (per-request, so
     revoking a role takes effect immediately — permissions are NOT baked into
     the JWT), and
  3. raises ``PermissionDenied`` (a clean ``403`` in the standard ApiResponse
     envelope) when the required permission is missing.

The built-in Superadmin role short-circuits every check (full access), so the
default superadmin account always passes. This guard is additive — the existing
``require_superadmin`` guard keeps working unchanged for legacy endpoints.
"""
import logging

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.app.core.security import decode_access_token
from backend.app.database.platform import get_platform_db
from backend.app.modules.rbac import service as rbac_service

logger = logging.getLogger(__name__)

_bearer = HTTPBearer()


class PermissionDenied(Exception):
    """Raised when an authenticated admin lacks a required permission.

    Handled by a registered exception handler that renders the standard
    ApiResponse envelope with a ``403`` status.
    """

    def __init__(self, permission: str):
        self.permission = permission
        super().__init__(f"Missing permission: {permission}")


def _authenticate(request: Request, credentials: HTTPAuthorizationCredentials) -> dict:
    """Validate the superadmin JWT and return its payload (401/403 on failure)."""
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if payload.get("role") != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Superadmin access required")
    request.state.token_kid = payload.get("_kid", "unknown")
    return payload


def require_permission(permission: str):
    """Return a dependency that enforces *permission* for the current admin."""

    def dependency(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(_bearer),
        db: Session = Depends(get_platform_db),
    ) -> dict:
        payload = _authenticate(request, credentials)
        perms = rbac_service.resolve_effective_permissions(db, payload.get("user_id"))
        if not rbac_service.has_permission(perms, permission):
            logger.info(
                "permission denied user_id=%s required=%s",
                payload.get("user_id"), permission,
            )
            raise PermissionDenied(permission)
        return {"user_id": payload.get("user_id"), "email": payload.get("email", "unknown")}

    return dependency
