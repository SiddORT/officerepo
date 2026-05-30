"""
Service layer — business logic for Currency Management.

Responsibilities:
  - Currency CRUD (+ uniqueness, ISO 4217 normalization, soft delete).
  - Single base-currency invariant (promotion is confirm-gated + audited).
  - Activate / deactivate currencies.
  - Exchange-rate updates & manual overrides — every change is journaled to
    ``currency_rate_history`` and audited. Rates are stored LOCALLY.
  - Live-sync orchestration via the provider abstraction (no live provider yet),
    recording a ``currency_sync_logs`` row per attempt.
  - Standardized DTOs (plain dicts) and audit logging for every mutation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.currency_management import constants as c
from backend.app.modules.currency_management import repository as repo
from backend.app.modules.currency_management import validators
from backend.app.modules.currency_management.models import (
    Currency, CurrencyRate, CurrencyRateHistory, CurrencySyncLog,
)
from backend.app.modules.currency_management.schemas import (
    CurrencyCreateRequest, CurrencyUpdateRequest, RateUpdateRequest,
)
from backend.app.modules.currency_management.providers import (
    get_provider, available_providers, ProviderNotConfigured,
)
from backend.shared.audit.audit_logger import record_audit


# ════════════════════════════════════════════════════════════════════════════
# Serialization (joined currency + current rate → plain dict)
# ════════════════════════════════════════════════════════════════════════════
def _rate_dict(rate: Optional[CurrencyRate]) -> Optional[dict]:
    if not rate:
        return None
    return {
        "id": rate.id,
        "currency_id": rate.currency_id,
        "exchange_rate": rate.exchange_rate,
        "rate_source": rate.rate_source,
        "is_manual_override": rate.is_manual_override,
        "last_updated_at": rate.last_updated_at,
        "updated_by": rate.updated_by,
    }


def _currency_dict(currency: Currency, rate: Optional[CurrencyRate]) -> dict:
    rd = _rate_dict(rate)
    return {
        "id": currency.id,
        "currency_code": currency.currency_code,
        "currency_name": currency.currency_name,
        "currency_symbol": currency.currency_symbol,
        "country": currency.country,
        "decimal_places": currency.decimal_places,
        "is_base_currency": currency.is_base_currency,
        "status": currency.status,
        "created_at": currency.created_at,
        "updated_at": currency.updated_at,
        "exchange_rate": rd["exchange_rate"] if rd else None,
        "rate_source": rd["rate_source"] if rd else None,
        "is_manual_override": rd["is_manual_override"] if rd else None,
        "rate_last_updated_at": rd["last_updated_at"] if rd else None,
        "rate": rd,
    }


def _history_dict(h: CurrencyRateHistory) -> dict:
    return {
        "id": h.id,
        "currency_id": h.currency_id,
        "old_rate": h.old_rate,
        "new_rate": h.new_rate,
        "rate_source": h.rate_source,
        "is_manual_override": h.is_manual_override,
        "changed_by": h.changed_by,
        "changed_at": h.changed_at,
    }


def _sync_dict(s: CurrencySyncLog) -> dict:
    return {
        "id": s.id,
        "sync_source": s.sync_source,
        "sync_status": s.sync_status,
        "currencies_updated": s.currencies_updated,
        "error_message": s.error_message,
        "started_at": s.started_at,
        "completed_at": s.completed_at,
    }


# ════════════════════════════════════════════════════════════════════════════
# Meta / dashboard
# ════════════════════════════════════════════════════════════════════════════
def meta_options() -> dict:
    return {
        "statuses": c.CURRENCY_STATUSES,
        "rate_sources": c.RATE_SOURCES,
        "sync_statuses": c.SYNC_STATUSES,
        "decimal_places": {"min": c.DECIMAL_PLACES_MIN, "max": c.DECIMAL_PLACES_MAX},
        "available_providers": available_providers(),
    }


def dashboard(db: Session) -> dict:
    by_status = repo.count_by_status(db)
    base = repo.get_base_currency(db)
    total = sum(by_status.values())
    return {
        "total": total,
        "active": by_status.get(c.STATUS_ACTIVE, 0),
        "inactive": by_status.get(c.STATUS_INACTIVE, 0),
        "by_status": by_status,
        "base_currency": base.currency_code if base else None,
    }


# ════════════════════════════════════════════════════════════════════════════
# Listing / detail
# ════════════════════════════════════════════════════════════════════════════
def list_currencies(db: Session, **kwargs) -> dict:
    page = kwargs.get("page", c.DEFAULT_PAGE)
    page_size = kwargs.get("page_size", c.DEFAULT_PAGE_SIZE)
    sort_by = kwargs.get("sort_by") or c.DEFAULT_SORT_BY
    if sort_by not in c.SORTABLE_CURRENCY_FIELDS:
        sort_by = c.DEFAULT_SORT_BY
    sort_dir = kwargs.get("sort_dir") or c.DEFAULT_SORT_DIR

    items, total = repo.list_currencies(
        db,
        page=page,
        page_size=page_size,
        search=kwargs.get("search"),
        status=kwargs.get("status"),
        rate_source=kwargs.get("rate_source"),
        is_base_currency=kwargs.get("is_base_currency"),
        sort_by=sort_by,
        sort_dir=sort_dir,
    )
    rates = repo.get_rates_for(db, [cur.id for cur in items])
    return {
        "items": [_currency_dict(cur, rates.get(cur.id)) for cur in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def get_currency_detail(db: Session, currency_id: str) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")
    rate = repo.get_rate(db, currency_id)
    return _currency_dict(currency, rate)


# ════════════════════════════════════════════════════════════════════════════
# Create / update / delete
# ════════════════════════════════════════════════════════════════════════════
def create_currency(
    db: Session, payload: CurrencyCreateRequest, *, actor_id: Optional[int], actor: Optional[str]
) -> dict:
    if repo.get_by_code(db, payload.currency_code):
        raise HTTPException(status_code=409, detail=f"Currency '{payload.currency_code}' already exists.")

    is_base = bool(payload.is_base_currency)
    if is_base:
        repo.clear_base_currency(db)

    currency = Currency(
        currency_code=payload.currency_code,
        currency_name=payload.currency_name,
        currency_symbol=payload.currency_symbol,
        country=payload.country,
        decimal_places=payload.decimal_places,
        status=payload.status,
        is_base_currency=is_base,
        created_by=actor_id,
    )
    repo.add(db, currency)

    # Initial current rate. The base currency is always 1.0 against itself.
    initial_rate = 1.0 if is_base else (payload.exchange_rate if payload.exchange_rate is not None else 1.0)
    rate = CurrencyRate(
        currency_id=currency.id,
        exchange_rate=initial_rate,
        rate_source=payload.rate_source,
        is_manual_override=False,
        updated_by=actor_id,
    )
    repo.add(db, rate)
    db.add(CurrencyRateHistory(
        currency_id=currency.id,
        old_rate=None,
        new_rate=initial_rate,
        rate_source=payload.rate_source,
        is_manual_override=False,
        changed_by=actor_id,
    ))

    record_audit(
        db, action=c.AUDIT_CURRENCY_CREATED, entity_type=c.AUDIT_ENTITY_CURRENCY,
        entity_id=currency.id, actor=actor,
        metadata={"currency_code": currency.currency_code, "is_base": is_base, "initial_rate": initial_rate},
    )
    if is_base:
        record_audit(
            db, action=c.AUDIT_BASE_CURRENCY_CHANGED, entity_type=c.AUDIT_ENTITY_CURRENCY,
            entity_id=currency.id, actor=actor, metadata={"currency_code": currency.currency_code},
        )

    db.commit()
    return get_currency_detail(db, currency.id)


def update_currency(
    db: Session, currency_id: str, payload: CurrencyUpdateRequest,
    *, actor_id: Optional[int], actor: Optional[str],
) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")

    changes: dict = {}
    for field in ("currency_name", "currency_symbol", "country", "decimal_places", "status"):
        new_val = getattr(payload, field)
        if new_val is not None and new_val != getattr(currency, field):
            changes[field] = new_val
            setattr(currency, field, new_val)

    if not changes:
        return get_currency_detail(db, currency_id)

    currency.updated_at = datetime.utcnow()
    record_audit(
        db, action=c.AUDIT_CURRENCY_UPDATED, entity_type=c.AUDIT_ENTITY_CURRENCY,
        entity_id=currency.id, actor=actor,
        metadata={"currency_code": currency.currency_code, "fields": sorted(changes.keys())},
    )
    db.commit()
    return get_currency_detail(db, currency_id)


def delete_currency(db: Session, currency_id: str, *, actor_id: Optional[int], actor: Optional[str]) -> None:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")
    if currency.is_base_currency:
        raise HTTPException(status_code=400, detail="The base currency cannot be deleted. Set another base first.")

    currency.is_deleted = True
    currency.deleted_at = datetime.utcnow()
    record_audit(
        db, action=c.AUDIT_CURRENCY_DELETED, entity_type=c.AUDIT_ENTITY_CURRENCY,
        entity_id=currency.id, actor=actor, metadata={"currency_code": currency.currency_code},
    )
    db.commit()


# ════════════════════════════════════════════════════════════════════════════
# Activate / deactivate
# ════════════════════════════════════════════════════════════════════════════
def set_status(
    db: Session, currency_id: str, status: str, *, actor_id: Optional[int], actor: Optional[str]
) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")

    if status == c.STATUS_INACTIVE and currency.is_base_currency:
        raise HTTPException(status_code=400, detail="The base currency cannot be deactivated.")

    if currency.status != status:
        currency.status = status
        currency.updated_at = datetime.utcnow()
        action = c.AUDIT_CURRENCY_ACTIVATED if status == c.STATUS_ACTIVE else c.AUDIT_CURRENCY_DEACTIVATED
        record_audit(
            db, action=action, entity_type=c.AUDIT_ENTITY_CURRENCY,
            entity_id=currency.id, actor=actor,
            metadata={"currency_code": currency.currency_code, "status": status},
        )
        db.commit()
    return get_currency_detail(db, currency_id)


# ════════════════════════════════════════════════════════════════════════════
# Base currency (single-invariant, confirm-gated, audited)
# ════════════════════════════════════════════════════════════════════════════
def set_base_currency(db: Session, currency_id: str, *, actor_id: Optional[int], actor: Optional[str]) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")
    if currency.status != c.STATUS_ACTIVE:
        raise HTTPException(status_code=400, detail="Only an active currency can be the base currency.")
    if currency.is_base_currency:
        return get_currency_detail(db, currency_id)

    previous = repo.get_base_currency(db)
    repo.clear_base_currency(db, exclude_id=currency.id)
    currency.is_base_currency = True
    currency.updated_at = datetime.utcnow()

    record_audit(
        db, action=c.AUDIT_BASE_CURRENCY_CHANGED, entity_type=c.AUDIT_ENTITY_CURRENCY,
        entity_id=currency.id, actor=actor,
        metadata={
            "currency_code": currency.currency_code,
            "previous": previous.currency_code if previous else None,
        },
    )
    db.commit()
    return get_currency_detail(db, currency_id)


# ════════════════════════════════════════════════════════════════════════════
# Exchange rate update / manual override
# ════════════════════════════════════════════════════════════════════════════
def update_rate(
    db: Session, currency_id: str, payload: RateUpdateRequest,
    *, actor_id: Optional[int], actor: Optional[str],
) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")

    rate = repo.get_rate(db, currency_id)
    old_rate = rate.exchange_rate if rate else None

    if rate is None:
        rate = CurrencyRate(currency_id=currency_id)
        db.add(rate)

    rate.exchange_rate = payload.exchange_rate
    rate.rate_source = payload.rate_source
    rate.is_manual_override = bool(payload.is_manual_override)
    rate.last_updated_at = datetime.utcnow()
    rate.updated_by = actor_id
    db.flush()

    repo.add_history(db, CurrencyRateHistory(
        currency_id=currency_id,
        old_rate=old_rate,
        new_rate=payload.exchange_rate,
        rate_source=payload.rate_source,
        is_manual_override=bool(payload.is_manual_override),
        changed_by=actor_id,
    ))

    action = c.AUDIT_RATE_OVERRIDDEN if payload.is_manual_override else c.AUDIT_RATE_UPDATED
    record_audit(
        db, action=action, entity_type=c.AUDIT_ENTITY_CURRENCY_RATE,
        entity_id=currency_id, actor=actor,
        metadata={
            "currency_code": currency.currency_code,
            "old_rate": old_rate,
            "new_rate": payload.exchange_rate,
            "rate_source": payload.rate_source,
            "is_manual_override": bool(payload.is_manual_override),
        },
    )
    db.commit()
    return get_currency_detail(db, currency_id)


# ════════════════════════════════════════════════════════════════════════════
# Rate history / sync logs
# ════════════════════════════════════════════════════════════════════════════
def list_rate_history(db: Session, currency_id: str, **kwargs) -> dict:
    currency = repo.get_currency(db, currency_id)
    if not currency:
        raise HTTPException(status_code=404, detail="Currency not found.")

    page = kwargs.get("page", c.DEFAULT_PAGE)
    page_size = kwargs.get("page_size", c.DEFAULT_PAGE_SIZE)
    sort_by = kwargs.get("sort_by") or "changed_at"
    if sort_by not in c.SORTABLE_HISTORY_FIELDS:
        sort_by = "changed_at"

    items, total = repo.list_rate_history(
        db,
        currency_id=currency_id,
        page=page,
        page_size=page_size,
        rate_source=kwargs.get("rate_source"),
        date_from=kwargs.get("date_from"),
        date_to=kwargs.get("date_to"),
        sort_by=sort_by,
        sort_dir=kwargs.get("sort_dir") or "desc",
    )
    return {
        "items": [_history_dict(h) for h in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def list_sync_logs(db: Session, **kwargs) -> dict:
    page = kwargs.get("page", c.DEFAULT_PAGE)
    page_size = kwargs.get("page_size", c.DEFAULT_PAGE_SIZE)
    sort_by = kwargs.get("sort_by") or "started_at"
    if sort_by not in c.SORTABLE_SYNC_FIELDS:
        sort_by = "started_at"

    items, total = repo.list_sync_logs(
        db,
        page=page,
        page_size=page_size,
        sync_status=kwargs.get("sync_status"),
        sort_by=sort_by,
        sort_dir=kwargs.get("sort_dir") or "desc",
    )
    return {
        "items": [_sync_dict(s) for s in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


# ════════════════════════════════════════════════════════════════════════════
# Live sync (provider abstraction — no live provider wired yet)
# ════════════════════════════════════════════════════════════════════════════
def run_sync(
    db: Session, *, sync_source: str, actor_id: Optional[int], actor: Optional[str]
) -> dict:
    """Attempt a live rate sync via the provider abstraction.

    Today no live provider is configured, so this records a ``Failed`` sync log
    (explicit, never silent) — the architecture is ready for a future scheduled
    job to plug a real provider into ``providers`` and have this succeed.
    """
    started_at = datetime.utcnow()
    base = repo.get_base_currency(db)
    status = c.SYNC_FAILED
    updated = 0
    error_message: Optional[str] = None

    try:
        if not base:
            raise ProviderNotConfigured("No base currency is configured; set a base currency before syncing.")
        provider = get_provider(sync_source)
        targets = [cur for cur in repo.list_active_currencies(db) if not cur.is_base_currency]
        result = provider.fetch_rates(base.currency_code, [t.currency_code for t in targets])
        skipped: list[str] = []
        for cur in targets:
            new_rate = result.rates.get(cur.currency_code)
            if new_rate is None:
                continue
            # Provider-supplied numbers are untrusted: reject anything that
            # would not pass manual entry (zero, negative, NaN/inf, non-numeric,
            # or above RATE_MAX). Such currencies keep their existing rate and
            # the sync downgrades to "Partial Success".
            try:
                new_rate = validators.validate_rate(new_rate)
            except ValueError:
                skipped.append(cur.currency_code)
                continue
            rate = repo.get_rate(db, cur.id)
            old_rate = rate.exchange_rate if rate else None
            if rate is None:
                rate = CurrencyRate(currency_id=cur.id)
                db.add(rate)
            rate.exchange_rate = new_rate
            rate.rate_source = sync_source
            rate.is_manual_override = False
            rate.last_updated_at = datetime.utcnow()
            rate.updated_by = actor_id
            db.flush()
            repo.add_history(db, CurrencyRateHistory(
                currency_id=cur.id, old_rate=old_rate, new_rate=new_rate,
                rate_source=sync_source, is_manual_override=False, changed_by=actor_id,
            ))
            updated += 1
        status = c.SYNC_SUCCESS if updated == len(targets) else c.SYNC_PARTIAL
        if skipped:
            status = c.SYNC_PARTIAL
            error_message = (
                f"Skipped invalid provider rate(s) for: {', '.join(sorted(skipped))}."
            )
        if result.error and status == c.SYNC_SUCCESS:
            status = c.SYNC_PARTIAL
            error_message = result.error
    except ProviderNotConfigured as exc:
        status = c.SYNC_FAILED
        error_message = str(exc)
    except Exception as exc:  # pragma: no cover - defensive
        status = c.SYNC_FAILED
        error_message = str(exc)[: c.ERROR_MESSAGE_MAX_LEN]

    log = repo.add_sync_log(db, CurrencySyncLog(
        sync_source=sync_source,
        sync_status=status,
        currencies_updated=updated,
        error_message=error_message[: c.ERROR_MESSAGE_MAX_LEN] if error_message else None,
        started_at=started_at,
        completed_at=datetime.utcnow(),
        triggered_by=actor_id,
    ))
    record_audit(
        db, action=c.AUDIT_SYNC_RUN, entity_type=c.AUDIT_ENTITY_CURRENCY_SYNC,
        entity_id=log.id, actor=actor,
        metadata={"sync_source": sync_source, "status": status, "currencies_updated": updated},
    )
    db.commit()
    return _sync_dict(log)
