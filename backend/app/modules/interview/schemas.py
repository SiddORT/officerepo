"""Pydantic schemas for the Interview Management module."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel


# ── Pipeline ──────────────────────────────────────────────────────────────────

class StageIn(BaseModel):
    stage_name:       str
    round_type:       Optional[str] = None
    sequence:         int = 1
    is_mandatory:     bool = True
    duration_minutes: Optional[int] = None
    instructions:     Optional[str] = None


class PipelineCreate(BaseModel):
    pipeline_name:    str
    description:      Optional[str] = None
    company_id:       Optional[str] = None
    department_id:    Optional[str] = None
    designation_id:   Optional[str] = None
    is_default:       bool = False
    stages:           List[StageIn] = []


class PipelineUpdate(BaseModel):
    pipeline_name:    Optional[str] = None
    description:      Optional[str] = None
    company_id:       Optional[str] = None
    department_id:    Optional[str] = None
    designation_id:   Optional[str] = None
    is_active:        Optional[bool] = None
    is_default:       Optional[bool] = None


class StageCreate(BaseModel):
    stage_name:       str
    round_type:       Optional[str] = None
    sequence:         int = 1
    is_mandatory:     bool = True
    duration_minutes: Optional[int] = None
    instructions:     Optional[str] = None


class StageUpdate(BaseModel):
    stage_name:       Optional[str] = None
    round_type:       Optional[str] = None
    sequence:         Optional[int] = None
    is_mandatory:     Optional[bool] = None
    duration_minutes: Optional[int] = None
    instructions:     Optional[str] = None
    is_active:        Optional[bool] = None


class StagesReorder(BaseModel):
    stage_ids: List[str]   # in desired order


# ── Interview ─────────────────────────────────────────────────────────────────

class InterviewCreate(BaseModel):
    candidate_id:     str
    opening_id:       Optional[str] = None
    pipeline_id:      Optional[str] = None
    pipeline_stage_id: Optional[str] = None
    round_number:     int = 1
    round_name:       Optional[str] = None
    round_type:       Optional[str] = None
    interview_date:   str    # YYYY-MM-DD
    start_time:       Optional[str] = None
    end_time:         Optional[str] = None
    timezone:         Optional[str] = "Asia/Kolkata"
    duration_minutes: Optional[int] = None
    mode:             Optional[str] = None
    location:         Optional[str] = None
    meeting_url:      Optional[str] = None
    instructions:     Optional[str] = None


class InterviewUpdate(BaseModel):
    round_number:     Optional[int]  = None
    round_name:       Optional[str]  = None
    round_type:       Optional[str]  = None
    interview_date:   Optional[str]  = None
    start_time:       Optional[str]  = None
    end_time:         Optional[str]  = None
    timezone:         Optional[str]  = None
    duration_minutes: Optional[int]  = None
    mode:             Optional[str]  = None
    location:         Optional[str]  = None
    meeting_url:      Optional[str]  = None
    instructions:     Optional[str]  = None


class InterviewReschedule(BaseModel):
    interview_date:   str
    start_time:       Optional[str] = None
    end_time:         Optional[str] = None
    reschedule_reason: Optional[str] = None
    mode:             Optional[str] = None
    location:         Optional[str] = None
    meeting_url:      Optional[str] = None


class InterviewComplete(BaseModel):
    result:    str
    notes:     Optional[str] = None


class InterviewCancel(BaseModel):
    notes: Optional[str] = None


# ── Panel ─────────────────────────────────────────────────────────────────────

class PanelMemberAdd(BaseModel):
    employee_id:    Optional[str] = None
    employee_name:  str
    employee_email: Optional[str] = None
    role:           str = "Panel Member"
    weightage:      Optional[int] = None


# ── Feedback ──────────────────────────────────────────────────────────────────

class ScorecardIn(BaseModel):
    criteria: str
    score:    Optional[int] = None   # 1–5
    notes:    Optional[str] = None


class FeedbackCreate(BaseModel):
    recommendation: Optional[str] = None
    overall_score:  Optional[float] = None
    strengths:      Optional[str] = None
    weaknesses:     Optional[str] = None
    comments:       Optional[str] = None
    is_private:     bool = False
    scorecards:     List[ScorecardIn] = []


class FeedbackUpdate(BaseModel):
    recommendation: Optional[str]   = None
    overall_score:  Optional[float] = None
    strengths:      Optional[str]   = None
    weaknesses:     Optional[str]   = None
    comments:       Optional[str]   = None
    is_private:     Optional[bool]  = None
    scorecards:     Optional[List[ScorecardIn]] = None


# ── Selection ─────────────────────────────────────────────────────────────────

class SelectionDecision(BaseModel):
    remarks:    Optional[str] = None
    opening_id: Optional[str] = None


class RejectionDecision(BaseModel):
    remarks:    Optional[str] = None
    opening_id: Optional[str] = None
