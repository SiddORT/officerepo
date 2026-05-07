import os
import secrets
import logging
from pydantic import model_validator
from pydantic_settings import BaseSettings

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
    #   Step 3 – Update JWT_SECRET / REFRESH_SECRET to the new values.
    #   Step 4 – Redeploy.  Tokens signed with the old secret are still accepted
    #            via the fallback path until they expire naturally.
    #   Step 5 – After the maximum token lifetime has passed (REFRESH_TOKEN_EXPIRE_DAYS),
    #            unset PREVIOUS_JWT_SECRET and PREVIOUS_REFRESH_SECRET and redeploy again.
    #
    # WARNING: leaving PREVIOUS_* vars set indefinitely keeps the old (possibly
    # compromised) secret active.  Always clear them after the grace period.
    PREVIOUS_JWT_SECRET: str = ""
    PREVIOUS_REFRESH_SECRET: str = ""

    # App
    APP_NAME: str = "Office Repo"
    API_V1_PREFIX: str = "/api/v1"
    TENANT_RESOLVER_STRATEGY: str = "header"  # header | subdomain | jwt
    ENVIRONMENT: str = "development"

    # CORS — comma-separated list of allowed origins for production.
    # Example: "https://app.officerepo.io,https://www.officerepo.io"
    # Ignored in development (wildcard is used instead).
    ALLOWED_ORIGINS: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

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


settings = Settings()
