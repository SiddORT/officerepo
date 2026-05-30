"""
Persistence model for CORS-rejected origins.

Browser requests whose ``Origin`` is blocked by the CORS policy are recorded
here (one aggregated row per offending origin) so a superadmin can diagnose a
misconfigured ``ALLOWED_ORIGINS`` entry or a typo'd subdomain from the admin
panel instead of having to read raw server logs.

The stored ``origin`` is the log-safe (truncated) value produced by
:func:`app.core.cors.mask_origin`; the Origin header is attacker-controlled, so
it is never persisted verbatim beyond the truncation guard.
"""
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime

from backend.app.database.platform import Base


class CorsRejection(Base):
    __tablename__ = "cors_rejections"

    id = Column(Integer, primary_key=True, index=True)

    # Masked/truncated offending Origin — unique so we aggregate per origin.
    origin = Column(String(255), nullable=False, unique=True, index=True)

    # How many times this origin has been blocked since first seen.
    hit_count = Column(Integer, nullable=False, default=1)

    # Sample request context from the most recent rejection.
    last_method = Column(String(10), nullable=True)
    last_path = Column(String(512), nullable=True)

    first_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
