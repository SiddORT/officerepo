"""Repository — Asset Requests (client DB)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.modules.asset_management.inventory_models import AssetRequest


def _seq(db: Session, client_id: str) -> str:
    count = db.query(AssetRequest).filter(AssetRequest.client_id == client_id).count()
    today = datetime.utcnow().strftime("%Y%m%d")
    return f"AREQ-{today}-{str(count + 1).zfill(4)}"


def list_requests(
    db: Session,
    client_id: str,
    *,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    request_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Dict[str, Any]:
    q = (
        db.query(AssetRequest)
        .filter(AssetRequest.client_id == client_id, AssetRequest.is_deleted == False)
    )
    if search:
        s = f"%{search}%"
        q = q.filter(
            AssetRequest.request_number.ilike(s)
            | AssetRequest.requested_by_name.ilike(s)
            | AssetRequest.category_name.ilike(s)
            | AssetRequest.free_text_asset.ilike(s)
            | AssetRequest.asset_master_name.ilike(s)
        )
    if status:
        q = q.filter(AssetRequest.status == status)
    if priority:
        q = q.filter(AssetRequest.priority == priority)
    if request_type:
        q = q.filter(AssetRequest.request_type == request_type)
    total = q.count()
    items = q.order_by(AssetRequest.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


def get_request(db: Session, client_id: str, request_id: str) -> Optional[AssetRequest]:
    return (
        db.query(AssetRequest)
        .filter(AssetRequest.id == request_id, AssetRequest.client_id == client_id,
                AssetRequest.is_deleted == False)
        .first()
    )


def create_request(db: Session, client_id: str, data: Dict[str, Any]) -> AssetRequest:
    req = AssetRequest(
        client_id=client_id,
        request_number=_seq(db, client_id),
        **{k: v for k, v in data.items() if hasattr(AssetRequest, k)},
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def update_request(db: Session, req: AssetRequest, data: Dict[str, Any]) -> AssetRequest:
    for k, v in data.items():
        if hasattr(AssetRequest, k) and k not in ("id", "client_id", "request_number"):
            setattr(req, k, v)
    db.commit()
    db.refresh(req)
    return req
