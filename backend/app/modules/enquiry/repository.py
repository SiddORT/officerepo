"""
Repository layer — raw DB operations only. No business logic here.
"""
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.app.modules.enquiry.models import Enquiry


def create_enquiry(db: Session, **fields) -> Enquiry:
    enquiry = Enquiry(**fields)
    db.add(enquiry)
    db.flush()
    return enquiry


def count_recent_by_ip(db: Session, ip_address: str, window_minutes: int) -> int:
    """Number of (non-deleted) enquiries from an IP within the time window."""
    if not ip_address:
        return 0
    since = datetime.utcnow() - timedelta(minutes=window_minutes)
    return (
        db.query(Enquiry)
        .filter(
            Enquiry.ip_address == ip_address,
            Enquiry.created_at >= since,
            Enquiry.is_deleted.is_(False),
        )
        .count()
    )


def find_recent_duplicate(
    db: Session,
    work_email: str,
    message: str,
    window_minutes: int,
) -> Optional[Enquiry]:
    """Find an identical email+message submission within the time window."""
    since = datetime.utcnow() - timedelta(minutes=window_minutes)
    return (
        db.query(Enquiry)
        .filter(
            Enquiry.work_email == work_email,
            Enquiry.message == message,
            Enquiry.created_at >= since,
            Enquiry.is_deleted.is_(False),
        )
        .first()
    )
