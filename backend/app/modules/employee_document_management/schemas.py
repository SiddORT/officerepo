"""Pydantic schemas for Employee Document Management."""
from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class DocTypeCreate(BaseModel):
    code: str
    name: str
    category: str
    expiry_tracking: bool = False
    verification_required: bool = False
    mandatory_onboarding: bool = False


class DocTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    expiry_tracking: Optional[bool] = None
    verification_required: Optional[bool] = None
    mandatory_onboarding: Optional[bool] = None
    is_active: Optional[bool] = None


class DocumentCreate(BaseModel):
    employee_id: str
    document_type_id: str
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    remarks: Optional[str] = None


class DocumentUpdate(BaseModel):
    document_number: Optional[str] = None
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    issuing_authority: Optional[str] = None
    remarks: Optional[str] = None


class VerifyDocument(BaseModel):
    notes: Optional[str] = None


class RejectDocument(BaseModel):
    rejection_reason: str


class ReplaceFile(BaseModel):
    change_notes: Optional[str] = None
