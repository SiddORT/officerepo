"""
Pydantic request/response schemas for the Client Management module.

Request models sanitize + validate at the boundary (trim, collapse spaces, strip
tags, format checks, controlled vocabularies). Response DTOs are built by the
service layer (PII is decrypted only into responses, never logged).
"""
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from backend.app.modules.client_management import constants as c
from backend.app.modules.client_management import validators as v


# ── Document Types (master) ──────────────────────────────────────────────────
class DocTypeCreateRequest(BaseModel):
    name: str = Field(..., max_length=100)
    category: str = Field(default=c.DOC_CATEGORY_GENERAL)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = True
    sort_order: Optional[int] = Field(0, ge=0)

    @field_validator("name")
    @classmethod
    def _name(cls, val):
        return v.validate_length(val.strip(), field="name", min_len=2, max_len=100, required=True)

    @field_validator("category")
    @classmethod
    def _cat(cls, val):
        return v.validate_choice(val, c.DOC_CATEGORIES, field="category", required=True)

    @field_validator("description")
    @classmethod
    def _desc(cls, val):
        return v.clean_text(val)


class DocTypeUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = None
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = Field(None, ge=0)

    @field_validator("name")
    @classmethod
    def _name(cls, val):
        if val is None:
            return None
        return v.validate_length(val.strip(), field="name", min_len=2, max_len=100)

    @field_validator("category")
    @classmethod
    def _cat(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.DOC_CATEGORIES, field="category")

    @field_validator("description")
    @classmethod
    def _desc(cls, val):
        return v.clean_text(val)


# ── Contacts (nested input for client create/update) ─────────────────────────
class ContactInput(BaseModel):
    id: Optional[str] = Field(None, max_length=36)
    contact_type: Optional[str] = Field(default=c.CONTACT_PRIMARY)
    first_name: str = Field(..., max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    designation: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    is_primary: Optional[bool] = False

    @field_validator("first_name")
    @classmethod
    def _first(cls, val):
        return v.validate_length(val, field="first_name", min_len=2, max_len=120, required=True)

    @field_validator("last_name", "designation")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)

    @field_validator("contact_type")
    @classmethod
    def _ctype(cls, val):
        if val is None:
            return c.CONTACT_PRIMARY
        return v.validate_choice(val, c.CONTACT_TYPES, field="contact_type", required=True)

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
    def _cc(cls, val):
        return v.validate_country_code(val, field="country_code")


# ── Clients ──────────────────────────────────────────────────────────────────
class ClientCreateRequest(BaseModel):
    company_name: str = Field(..., max_length=150)
    legal_name: Optional[str] = Field(None, max_length=200)
    industry: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=60)
    status: Optional[str] = Field(default=c.STATUS_PROSPECTIVE)
    contacts: Optional[List[ContactInput]] = None

    @field_validator("company_name")
    @classmethod
    def _company(cls, val):
        return v.validate_length(val, field="company_name", min_len=2, max_len=150, required=True)

    @field_validator("legal_name", "industry", "company_size", "country", "state", "city", "district", "postal_code", "timezone")
    @classmethod
    def _opt_text(cls, val):
        return v.clean_text(val)

    @field_validator("website")
    @classmethod
    def _website(cls, val):
        return v.validate_url(val, field="website")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return c.STATUS_PROSPECTIVE
        return v.validate_choice(val, c.CLIENT_STATUSES, field="status", required=True)


class ClientUpdateRequest(BaseModel):
    company_name: Optional[str] = Field(None, max_length=150)
    legal_name: Optional[str] = Field(None, max_length=200)
    industry: Optional[str] = Field(None, max_length=120)
    website: Optional[str] = Field(None, max_length=255)
    company_size: Optional[str] = Field(None, max_length=50)
    country: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=50)
    postal_code: Optional[str] = Field(None, max_length=20)
    timezone: Optional[str] = Field(None, max_length=60)

    @field_validator("company_name")
    @classmethod
    def _company(cls, val):
        return v.validate_length(val, field="company_name", min_len=2, max_len=150)

    @field_validator("legal_name", "industry", "company_size", "country", "state", "city", "district", "postal_code", "timezone")
    @classmethod
    def _opt_text(cls, val):
        return v.clean_text(val)

    @field_validator("website")
    @classmethod
    def _website(cls, val):
        return v.validate_url(val, field="website")


class StatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        return v.validate_choice(val, c.CLIENT_STATUSES, field="status", required=True)


# ── Contacts (standalone CRUD) ───────────────────────────────────────────────
class ContactCreateRequest(ContactInput):
    pass


class ContactUpdateRequest(BaseModel):
    contact_type: Optional[str] = None
    first_name: Optional[str] = Field(None, max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    designation: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    is_primary: Optional[bool] = None

    @field_validator("first_name")
    @classmethod
    def _first(cls, val):
        return v.validate_length(val, field="first_name", min_len=2, max_len=120)

    @field_validator("last_name", "designation")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)

    @field_validator("contact_type")
    @classmethod
    def _ctype(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.CONTACT_TYPES, field="contact_type")

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
    def _cc(cls, val):
        return v.validate_country_code(val, field="country_code")


# ── Billing profile (Commercials) ────────────────────────────────────────────
class BillingProfileRequest(BaseModel):
    gst_number: Optional[str] = Field(None, max_length=30)
    pan_number: Optional[str] = Field(None, max_length=20)
    tax_registration_number: Optional[str] = Field(None, max_length=60)
    billing_email: Optional[str] = Field(None, max_length=255)
    payment_terms: Optional[str] = Field(None, max_length=60)
    currency_code: Optional[str] = Field(None, max_length=8)
    billing_address_1: Optional[str] = Field(None, max_length=255)
    billing_address_2: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    district: Optional[str] = Field(None, max_length=50)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    bank_account_name: Optional[str] = Field(None, max_length=150)
    bank_account_number: Optional[str] = Field(None, max_length=64)
    bank_name: Optional[str] = Field(None, max_length=150)
    bank_branch_name: Optional[str] = Field(None, max_length=150)
    bank_ifsc_code: Optional[str] = Field(None, max_length=20)
    bank_swift_code: Optional[str] = Field(None, max_length=20)
    bank_iban: Optional[str] = Field(None, max_length=40)
    bank_upi_id: Optional[str] = Field(None, max_length=80)

    @field_validator("gst_number")
    @classmethod
    def _gst(cls, val):
        return v.validate_gst(val, field="gst_number")

    @field_validator("billing_email")
    @classmethod
    def _email(cls, val):
        return v.validate_email(val, field="billing_email")

    @field_validator("payment_terms")
    @classmethod
    def _terms(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.PAYMENT_TERMS, field="payment_terms")

    @field_validator("currency_code")
    @classmethod
    def _currency(cls, val):
        if val is None:
            return None
        return v.validate_choice(val.upper() if isinstance(val, str) else val, c.CURRENCY_CODES, field="currency_code")

    @field_validator(
        "pan_number", "tax_registration_number", "billing_address_1", "billing_address_2",
        "city", "district", "state", "country", "postal_code", "bank_account_name", "bank_account_number",
        "bank_name", "bank_branch_name", "bank_ifsc_code", "bank_swift_code", "bank_iban", "bank_upi_id",
    )
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)


# ── Subscription ─────────────────────────────────────────────────────────────
class SubscriptionRequest(BaseModel):
    plan_name: Optional[str] = Field(None, max_length=120)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    billing_cycle: Optional[str] = None
    user_limit: Optional[int] = Field(None, ge=0, le=10_000_000)
    storage_limit: Optional[str] = Field(None, max_length=40)
    status: Optional[str] = None

    @field_validator("plan_name", "storage_limit")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)

    @field_validator("billing_cycle")
    @classmethod
    def _cycle(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.BILLING_CYCLES, field="billing_cycle")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.SUBSCRIPTION_STATUSES, field="status")


# ── Modules ──────────────────────────────────────────────────────────────────
class ModuleToggleRequest(BaseModel):
    module_name: str
    is_enabled: bool

    @field_validator("module_name")
    @classmethod
    def _module(cls, val):
        return v.validate_choice(val, c.CLIENT_MODULES, field="module_name", required=True)


# ── Database connection ──────────────────────────────────────────────────────
class DbConnectionRequest(BaseModel):
    database_name: Optional[str] = Field(None, max_length=120)
    database_host: Optional[str] = Field(None, max_length=255)
    database_port: Optional[int] = Field(None, ge=1, le=65535)
    database_username: Optional[str] = Field(None, max_length=120)
    database_password: Optional[str] = Field(None, max_length=255)
    database_status: Optional[str] = None

    @field_validator("database_name", "database_host", "database_username")
    @classmethod
    def _text(cls, val):
        return v.clean_text(val)

    @field_validator("database_status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.DB_STATUSES, field="database_status")


# ── Domains ──────────────────────────────────────────────────────────────────
class DomainCreateRequest(BaseModel):
    domain_type: str = Field("custom", pattern="^(subdomain|domain|custom)$")
    subdomain: Optional[str] = Field(None, max_length=120)
    custom_domain: Optional[str] = Field(None, max_length=255)
    is_primary: Optional[bool] = False

    @field_validator("subdomain")
    @classmethod
    def _sub(cls, val):
        return v.validate_subdomain(val, field="subdomain")

    @field_validator("custom_domain")
    @classmethod
    def _custom(cls, val):
        return v.validate_domain(val, field="custom_domain")


# ── Admin users ──────────────────────────────────────────────────────────────
class AdminUserCreateRequest(BaseModel):
    first_name: str = Field(..., max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    status: Optional[str] = Field(default=c.ADMIN_STATUS_INVITED)

    @field_validator("first_name")
    @classmethod
    def _first(cls, val):
        return v.validate_length(val, field="first_name", min_len=2, max_len=120, required=True)

    @field_validator("last_name")
    @classmethod
    def _text(cls, val):
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
    def _cc(cls, val):
        return v.validate_country_code(val, field="country_code")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return c.ADMIN_STATUS_INVITED
        return v.validate_choice(val, c.ADMIN_STATUSES, field="status")


class AdminUserUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, max_length=120)
    last_name: Optional[str] = Field(None, max_length=120)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)
    country_code: Optional[str] = Field(None, max_length=8)
    status: Optional[str] = None

    @field_validator("first_name")
    @classmethod
    def _first(cls, val):
        return v.validate_length(val, field="first_name", min_len=2, max_len=120)

    @field_validator("last_name")
    @classmethod
    def _text(cls, val):
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
    def _cc(cls, val):
        return v.validate_country_code(val, field="country_code")

    @field_validator("status")
    @classmethod
    def _status(cls, val):
        if val is None:
            return None
        return v.validate_choice(val, c.ADMIN_STATUSES, field="status")
