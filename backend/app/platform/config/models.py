from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, DateTime

from backend.app.database.platform import Base


class PlatformConfig(Base):
    """
    Generic key/value store for platform-level configuration.

    Keys are short ASCII identifiers (e.g. "previous_secret_issued_at").
    Values are stored as TEXT so any scalar can be persisted without schema
    changes.
    """

    __tablename__ = "platform_config"

    key = Column(String(255), primary_key=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(tz=timezone.utc),
        onupdate=lambda: datetime.now(tz=timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<PlatformConfig key={self.key!r} value={self.value!r}>"
