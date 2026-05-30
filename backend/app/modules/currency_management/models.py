"""
Currency Management models — global platform settings (no tenant scope).

Design notes:
- UUID (String(36)) primary keys per spec.
- ``currencies`` holds the configured currency; ``currency_rates`` is the 1:1
  *current* exchange rate; ``currency_rate_history`` records every rate change;
  ``currency_sync_logs`` records each live-sync attempt.
- Exchange rates are stored LOCALLY — invoices/reports read these, never a live API.
- Every table carries created/changed timestamps; mutable tables also carry the
  audit/soft-delete columns per DB standards.
"""
from datetime import datetime
import uuid

from sqlalchemy import (
    Column, String, Text, DateTime, Boolean, Integer, Float, ForeignKey, Index,
)

from backend.app.database.platform import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Currency(Base):
    __tablename__ = "currencies"

    id = Column(String(36), primary_key=True, default=_uuid)

    currency_code = Column(String(3), nullable=False, unique=True, index=True)
    currency_name = Column(String(100), nullable=False, index=True)
    currency_symbol = Column(String(8), nullable=False)
    country = Column(String(100), nullable=False)
    decimal_places = Column(Integer, nullable=False, default=2)

    is_base_currency = Column(Boolean, nullable=False, default=False, index=True)
    status = Column(String(20), nullable=False, default="Active", index=True)

    # Audit / soft delete
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)


class CurrencyRate(Base):
    """1:1 with a currency — the *current* exchange rate (relative to base)."""
    __tablename__ = "currency_rates"

    id = Column(String(36), primary_key=True, default=_uuid)
    currency_id = Column(String(36), ForeignKey("currencies.id"), nullable=False, unique=True, index=True)

    exchange_rate = Column(Float, nullable=False, default=1.0)
    rate_source = Column(String(30), nullable=False, default="Manual")
    is_manual_override = Column(Boolean, nullable=False, default=False)

    last_updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class CurrencyRateHistory(Base):
    """Append-only journal of every exchange rate change."""
    __tablename__ = "currency_rate_history"

    id = Column(String(36), primary_key=True, default=_uuid)
    currency_id = Column(String(36), ForeignKey("currencies.id"), nullable=False, index=True)

    old_rate = Column(Float, nullable=True)
    new_rate = Column(Float, nullable=False)
    rate_source = Column(String(30), nullable=False)
    is_manual_override = Column(Boolean, nullable=False, default=False)

    changed_by = Column(Integer, nullable=True)
    changed_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)


class CurrencySyncLog(Base):
    """One row per live-sync attempt (architecture for future scheduled jobs)."""
    __tablename__ = "currency_sync_logs"

    id = Column(String(36), primary_key=True, default=_uuid)

    sync_source = Column(String(50), nullable=False)
    sync_status = Column(String(30), nullable=False, index=True)
    currencies_updated = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    started_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)
    triggered_by = Column(Integer, nullable=True)


Index("ix_currency_rate_history_currency_changed", CurrencyRateHistory.currency_id, CurrencyRateHistory.changed_at)
