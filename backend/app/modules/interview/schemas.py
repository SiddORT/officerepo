"""Pydantic schemas for the Interview Management module."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class InterviewCreate(BaseModel):
    candidate_id:     str
    opening_id:       Optional[str] = None
    round_number:     int = 1
    round_type:       Optional[str] = None
    round_name:       Optional[str] = None
    interview_date:   date
    interview_time:   Optional[str] = None
    duration_minutes: Optional[int] = None
    mode:             Optional[str] = None
    location:         Optional[str] = None
    meeting_link:     Optional[str] = None
    interviewers:     Optional[str] = None
    notes:            Optional[str] = None


class InterviewUpdate(BaseModel):
    round_number:     Optional[int]  = None
    round_type:       Optional[str]  = None
    round_name:       Optional[str]  = None
    interview_date:   Optional[date] = None
    interview_time:   Optional[str]  = None
    duration_minutes: Optional[int]  = None
    mode:             Optional[str]  = None
    location:         Optional[str]  = None
    meeting_link:     Optional[str]  = None
    interviewers:     Optional[str]  = None
    notes:            Optional[str]  = None


class InterviewComplete(BaseModel):
    result:          str
    feedback_rating: Optional[str] = None
    feedback:        Optional[str] = None
    notes:           Optional[str] = None


class InterviewCancel(BaseModel):
    notes: Optional[str] = None
