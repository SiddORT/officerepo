from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr


# ── General ───────────────────────────────────────────────────────────────────

class GeneralSettingsUpdate(BaseModel):
    client_name:        Optional[str] = None
    display_name:       Optional[str] = None
    default_company:    Optional[str] = None
    default_language:   Optional[str] = None
    date_format:        Optional[str] = None
    time_format:        Optional[str] = None
    fiscal_year_start:  Optional[int] = None
    week_start_day:     Optional[str] = None

class GeneralSettingsOut(BaseModel):
    id:                 str
    client_name:        Optional[str]
    display_name:       Optional[str]
    default_company:    Optional[str]
    default_language:   Optional[str]
    date_format:        Optional[str]
    time_format:        Optional[str]
    fiscal_year_start:  Optional[int]
    week_start_day:     Optional[str]
    updated_at:         Optional[datetime]

    class Config:
        from_attributes = True


# ── Branding ──────────────────────────────────────────────────────────────────

class BrandingUpdate(BaseModel):
    logo_url:           Optional[str] = None
    favicon_url:        Optional[str] = None
    seal_url:           Optional[str] = None
    signature_url:      Optional[str] = None
    signatory_name:     Optional[str] = None
    designation:        Optional[str] = None
    website:            Optional[str] = None
    support_email:      Optional[str] = None
    phone:              Optional[str] = None
    registered_address: Optional[str] = None
    corporate_address:  Optional[str] = None

class BrandingOut(BaseModel):
    id:                 str
    logo_url:           Optional[str]
    favicon_url:        Optional[str]
    seal_url:           Optional[str]
    signature_url:      Optional[str]
    signatory_name:     Optional[str]
    designation:        Optional[str]
    website:            Optional[str]
    support_email:      Optional[str]
    phone:              Optional[str]
    registered_address: Optional[str]
    corporate_address:  Optional[str]
    updated_at:         Optional[datetime]

    class Config:
        from_attributes = True


# ── Localization ──────────────────────────────────────────────────────────────

class LocalizationUpdate(BaseModel):
    currency_code:     Optional[str] = None
    currency_symbol:   Optional[str] = None
    currency_position: Optional[str] = None
    decimal_precision: Optional[int] = None
    timezone:          Optional[str] = None
    country:           Optional[str] = None
    language:          Optional[str] = None
    date_format:       Optional[str] = None
    time_format:       Optional[str] = None
    number_format:     Optional[str] = None

class LocalizationOut(BaseModel):
    id:                str
    currency_code:     Optional[str]
    currency_symbol:   Optional[str]
    currency_position: Optional[str]
    decimal_precision: Optional[int]
    timezone:          Optional[str]
    country:           Optional[str]
    language:          Optional[str]
    date_format:       Optional[str]
    time_format:       Optional[str]
    number_format:     Optional[str]
    updated_at:        Optional[datetime]

    class Config:
        from_attributes = True


# ── Notification Channels ─────────────────────────────────────────────────────

class NotificationChannelUpdate(BaseModel):
    is_enabled: bool

class NotificationChannelOut(BaseModel):
    id:         str
    channel:    str
    is_enabled: bool
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Credentials ───────────────────────────────────────────────────────────────

class CredentialConfigUpdate(BaseModel):
    config: Dict[str, Any]

class CredentialOut(BaseModel):
    id:              str
    credential_type: str
    is_configured:   bool
    updated_at:      Optional[datetime]

    class Config:
        from_attributes = True


# ── Common Masters ────────────────────────────────────────────────────────────

class CommonMasterCreate(BaseModel):
    code:          str
    label:         str
    sort_order:    Optional[int] = 0
    is_active:     Optional[bool] = True
    metadata_json: Optional[Dict[str, Any]] = None

class CommonMasterUpdate(BaseModel):
    label:         Optional[str] = None
    sort_order:    Optional[int] = None
    is_active:     Optional[bool] = None
    metadata_json: Optional[Dict[str, Any]] = None

class CommonMasterOut(BaseModel):
    id:            str
    master_type:   str
    code:          str
    label:         str
    sort_order:    int
    is_active:     bool
    metadata_json: Optional[Dict[str, Any]]
    updated_at:    Optional[datetime]

    class Config:
        from_attributes = True
