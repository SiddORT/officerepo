"""
SQLAlchemy model for per-superadmin general preferences.

One row per admin (unique constraint on admin_id). Created lazily on
first GET — no row means defaults apply.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from backend.app.database.platform import Base


class SuperAdminPreferences(Base):
    __tablename__ = "superadmin_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    admin_id = Column(
        Integer,
        ForeignKey("superadmins.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    theme = Column(String(20), nullable=False, default="system")
    language = Column(String(10), nullable=False, default="en")
    timezone = Column(String(100), nullable=False, default="UTC")
    date_format = Column(String(20), nullable=False, default="DD/MM/YYYY")
    time_format = Column(String(5), nullable=False, default="12h")
    week_start_day = Column(String(10), nullable=False, default="monday")
    default_landing_page = Column(String(100), nullable=False, default="/dashboard")
    table_page_size = Column(Integer, nullable=False, default=25)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
