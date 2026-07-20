from __future__ import annotations
import json
from typing import Any, Dict, List

from sqlalchemy.orm import Session

from backend.shared.security.encryption import encrypt_value, decrypt_value
from . import repository as repo
from .constants import CREDENTIAL_TYPES, NOTIFICATION_CHANNELS, MASTER_TYPE_LABELS
from .schemas import (
    GeneralSettingsOut, BrandingOut, LocalizationOut,
    NotificationChannelOut, CredentialOut, CommonMasterOut,
)


def _user_id(payload: dict) -> str:
    return str(payload.get("user_id", "system"))


# ── General ────────────────────────────────────────────────────────────────────

def get_general(db: Session, client_id: str) -> GeneralSettingsOut:
    row = repo.get_general(db, client_id)
    return GeneralSettingsOut.model_validate(row)


def update_general(db: Session, client_id: str, data: dict, payload: dict) -> GeneralSettingsOut:
    row = repo.update_general(db, client_id, data, _user_id(payload))
    return GeneralSettingsOut.model_validate(row)


# ── Branding ───────────────────────────────────────────────────────────────────

def get_branding(db: Session, client_id: str) -> BrandingOut:
    row = repo.get_branding(db, client_id)
    return BrandingOut.model_validate(row)


def update_branding(db: Session, client_id: str, data: dict, payload: dict) -> BrandingOut:
    row = repo.update_branding(db, client_id, data, _user_id(payload))
    return BrandingOut.model_validate(row)


def clear_branding_field(db: Session, client_id: str, field: str, payload: dict) -> BrandingOut:
    row = repo.clear_branding_field(db, client_id, field, _user_id(payload))
    return BrandingOut.model_validate(row)


# ── Localization ───────────────────────────────────────────────────────────────

def get_localization(db: Session, client_id: str) -> LocalizationOut:
    row = repo.get_localization(db, client_id)
    return LocalizationOut.model_validate(row)


def update_localization(db: Session, client_id: str, data: dict, payload: dict) -> LocalizationOut:
    row = repo.update_localization(db, client_id, data, _user_id(payload))
    return LocalizationOut.model_validate(row)


# ── Notification Channels ──────────────────────────────────────────────────────

def _enrich_channels(rows) -> List[dict]:
    meta = {ch["type"]: ch for ch in NOTIFICATION_CHANNELS}
    result = []
    for r in rows:
        ch_meta = meta.get(r.channel, {})
        result.append({
            "id":         r.id,
            "channel":    r.channel,
            "label":      ch_meta.get("label", r.channel),
            "icon":       ch_meta.get("icon", ""),
            "is_enabled": r.is_enabled,
            "updated_at": r.updated_at,
        })
    return result


def get_notification_channels(db: Session, client_id: str) -> List[dict]:
    rows = repo.get_notification_channels(db, client_id)
    return _enrich_channels(rows)


def update_notification_channel(
    db: Session, client_id: str, channel: str, is_enabled: bool, payload: dict
) -> dict | None:
    row = repo.update_notification_channel(db, client_id, channel, is_enabled, _user_id(payload))
    if not row:
        return None
    return _enrich_channels([row])[0]


# ── Credentials ────────────────────────────────────────────────────────────────

def _enrich_credentials(rows) -> List[dict]:
    meta = {ct["type"]: ct for ct in CREDENTIAL_TYPES}
    result = []
    for r in rows:
        ct_meta = meta.get(r.credential_type, {})
        result.append({
            "id":              r.id,
            "credential_type": r.credential_type,
            "label":           ct_meta.get("label", r.credential_type),
            "description":     ct_meta.get("description", ""),
            "is_configured":   r.is_configured,
            "updated_at":      r.updated_at,
        })
    return result


def get_credentials(db: Session, client_id: str) -> List[dict]:
    rows = repo.get_credentials(db, client_id)
    return _enrich_credentials(rows)


def update_credential(
    db: Session, client_id: str, credential_type: str,
    config: Dict[str, Any], payload: dict,
) -> dict | None:
    encrypted = encrypt_value(json.dumps(config))
    row = repo.update_credential(db, client_id, credential_type, encrypted, _user_id(payload))
    if not row:
        return None
    return _enrich_credentials([row])[0]


def clear_credential(db: Session, client_id: str, credential_type: str, payload: dict) -> dict | None:
    row = repo.clear_credential(db, client_id, credential_type, _user_id(payload))
    if not row:
        return None
    return _enrich_credentials([row])[0]


# ── Common Masters ─────────────────────────────────────────────────────────────

def list_common_masters(db: Session, client_id: str, master_type: str) -> dict:
    rows = repo.list_common_masters(db, client_id, master_type)
    return {
        "master_type": master_type,
        "label":       MASTER_TYPE_LABELS.get(master_type, master_type),
        "items":       [CommonMasterOut.model_validate(r) for r in rows],
        "total":       len(rows),
    }


def create_common_master(db: Session, client_id: str, master_type: str, data: dict, payload: dict) -> CommonMasterOut:
    row = repo.create_common_master(db, client_id, master_type, data, _user_id(payload))
    return CommonMasterOut.model_validate(row)


def update_common_master(db: Session, client_id: str, master_id: str, data: dict, payload: dict):
    row = repo.update_common_master(db, client_id, master_id, data, _user_id(payload))
    return CommonMasterOut.model_validate(row) if row else None


def delete_common_master(db: Session, client_id: str, master_id: str) -> bool:
    return repo.delete_common_master(db, client_id, master_id)


def seed_common_masters(db: Session, client_id: str, master_type: str, payload: dict) -> dict:
    added = repo.seed_common_masters(db, client_id, master_type, _user_id(payload))
    return {"seeded": added, "master_type": master_type}


def get_all_master_types(db: Session, client_id: str) -> List[dict]:
    from .constants import MASTER_TYPES
    result = []
    for mt in MASTER_TYPES:
        count = len(repo.list_common_masters(db, client_id, mt))
        result.append({
            "master_type": mt,
            "label":       MASTER_TYPE_LABELS.get(mt, mt),
            "count":       count,
        })
    return result
