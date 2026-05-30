"""
Service layer — business logic for public enquiries.

Responsibilities:
  - Spam protection: honeypot, rate limiting, duplicate detection, Turnstile.
  - Apply business defaults (source, status).
  - Persist via the repository.
"""
import logging
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.modules.enquiry import repository as repo
from backend.app.modules.enquiry.constants import (
    DEFAULT_SOURCE,
    DEFAULT_STATUS,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MINUTES,
    DUPLICATE_WINDOW_MINUTES,
)
from backend.app.modules.enquiry.schemas import EnquiryCreateRequest, EnquiryResponse

logger = logging.getLogger(__name__)

# Sentinel raised internally when a bot trips the honeypot. The router converts
# this into a normal success response so bots get no signal that they failed.
class HoneypotTripped(Exception):
    pass


def _verify_turnstile(token: Optional[str], ip_address: Optional[str]) -> None:
    """Cloudflare Turnstile verification — active only when a secret is configured.

    Architecture is ready: set TURNSTILE_SECRET_KEY in the environment and pass
    `turnstile_token` from the frontend widget to enforce verification. When no
    secret is set (e.g. local/dev), verification is skipped.
    """
    from backend.app.config.settings import settings

    secret = getattr(settings, "TURNSTILE_SECRET_KEY", "") or ""
    if not secret:
        return  # not configured — skip enforcement

    if not token:
        raise HTTPException(status_code=400, detail="Captcha verification required.")

    try:
        import httpx

        resp = httpx.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": secret, "response": token, "remoteip": ip_address or ""},
            timeout=10.0,
        )
        result = resp.json()
    except Exception:
        logger.exception("Turnstile verification request failed.")
        raise HTTPException(status_code=503, detail="Captcha verification unavailable. Please try again.")

    if not result.get("success"):
        raise HTTPException(status_code=400, detail="Captcha verification failed.")


def create_enquiry(
    db: Session,
    payload: EnquiryCreateRequest,
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> EnquiryResponse:
    # 1. Honeypot — if the hidden field is filled, it's a bot.
    if payload.honeypot and payload.honeypot.strip():
        logger.info("Enquiry honeypot tripped from ip=%s", ip_address)
        raise HoneypotTripped()

    # 2. Cloudflare Turnstile (enforced only when configured).
    _verify_turnstile(payload.turnstile_token, ip_address)

    # 3. Rate limiting — max N per IP per window.
    recent = repo.count_recent_by_ip(db, ip_address, RATE_LIMIT_WINDOW_MINUTES)
    if recent >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many enquiries from your network. Please try again later.",
        )

    # 4. Duplicate submission detection.
    if repo.find_recent_duplicate(db, payload.work_email, payload.message, DUPLICATE_WINDOW_MINUTES):
        raise HTTPException(
            status_code=409,
            detail="We've already received this enquiry. Our team will reach out shortly.",
        )

    # 5. Persist with business defaults.
    enquiry = repo.create_enquiry(
        db,
        full_name=payload.full_name,
        work_email=payload.work_email,
        phone_number=payload.phone_number,
        company_name=payload.company_name,
        interested_module=payload.interested_module,
        message=payload.message,
        source=DEFAULT_SOURCE,
        status=DEFAULT_STATUS,
        ip_address=ip_address,
        user_agent=(user_agent or "")[:512] or None,
    )
    db.commit()
    db.refresh(enquiry)
    return EnquiryResponse.model_validate(enquiry)
