"""
Concrete exchange-rate provider backed by exchangerate-api.com (v6).

Credentials are read from the environment (never hardcoded):
  EXCHANGE_RATE_API_KEY     — required; the v6 API key. Without it the provider
                              is *not configured* and live sync stays disabled.
  EXCHANGE_RATE_API_URL     — optional base URL (default: the v6 endpoint).
  EXCHANGE_RATE_API_TIMEOUT — optional per-request timeout in seconds.

The v6 "latest" endpoint returns conversion rates keyed by ISO 4217 code,
expressed per one unit of the base currency::

    GET {base_url}/{api_key}/latest/{BASE}
    -> {"result":"success","base_code":"USD","conversion_rates":{"EUR":0.9, ...}}

Rates are normalized into a ``ProviderResult`` so the service layer never sees
vendor-specific JSON. Network / parse / vendor errors are returned as
``ProviderResult.error`` (downgrading a sync to *Partial Success*); only a
genuinely-missing key raises ``ProviderNotConfigured`` (recorded as *Failed*).
"""
from __future__ import annotations

import logging
from typing import List, Optional

import httpx

from backend.app.config.settings import settings
from backend.app.modules.currency_management.providers.base import (
    ExchangeRateProvider,
    ProviderNotConfigured,
    ProviderResult,
)

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://v6.exchangerate-api.com/v6"
DEFAULT_TIMEOUT = 10.0


class ExchangeRateApiProvider(ExchangeRateProvider):
    """Live provider for exchangerate-api.com (registered as ``Forex API``)."""

    name = "Forex API"

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_key = (
            api_key if api_key is not None
            else getattr(settings, "EXCHANGE_RATE_API_KEY", "")
        ) or ""
        self.base_url = (
            base_url or getattr(settings, "EXCHANGE_RATE_API_URL", "") or DEFAULT_BASE_URL
        ).rstrip("/")
        if timeout is not None:
            self.timeout = timeout
        else:
            self.timeout = float(
                getattr(settings, "EXCHANGE_RATE_API_TIMEOUT", DEFAULT_TIMEOUT) or DEFAULT_TIMEOUT
            )

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def fetch_rates(self, base: str, symbols: List[str]) -> ProviderResult:
        if not self.is_configured():
            raise ProviderNotConfigured(
                "EXCHANGE_RATE_API_KEY is not set; cannot fetch live exchange rates. "
                "Set it in the environment to enable live sync."
            )

        base_code = (base or "").upper()
        url = f"{self.base_url}/{self.api_key}/latest/{base_code}"

        try:
            resp = httpx.get(url, timeout=self.timeout)
        except Exception as exc:  # noqa: BLE001 - surface as a soft error, not a crash
            logger.warning("Exchange-rate fetch failed (network): %s", exc)
            return ProviderResult(
                base=base_code, error=f"Request to exchange-rate provider failed: {exc}"
            )

        if resp.status_code != 200:
            logger.warning("Exchange-rate fetch returned HTTP %s", resp.status_code)
            return ProviderResult(
                base=base_code, error=f"Provider returned HTTP {resp.status_code}."
            )

        try:
            data = resp.json()
        except Exception as exc:  # noqa: BLE001
            return ProviderResult(
                base=base_code, error=f"Could not parse provider response: {exc}"
            )

        if data.get("result") != "success":
            return ProviderResult(
                base=base_code,
                error=f"Provider error: {data.get('error-type', 'unknown')}.",
            )

        conversion = data.get("conversion_rates") or {}
        wanted = {s.upper() for s in symbols}
        rates: dict = {}
        for code, value in conversion.items():
            up = code.upper()
            if up in wanted:
                try:
                    rates[up] = float(value)
                except (TypeError, ValueError):
                    continue

        fetched = sorted(rates.keys())
        missing = sorted(wanted - set(fetched))
        error = (
            f"Provider did not return rates for: {', '.join(missing)}." if missing else None
        )
        return ProviderResult(
            base=base_code, rates=rates, fetched_symbols=fetched, error=error
        )
