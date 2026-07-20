from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from .constants import NOTIFICATION_CHANNELS, CREDENTIAL_TYPES, DEFAULT_MASTERS
from .models import (
    ClientGeneralSettings, ClientBranding, ClientLocalization,
    ClientNotificationChannel, ClientCredential, ClientCommonMaster,
)


# ── helpers ────────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.utcnow()


# ── General ────────────────────────────────────────────────────────────────────

def get_general(db: Session, client_id: str) -> ClientGeneralSettings:
    row = db.query(ClientGeneralSettings).filter_by(id="default").first()
    if not row:
        row = ClientGeneralSettings(id="default", client_id=client_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_general(db: Session, client_id: str, data: dict, updated_by: str) -> ClientGeneralSettings:
    row = get_general(db, client_id)
    for k, v in data.items():
        if v is not None and hasattr(row, k):
            setattr(row, k, v)
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── Branding ───────────────────────────────────────────────────────────────────

def get_branding(db: Session, client_id: str) -> ClientBranding:
    row = db.query(ClientBranding).filter_by(id="default").first()
    if not row:
        row = ClientBranding(id="default", client_id=client_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_branding(db: Session, client_id: str, data: dict, updated_by: str) -> ClientBranding:
    row = get_branding(db, client_id)
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def clear_branding_field(db: Session, client_id: str, field: str, updated_by: str) -> ClientBranding:
    row = get_branding(db, client_id)
    if hasattr(row, field):
        setattr(row, field, None)
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── Localization ───────────────────────────────────────────────────────────────

def get_localization(db: Session, client_id: str) -> ClientLocalization:
    row = db.query(ClientLocalization).filter_by(id="default").first()
    if not row:
        row = ClientLocalization(id="default", client_id=client_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def update_localization(db: Session, client_id: str, data: dict, updated_by: str) -> ClientLocalization:
    row = get_localization(db, client_id)
    for k, v in data.items():
        if v is not None and hasattr(row, k):
            setattr(row, k, v)
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── Notification Channels ──────────────────────────────────────────────────────

def _seed_channels(db: Session, client_id: str) -> None:
    for ch in NOTIFICATION_CHANNELS:
        exists = db.query(ClientNotificationChannel).filter_by(
            client_id=client_id, channel=ch["type"]
        ).first()
        if not exists:
            db.add(ClientNotificationChannel(client_id=client_id, channel=ch["type"], is_enabled=False))
    db.commit()


def get_notification_channels(db: Session, client_id: str) -> List[ClientNotificationChannel]:
    rows = db.query(ClientNotificationChannel).filter_by(client_id=client_id).all()
    if not rows:
        _seed_channels(db, client_id)
        rows = db.query(ClientNotificationChannel).filter_by(client_id=client_id).all()
    return rows


def update_notification_channel(
    db: Session, client_id: str, channel: str, is_enabled: bool, updated_by: str
) -> Optional[ClientNotificationChannel]:
    get_notification_channels(db, client_id)
    row = db.query(ClientNotificationChannel).filter_by(client_id=client_id, channel=channel).first()
    if not row:
        return None
    row.is_enabled = is_enabled
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── Credentials ────────────────────────────────────────────────────────────────

def _seed_credentials(db: Session, client_id: str) -> None:
    for ct in CREDENTIAL_TYPES:
        exists = db.query(ClientCredential).filter_by(
            client_id=client_id, credential_type=ct["type"]
        ).first()
        if not exists:
            db.add(ClientCredential(
                client_id=client_id,
                credential_type=ct["type"],
                is_configured=False,
            ))
    db.commit()


def get_credentials(db: Session, client_id: str) -> List[ClientCredential]:
    rows = db.query(ClientCredential).filter_by(client_id=client_id).all()
    if not rows:
        _seed_credentials(db, client_id)
        rows = db.query(ClientCredential).filter_by(client_id=client_id).all()
    return rows


def update_credential(
    db: Session, client_id: str, credential_type: str,
    encrypted_data: str, updated_by: str,
) -> Optional[ClientCredential]:
    get_credentials(db, client_id)
    row = db.query(ClientCredential).filter_by(
        client_id=client_id, credential_type=credential_type
    ).first()
    if not row:
        return None
    row.encrypted_data = encrypted_data
    row.is_configured = True
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def clear_credential(db: Session, client_id: str, credential_type: str, updated_by: str) -> Optional[ClientCredential]:
    row = db.query(ClientCredential).filter_by(
        client_id=client_id, credential_type=credential_type
    ).first()
    if not row:
        return None
    row.encrypted_data = None
    row.is_configured = False
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


# ── Common Masters ─────────────────────────────────────────────────────────────

def list_common_masters(db: Session, client_id: str, master_type: str) -> List[ClientCommonMaster]:
    return (
        db.query(ClientCommonMaster)
        .filter_by(client_id=client_id, master_type=master_type)
        .order_by(ClientCommonMaster.sort_order, ClientCommonMaster.label)
        .all()
    )


def get_common_master(db: Session, client_id: str, master_id: str) -> Optional[ClientCommonMaster]:
    return db.query(ClientCommonMaster).filter_by(client_id=client_id, id=master_id).first()


def create_common_master(db: Session, client_id: str, master_type: str, data: dict, created_by: str) -> ClientCommonMaster:
    row = ClientCommonMaster(
        client_id=client_id,
        master_type=master_type,
        created_by=created_by,
        updated_by=created_by,
        **{k: v for k, v in data.items() if hasattr(ClientCommonMaster, k)},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_common_master(db: Session, client_id: str, master_id: str, data: dict, updated_by: str) -> Optional[ClientCommonMaster]:
    row = get_common_master(db, client_id, master_id)
    if not row:
        return None
    for k, v in data.items():
        if v is not None and hasattr(row, k):
            setattr(row, k, v)
    row.updated_by = updated_by
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row


def delete_common_master(db: Session, client_id: str, master_id: str) -> bool:
    row = get_common_master(db, client_id, master_id)
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def seed_common_masters(db: Session, client_id: str, master_type: str, created_by: str) -> int:
    defaults = DEFAULT_MASTERS.get(master_type, [])
    added = 0
    existing_codes = {
        r.code for r in db.query(ClientCommonMaster)
        .filter_by(client_id=client_id, master_type=master_type)
        .all()
    }
    for i, item in enumerate(defaults):
        if item["code"] not in existing_codes:
            row = ClientCommonMaster(
                client_id=client_id,
                master_type=master_type,
                code=item["code"],
                label=item["label"],
                sort_order=i,
                metadata_json=item.get("metadata"),
                created_by=created_by,
                updated_by=created_by,
            )
            db.add(row)
            added += 1
    db.commit()
    return added
