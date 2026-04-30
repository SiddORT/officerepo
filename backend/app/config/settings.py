import secrets
import logging
from pydantic import model_validator
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

_SENTINEL = "__unset__"


class Settings(BaseSettings):
    # Platform (master) database
    PLATFORM_DB_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/office_repo_platform"

    # JWT — defaults use a sentinel so the validator can detect missing values
    JWT_SECRET: str = _SENTINEL
    REFRESH_SECRET: str = _SENTINEL
    SESSION_SECRET: str = _SENTINEL  # legacy alias for JWT_SECRET
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Office Repo"
    API_V1_PREFIX: str = "/api/v1"
    TENANT_RESOLVER_STRATEGY: str = "header"  # header | subdomain | jwt
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        extra = "allow"

    @model_validator(mode="after")
    def _resolve_and_validate_secrets(self) -> "Settings":
        is_production = self.ENVIRONMENT.lower() == "production"

        # JWT_SECRET: accept SESSION_SECRET as legacy alias
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

        # REFRESH_SECRET
        if self.REFRESH_SECRET == _SENTINEL:
            if is_production:
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

        return self


settings = Settings()
