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

from typing import Dict, List

from backend.app.modules.currency_management.providers.base import (
    ExchangeRateProvider,
    ProviderNotConfigured,
    ProviderResult,
)

# No live providers are configured yet — the module ships with the seam only.
# Map a provider name → an ExchangeRateProvider instance to "go live".
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


__all__ = [
    "ExchangeRateProvider",
    "ProviderNotConfigured",
    "ProviderResult",
    "get_provider",
    "register_provider",
    "available_providers",
]
