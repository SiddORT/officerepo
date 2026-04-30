import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Platform (master) database
    PLATFORM_DB_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/office_repo_platform")

    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.getenv("SESSION_SECRET", "supersecretjwtkey"))
    REFRESH_SECRET: str = os.getenv("REFRESH_SECRET", "supersecretrefreshkey")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    APP_NAME: str = "Office Repo"
    API_V1_PREFIX: str = "/api/v1"
    TENANT_RESOLVER_STRATEGY: str = os.getenv("TENANT_RESOLVER_STRATEGY", "header")  # header | subdomain | jwt

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
