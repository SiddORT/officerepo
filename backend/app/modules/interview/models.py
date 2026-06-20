"""Interview Management models — stored in the CLIENT database (ClientBase).

Tables:
  interview_pipelines       — reusable interview workflows
  interview_pipeline_stages — ordered rounds within a pipeline
  interviews                — actual scheduled interview instances
  interview_panels          — panel members assigned to an interview
  interview_feedback        — evaluator feedback per interview
  interview_scorecards      — per-criteria scores within feedback
  interview_activities      — audit trail / candidate timeline
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, Numeric, String, Text

from backend.app.database.client_db import ClientBase


def _uuid() -> str:
    return str(uuid.uuid4())


class InterviewPipeline(ClientBase):
    """Reusable interview workflow template."""
    __tablename__ = "interview_pipelines"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)

    pipeline_name    = Column(String(200), nullable=False)
    description      = Column(Text,        nullable=True)

    company_id       = Column(String(36),  nullable=True)
    company_name     = Column(String(200), nullable=True)
    department_id    = Column(String(36),  nullable=True)
    department_name  = Column(String(200), nullable=True)
    designation_id   = Column(String(36),  nullable=True)
    designation_name = Column(String(200), nullable=True)

    is_active        = Column(Boolean,  nullable=False, default=True)
    is_default       = Column(Boolean,  nullable=False, default=False)

    created_by       = Column(String(200), nullable=True)
    is_deleted       = Column(Boolean,  nullable=False, default=False)
    deleted_at       = Column(DateTime, nullable=True)
    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterviewPipelineStage(ClientBase):
    """One round within an interview pipeline."""
    __tablename__ = "interview_pipeline_stages"

    id               = Column(String(36), primary_key=True, default=_uuid)
    client_id        = Column(String(36), nullable=False, index=True)
    pipeline_id      = Column(String(36), nullable=False, index=True)

    stage_name       = Column(String(200), nullable=False)
    round_type       = Column(String(80),  nullable=True)   # HR Round / Technical etc.
    sequence         = Column(Integer,     nullable=False, default=1)
    is_mandatory     = Column(Boolean,     nullable=False, default=True)
    duration_minutes = Column(Integer,     nullable=True)
    instructions     = Column(Text,        nullable=True)
    is_active        = Column(Boolean,     nullable=False, default=True)

    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Interview(ClientBase):
    """Actual scheduled interview instance for a candidate."""
    __tablename__ = "interviews"

    id                  = Column(String(36),  primary_key=True, default=_uuid)
    client_id           = Column(String(36),  nullable=False, index=True)
    interview_number    = Column(String(40),  nullable=False, unique=True, index=True)

    # Candidate
    candidate_id        = Column(String(36),  nullable=False, index=True)
    candidate_name      = Column(String(200), nullable=True)

    # Job opening (optional)
    opening_id          = Column(String(36),  nullable=True, index=True)
    opening_title       = Column(String(200), nullable=True)

    # Pipeline link (optional)
    pipeline_id         = Column(String(36),  nullable=True, index=True)
    pipeline_name       = Column(String(200), nullable=True)
    pipeline_stage_id   = Column(String(36),  nullable=True)

    # Round details
    round_number        = Column(Integer,     nullable=False, default=1)
    round_name          = Column(String(200), nullable=True)
    round_type          = Column(String(80),  nullable=True)

    # Scheduling
    interview_date      = Column(String(10),  nullable=False)   # YYYY-MM-DD
    start_time          = Column(String(10),  nullable=True)    # HH:MM
    end_time            = Column(String(10),  nullable=True)    # HH:MM
    timezone            = Column(String(60),  nullable=True, default="Asia/Kolkata")
    duration_minutes    = Column(Integer,     nullable=True)

    # Mode / location
    mode                = Column(String(30),  nullable=True)
    location            = Column(String(300), nullable=True)
    meeting_url         = Column(String(500), nullable=True)
    instructions        = Column(Text,        nullable=True)

    # Outcome
    status              = Column(String(30),  nullable=False, default="Scheduled", index=True)
    result              = Column(String(30),  nullable=False, default="Pending")

    # Reschedule tracking
    reschedule_count    = Column(Integer,     nullable=False, default=0)
    reschedule_reason   = Column(Text,        nullable=True)
    original_date       = Column(String(10),  nullable=True)

    is_deleted          = Column(Boolean,  nullable=False, default=False)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(String(200), nullable=True)
    created_at          = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at          = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterviewPanel(ClientBase):
    """Panel member assigned to an interview."""
    __tablename__ = "interview_panels"

    id             = Column(String(36),  primary_key=True, default=_uuid)
    client_id      = Column(String(36),  nullable=False, index=True)
    interview_id   = Column(String(36),  nullable=False, index=True)

    employee_id    = Column(String(36),  nullable=True)
    employee_name  = Column(String(200), nullable=False)
    employee_email = Column(String(200), nullable=True)
    role           = Column(String(60),  nullable=False, default="Panel Member")
    weightage      = Column(Integer,     nullable=True)   # 0–100
    is_confirmed   = Column(Boolean,     nullable=False, default=False)

    created_at     = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at     = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterviewFeedback(ClientBase):
    """Evaluator feedback for a completed interview."""
    __tablename__ = "interview_feedback"

    id               = Column(String(36),  primary_key=True, default=_uuid)
    client_id        = Column(String(36),  nullable=False, index=True)
    interview_id     = Column(String(36),  nullable=False, index=True)
    candidate_id     = Column(String(36),  nullable=False, index=True)

    evaluator_id     = Column(String(36),  nullable=True)
    evaluator_name   = Column(String(200), nullable=True)

    recommendation   = Column(String(30),  nullable=True)   # Strong Hire / Hire / Hold / Reject
    overall_score    = Column(Numeric(4, 1), nullable=True)  # 1.0–10.0

    strengths        = Column(Text,        nullable=True)
    weaknesses       = Column(Text,        nullable=True)
    comments         = Column(Text,        nullable=True)
    is_private       = Column(Boolean,     nullable=False, default=False)

    created_at       = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at       = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class InterviewScorecard(ClientBase):
    """Per-criteria score within a feedback record."""
    __tablename__ = "interview_scorecards"

    id           = Column(String(36), primary_key=True, default=_uuid)
    client_id    = Column(String(36), nullable=False, index=True)
    feedback_id  = Column(String(36), nullable=False, index=True)
    interview_id = Column(String(36), nullable=False, index=True)

    criteria     = Column(String(100), nullable=False)
    score        = Column(Integer,     nullable=True)   # 1–5
    notes        = Column(Text,        nullable=True)

    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)


class InterviewActivity(ClientBase):
    """Audit trail and candidate timeline for interview events."""
    __tablename__ = "interview_activities"

    id           = Column(String(36),  primary_key=True, default=_uuid)
    client_id    = Column(String(36),  nullable=False, index=True)
    interview_id = Column(String(36),  nullable=True, index=True)
    candidate_id = Column(String(36),  nullable=True, index=True)

    action       = Column(String(100), nullable=False)
    actor        = Column(String(200), nullable=True)
    old_value    = Column(Text,        nullable=True)
    new_value    = Column(Text,        nullable=True)
    notes        = Column(Text,        nullable=True)

    created_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
