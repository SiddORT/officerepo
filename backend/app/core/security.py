import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from backend.app.config.settings import settings

logger = logging.getLogger(__name__)


def _derive_kid(secret: str) -> str:
    """Return the first 8 hex characters of the SHA-256 digest of *secret*.

    This produces a short, stable key ID that lets operators correlate a token
    with the secret version that signed it without exposing the secret itself.
    """
    return hashlib.sha256(secret.encode()).hexdigest()[:8]


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    kid = _derive_kid(settings.JWT_SECRET)
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256", headers={"kid": kid})


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    kid = _derive_kid(settings.REFRESH_SECRET)
    return jwt.encode(to_encode, settings.REFRESH_SECRET, algorithm="HS256", headers={"kid": kid})


def decode_access_token(token: str) -> Dict[str, Any]:
    """Verify *token* and return its payload.

    The verified ``kid`` (key ID of the signing secret) is injected into the
    returned payload under the ``_kid`` key so callers can propagate it to
    structured logs without re-deriving it.
    """
    from backend.app.core.fallback_counter import record_fallback_use
    current_kid = _derive_kid(settings.JWT_SECRET)
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid", "unknown")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        payload["_kid"] = kid
        logger.debug("access token verified kid=%s", kid)
        return payload
    except JWTError:
        if settings.PREVIOUS_JWT_SECRET and settings.previous_secret_grace_active():
            payload = jwt.decode(token, settings.PREVIOUS_JWT_SECRET, algorithms=["HS256"])
            previous_kid = _derive_kid(settings.PREVIOUS_JWT_SECRET)
            header_kid = jwt.get_unverified_header(token).get("kid", "unknown")
            logger.info(
                "access token accepted via fallback key header_kid=%s derived_previous_kid=%s "
                "(current kid=%s); token was signed before rotation — rotation is not yet safe to complete",
                header_kid,
                previous_kid,
                current_kid,
            )
            record_fallback_use()
            payload["_kid"] = header_kid
            return payload
        raise


def create_portal_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Short-lived JWT for a client portal admin user (type='portal_access').

    Uses the same JWT_SECRET as superadmin tokens but carries a distinct
    ``token_type`` claim so the portal guard can reject superadmin tokens
    and vice-versa.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=8))
    to_encode.update({"exp": expire, "token_type": "portal_access"})
    kid = _derive_kid(settings.JWT_SECRET)
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256", headers={"kid": kid})


def decode_portal_token(token: str) -> Dict[str, Any]:
    """Verify a portal access token and return its payload."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        if payload.get("token_type") != "portal_access":
            raise JWTError("not a portal token")
        return payload
    except JWTError:
        raise


def decode_refresh_token(token: str) -> Dict[str, Any]:
    from backend.app.core.fallback_counter import record_fallback_use
    current_kid = _derive_kid(settings.REFRESH_SECRET)
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid", "unknown")
        payload = jwt.decode(token, settings.REFRESH_SECRET, algorithms=["HS256"])
        logger.debug("refresh token verified kid=%s", kid)
        return payload
    except JWTError:
        if settings.PREVIOUS_REFRESH_SECRET and settings.previous_secret_grace_active():
            payload = jwt.decode(token, settings.PREVIOUS_REFRESH_SECRET, algorithms=["HS256"])
            previous_kid = _derive_kid(settings.PREVIOUS_REFRESH_SECRET)
            header_kid = jwt.get_unverified_header(token).get("kid", "unknown")
            logger.info(
                "refresh token accepted via fallback key header_kid=%s derived_previous_kid=%s "
                "(current kid=%s); token was signed before rotation — rotation is not yet safe to complete",
                header_kid,
                previous_kid,
                current_kid,
            )
            record_fallback_use()
            return payload
        raise
