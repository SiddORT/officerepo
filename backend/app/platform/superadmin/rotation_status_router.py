"""
GET /api/v1/superadmin/rotation-status

Returns the current JWT key rotation state so the superadmin dashboard can
display a warning when old-key tokens are still being accepted.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.app.config.settings import settings
from backend.app.core.security import _derive_kid
from backend.app.core.fallback_counter import count_last_hour
from backend.app.database.platform import get_platform_db
from backend.app.platform.superadmin.models import SuperAdmin
from backend.app.core.security import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request

router = APIRouter()

_bearer = HTTPBearer(auto_error=False)


def _require_superadmin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return payload


class RotationStatusResponse(BaseModel):
    grace_active: bool
    current_kid: str
    previous_kid: Optional[str]
    fallback_requests_last_hour: int
    grace_expires_at: Optional[str]


@router.get(
    "/rotation-status",
    response_model=RotationStatusResponse,
    summary="JWT key rotation status",
    tags=["superadmin - rotation"],
)
def get_rotation_status(_payload=Depends(_require_superadmin)):
    current_kid = _derive_kid(settings.JWT_SECRET)

    grace_active = settings.previous_secret_grace_active()

    previous_kid: Optional[str] = None
    grace_expires_at: Optional[str] = None

    if settings.PREVIOUS_JWT_SECRET and settings._previous_secret_origin:
        previous_kid = _derive_kid(settings.PREVIOUS_JWT_SECRET)
        from datetime import timedelta
        expires = settings._previous_secret_origin + timedelta(
            hours=settings.PREVIOUS_SECRET_GRACE_HOURS
        )
        grace_expires_at = expires.isoformat()

    fallback_count = count_last_hour() if grace_active else 0

    return RotationStatusResponse(
        grace_active=grace_active,
        current_kid=current_kid,
        previous_kid=previous_kid,
        fallback_requests_last_hour=fallback_count,
        grace_expires_at=grace_expires_at,
    )
