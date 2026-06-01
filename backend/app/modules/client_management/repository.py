"""
Repository layer — Client Management.

DB queries only. No business logic, no HTTP, no encryption/audit concerns —
those live in the service layer. Every query is scoped to non-deleted rows where
the table supports soft delete.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from backend.app.modules.client_management.models import (
    Client, ClientContact, ClientBillingProfile, ClientDbConnection,
    ClientSubscription, ClientModule, ClientDocument, ClientActivityLog,
    ClientDomain, ClientAdminUser,
)


# ── Generic ──────────────────────────────────────────────────────────────────
def add(db: Session, obj):
    db.add(obj)
    db.flush()
    return obj


# ── Clients ──────────────────────────────────────────────────────────────────
def get_client(db: Session, client_id: str) -> Optional[Client]:
    return (
        db.query(Client)
        .filter(Client.id == client_id, Client.is_deleted.is_(False))
        .first()
    )


def get_client_by_code(db: Session, client_code: str) -> Optional[Client]:
    return db.query(Client).filter(Client.client_code == client_code).first()


def get_client_by_lead(db: Session, lead_id: str) -> Optional[Client]:
    """Find a (non-deleted) client converted from a given lead — duplicate guard."""
    return (
        db.query(Client)
        .filter(Client.lead_id == lead_id, Client.is_deleted.is_(False))
        .first()
    )


def count_clients(db: Session) -> int:
    return db.query(func.count(Client.id)).filter(Client.is_deleted.is_(False)).scalar() or 0


def status_counts(db: Session) -> dict:
    rows = (
        db.query(Client.status, func.count(Client.id))
        .filter(Client.is_deleted.is_(False))
        .group_by(Client.status)
        .all()
    )
    return {status: count for status, count in rows}


def list_clients(
    db: Session,
    *,
    page: int,
    page_size: int,
    search: Optional[str] = None,
    status: Optional[str] = None,
    industry: Optional[str] = None,
    country: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
) -> Tuple[List[Client], int]:
    q = db.query(Client).filter(Client.is_deleted.is_(False))

    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(
            Client.company_name.ilike(like),
            Client.client_code.ilike(like),
            Client.legal_name.ilike(like),
            Client.industry.ilike(like),
        ))
    if status:
        q = q.filter(Client.status == status)
    if industry:
        q = q.filter(Client.industry == industry)
    if country:
        q = q.filter(Client.country == country)

    total = q.count()

    sort_col = getattr(Client, sort_by, Client.created_at)
    q = q.order_by(sort_col.asc() if sort_dir == "asc" else sort_col.desc())

    items = q.offset((page - 1) * page_size).limit(page_size).all()
    return items, total


# ── Contacts ─────────────────────────────────────────────────────────────────
def list_contacts(db: Session, client_id: str) -> List[ClientContact]:
    return (
        db.query(ClientContact)
        .filter(ClientContact.client_id == client_id, ClientContact.is_deleted.is_(False))
        .order_by(ClientContact.is_primary.desc(), ClientContact.created_at.asc())
        .all()
    )


def get_contact(db: Session, client_id: str, contact_id: str) -> Optional[ClientContact]:
    return (
        db.query(ClientContact)
        .filter(
            ClientContact.id == contact_id,
            ClientContact.client_id == client_id,
            ClientContact.is_deleted.is_(False),
        )
        .first()
    )


def get_primary_contact(db: Session, client_id: str) -> Optional[ClientContact]:
    return (
        db.query(ClientContact)
        .filter(
            ClientContact.client_id == client_id,
            ClientContact.is_primary.is_(True),
            ClientContact.is_deleted.is_(False),
        )
        .first()
    )


# ── Billing profile (1:1) ────────────────────────────────────────────────────
def get_billing_profile(db: Session, client_id: str) -> Optional[ClientBillingProfile]:
    return (
        db.query(ClientBillingProfile)
        .filter(ClientBillingProfile.client_id == client_id)
        .first()
    )


# ── DB connection (1:1) ──────────────────────────────────────────────────────
def get_db_connection(db: Session, client_id: str) -> Optional[ClientDbConnection]:
    return (
        db.query(ClientDbConnection)
        .filter(ClientDbConnection.client_id == client_id)
        .first()
    )


# ── Subscription (1:1 current) ───────────────────────────────────────────────
def get_subscription(db: Session, client_id: str) -> Optional[ClientSubscription]:
    return (
        db.query(ClientSubscription)
        .filter(ClientSubscription.client_id == client_id)
        .order_by(ClientSubscription.created_at.desc())
        .first()
    )


def get_subscriptions_bulk(
    db: Session, client_ids: list[str]
) -> dict[str, ClientSubscription]:
    """Fetch the latest subscription for each client in one query.

    Returns a mapping ``{client_id: ClientSubscription}`` so the caller can
    avoid N+1 queries when building list-view summaries.  Uses a DISTINCT ON
    (PostgreSQL) approach: order by client_id + created_at DESC so the first
    row per client_id is the most recent subscription.
    """
    if not client_ids:
        return {}
    from sqlalchemy import distinct, desc
    # Subquery: rank subscriptions per client, pick the latest
    from sqlalchemy import func
    sub = (
        db.query(
            ClientSubscription,
            func.row_number().over(
                partition_by=ClientSubscription.client_id,
                order_by=ClientSubscription.created_at.desc(),
            ).label("rn"),
        )
        .filter(ClientSubscription.client_id.in_(client_ids))
        .subquery()
    )
    rows = (
        db.query(ClientSubscription)
        .join(sub, ClientSubscription.id == sub.c.id)
        .filter(sub.c.rn == 1)
        .all()
    )
    return {s.client_id: s for s in rows}


# ── Modules ──────────────────────────────────────────────────────────────────
def list_modules(db: Session, client_id: str) -> List[ClientModule]:
    return (
        db.query(ClientModule)
        .filter(ClientModule.client_id == client_id)
        .order_by(ClientModule.created_at.asc())
        .all()
    )


def get_module(db: Session, client_id: str, module_name: str) -> Optional[ClientModule]:
    return (
        db.query(ClientModule)
        .filter(ClientModule.client_id == client_id, ClientModule.module_name == module_name)
        .first()
    )


# ── Documents ────────────────────────────────────────────────────────────────
def list_documents(db: Session, client_id: str) -> List[ClientDocument]:
    return (
        db.query(ClientDocument)
        .filter(ClientDocument.client_id == client_id, ClientDocument.is_deleted.is_(False))
        .order_by(ClientDocument.created_at.desc())
        .all()
    )


def get_document(db: Session, client_id: str, document_id: str) -> Optional[ClientDocument]:
    return (
        db.query(ClientDocument)
        .filter(
            ClientDocument.id == document_id,
            ClientDocument.client_id == client_id,
            ClientDocument.is_deleted.is_(False),
        )
        .first()
    )


# ── Activity logs ────────────────────────────────────────────────────────────
def list_activity_logs(db: Session, client_id: str) -> List[ClientActivityLog]:
    return (
        db.query(ClientActivityLog)
        .filter(ClientActivityLog.client_id == client_id)
        .order_by(ClientActivityLog.created_at.desc())
        .all()
    )


# ── Domains ──────────────────────────────────────────────────────────────────
def list_domains(db: Session, client_id: str) -> List[ClientDomain]:
    return (
        db.query(ClientDomain)
        .filter(ClientDomain.client_id == client_id, ClientDomain.is_deleted.is_(False))
        .order_by(ClientDomain.is_primary.desc(), ClientDomain.created_at.asc())
        .all()
    )


def get_domain(db: Session, client_id: str, domain_id: str) -> Optional[ClientDomain]:
    return (
        db.query(ClientDomain)
        .filter(
            ClientDomain.id == domain_id,
            ClientDomain.client_id == client_id,
            ClientDomain.is_deleted.is_(False),
        )
        .first()
    )


# ── Admin users ──────────────────────────────────────────────────────────────
def list_admin_users(db: Session, client_id: str) -> List[ClientAdminUser]:
    return (
        db.query(ClientAdminUser)
        .filter(ClientAdminUser.client_id == client_id, ClientAdminUser.is_deleted.is_(False))
        .order_by(ClientAdminUser.created_at.asc())
        .all()
    )


def get_admin_user(db: Session, client_id: str, admin_id: str) -> Optional[ClientAdminUser]:
    return (
        db.query(ClientAdminUser)
        .filter(
            ClientAdminUser.id == admin_id,
            ClientAdminUser.client_id == client_id,
            ClientAdminUser.is_deleted.is_(False),
        )
        .first()
    )
