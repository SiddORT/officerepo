"""
Tests for the live exchange-rate provider (Currency Management).

Covers the concrete ``ExchangeRateApiProvider`` (exchangerate-api.com v6):
  - not configured (no API key) raises ProviderNotConfigured
  - a successful fetch normalizes vendor JSON into a ProviderResult
  - missing symbols downgrade the result with an error (→ Partial sync)
  - vendor / HTTP / network errors surface as a soft error, never a crash
"""
import unittest
from unittest.mock import patch

from backend.app.modules.currency_management.providers import exchange_rate_api as era
from backend.app.modules.currency_management.providers.base import ProviderNotConfigured


class _FakeResp:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


class ExchangeRateApiProviderTests(unittest.TestCase):
    def test_not_configured_raises(self):
        provider = era.ExchangeRateApiProvider(api_key="")
        self.assertFalse(provider.is_configured())
        with self.assertRaises(ProviderNotConfigured):
            provider.fetch_rates("USD", ["EUR"])

    def test_successful_fetch_normalizes_rates(self):
        provider = era.ExchangeRateApiProvider(api_key="k")
        payload = {
            "result": "success",
            "base_code": "USD",
            "conversion_rates": {"USD": 1, "EUR": 0.92, "INR": 83.1, "GBP": 0.79},
        }
        with patch.object(era.httpx, "get", return_value=_FakeResp(200, payload)) as get:
            result = provider.fetch_rates("usd", ["EUR", "INR"])
        self.assertIn("k/latest/USD", get.call_args.args[0])
        self.assertEqual(result.base, "USD")
        self.assertEqual(result.rates, {"EUR": 0.92, "INR": 83.1})
        self.assertEqual(result.fetched_symbols, ["EUR", "INR"])
        self.assertIsNone(result.error)

    def test_missing_symbol_sets_error(self):
        provider = era.ExchangeRateApiProvider(api_key="k")
        payload = {"result": "success", "conversion_rates": {"EUR": 0.92}}
        with patch.object(era.httpx, "get", return_value=_FakeResp(200, payload)):
            result = provider.fetch_rates("USD", ["EUR", "JPY"])
        self.assertEqual(result.rates, {"EUR": 0.92})
        self.assertIsNotNone(result.error)
        self.assertIn("JPY", result.error)

    def test_vendor_error_surfaces(self):
        provider = era.ExchangeRateApiProvider(api_key="k")
        payload = {"result": "error", "error-type": "invalid-key"}
        with patch.object(era.httpx, "get", return_value=_FakeResp(200, payload)):
            result = provider.fetch_rates("USD", ["EUR"])
        self.assertEqual(result.rates, {})
        self.assertIn("invalid-key", result.error)

    def test_http_error_surfaces(self):
        provider = era.ExchangeRateApiProvider(api_key="k")
        with patch.object(era.httpx, "get", return_value=_FakeResp(503, {})):
            result = provider.fetch_rates("USD", ["EUR"])
        self.assertEqual(result.rates, {})
        self.assertIn("503", result.error)

    def test_network_error_surfaces(self):
        provider = era.ExchangeRateApiProvider(api_key="k")
        with patch.object(era.httpx, "get", side_effect=RuntimeError("boom")):
            result = provider.fetch_rates("USD", ["EUR"])
        self.assertEqual(result.rates, {})
        self.assertIn("boom", result.error)


if __name__ == "__main__":
    unittest.main()
