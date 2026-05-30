"""
Router layer — Currency Management (superadmin, permission-guarded).

HTTP only: validates auth + permission, maps requests to the service layer, and
wraps results in the standard ApiResponse. No business logic lives here. Every
action is gated behind a ``currency.*`` permission via ``require_permission``.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.permissions import require_permission
from backend.app.database.platform import get_platform_db
from backend.app.modules.currency_management import constants as c
from backend.app.modules.currency_management import service
from backend.app.modules.currency_management.schemas import (
    CurrencyCreateRequest, CurrencyUpdateRequest, StatusUpdateRequest,
    BaseCurrencyRequest, RateUpdateRequest,
)
from backend.app.modules.rbac import constants as perms
from backend.shared.response import ApiResponse

router = APIRouter()


def _parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(tz=None).replace(tzinfo=None)
    return dt


# ── Meta / dashboard ─────────────────────────────────────────────────────────
@router.get("/meta/options", summary="Currency enums / option lists")
def meta_options(
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW)),
):
    return ApiResponse.ok(service.meta_options()).model_dump()


@router.get("/dashboard", summary="Currency counts (total/active/inactive/base)")
def dashboard(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW)),
):
    return ApiResponse.ok(service.dashboard(db)).model_dump()


# ── List / detail ────────────────────────────────────────────────────────────
@router.get("", summary="List currencies (paginated / searchable / filterable)")
def list_currencies(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW)),
    page: int = Query(c.DEFAULT_PAGE, ge=1),
    page_size: int = Query(c.DEFAULT_PAGE_SIZE, ge=1, le=c.MAX_PAGE_SIZE),
    sort_by: str = Query(c.DEFAULT_SORT_BY),
    sort_dir: str = Query(c.DEFAULT_SORT_DIR),
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    rate_source: Optional[str] = Query(None),
    is_base_currency: Optional[bool] = Query(None),
):
    result = service.list_currencies(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir,
        search=search, status=status_filter, rate_source=rate_source,
        is_base_currency=is_base_currency,
    )
    return ApiResponse.paginated(
        items=result["items"], total=result["total"],
        page=result["page"], page_size=result["page_size"],
    ).model_dump()


@router.get("/sync-logs", summary="List exchange-rate sync logs")
def list_sync_logs(
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW_HISTORY)),
    page: int = Query(c.DEFAULT_PAGE, ge=1),
    page_size: int = Query(c.DEFAULT_PAGE_SIZE, ge=1, le=c.MAX_PAGE_SIZE),
    sort_by: str = Query("started_at"),
    sort_dir: str = Query("desc"),
    sync_status: Optional[str] = Query(None),
):
    result = service.list_sync_logs(
        db, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir,
        sync_status=sync_status,
    )
    return ApiResponse.paginated(
        items=result["items"], total=result["total"],
        page=result["page"], page_size=result["page_size"],
    ).model_dump()


@router.post("/sync", summary="Trigger a live exchange-rate sync (provider abstraction)")
def run_sync(
    sync_source: str = Query(c.SOURCE_FOREX_API),
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_OVERRIDE_RATE)),
):
    data = service.run_sync(db, sync_source=sync_source, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Sync attempt recorded.").model_dump()


@router.get("/{currency_id}", summary="Currency detail (with current rate)")
def get_currency(
    currency_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW)),
):
    return ApiResponse.ok(service.get_currency_detail(db, currency_id)).model_dump()


@router.get("/{currency_id}/rate-history", summary="Rate change history (filterable)")
def rate_history(
    currency_id: str,
    db: Session = Depends(get_platform_db),
    _admin: dict = Depends(require_permission(perms.PERM_CURRENCY_VIEW_HISTORY)),
    page: int = Query(c.DEFAULT_PAGE, ge=1),
    page_size: int = Query(c.DEFAULT_PAGE_SIZE, ge=1, le=c.MAX_PAGE_SIZE),
    sort_by: str = Query("changed_at"),
    sort_dir: str = Query("desc"),
    rate_source: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
):
    result = service.list_rate_history(
        db, currency_id, page=page, page_size=page_size, sort_by=sort_by, sort_dir=sort_dir,
        rate_source=rate_source, date_from=_parse_dt(date_from), date_to=_parse_dt(date_to),
    )
    return ApiResponse.paginated(
        items=result["items"], total=result["total"],
        page=result["page"], page_size=result["page_size"],
    ).model_dump()


# ── Create / update / delete ─────────────────────────────────────────────────
@router.post("", status_code=status.HTTP_201_CREATED, summary="Add a currency")
def create_currency(
    payload: CurrencyCreateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_CREATE)),
):
    data = service.create_currency(db, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Currency created.").model_dump()


@router.patch("/{currency_id}", summary="Edit a currency")
def update_currency(
    currency_id: str,
    payload: CurrencyUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_EDIT)),
):
    data = service.update_currency(db, currency_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Currency updated.").model_dump()


@router.delete("/{currency_id}", summary="Delete a currency (soft delete)")
def delete_currency(
    currency_id: str,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_EDIT)),
):
    service.delete_currency(db, currency_id, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(message="Currency deleted.").model_dump()


# ── Activate / deactivate ────────────────────────────────────────────────────
@router.post("/{currency_id}/status", summary="Activate or deactivate a currency")
def set_status(
    currency_id: str,
    payload: StatusUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_ACTIVATE)),
):
    data = service.set_status(db, currency_id, payload.status, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message=f"Currency {payload.status.lower()}.").model_dump()


# ── Base currency (confirm-gated) ────────────────────────────────────────────
@router.post("/{currency_id}/base", summary="Set the single platform base currency")
def set_base_currency(
    currency_id: str,
    payload: BaseCurrencyRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_EDIT)),
):
    data = service.set_base_currency(db, currency_id, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Base currency updated.").model_dump()


# ── Exchange rate update / manual override ───────────────────────────────────
@router.put("/{currency_id}/rate", summary="Update or manually override the exchange rate")
def update_rate(
    currency_id: str,
    payload: RateUpdateRequest,
    db: Session = Depends(get_platform_db),
    admin: dict = Depends(require_permission(perms.PERM_CURRENCY_OVERRIDE_RATE)),
):
    data = service.update_rate(db, currency_id, payload, actor_id=admin["user_id"], actor=admin["email"])
    return ApiResponse.ok(data, message="Exchange rate updated.").model_dump()
