"""Industry Master — platform-level reference table (platform DB).

Seeded at startup with standard industries + sub-industries.
Accessible to any portal user via GET /portal/{subdomain}/org/meta/industries.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String

from backend.app.database.platform import Base


class IndustryMaster(Base):
    __tablename__ = "industry_master"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    name            = Column(String(200), nullable=False, unique=True)
    sub_industries  = Column(JSON, nullable=True)   # list[str]
    sort_order      = Column(Integer, default=0, nullable=False)
    is_active       = Column(Boolean, default=True, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow, nullable=False)
