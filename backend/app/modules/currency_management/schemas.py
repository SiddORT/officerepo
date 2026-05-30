"""
Schema layer — Pydantic request models for Currency Management.
Input is trimmed/validated/normalized at the boundary before reaching the service.
Responses are assembled as plain dicts in the service (joined currency + rate).
"""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from backend.app.modules.currency_management import constants as c
from backend.app.modules.currency_management import validators as v


class CurrencyCreateRequest(BaseModel):
    currency_code: str
    currency_name: str
    currency_symbol: str
    country: str
    decimal_places: int = c.DEFAULT_DECIMAL_PLACES
    status: str = c.STATUS_ACTIVE
    is_base_currency: bool = False
    # Optional initial exchange rate (relative to base). Defaults to 1.0 for base.
    exchange_rate: Optional[float] = None
    rate_source: str = c.SOURCE_MANUAL

    @field_validator("currency_code")
    @classmethod
    def _code(cls, val: str) -> str:
        return v.validate_currency_code(val)

    @field_validator("currency_name")
    @classmethod
    def _name(cls, val: str) -> str:
        return v.validate_name(val)

    @field_validator("currency_symbol")
    @classmethod
    def _symbol(cls, val: str) -> str:
        return v.validate_symbol(val)

    @field_validator("country")
    @classmethod
    def _country(cls, val: str) -> str:
        return v.validate_country(val)

    @field_validator("decimal_places")
    @classmethod
    def _dp(cls, val: int) -> int:
        return v.validate_decimal_places(val)

    @field_validator("status")
    @classmethod
    def _status(cls, val: str) -> str:
        return v.validate_status(val)

    @field_validator("rate_source")
    @classmethod
    def _source(cls, val: str) -> str:
        return v.validate_rate_source(val)

    @field_validator("exchange_rate")
    @classmethod
    def _rate(cls, val: Optional[float]) -> Optional[float]:
        return v.validate_rate(val, required=False)


class CurrencyUpdateRequest(BaseModel):
    currency_name: Optional[str] = None
    currency_symbol: Optional[str] = None
    country: Optional[str] = None
    decimal_places: Optional[int] = None
    status: Optional[str] = None

    @field_validator("currency_name")
    @classmethod
    def _name(cls, val: Optional[str]) -> Optional[str]:
        return v.validate_name(val, required=False)

    @field_validator("currency_symbol")
    @classmethod
    def _symbol(cls, val: Optional[str]) -> Optional[str]:
        return v.validate_symbol(val, required=False)

    @field_validator("country")
    @classmethod
    def _country(cls, val: Optional[str]) -> Optional[str]:
        return v.validate_country(val, required=False)

    @field_validator("decimal_places")
    @classmethod
    def _dp(cls, val: Optional[int]) -> Optional[int]:
        return v.validate_decimal_places(val, required=False)

    @field_validator("status")
    @classmethod
    def _status(cls, val: Optional[str]) -> Optional[str]:
        return v.validate_status(val, required=False)


class StatusUpdateRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def _status(cls, val: str) -> str:
        return v.validate_status(val)


class BaseCurrencyRequest(BaseModel):
    """Confirm-gated promotion of a currency to the single platform base."""
    confirm: bool = True


class RateUpdateRequest(BaseModel):
    exchange_rate: float
    rate_source: str = c.SOURCE_MANUAL
    is_manual_override: bool = False

    @field_validator("exchange_rate")
    @classmethod
    def _rate(cls, val: float) -> float:
        return v.validate_rate(val)

    @field_validator("rate_source")
    @classmethod
    def _source(cls, val: str) -> str:
        return v.validate_rate_source(val)
