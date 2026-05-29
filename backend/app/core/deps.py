import logging
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from backend.app.core.security import decode_access_token

logger = logging.getLogger(__name__)

_bearer = HTTPBearer()


def require_superadmin(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """FastAPI dependency that validates a superadmin JWT.

    Returns the decoded token payload on success.
    Raises HTTP 401 for invalid/expired tokens and HTTP 403 for non-superadmin roles.

    Sets ``request.state.token_kid`` so the TenantMiddleware can emit a
    structured log record for each successfully authenticated request.
    """
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required",
        )

    request.state.token_kid = payload.get("_kid", "unknown")
    logger.debug("superadmin dependency passed for user_id=%s", payload.get("user_id"))
    return payload
