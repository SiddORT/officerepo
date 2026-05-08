from pydantic import BaseModel, field_validator, model_validator
from typing import Optional, List, Any
from datetime import datetime
import re

_UNSAFE_RE = re.compile(r"[<>\"'`;\\]|script|SELECT|INSERT|UPDATE|DELETE|DROP|--", re.IGNORECASE)


def _safe(v):
    if isinstance(v, str) and _UNSAFE_RE.search(v):
        raise ValueError("Field contains invalid or unsafe characters.")
    return v.strip() if isinstance(v, str) else v


# ── Nested sub-schemas ────────────────────────────────────────────────────────

class DomainConfigIn(BaseModel):
    subdomain: str
    custom_domain: Optional[str] = None

    @field_validator("subdomain")
    @classmethod
    def validate_subdomain(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$", v):
            raise ValueError("Subdomain must be lowercase letters, digits, or hyphens.")
        return v


class DbConfigIn(BaseModel):
    db_name: str
    db_host: str
    db_port: int = 5432
    db_username: str
    db_password: str

    @field_validator("db_port")
    @classmethod
    def validate_port(cls, v):
        if not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535.")
        return v

    @field_validator("db_name", "db_host", "db_username")
    @classmethod
    def no_unsafe(cls, v):
        return _safe(v)


class SubscriptionIn(BaseModel):
    plan_name: Optional[str] = "Starter"
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    user_limit: Optional[int] = 25
    storage_limit: Optional[int] = 1024


class ModulesIn(BaseModel):
    employee: bool = False
    hrms: bool = False
    assets: bool = False
    billing: bool = False
    workflow: bool = False
    reports: bool = False


class BrandingIn(BaseModel):
    primary_color: Optional[str] = "#6366f1"
    theme_mode: Optional[str] = "dark"

    @field_validator("theme_mode")
    @classmethod
    def validate_theme(cls, v):
        if v not in ("dark", "light"):
            raise ValueError("theme_mode must be 'dark' or 'light'.")
        return v


# ── Create Tenant (full, one-shot) ────────────────────────────────────────────

class TenantCreateRequest(BaseModel):
    tenant_name: str
    tenant_code: str
    company_email: str
    contact_number: Optional[str] = None
    company_website: Optional[str] = None
    timezone: Optional[str] = "UTC"
    region: Optional[str] = None

    domain: DomainConfigIn
    db_config: Optional[DbConfigIn] = None
    subscription: Optional[SubscriptionIn] = None
    modules: Optional[ModulesIn] = None
    branding: Optional[BrandingIn] = None

    @field_validator("tenant_name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Tenant name is required.")
        if len(v) > 255:
            raise ValueError("Tenant name must be at most 255 characters.")
        return _safe(v)

    @field_validator("tenant_code")
    @classmethod
    def validate_code(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$", v):
            raise ValueError(
                "Tenant code must be 3–50 lowercase letters, digits, or hyphens and cannot start/end with a hyphen."
            )
        return v

    @field_validator("company_email")
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Enter a valid email address.")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_phone(cls, v):
        if not v or not v.strip():
            return None
        v = v.strip()
        if not re.match(r"^\+?[0-9\s\-().]{7,25}$", v):
            raise ValueError("Enter a valid phone number.")
        return v

    @field_validator("company_website")
    @classmethod
    def validate_url(cls, v):
        if not v or not v.strip():
            return None
        v = v.strip()
        if not re.match(r"^(https?://)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(:\d+)?(/[^\s]*)?$", v):
            raise ValueError("Enter a valid URL.")
        return v


# ── Draft Create (step 0 — basic info only) ───────────────────────────────────

class TenantDraftCreateRequest(BaseModel):
    tenant_name: str
    tenant_code: str
    company_email: str
    contact_number: Optional[str] = None
    company_website: Optional[str] = None
    timezone: Optional[str] = "UTC"
    region: Optional[str] = None

    @field_validator("tenant_name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Tenant name is required.")
        if len(v) > 255:
            raise ValueError("Tenant name must be at most 255 characters.")
        return _safe(v)

    @field_validator("tenant_code")
    @classmethod
    def validate_code(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$", v):
            raise ValueError("Tenant code must be 3–50 lowercase letters, digits, or hyphens.")
        return v

    @field_validator("company_email")
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Enter a valid email address.")
        return v

    @field_validator("contact_number")
    @classmethod
    def validate_phone(cls, v):
        if not v or not v.strip():
            return None
        v = v.strip()
        if not re.match(r"^\+?[0-9\s\-().]{7,25}$", v):
            raise ValueError("Enter a valid phone number.")
        return v

    @field_validator("company_website")
    @classmethod
    def validate_url(cls, v):
        if not v or not v.strip():
            return None
        v = v.strip()
        if not re.match(r"^(https?://)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(:\d+)?(/[^\s]*)?$", v):
            raise ValueError("Enter a valid URL.")
        return v


# ── Step-save schemas ─────────────────────────────────────────────────────────

class DomainStepRequest(BaseModel):
    subdomain: str
    custom_domain: Optional[str] = None

    @field_validator("subdomain")
    @classmethod
    def validate_subdomain(cls, v):
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$", v):
            raise ValueError("Subdomain must be lowercase letters, digits, or hyphens.")
        return v


class DatabaseStepRequest(BaseModel):
    db_name: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = 5432
    db_username: Optional[str] = None
    db_password: Optional[str] = None

    @field_validator("db_port")
    @classmethod
    def validate_port(cls, v):
        if v is not None and not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535.")
        return v


class SubscriptionStepRequest(BaseModel):
    plan_name: Optional[str] = "Starter"
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    user_limit: Optional[int] = 25
    storage_limit: Optional[int] = 1024


class ModulesStepRequest(BaseModel):
    employee: bool = False
    hrms: bool = False
    assets: bool = False
    billing: bool = False
    workflow: bool = False
    reports: bool = False


# ── Update Tenant ─────────────────────────────────────────────────────────────

class TenantUpdateRequest(BaseModel):
    tenant_name: Optional[str] = None
    company_email: Optional[str] = None
    contact_number: Optional[str] = None
    company_website: Optional[str] = None
    timezone: Optional[str] = None
    region: Optional[str] = None

    @field_validator("tenant_name")
    @classmethod
    def validate_name(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Tenant name cannot be empty.")
        return _safe(v)

    @field_validator("company_email")
    @classmethod
    def validate_email(cls, v):
        if v is None:
            return v
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v):
            raise ValueError("Enter a valid email address.")
        return v


# ── Response schemas ──────────────────────────────────────────────────────────

class DomainResponse(BaseModel):
    id: int
    subdomain: Optional[str] = None
    custom_domain: Optional[str] = None
    is_primary: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DbConnectionResponse(BaseModel):
    id: int
    db_name: Optional[str] = None
    db_host: Optional[str] = None
    db_port: Optional[int] = None
    db_username: Optional[str] = None
    db_status: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: int
    plan_name: Optional[str] = None
    status: str
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    user_limit: Optional[int] = None
    storage_limit: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ModuleResponse(BaseModel):
    module: str
    is_enabled: bool

    class Config:
        from_attributes = True


class BrandingResponse(BaseModel):
    primary_color: Optional[str] = None
    theme_mode: Optional[str] = None
    logo_path: Optional[str] = None
    favicon_path: Optional[str] = None

    class Config:
        from_attributes = True


class ActivityLogResponse(BaseModel):
    id: int
    action: str
    performed_by: Optional[str] = None
    metadata: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CompletionBreakdown(BaseModel):
    basic_info: bool
    domain: bool
    database: bool
    subscription: bool
    modules: bool


class TenantListItem(BaseModel):
    id: int
    tenant_name: str
    tenant_code: str
    subdomain: Optional[str] = None
    plan_name: Optional[str] = None
    status: str
    profile_completion: int = 0
    completion_breakdown: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TenantDetailResponse(BaseModel):
    id: int
    tenant_name: str
    tenant_code: str
    company_email: Optional[str] = None
    contact_number: Optional[str] = None
    company_website: Optional[str] = None
    timezone: Optional[str] = None
    region: Optional[str] = None
    logo_path: Optional[str] = None
    status: str
    profile_completion: int = 0
    completion_breakdown: Optional[dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    domains: List[DomainResponse] = []
    db_connection: Optional[DbConnectionResponse] = None
    subscription: Optional[SubscriptionResponse] = None
    modules: List[ModuleResponse] = []
    branding: Optional[BrandingResponse] = None
    activity_logs: List[ActivityLogResponse] = []

    class Config:
        from_attributes = True
