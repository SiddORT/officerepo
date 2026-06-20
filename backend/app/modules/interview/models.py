"""Interview Management models — stored in the CLIENT database (ClientBase)."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text, Time

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class InterviewRound(ClientBase):
    """One scheduled interview round for a candidate."""
    __tablename__ = "interview_rounds"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    interview_number    = Column(String(40),  nullable=False, unique=True, index=True)

    # Candidate link
    candidate_id        = Column(String(36),  nullable=False, index=True)
    candidate_name      = Column(String(200), nullable=True)   # denormalized

    # Opening link (optional)
    opening_id          = Column(String(36),  nullable=True, index=True)
    opening_title       = Column(String(200), nullable=True)   # denormalized

    # Round details
    round_number        = Column(Integer,     nullable=False, default=1)
    round_type          = Column(String(80),  nullable=True)   # HR Round / Technical Round …
    round_name          = Column(String(200), nullable=True)   # free text label

    # Scheduling
    interview_date      = Column(Date,        nullable=False)
    interview_time      = Column(String(10),  nullable=True)   # HH:MM stored as string
    duration_minutes    = Column(Integer,     nullable=True)
    mode                = Column(String(30),  nullable=True)   # In-person / Video Call / Phone

    # Location / link
    location            = Column(String(300), nullable=True)
    meeting_link        = Column(String(500), nullable=True)

    # Interviewers (comma-separated names or "Name <email>" entries)
    interviewers        = Column(Text, nullable=True)

    # Outcome
    status              = Column(String(30),  nullable=False, default="Scheduled", index=True)
    result              = Column(String(30),  nullable=False, default="Pending")
    feedback_rating     = Column(String(30),  nullable=True)
    feedback            = Column(Text,        nullable=True)
    notes               = Column(Text,        nullable=True)

    is_deleted          = Column(Boolean,  nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(String(200), nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
