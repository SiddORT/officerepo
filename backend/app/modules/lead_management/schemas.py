"""
Pydantic request/response schemas for the Lead Management module.

Request models sanitize + validate at the boundary (trim, collapse spaces, strip
tags, format checks, controlled vocabularies). Response models are plain DTOs the
service layer builds (PII is decrypted only into responses, never logged).
"""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from backend.app.modules.lead_management import constants as c
from backend.app.modules.lead_management import validators as v


# ── Leads ────────────────────────────────────────────────────────────────────
class LeadCreateRequest(BaseModel):
    company_name: str = Field(..., max_length=150)
    contact_name: str = Field(..., max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    designation: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=120)
    country: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    expected_user_count: Optional[int] = Field(None, ge=0, le=10_000_000)
    lead_source: str = Field(default="Manual Entry")
    lead_owner_id: Optional[int] = None
    current_stage: Optional[str] = Field(default=c.STAGE_NEW)
    expected_revenue: Optional[float] = Field(None, ge=0)
    expected_go_live_date: Optional[date] = None
    interested_modules: Optional[str] = Field(None, max_length=1000)

    @field_validator("company_name")
    @classmethod
    def _company(cls, val):
        return v.validate_length(val, field="company_name", min_len=2, max_len=150, required=True)

    @field_validator("contact_name")
    @classmethod
    def _contact(cls, val):
        return v.validate_length(val, field="contact_name", min_len=2, max_len=120, required=True)

    @field_validator("email")
    @classmethod
    def _email(cls, val):
        return v.validate_email(val, field="email")

    @field_validator("phone")
    @classmethod
    def _phone(cls, val):
        return v.validate_phone(val, field="phone")

    @field_validator("country_code")
    @classmethod
    def _country_code(cls, val):
        return v.validate_country_code(val, field="country_code")

    @field_validator("designation", "industry", "country", "company_size", "website", "interested_modules")
    @classmethod
    def _opt_text(cls, val):
        return v.clean_text(val)

    @field_validator("lead_source")
    @classmethod
    def _source(cls, val):
        return v.validate_choice(val, c.LEAD_SOURCES, field="lead_source", required=True)

    @field_validator("current_stage")
    @classmethod
    def _stage(cls, val):
        if val is None:
            return c.STAGE_NEW
        return v.validate_choice(val, c.LEAD_STAGES, field="current_stage", required=True)


class LeadUpdateRequest(BaseModel):
    company_name: Optional[str] = Field(None, max_length=150)
    contact_name: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    designation: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=120)
    country: Optional[str] = Field(None, max_length=100)
    company_size: Optional[str] = Field(None, max_length=50)
    expected_user_count: Optional[int] = Field(None, ge=0, le=10_000_000)
    lead_source: Optional[str] = None
    lead_owner_id: Optional[int] = None
    expected_revenue: Optional[float] = Field(None, ge=0)
    expected_go_live_date: Optional[date] = None
    interested_modules: Optional[str] = Field(None, max_length=1000)

    @field_validator("company_name")
    @classmethod
    def _company(cls, val):
        return v.validate_length(val, field="company_name", min_len=2, max_len=150)

    @field_validator("contact_name")
    @classmethod
    def _contact(cls, val):
        return v.validate_length(val, field="contact_name", min_len=2, max_len=120)

    @field_validator("email")
    @classmethod
    def _email(cls, val):
        return v.validate_email(val, field="email")

    @field_validator("phone")
    @classmethod
    def _phone(cls, val):
        return v.validate_phone(val, field="phone")

    @field_validator("country_code")
    @classmethod
    def _country_code(cls, val):
        return v.validate_country_code(val, field="country_code")

    @field_validator("designation", "industry", "country", "company_size", "website", "interested_modules")
    @classmethod
    def _opt_text(cls, val):
        return v.clean_text(val)

    @field_validator("lead_source")
    @classmethod
    def _source(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.LEAD_SOURCES, field="lead_source")


class ScoreLabelRequest(BaseModel):
    """Manual Hot/Warm/Cold override. ``label=None`` clears the override."""
    label: Optional[str] = None

    @field_validator("label")
    @classmethod
    def _label(cls, val):
        if val is None:
            return None
        cleaned = v.clean_text(val, collapse_spaces=True)
        if not cleaned:
            return None
        allowed = [c.SCORE_LABEL_HOT, c.SCORE_LABEL_WARM, c.SCORE_LABEL_COLD]
        return v.validate_choice(cleaned, allowed, field="label", required=True)


class StageUpdateRequest(BaseModel):
    stage: str

    @field_validator("stage")
    @classmethod
    def _stage(cls, val):
        return v.validate_choice(val, c.LEAD_STAGES, field="stage", required=True)


class LeadLostRequest(BaseModel):
    loss_reason: str
    competitor_name: Optional[str] = Field(None, max_length=150)
    remarks: Optional[str] = Field(None, max_length=2000)

    @field_validator("loss_reason")
    @classmethod
    def _reason(cls, val):
        return v.validate_choice(val, c.LOSS_REASONS, field="loss_reason", required=True)

    @field_validator("competitor_name", "remarks")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)


# ── Activities ───────────────────────────────────────────────────────────────
class ActivityCreateRequest(BaseModel):
    activity_type: str
    activity_date: Optional[datetime] = None
    remarks: Optional[str] = Field(None, max_length=2000)
    next_action: Optional[str] = Field(None, max_length=2000)
    next_action_date: Optional[datetime] = None

    @field_validator("activity_type")
    @classmethod
    def _type(cls, val):
        return v.validate_choice(val, c.ACTIVITY_TYPES, field="activity_type", required=True)

    @field_validator("remarks", "next_action")
    @classmethod
    def _remarks(cls, val):
        return v.clean_text(val, collapse_spaces=False)


class ActivityUpdateRequest(BaseModel):
    activity_type: Optional[str] = None
    activity_date: Optional[datetime] = None
    remarks: Optional[str] = Field(None, max_length=2000)
    next_action: Optional[str] = Field(None, max_length=2000)
    next_action_date: Optional[datetime] = None

    @field_validator("activity_type")
    @classmethod
    def _type(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.ACTIVITY_TYPES, field="activity_type")

    @field_validator("remarks", "next_action")
    @classmethod
    def _remarks(cls, val):
        return v.clean_text(val, collapse_spaces=False)


# ── Demos ────────────────────────────────────────────────────────────────────
class DemoCreateRequest(BaseModel):
    demo_date: datetime
    demo_type: Optional[str] = None
    conducted_by: Optional[str] = Field(None, max_length=120)
    status: Optional[str] = Field(default=c.DEMO_STATUS_SCHEDULED)
    feedback: Optional[str] = Field(None, max_length=2000)
    interested_modules: Optional[str] = Field(None, max_length=1000)
    expected_users: Optional[int] = Field(None, ge=0, le=10_000_000)
    next_steps: Optional[str] = Field(None, max_length=2000)

    @field_validator("demo_type")
    @classmethod
    def _type(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.DEMO_TYPES, field="demo_type")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return c.DEMO_STATUS_SCHEDULED
        return v.validate_choice(val, c.DEMO_STATUSES, field="status")

    @field_validator("conducted_by", "feedback", "interested_modules", "next_steps")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val, collapse_spaces=False)


class DemoUpdateRequest(BaseModel):
    demo_date: Optional[datetime] = None
    demo_type: Optional[str] = None
    conducted_by: Optional[str] = Field(None, max_length=120)
    status: Optional[str] = None
    feedback: Optional[str] = Field(None, max_length=2000)
    interested_modules: Optional[str] = Field(None, max_length=1000)
    expected_users: Optional[int] = Field(None, ge=0, le=10_000_000)
    next_steps: Optional[str] = Field(None, max_length=2000)

    @field_validator("demo_type")
    @classmethod
    def _type(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.DEMO_TYPES, field="demo_type")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.DEMO_STATUSES, field="status")

    @field_validator("conducted_by", "feedback", "interested_modules", "next_steps")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val, collapse_spaces=False)


# ── Follow-ups ───────────────────────────────────────────────────────────────
class FollowupCreateRequest(BaseModel):
    followup_date: datetime
    followup_type: Optional[str] = None
    priority: Optional[str] = Field(default="Medium")
    remarks: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = Field(default=c.FOLLOWUP_STATUS_PENDING)

    @field_validator("followup_type")
    @classmethod
    def _type(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.FOLLOWUP_TYPES, field="followup_type")

    @field_validator("priority")
    @classmethod
    def _priority(cls, val):
        if val is None:
            return "Medium"
        return v.validate_choice(val, c.FOLLOWUP_PRIORITIES, field="priority")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return c.FOLLOWUP_STATUS_PENDING
        return v.validate_choice(val, c.FOLLOWUP_STATUSES, field="status")

    @field_validator("remarks")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val, collapse_spaces=False)


class FollowupUpdateRequest(BaseModel):
    followup_date: Optional[datetime] = None
    followup_type: Optional[str] = None
    priority: Optional[str] = None
    remarks: Optional[str] = Field(None, max_length=2000)
    status: Optional[str] = None

    @field_validator("followup_type")
    @classmethod
    def _type(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.FOLLOWUP_TYPES, field="followup_type")

    @field_validator("priority")
    @classmethod
    def _priority(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.FOLLOWUP_PRIORITIES, field="priority")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.FOLLOWUP_STATUSES, field="status")

    @field_validator("remarks")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val, collapse_spaces=False)


# ── Notes ────────────────────────────────────────────────────────────────────
class NoteCreateRequest(BaseModel):
    note: str = Field(..., max_length=5000)

    @field_validator("note")
    @classmethod
    def _note(cls, val):
        return v.validate_length(val, field="note", min_len=1, max_len=5000, required=True, collapse_spaces=False)


# ── Proposals ────────────────────────────────────────────────────────────────
class ProposalCreateRequest(BaseModel):
    proposal_date: Optional[datetime] = None
    quoted_amount: Optional[float] = Field(None, ge=0)
    modules_included: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = Field(default=c.PROPOSAL_STATUS_DRAFT)

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return c.PROPOSAL_STATUS_DRAFT
        return v.validate_choice(val, c.PROPOSAL_STATUSES, field="status")

    @field_validator("modules_included")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)


class ProposalUpdateRequest(BaseModel):
    proposal_date: Optional[datetime] = None
    quoted_amount: Optional[float] = Field(None, ge=0)
    modules_included: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.PROPOSAL_STATUSES, field="status")

    @field_validator("modules_included")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)


# ── Negotiations ─────────────────────────────────────────────────────────────
class NegotiationCreateRequest(BaseModel):
    discussion_date: Optional[datetime] = None
    discussion_notes: Optional[str] = Field(None, max_length=2000)
    expected_closure_date: Optional[date] = None
    status: Optional[str] = Field(default="Ongoing")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return "Ongoing"
        return v.validate_choice(val, c.NEGOTIATION_STATUSES, field="status")

    @field_validator("discussion_notes")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val, collapse_spaces=False)


# ── Conversion ───────────────────────────────────────────────────────────────
class ConvertEnquiryRequest(BaseModel):
    lead_source: Optional[str] = Field(default="Website")
    lead_owner_id: Optional[int] = None

    @field_validator("lead_source")
    @classmethod
    def _source(cls, val):
        if val is None:
            return "Website"
        return v.validate_choice(val, c.LEAD_SOURCES, field="lead_source")


class ConvertClientRequest(BaseModel):
    plan_id: Optional[int] = None
    slug: Optional[str] = Field(None, max_length=100)

    @field_validator("slug")
    @classmethod
    def _slug(cls, val):
        return v.clean_text(val)


# ── Spokespersons (additional points of contact) ─────────────────────────────
class SpokespersonCreateRequest(BaseModel):
    name: str = Field(..., max_length=120)
    designation: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    is_primary: Optional[bool] = False

    @field_validator("name")
    @classmethod
    def _name(cls, val):
        return v.validate_length(val, field="name", min_len=2, max_len=120, required=True)

    @field_validator("designation")
    @classmethod
    def _designation(cls, val):
        return v.clean_text(val)

    @field_validator("email")
    @classmethod
    def _email(cls, val):
        return v.validate_email(val, field="email")

    @field_validator("phone")
    @classmethod
    def _phone(cls, val):
        return v.validate_phone(val, field="phone")

    @field_validator("country_code")
    @classmethod
    def _country_code(cls, val):
        return v.validate_country_code(val, field="country_code")


class SpokespersonUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    designation: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    is_primary: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def _name(cls, val):
        return v.validate_length(val, field="name", min_len=2, max_len=120)

    @field_validator("designation")
    @classmethod
    def _designation(cls, val):
        return v.clean_text(val)

    @field_validator("email")
    @classmethod
    def _email(cls, val):
        return v.validate_email(val, field="email")

    @field_validator("phone")
    @classmethod
    def _phone(cls, val):
        return v.validate_phone(val, field="phone")

    @field_validator("country_code")
    @classmethod
    def _country_code(cls, val):
        return v.validate_country_code(val, field="country_code")
