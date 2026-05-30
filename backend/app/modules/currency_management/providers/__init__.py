"""
Exchange-rate provider abstraction.

Live sync is intentionally NOT wired to any real provider yet — only the
``Manual`` source is operational. This package defines the seam so that future
providers (ExchangeRate API, Fixer, Open Exchange Rates, XE, CurrencyLayer, …)
can be registered without touching the service or router layers.

Usage::

    from backend.app.modules.currency_management.providers import get_provider
    provider = get_provider("ExchangeRate API")   # raises ProviderNotConfigured today
    rates = provider.fetch_rates(base="USD", symbols=["EUR", "INR"])

Register a real provider by adding it to ``_REGISTRY`` (or calling
``register_provider``) — callers stay unchanged.
"""
from __future__ import annotations

import logging
from typing import Dict, List

from backend.app.modules.currency_management.providers.base import (
    ExchangeRateProvider,
    ProviderNotConfigured,
    ProviderResult,
)

logger = logging.getLogger(__name__)

# Live providers are registered at import time when their credentials are present
# (see ``_bootstrap_default_providers``). Map a provider name → an
# ExchangeRateProvider instance. Empty when no credentials are configured, in
# which case ``get_provider`` raises ``ProviderNotConfigured`` (explicit failure).
_REGISTRY: Dict[str, ExchangeRateProvider] = {}


def register_provider(name: str, provider: ExchangeRateProvider) -> None:
    _REGISTRY[name] = provider


def available_providers() -> List[str]:
    return sorted(_REGISTRY.keys())


def get_provider(name: str) -> ExchangeRateProvider:
    provider = _REGISTRY.get(name)
    if provider is None:
        raise ProviderNotConfigured(
            f"No live exchange-rate provider is configured for '{name}'. "
            "Rates can only be set via the Manual source at this time."
        )
    return provider


def _bootstrap_default_providers() -> None:
    """Register the built-in live provider when its credentials are present.

    Import-time and best-effort: a missing key simply leaves the registry empty
    (live sync records a ``Failed`` log explaining no provider is configured),
    and any unexpected error never blocks module import.
    """
    try:
        from backend.app.modules.currency_management.providers.exchange_rate_api import (
            ExchangeRateApiProvider,
        )

        provider = ExchangeRateApiProvider()
        if provider.is_configured():
            register_provider(provider.name, provider)
            logger.info("Registered live exchange-rate provider: %s", provider.name)
    except Exception:  # pragma: no cover - never block import on provider wiring
        logger.exception("Failed to bootstrap default exchange-rate provider")


_bootstrap_default_providers()


__all__ = [
    "ExchangeRateProvider",
    "ProviderNotConfigured",
    "ProviderResult",
    "get_provider",
    "register_provider",
    "available_providers",
]
