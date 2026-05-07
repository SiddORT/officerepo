import os
import secrets
import logging
from datetime import datetime, timezone
from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_SENTINEL = "__unset__"


def _normalize_db_url(url: str) -> str:
    """Convert postgres:// → postgresql+psycopg2:// for SQLAlchemy compatibility."""
    if url.startswith("postgres://"):
        url = "postgresql+psycopg2://" + url[len("postgres://"):]
    elif url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


class Settings(BaseSettings):
    # Platform (master) database — reads DATABASE_URL from environment automatically
    DATABASE_URL: str = _SENTINEL
    PLATFORM_DB_URL: str = _SENTINEL

    # JWT — defaults use a sentinel so the validator can detect missing values
    JWT_SECRET: str = _SENTINEL
    REFRESH_SECRET: str = _SENTINEL
    SESSION_SECRET: str = _SENTINEL  # legacy alias for JWT_SECRET
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Key rotation — graceful rollover procedure:
    #
    #   Step 1 – Generate new secrets.
    #   Step 2 – Set PREVIOUS_JWT_SECRET=<old JWT_SECRET> and
    #            PREVIOUS_REFRESH_SECRET=<old REFRESH_SECRET> in the environment.
    #   Step 3 – Set PREVIOUS_SECRET_ISSUED_AT to the current UTC time in ISO-8601
    #            format (e.g. 2026-05-07T12:00:00Z).  This starts the grace clock.
    #   Step 4 – Update JWT_SECRET / REFRESH_SECRET to the new values.
    #   Step 5 – Redeploy.  Tokens signed with the old secret are still accepted
    #            via the fallback path until PREVIOUS_SECRET_GRACE_HOURS elapses.
    #   Step 6 – After the grace period the fallback is skipped automatically even
    #            if the env vars are still set — no manual cleanup step required.
    #
    # WARNING: If PREVIOUS_SECRET_ISSUED_AT is not set the grace period is measured
    # from application startup, which resets on every restart.  Always set
    # PREVIOUS_SECRET_ISSUED_AT to ensure a stable expiry time.
    PREVIOUS_JWT_SECRET: str = ""
    PREVIOUS_REFRESH_SECRET: str = ""

    # ISO-8601 UTC timestamp of when the rotation was performed, e.g.
    # "2026-05-07T12:00:00Z".  The fallback secrets are accepted only within
    # PREVIOUS_SECRET_GRACE_HOURS hours of this timestamp.
    # If unset, the clock starts from application startup time.
    PREVIOUS_SECRET_ISSUED_AT: str = ""

    # How long (in hours) to honour the previous secrets after rotation.
    # Default: 168 h = 7 days (long enough for all refresh tokens to expire).
    PREVIOUS_SECRET_GRACE_HOURS: int = 168

    # App
    APP_NAME: str = "Office Repo"
    API_V1_PREFIX: str = "/api/v1"
    TENANT_RESOLVER_STRATEGY: str = "header"  # header | subdomain | jwt
    ENVIRONMENT: str = "development"

    # CORS — comma-separated list of allowed origins for production.
    # Example: "https://app.officerepo.io,https://www.officerepo.io"
    # Ignored in development (wildcard is used instead).
    ALLOWED_ORIGINS: str = ""

    # Internal — set at startup; not read from environment
    _previous_secret_origin: datetime = None

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    @model_validator(mode="after")
    def _resolve_and_validate_secrets(self) -> "Settings":
        is_production = self.ENVIRONMENT.lower() == "production"

        # ── Database ──────────────────────────────────────────────────────────
        # Prefer explicit PLATFORM_DB_URL, fall back to DATABASE_URL (Replit built-in)
        if self.PLATFORM_DB_URL == _SENTINEL:
            if self.DATABASE_URL != _SENTINEL:
                self.PLATFORM_DB_URL = _normalize_db_url(self.DATABASE_URL)
            else:
                self.PLATFORM_DB_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/office_repo_platform"
        else:
            self.PLATFORM_DB_URL = _normalize_db_url(self.PLATFORM_DB_URL)

        # ── JWT_SECRET ────────────────────────────────────────────────────────
        if self.JWT_SECRET == _SENTINEL:
            if self.SESSION_SECRET != _SENTINEL:
                self.JWT_SECRET = self.SESSION_SECRET
            elif is_production:
                raise ValueError(
                    "JWT_SECRET must be set in production. "
                    "The application cannot start with a missing or insecure secret."
                )
            else:
                self.JWT_SECRET = secrets.token_hex(32)
                logger.warning(
                    "JWT_SECRET is not set. A random secret has been generated for this "
                    "run. Set JWT_SECRET explicitly for persistent sessions."
                )

        # ── REFRESH_SECRET ────────────────────────────────────────────────────
        if self.REFRESH_SECRET == _SENTINEL:
            # Fall back to SESSION_SECRET so prod keeps working without extra setup
            if self.SESSION_SECRET != _SENTINEL:
                self.REFRESH_SECRET = self.SESSION_SECRET + "_refresh"
            elif is_production:
                raise ValueError(
                    "REFRESH_SECRET must be set in production. "
                    "The application cannot start with a missing or insecure secret."
                )
            else:
                self.REFRESH_SECRET = secrets.token_hex(32)
                logger.warning(
                    "REFRESH_SECRET is not set. A random secret has been generated for "
                    "this run. Set REFRESH_SECRET explicitly for persistent sessions."
                )

        # ── Previous-secret grace-period clock ────────────────────────────────
        # Validate grace hours before computing anything else.
        if self.PREVIOUS_SECRET_GRACE_HOURS < 1:
            raise ValueError(
                "PREVIOUS_SECRET_GRACE_HOURS must be a positive integer (>= 1). "
                f"Got: {self.PREVIOUS_SECRET_GRACE_HOURS}"
            )

        # Resolve the origin timestamp once at startup so all subsequent checks
        # compare against a stable wall-clock reference.
        if self.PREVIOUS_JWT_SECRET or self.PREVIOUS_REFRESH_SECRET:
            if self.PREVIOUS_SECRET_ISSUED_AT.strip():
                try:
                    origin = datetime.fromisoformat(
                        self.PREVIOUS_SECRET_ISSUED_AT.replace("Z", "+00:00")
                    )
                    # Normalise to UTC-aware
                    if origin.tzinfo is None:
                        origin = origin.replace(tzinfo=timezone.utc)
                    self._previous_secret_origin = origin
                except ValueError:
                    logger.warning(
                        "PREVIOUS_SECRET_ISSUED_AT=%r could not be parsed as ISO-8601. "
                        "Falling back to application startup time as the grace-period origin.",
                        self.PREVIOUS_SECRET_ISSUED_AT,
                    )
                    self._previous_secret_origin = datetime.now(tz=timezone.utc)
            else:
                logger.warning(
                    "PREVIOUS_JWT_SECRET / PREVIOUS_REFRESH_SECRET are set but "
                    "PREVIOUS_SECRET_ISSUED_AT is missing. The grace-period clock will "
                    "start from application startup time and reset on every restart. "
                    "Set PREVIOUS_SECRET_ISSUED_AT to a fixed UTC timestamp for a "
                    "stable expiry time."
                )
                self._previous_secret_origin = datetime.now(tz=timezone.utc)

            # Warn if the grace period has already elapsed at startup
            elapsed_hours = (
                datetime.now(tz=timezone.utc) - self._previous_secret_origin
            ).total_seconds() / 3600
            if elapsed_hours >= self.PREVIOUS_SECRET_GRACE_HOURS:
                logger.warning(
                    "PREVIOUS_JWT_SECRET / PREVIOUS_REFRESH_SECRET grace period has "
                    "already elapsed (%.1f h >= %d h configured). The fallback secrets "
                    "will be ignored for all token verifications. Consider unsetting "
                    "PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET to keep the "
                    "environment tidy.",
                    elapsed_hours,
                    self.PREVIOUS_SECRET_GRACE_HOURS,
                )

        # ALLOWED_ORIGINS
        # In non-development environments, restrict to an explicit list.
        # If ALLOWED_ORIGINS is not set, fall back to the Replit-provided domain
        # (REPLIT_DOMAINS env var) so the app never crashes at startup over this.
        is_restricted = self.ENVIRONMENT.lower() != "development"
        if is_restricted:
            if not self.ALLOWED_ORIGINS.strip():
                replit_domains = os.environ.get("REPLIT_DOMAINS", "")
                if replit_domains:
                    self.ALLOWED_ORIGINS = ",".join(
                        f"https://{d.strip()}"
                        for d in replit_domains.split(",")
                        if d.strip()
                    )
                    logger.warning(
                        "ALLOWED_ORIGINS was not set; auto-detected Replit domains: %s. "
                        "Set ALLOWED_ORIGINS explicitly for production.",
                        self.ALLOWED_ORIGINS,
                    )
                else:
                    logger.warning(
                        "ALLOWED_ORIGINS is not set and REPLIT_DOMAINS is unavailable. "
                        "Falling back to wildcard CORS — set ALLOWED_ORIGINS in production."
                    )
                    self.ALLOWED_ORIGINS = "*"
            else:
                origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
                if "*" in origins:
                    logger.warning(
                        "ALLOWED_ORIGINS contains '*' in a non-development environment. "
                        "Consider specifying explicit origin URLs instead."
                    )

        return self

    def previous_secret_grace_active(self) -> bool:
        """Return True if the previous-secret grace period is still in effect."""
        if not self._previous_secret_origin:
            return False
        elapsed_hours = (
            datetime.now(tz=timezone.utc) - self._previous_secret_origin
        ).total_seconds() / 3600
        return elapsed_hours < self.PREVIOUS_SECRET_GRACE_HOURS


settings = Settings()
