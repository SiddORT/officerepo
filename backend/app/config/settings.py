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

    # How often (in hours) the background monitor re-checks whether the grace
    # period has elapsed but PREVIOUS_* vars are still set.  Default: 1 hour.
    PREVIOUS_SECRET_CHECK_INTERVAL_HOURS: int = 1

    # Optional URL to POST a JSON alert payload to when stale PREVIOUS_* secrets
    # are detected after the grace period.  Leave blank to disable webhooks.
    SECRET_ROTATION_ALERT_URL: str = ""

    # Optional metadata merged into the stale-secret webhook payload so that
    # the alert can be routed or rendered correctly by the receiving system
    # (PagerDuty, Opsgenie, Slack block-kit bots, etc.) without a proxy layer.
    #
    # SECRET_ROTATION_ALERT_SEVERITY
    #   A free-form severity / priority label included as "severity" in the
    #   payload.  Common values: "critical", "high", "warning", "info".
    #   Defaults to "warning" when not set.
    #   Example: SECRET_ROTATION_ALERT_SEVERITY=critical
    #
    # SECRET_ROTATION_ALERT_ENV_TAG
    #   A free-form environment tag included as "environment" in the payload.
    #   Useful for distinguishing staging vs production alerts in shared
    #   on-call tooling.  Defaults to the ENVIRONMENT value when not set.
    #   Example: SECRET_ROTATION_ALERT_ENV_TAG=production
    SECRET_ROTATION_ALERT_SEVERITY: str = ""
    SECRET_ROTATION_ALERT_ENV_TAG: str = ""

    # CORS rejection alerting — when a browser request arrives with an Origin
    # that the CORS policy does not allow (a typo'd ALLOWED_ORIGINS entry or a
    # misconfigured tenant subdomain), the rejection is logged server-side and,
    # if CORS_REJECTION_ALERT_URL is set, a JSON payload is POSTed to it.
    # Mirrors the SECRET_ROTATION_ALERT_* pattern.
    #
    # CORS_REJECTION_ALERT_URL
    #   Optional webhook URL. Leave blank to disable webhooks (logging stays on).
    # CORS_REJECTION_ALERT_SEVERITY
    #   Free-form severity label included as "severity" (default "warning").
    # CORS_REJECTION_ALERT_ENV_TAG
    #   Free-form environment tag included as "environment" (default ENVIRONMENT).
    # CORS_REJECTION_ALERT_COOLDOWN_MINUTES
    #   Minimum minutes between webhook alerts for the SAME rejected origin, so a
    #   retrying misconfigured client cannot flood the receiver. The log line is
    #   always emitted; only the webhook is throttled. 0 disables throttling.
    CORS_REJECTION_ALERT_URL: str = ""
    CORS_REJECTION_ALERT_SEVERITY: str = ""
    CORS_REJECTION_ALERT_ENV_TAG: str = ""
    CORS_REJECTION_ALERT_COOLDOWN_MINUTES: int = 60

    # Minimum number of minutes that must elapse between two successful
    # in-process secret rotations via POST /superadmin/rotate-secrets.
    # Prevents accidental or malicious rapid rotation that could lock out
    # active users faster than the grace period covers them.
    # Set to 0 to disable the cooldown entirely. Default: 60 minutes.
    ROTATE_SECRETS_COOLDOWN_MINUTES: int = 60

    # App
    APP_NAME: str = "Office Repo"
    API_V1_PREFIX: str = "/api/v1"
    TENANT_RESOLVER_STRATEGY: str = "header"  # header | subdomain | jwt
    ENVIRONMENT: str = "development"

    # Cloudflare Turnstile — optional bot protection for the public enquiry form.
    # When set, the backend verifies the widget token via Cloudflare siteverify
    # and the frontend renders the widget (VITE_TURNSTILE_SITE_KEY). Leave blank
    # to disable enforcement (default for local/dev).
    TURNSTILE_SECRET_KEY: str = ""

    # Number of trusted reverse-proxy / CDN hops in front of the app. Used to
    # resolve the real client IP from X-Forwarded-For without trusting the
    # left-most (client-spoofable) entry: the client IP is taken this many hops
    # from the right of the chain. Replit serves the app behind one proxy, so the
    # default of 1 selects the right-most entry (added by trusted infra).
    TRUSTED_PROXY_HOPS: int = 1

    # Field-level encryption for enquiry PII (email/phone/message).
    # Comma-separated urlsafe-base64 Fernet keys; the FIRST is used to encrypt,
    # ALL are tried when decrypting (enables zero-downtime key rotation). When
    # blank, a key is derived deterministically from SESSION_SECRET/JWT_SECRET so
    # the feature works without provisioning a dedicated secret. Set a dedicated
    # key in production for cryptographic separation.
    ENQUIRY_ENCRYPTION_KEYS: str = ""

    # Privacy policy version stamped onto each consent record. Bump whenever the
    # published privacy policy materially changes so consent provenance is tracked.
    PRIVACY_POLICY_VERSION: str = "1.0"

    # Data retention window (days) for enquiry PII. Used to set retention_until on
    # new submissions to support retention-policy enforcement / right-to-erasure.
    ENQUIRY_RETENTION_DAYS: int = 365

    # CORS — comma-separated list of allowed origins for production.
    # Example: "https://app.officerepo.io,https://www.officerepo.io"
    # Ignored in development (wildcard is used instead).
    ALLOWED_ORIGINS: str = ""

    # Internal — set at startup; not read from environment
    _previous_secret_origin: datetime = None
    # True when _previous_secret_origin was set to startup time as a fallback
    # because neither the env var nor the DB had a value yet.
    _previous_secret_origin_is_fallback: bool = False

    # Internal — wall-clock time of the last successful in-process secret
    # rotation. Used to enforce ROTATE_SECRETS_COOLDOWN_MINUTES. Not read from
    # the environment; reset on every restart (in-memory single-instance state).
    _last_rotation_at: datetime = None

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

        if self.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS < 1:
            raise ValueError(
                "PREVIOUS_SECRET_CHECK_INTERVAL_HOURS must be a positive integer (>= 1). "
                f"Got: {self.PREVIOUS_SECRET_CHECK_INTERVAL_HOURS}"
            )

        if self.ROTATE_SECRETS_COOLDOWN_MINUTES < 0:
            raise ValueError(
                "ROTATE_SECRETS_COOLDOWN_MINUTES must be a non-negative integer (>= 0). "
                f"Got: {self.ROTATE_SECRETS_COOLDOWN_MINUTES}"
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
                    self._previous_secret_origin_is_fallback = False
                except ValueError:
                    logger.warning(
                        "PREVIOUS_SECRET_ISSUED_AT=%r could not be parsed as ISO-8601. "
                        "Falling back to application startup time as the grace-period origin.",
                        self.PREVIOUS_SECRET_ISSUED_AT,
                    )
                    self._previous_secret_origin = datetime.now(tz=timezone.utc)
                    self._previous_secret_origin_is_fallback = True
            else:
                # env var not set — defer the warning until after the DB lookup
                # (main.py will call apply_db_rotation_timestamp or emit the warning
                # if the DB also has no value).
                self._previous_secret_origin = datetime.now(tz=timezone.utc)
                self._previous_secret_origin_is_fallback = True

            # Warn if the grace period has already elapsed at startup
            if not self._previous_secret_origin_is_fallback:
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
        # (REPLIT_DOMAINS env var).  If that is also unavailable, raise an error
        # so the application refuses to start with an insecure CORS config.
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
                    raise ValueError(
                        "ALLOWED_ORIGINS must be set in production. "
                        "Provide a comma-separated list of explicit origin URLs "
                        "(e.g. 'https://app.example.com'). "
                        "The application cannot start with an empty ALLOWED_ORIGINS "
                        "in a non-development environment."
                    )
            else:
                origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
                if "*" in origins:
                    raise ValueError(
                        "ALLOWED_ORIGINS must not contain '*' in production. "
                        "Wildcards are only permitted in development. "
                        "Provide explicit origin URLs instead."
                    )

        return self

    def apply_db_rotation_timestamp(self, iso_value: str) -> bool:
        """
        Override the grace-period origin with a timestamp read from the DB.

        Called at startup by main.py when PREVIOUS_SECRET_ISSUED_AT is absent
        from the environment but a value is found in the platform_config table.

        Returns True if the value was successfully applied, False otherwise.
        """
        if not iso_value or not iso_value.strip():
            return False
        try:
            origin = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
            if origin.tzinfo is None:
                origin = origin.replace(tzinfo=timezone.utc)
            self._previous_secret_origin = origin
            self._previous_secret_origin_is_fallback = False

            elapsed_hours = (
                datetime.now(tz=timezone.utc) - origin
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
            return True
        except ValueError:
            logger.warning(
                "platform_config previous_secret_issued_at=%r could not be parsed "
                "as ISO-8601. Falling back to application startup time.",
                iso_value,
            )
            return False

    def previous_secret_grace_active(self) -> bool:
        """Return True if the previous-secret grace period is still in effect."""
        if not self._previous_secret_origin:
            return False
        elapsed_hours = (
            datetime.now(tz=timezone.utc) - self._previous_secret_origin
        ).total_seconds() / 3600
        return elapsed_hours < self.PREVIOUS_SECRET_GRACE_HOURS


settings = Settings()
