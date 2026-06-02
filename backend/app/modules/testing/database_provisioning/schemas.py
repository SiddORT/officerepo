import re
from pydantic import BaseModel, Field, field_validator


class CreateDatabaseRequest(BaseModel):
    database_name: str = Field(..., min_length=3, max_length=63)

    @field_validator("database_name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        if not re.fullmatch(r"[a-z][a-z0-9_]*", v):
            raise ValueError(
                "Database name must be lowercase, start with a letter, "
                "and contain only letters, numbers, and underscores."
            )
        return v


class DatabaseActionResponse(BaseModel):
    success: bool
    database_name: str
    message: str


class ListDatabasesResponse(BaseModel):
    databases: list[str]
