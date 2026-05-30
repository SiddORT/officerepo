"""
Router layer — public enquiry endpoint. No authentication required.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.database.platform import get_platform_db
from backend.app.modules.enquiry import service
from backend.app.modules.enquiry.constants import SUCCESS_MESSAGE
from backend.app.modules.enquiry.schemas import EnquiryCreateRequest
from backend.shared.response import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter()


def _client_ip(request: Request) -> Optional[str]:
    """Resolve the real client IP for rate limiting.

    The left-most X-Forwarded-For entry is client-controllable and therefore
    spoofable, which would let a bot rotate IPs to evade per-IP rate limiting.
    Instead we take the entry TRUSTED_PROXY_HOPS positions from the right of the
    chain — that segment is appended by trusted infrastructure, not the client.
    Falls back to the directly-connected peer when no header is present.
    """
    hops = max(1, getattr(settings, "TRUSTED_PROXY_HOPS", 1))
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        parts = [p.strip() for p in fwd.split(",") if p.strip()]
        if parts:
            idx = min(hops, len(parts))
            return parts[-idx]
    return request.client.host if request.client else None


@router.post("", summary="Submit a public website enquiry")
def submit_enquiry(
    payload: EnquiryCreateRequest,
    request: Request,
    db: Session = Depends(get_platform_db),
):
    ip_address = _client_ip(request)
    user_agent = request.headers.get("user-agent")
    # Prefer the server-observed referer; fall back to the client-supplied value.
    referrer_url = request.headers.get("referer") or payload.referrer_url

    try:
        service.create_enquiry(
            db,
            payload,
            ip_address=ip_address,
            user_agent=user_agent,
            referrer_url=referrer_url,
        )
    except service.HoneypotTripped:
        # Silently succeed so bots get no signal — nothing is persisted.
        return ApiResponse.ok(None, SUCCESS_MESSAGE).model_dump()

    return ApiResponse.ok(None, SUCCESS_MESSAGE).model_dump()
