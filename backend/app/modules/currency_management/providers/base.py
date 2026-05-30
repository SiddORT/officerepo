"""
Provider-agnostic base contract for live exchange-rate sync.

A concrete provider subclasses ``ExchangeRateProvider`` and implements
``fetch_rates``. The service layer depends only on this contract, so swapping
or adding a vendor never ripples outward. No vendor is implemented yet (Manual
source only), but the seam is here for future scheduled-sync jobs.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional


class ProviderNotConfigured(Exception):
    """Raised when a live provider is requested but none is wired up."""


@dataclass
class ProviderResult:
    """Normalized result returned by a provider's ``fetch_rates``."""
    base: str
    rates: Dict[str, float] = field(default_factory=dict)
    fetched_symbols: List[str] = field(default_factory=list)
    error: Optional[str] = None


class ExchangeRateProvider(ABC):
    """Contract every concrete exchange-rate provider must satisfy."""

    name: str = "abstract"

    @abstractmethod
    def fetch_rates(self, base: str, symbols: List[str]) -> ProviderResult:
        """Return current rates for ``symbols`` expressed per one unit of ``base``."""
        raise NotImplementedError
