import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.app.config.settings import settings
from backend.app.core.deps import require_superadmin

logger = logging.getLogger(__name__)

router = APIRouter()


class RotateSecretsResponse(BaseModel):
    rotated: bool
    environment: str
    new_jwt_secret: str | None = None
    new_refresh_secret: str | None = None
    previous_jwt_secret_kid: str | None = None
    previous_refresh_secret_kid: str | None = None
    grace_period_expires_at: str | None = None
    grace_period_hours: int | None = None
    message: str
    instructions: list[str] | None = None


def _kid(secret: str) -> str:
    """Return the 8-char key ID for display (same derivation as security.py)."""
    import hashlib
    return hashlib.sha256(secret.encode()).hexdigest()[:8]


@router.post(
    "/rotate-secrets",
    response_model=RotateSecretsResponse,
    status_code=status.HTTP_200_OK,
    summary="Rotate JWT and refresh secrets",
    description=(
        "Promotes the current secrets to PREVIOUS_*, generates new secrets, and "
        "stamps the grace-period clock. In production the endpoint is disabled and "
        "returns manual rotation instructions instead.\n\n"
        "**Security**: Superadmin JWT required. New secret values are returned once — "
        "copy them immediately into your secrets manager and redeploy.\n\n"
        "**Rate limit**: Successful rotations are throttled to at most once per "
        "ROTATE_SECRETS_COOLDOWN_MINUTES (default 60). Calls within the cooldown "
        "window return 429 with the next allowed rotation time."
    ),
    responses={
        429: {
            "description": "Rotation rate-limited; retry after the cooldown elapses.",
        }
    },
)
def rotate_secrets(
    _admin: dict = Depends(require_superadmin),
) -> RotateSecretsResponse:
    env = settings.ENVIRONMENT.lower()

    if env == "production":
        grace_expiry = None
        if settings._previous_secret_origin:
            expires_at = settings._previous_secret_origin + timedelta(
                hours=settings.PREVIOUS_SECRET_GRACE_HOURS
            )
            grace_expiry = expires_at.isoformat()

        instructions = [
            "1. Generate new secrets (e.g. `python -c \"import secrets; print(secrets.token_hex(32))\"`).",
            "2. Set PREVIOUS_JWT_SECRET=<current JWT_SECRET> in your secrets manager.",
            "3. Set PREVIOUS_REFRESH_SECRET=<current REFRESH_SECRET> in your secrets manager.",
            f"4. Set PREVIOUS_SECRET_ISSUED_AT=<current UTC ISO-8601 timestamp> to start the "
            f"{settings.PREVIOUS_SECRET_GRACE_HOURS}-hour grace clock.",
            "5. Update JWT_SECRET and REFRESH_SECRET to the new values.",
            "6. Redeploy the application.",
            "7. After the grace period elapses, unset PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET.",
        ]

        logger.info(
            "rotate-secrets called in production by superadmin user_id=%s — returning manual instructions",
            _admin.get("user_id"),
        )

        return RotateSecretsResponse(
            rotated=False,
            environment=env,
            grace_period_expires_at=grace_expiry,
            grace_period_hours=settings.PREVIOUS_SECRET_GRACE_HOURS,
            message=(
                "Automatic in-process rotation is disabled in production. "
                "Follow the instructions to rotate secrets safely via your secrets manager."
            ),
            instructions=instructions,
        )

    now = datetime.now(tz=timezone.utc)

    # ── Rate limiting ─────────────────────────────────────────────────────────
    # Reject calls made within the cooldown window since the last successful
    # rotation. The timestamp is held in-memory (single-instance state) and
    # resets on restart, which is sufficient for the single-instance deployment.
    cooldown_minutes = settings.ROTATE_SECRETS_COOLDOWN_MINUTES
    last_rotation_at = settings._last_rotation_at
    if cooldown_minutes > 0 and last_rotation_at is not None:
        next_allowed_at = last_rotation_at + timedelta(minutes=cooldown_minutes)
        if now < next_allowed_at:
            retry_after_seconds = max(1, int((next_allowed_at - now).total_seconds()))
            logger.warning(
                "rotate-secrets rejected (cooldown active): last_rotation_at=%s "
                "next_allowed_at=%s retry_after_seconds=%d initiated_by=superadmin:user_id=%s",
                last_rotation_at.isoformat(),
                next_allowed_at.isoformat(),
                retry_after_seconds,
                _admin.get("user_id"),
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(retry_after_seconds)},
                content={
                    "rotated": False,
                    "environment": env,
                    "message": (
                        "Secret rotation is rate-limited. The last rotation was too "
                        f"recent. Try again after {next_allowed_at.isoformat()}."
                    ),
                    "cooldown_minutes": cooldown_minutes,
                    "last_rotation_at": last_rotation_at.isoformat(),
                    "next_rotation_allowed_at": next_allowed_at.isoformat(),
                    "retry_after_seconds": retry_after_seconds,
                },
            )

    old_jwt_secret = settings.JWT_SECRET
    old_refresh_secret = settings.REFRESH_SECRET

    new_jwt_secret = secrets.token_hex(32)
    new_refresh_secret = secrets.token_hex(32)

    settings.PREVIOUS_JWT_SECRET = old_jwt_secret
    settings.PREVIOUS_REFRESH_SECRET = old_refresh_secret
    settings.PREVIOUS_SECRET_ISSUED_AT = now.isoformat()
    settings._previous_secret_origin = now

    settings.JWT_SECRET = new_jwt_secret
    settings.REFRESH_SECRET = new_refresh_secret

    settings._last_rotation_at = now

    grace_expires_at = now + timedelta(hours=settings.PREVIOUS_SECRET_GRACE_HOURS)

    logger.info(
        "rotate-secrets: in-process rotation complete. "
        "new_jwt_kid=%s new_refresh_kid=%s previous_jwt_kid=%s previous_refresh_kid=%s "
        "grace_expires_at=%s initiated_by=superadmin:user_id=%s",
        _kid(new_jwt_secret),
        _kid(new_refresh_secret),
        _kid(old_jwt_secret),
        _kid(old_refresh_secret),
        grace_expires_at.isoformat(),
        _admin.get("user_id"),
    )

    return RotateSecretsResponse(
        rotated=True,
        environment=env,
        new_jwt_secret=new_jwt_secret,
        new_refresh_secret=new_refresh_secret,
        previous_jwt_secret_kid=_kid(old_jwt_secret),
        previous_refresh_secret_kid=_kid(old_refresh_secret),
        grace_period_expires_at=grace_expires_at.isoformat(),
        grace_period_hours=settings.PREVIOUS_SECRET_GRACE_HOURS,
        message=(
            "Rotation complete. Copy the new secret values into your secrets manager "
            "and redeploy to make them permanent. The previous secrets will be accepted "
            f"for another {settings.PREVIOUS_SECRET_GRACE_HOURS} hours (grace period)."
        ),
        instructions=[
            "1. Copy new_jwt_secret → set JWT_SECRET in your secrets manager.",
            "2. Copy new_refresh_secret → set REFRESH_SECRET in your secrets manager.",
            f"3. Set PREVIOUS_JWT_SECRET to the old value (kid: {_kid(old_jwt_secret)}).",
            f"4. Set PREVIOUS_REFRESH_SECRET to the old value (kid: {_kid(old_refresh_secret)}).",
            f"5. Set PREVIOUS_SECRET_ISSUED_AT={now.isoformat()} to anchor the grace clock.",
            "6. Redeploy the application.",
            "7. After the grace period elapses, unset PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET.",
        ],
    )
