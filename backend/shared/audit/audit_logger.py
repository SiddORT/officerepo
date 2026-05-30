"""
Reusable audit logging helper + masking utilities.

Records compliance-relevant events to the ``audit_logs`` table. Sensitive values
(email, phone, message) MUST be masked before they reach the log — use the
``mask_*`` helpers below. The recorder flushes (no commit) so it participates in
the caller's transaction.
"""
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from backend.shared.audit.models import AuditLog

logger = logging.getLogger(__name__)


def mask_email(email: Optional[str]) -> Optional[str]:
    """Mask an email for audit logs: 'jane.doe@acme.com' -> 'j***e@acme.com'."""
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked_local = (local[0] if local else "") + "*"
    else:
        masked_local = f"{local[0]}***{local[-1]}"
    return f"{masked_local}@{domain}"


def mask_value(value: Optional[str], visible: int = 2) -> Optional[str]:
    """Mask an arbitrary value, leaving only the last ``visible`` characters."""
    if not value:
        return None
    tail = value[-visible:] if len(value) > visible else ""
    return f"***{tail}"


def record_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    actor: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> AuditLog:
    """Persist an audit entry within the caller's transaction (flush, no commit).

    Failures are swallowed (logged) so auditing never breaks the primary
    operation — but the metadata is the caller's responsibility to pre-mask.
    """
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor,
        log_metadata=metadata or {},
    )
    try:
        db.add(entry)
        db.flush()
    except Exception:  # pragma: no cover - audit must never break the main flow
        logger.exception("Failed to record audit entry action=%s", action)
    return entry
