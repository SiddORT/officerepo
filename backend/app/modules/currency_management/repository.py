"""
Repository layer — pure DB queries for Currency Management. No business logic.
All currency reads exclude soft-deleted rows unless explicitly noted.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.modules.currency_management.models import (
    Currency, CurrencyRate, CurrencyRateHistory, CurrencySyncLog,
)


# ── Currencies ───────────────────────────────────────────────────────────────
def add(db: Session, instance) -> object:
    db.add(instance)
    db.flush()
    return instance


def get_currency(db: Session, currency_id: str) -> Optional[Currency]:
    return (
        db.query(Currency)
        .filter(Currency.id == currency_id, Currency.is_deleted.is_(False))
        .first()
    )


def get_by_code(db: Session, code: str, *, exclude_id: Optional[str] = None) -> Optional[Currency]:
    q = db.query(Currency).filter(
        Currency.currency_code == code, Currency.is_deleted.is_(False)
    )
    if exclude_id:
        q = q.filter(Currency.id != exclude_id)
    return q.first()


def get_base_currency(db: Session) -> Optional[Currency]:
    return (
        db.query(Currency)
        .filter(Currency.is_base_currency.is_(True), Currency.is_deleted.is_(False))
        .first()
    )


def clear_base_currency(db: Session, *, exclude_id: Optional[str] = None) -> None:
    q = db.query(Currency).filter(Currency.is_base_currency.is_(True))
    if exclude_id:
        q = q.filter(Currency.id != exclude_id)
    for row in q.all():
        row.is_base_currency = False
    db.flush()


def list_currencies(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: Optional[str] = None,
    status: Optional[str] = None,
    rate_source: Optional[str] = None,
    is_base_currency: Optional[bool] = None,
    sort_by: str = "currency_code",
    sort_dir: str = "asc",
) -> Tuple[List[Currency], int]:
    q = db.query(Currency).filter(Currency.is_deleted.is_(False))

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            or_(
                Currency.currency_code.ilike(like),
                Currency.currency_name.ilike(like),
                Currency.country.ilike(like),
            )
        )
    if status:
        q = q.filter(Currency.status == status)
    if is_base_currency is not None:
        q = q.filter(Currency.is_base_currency.is_(is_base_currency))

    if rate_source:
        q = q.join(CurrencyRate, CurrencyRate.currency_id == Currency.id).filter(
            CurrencyRate.rate_source == rate_source
        )

    total = q.count()

    sort_col = getattr(Currency, sort_by, Currency.currency_code)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


def count_by_status(db: Session) -> dict:
    rows = db.query(Currency.status).filter(Currency.is_deleted.is_(False)).all()
    counts: dict = {}
    for (status,) in rows:
        counts[status] = counts.get(status, 0) + 1
    return counts


def count_active_currencies(db: Session) -> int:
    return (
        db.query(Currency.id)
        .filter(Currency.is_deleted.is_(False), Currency.status == "Active")
        .count()
    )


def list_active_currencies(db: Session) -> List[Currency]:
    return (
        db.query(Currency)
        .filter(Currency.is_deleted.is_(False), Currency.status == "Active")
        .order_by(Currency.currency_code.asc())
        .all()
    )


# ── Current rate (1:1) ───────────────────────────────────────────────────────
def get_rate(db: Session, currency_id: str) -> Optional[CurrencyRate]:
    return db.query(CurrencyRate).filter(CurrencyRate.currency_id == currency_id).first()


def get_rates_for(db: Session, currency_ids: List[str]) -> dict:
    if not currency_ids:
        return {}
    rows = db.query(CurrencyRate).filter(CurrencyRate.currency_id.in_(currency_ids)).all()
    return {r.currency_id: r for r in rows}


# ── Rate history ─────────────────────────────────────────────────────────────
def add_history(db: Session, instance: CurrencyRateHistory) -> CurrencyRateHistory:
    db.add(instance)
    db.flush()
    return instance


def list_rate_history(
    db: Session,
    *,
    currency_id: str,
    page: int,
    page_size: int,
    rate_source: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "changed_at",
    sort_dir: str = "desc",
) -> Tuple[List[CurrencyRateHistory], int]:
    q = db.query(CurrencyRateHistory).filter(CurrencyRateHistory.currency_id == currency_id)
    if rate_source:
        q = q.filter(CurrencyRateHistory.rate_source == rate_source)
    if date_from:
        q = q.filter(CurrencyRateHistory.changed_at >= date_from)
    if date_to:
        q = q.filter(CurrencyRateHistory.changed_at <= date_to)

    total = q.count()
    sort_col = getattr(CurrencyRateHistory, sort_by, CurrencyRateHistory.changed_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ── Sync logs ────────────────────────────────────────────────────────────────
def add_sync_log(db: Session, instance: CurrencySyncLog) -> CurrencySyncLog:
    db.add(instance)
    db.flush()
    return instance


def list_sync_logs(
    db: Session,
    *,
    page: int,
    page_size: int,
    sync_status: Optional[str] = None,
    sort_by: str = "started_at",
    sort_dir: str = "desc",
) -> Tuple[List[CurrencySyncLog], int]:
    q = db.query(CurrencySyncLog)
    if sync_status:
        q = q.filter(CurrencySyncLog.sync_status == sync_status)
    total = q.count()
    sort_col = getattr(CurrencySyncLog, sort_by, CurrencySyncLog.started_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())
    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total
