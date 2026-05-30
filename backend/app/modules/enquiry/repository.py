"""
Repository layer — raw DB operations only. No business logic here.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.modules.enquiry import constants as c
from backend.app.modules.enquiry.models import Enquiry, EnquiryActivity, EnquiryNote


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
    dedupe_hash: str,
    window_minutes: int,
) -> Optional[Enquiry]:
    """Find a recent submission with the same email+company blind index.

    The blind index lets us detect duplicates without decrypting/querying the
    encrypted email — identical email+company within the window collide on hash.
    """
    if not dedupe_hash:
        return None
    since = datetime.utcnow() - timedelta(minutes=window_minutes)
    return (
        db.query(Enquiry)
        .filter(
            Enquiry.dedupe_hash == dedupe_hash,
            Enquiry.created_at >= since,
            Enquiry.is_deleted.is_(False),
        )
        .first()
    )


def exists_by_enquiry_number(db: Session, enquiry_number: str) -> bool:
    return (
        db.query(Enquiry.id)
        .filter(Enquiry.enquiry_number == enquiry_number)
        .first()
        is not None
    )


# ════════════════════════════════════════════════════════════════════════════
# Superadmin Inbox — queries
# ════════════════════════════════════════════════════════════════════════════
def get_by_id(db: Session, enquiry_id: int) -> Optional[Enquiry]:
    return (
        db.query(Enquiry)
        .filter(Enquiry.id == enquiry_id, Enquiry.is_deleted.is_(False))
        .first()
    )


def list_enquiries(
    db: Session,
    *,
    page: int,
    page_size: int,
    sort_by: str,
    sort_dir: str,
    status: Optional[str] = None,
    is_spam: Optional[bool] = None,
    assigned_to: Optional[int] = None,
    search: Optional[str] = None,
) -> Tuple[List[Enquiry], int]:
    """Paginated, filterable, searchable list of enquiries.

    Search matches plaintext columns only (full_name / company_name /
    enquiry_number) because email/phone are encrypted and not queryable.
    """
    q = db.query(Enquiry).filter(Enquiry.is_deleted.is_(False))

    if status:
        q = q.filter(Enquiry.status == status)
    if is_spam is not None:
        q = q.filter(Enquiry.is_spam.is_(is_spam))
    if assigned_to is not None:
        q = q.filter(Enquiry.assigned_to == assigned_to)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(
            (Enquiry.full_name.ilike(like))
            | (Enquiry.company_name.ilike(like))
            | (Enquiry.enquiry_number.ilike(like))
        )

    total = q.count()

    sort_col = getattr(Enquiry, sort_by, Enquiry.created_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    offset = (page - 1) * page_size
    items = q.offset(offset).limit(page_size).all()
    return items, total


def status_counts(db: Session) -> dict:
    """Counts grouped by status (non-deleted, excluding spam)."""
    rows = (
        db.query(Enquiry.status, func.count(Enquiry.id))
        .filter(Enquiry.is_deleted.is_(False), Enquiry.is_spam.is_(False))
        .group_by(Enquiry.status)
        .all()
    )
    return {status: count for status, count in rows}


def spam_count(db: Session) -> int:
    return (
        db.query(func.count(Enquiry.id))
        .filter(Enquiry.is_deleted.is_(False), Enquiry.is_spam.is_(True))
        .scalar()
        or 0
    )


def total_count(db: Session) -> int:
    return (
        db.query(func.count(Enquiry.id))
        .filter(Enquiry.is_deleted.is_(False))
        .scalar()
        or 0
    )


# ── Notes ────────────────────────────────────────────────────────────────────
def add_note(db: Session, enquiry_id: int, note: str, created_by: Optional[int]) -> EnquiryNote:
    row = EnquiryNote(enquiry_id=enquiry_id, note=note, created_by=created_by)
    db.add(row)
    db.flush()
    return row


def list_notes(db: Session, enquiry_id: int) -> List[EnquiryNote]:
    return (
        db.query(EnquiryNote)
        .filter(EnquiryNote.enquiry_id == enquiry_id, EnquiryNote.is_deleted.is_(False))
        .order_by(EnquiryNote.created_at.desc())
        .all()
    )


def get_note(db: Session, enquiry_id: int, note_id: int) -> Optional[EnquiryNote]:
    return (
        db.query(EnquiryNote)
        .filter(
            EnquiryNote.id == note_id,
            EnquiryNote.enquiry_id == enquiry_id,
            EnquiryNote.is_deleted.is_(False),
        )
        .first()
    )


# ── Activity timeline ─────────────────────────────────────────────────────────
def add_activity(
    db: Session, enquiry_id: int, activity_type: str, description: Optional[str],
    created_by: Optional[int],
) -> EnquiryActivity:
    row = EnquiryActivity(
        enquiry_id=enquiry_id, activity_type=activity_type,
        description=description, created_by=created_by,
    )
    db.add(row)
    db.flush()
    return row


def list_activities(db: Session, enquiry_id: int) -> List[EnquiryActivity]:
    return (
        db.query(EnquiryActivity)
        .filter(EnquiryActivity.enquiry_id == enquiry_id)
        .order_by(EnquiryActivity.created_at.desc())
        .all()
    )
