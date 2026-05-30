"""
Service layer — business logic for public enquiries.

Responsibilities:
  - Spam protection: honeypot, rate limiting, duplicate detection, Turnstile.
  - Field-level encryption of PII (email, phone, message).
  - Consent tracking (privacy + marketing) and enquiry numbering.
  - Audit logging (with masked PII).
  - Apply business defaults & retention window, then persist via the repository.
"""
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.app.config.settings import settings
from backend.app.modules.enquiry import repository as repo
from backend.app.modules.enquiry.constants import (
    DEFAULT_SOURCE,
    DEFAULT_STATUS,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MINUTES,
    DUPLICATE_WINDOW_MINUTES,
    ENQUIRY_NUMBER_PREFIX,
    AUDIT_ENTITY,
    AUDIT_CREATED,
    AUDIT_CONSENT,
    AUDIT_MARKETING_CONSENT,
    DUPLICATE_MESSAGE,
    RATE_LIMIT_MESSAGE,
)
from backend.app.modules.enquiry.models import Enquiry
from backend.app.modules.enquiry.schemas import EnquiryCreateRequest
from backend.shared.security.encryption import encrypt_value, blind_index
from backend.shared.audit.audit_logger import record_audit, mask_email

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


def _generate_enquiry_number(db: Session) -> str:
    """Generate a unique human-readable enquiry number: ENQ-YYYYMMDD-XXXXXXXX."""
    date_part = datetime.utcnow().strftime("%Y%m%d")
    for _ in range(5):
        suffix = uuid.uuid4().hex[:8].upper()
        candidate = f"{ENQUIRY_NUMBER_PREFIX}-{date_part}-{suffix}"
        if not repo.exists_by_enquiry_number(db, candidate):
            return candidate
    # Extremely unlikely; fall back to a longer suffix.
    return f"{ENQUIRY_NUMBER_PREFIX}-{date_part}-{uuid.uuid4().hex.upper()}"


def create_enquiry(
    db: Session,
    payload: EnquiryCreateRequest,
    ip_address: Optional[str],
    user_agent: Optional[str],
    referrer_url: Optional[str] = None,
) -> Enquiry:
    # 1. Honeypot — if the hidden field is filled, it's a bot.
    if payload.website_url and payload.website_url.strip():
        logger.info("Enquiry honeypot tripped from ip=%s", ip_address)
        raise HoneypotTripped()

    # 2. Cloudflare Turnstile (enforced only when configured).
    _verify_turnstile(payload.turnstile_token, ip_address)

    # 3. Rate limiting — max N per IP per window.
    recent = repo.count_recent_by_ip(db, ip_address, RATE_LIMIT_WINDOW_MINUTES)
    if recent >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)

    # 4. Duplicate detection — same email+company within the window (via blind index).
    dedupe_hash = blind_index(payload.work_email, payload.company_name)
    if repo.find_recent_duplicate(db, dedupe_hash, DUPLICATE_WINDOW_MINUTES):
        raise HTTPException(status_code=409, detail=DUPLICATE_MESSAGE)

    # 5. Consent stamping + compliance metadata.
    now = datetime.utcnow()
    retention_days = max(0, getattr(settings, "ENQUIRY_RETENTION_DAYS", 365))
    retention_until = now + timedelta(days=retention_days) if retention_days else None
    marketing = bool(payload.marketing_consent)

    # 6. Persist — PII encrypted at rest, business defaults applied.
    enquiry = repo.create_enquiry(
        db,
        enquiry_number=_generate_enquiry_number(db),
        full_name=payload.full_name,
        company_name=payload.company_name,
        email_encrypted=encrypt_value(payload.work_email),
        phone_encrypted=encrypt_value(payload.phone_number),
        message_encrypted=encrypt_value(payload.message),
        dedupe_hash=dedupe_hash,
        interested_module=payload.interested_module,
        source=DEFAULT_SOURCE,
        status=DEFAULT_STATUS,
        consent_given=True,
        consent_timestamp=now,
        privacy_policy_version=getattr(settings, "PRIVACY_POLICY_VERSION", "1.0"),
        marketing_consent=marketing,
        marketing_consent_timestamp=now if marketing else None,
        ip_address=ip_address,
        user_agent=(user_agent or "")[:512] or None,
        referrer_url=(referrer_url or "")[:1024] or None,
        retention_until=retention_until,
        deletion_requested=False,
    )

    # 7. Audit trail — never store raw PII; email is masked.
    masked = mask_email(payload.work_email)
    base_meta = {"enquiry_number": enquiry.enquiry_number, "email": masked, "ip": ip_address}
    record_audit(db, AUDIT_CREATED, AUDIT_ENTITY, enquiry.enquiry_number, metadata=base_meta)
    record_audit(
        db,
        AUDIT_CONSENT,
        AUDIT_ENTITY,
        enquiry.enquiry_number,
        metadata={**base_meta, "privacy_policy_version": enquiry.privacy_policy_version},
    )
    if marketing:
        record_audit(db, AUDIT_MARKETING_CONSENT, AUDIT_ENTITY, enquiry.enquiry_number, metadata=base_meta)

    db.commit()
    db.refresh(enquiry)
    return enquiry
