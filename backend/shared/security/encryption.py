"""
Field-level encryption helper.

Used to encrypt sensitive personal data (email, phone, message) at rest so that
the database never stores plaintext PII. Built on Fernet (AES-128-CBC + HMAC),
wrapped in MultiFernet so multiple keys can be active at once — this is what
makes seamless **key rotation** possible:

    - The FIRST key in the list is always used to encrypt new values.
    - ALL keys are tried (in order) when decrypting, so values encrypted with an
      older key keep decrypting after a new key is prepended.

To rotate keys: generate a new Fernet key, prepend it to ENQUIRY_ENCRYPTION_KEYS
(comma-separated), redeploy, then re-encrypt existing rows at leisure before
finally dropping the old key.

Key source (in priority order):
    1. settings.ENQUIRY_ENCRYPTION_KEYS — comma-separated urlsafe-base64 Fernet keys.
    2. Derived deterministically (HKDF-SHA256) from SESSION_SECRET / JWT_SECRET so
       the feature works out of the box without provisioning a new secret. The
       derivation is stable across restarts, so encrypted data remains readable.

Security notes:
    - This module NEVER logs plaintext or ciphertext values.
    - A separate deterministic ``blind_index`` (keyed HMAC-SHA256) is provided for
      equality lookups (e.g. duplicate detection) on values that are otherwise
      stored encrypted and therefore non-queryable.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
from functools import lru_cache
from typing import List, Optional

from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# Stable, non-secret salts/info labels for key derivation. Changing these would
# invalidate previously-derived keys, so they must remain constant.
_KDF_SALT = b"office-repo.enquiry.encryption.v1"
_KDF_INFO = b"field-encryption-key"
_BLIND_INDEX_INFO = b"office-repo.enquiry.blind-index.v1"

# Sentinel used by settings to mark an unset secret. Treated as "no value" here
# so we never derive a key from the literal placeholder string.
_SECRET_SENTINEL = "__unset__"


def _base_secret() -> str:
    """Return a stable application secret for key derivation.

    Prefers JWT_SECRET because settings always resolves it to a real value
    (explicit env, SESSION_SECRET alias, or a generated dev secret). The
    sentinel placeholder is ignored so a key is never derived from a constant.
    """
    from backend.app.config.settings import settings

    for name in ("JWT_SECRET", "SESSION_SECRET"):
        val = (getattr(settings, name, "") or "").strip()
        if val and val != _SECRET_SENTINEL:
            return val
    return ""


def _derive_fernet_key(base_secret: str) -> str:
    """Derive a urlsafe-base64 Fernet key from an arbitrary base secret via HKDF."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_KDF_SALT,
        info=_KDF_INFO,
    )
    raw = hkdf.derive(base_secret.encode("utf-8"))
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def _load_keys() -> List[str]:
    """Resolve the ordered list of Fernet keys (first = primary for encryption)."""
    from backend.app.config.settings import settings

    configured = (getattr(settings, "ENQUIRY_ENCRYPTION_KEYS", "") or "").strip()
    if configured:
        keys = [k.strip() for k in configured.split(",") if k.strip()]
        if keys:
            return keys

    # Fallback: derive deterministically from an existing secret so the feature
    # works without provisioning a dedicated key. Production should set a
    # dedicated ENQUIRY_ENCRYPTION_KEYS for cryptographic separation.
    base_secret = _base_secret()
    if not base_secret:
        raise RuntimeError(
            "No encryption key available: set ENQUIRY_ENCRYPTION_KEYS or ensure "
            "JWT_SECRET / SESSION_SECRET is configured."
        )
    return [_derive_fernet_key(base_secret)]


def _blind_index_key() -> bytes:
    """Derive the HMAC key for blind indexes from a STABLE application secret.

    Deliberately decoupled from the rotating encryption keys: rotating
    ENQUIRY_ENCRYPTION_KEYS must NOT change blind-index outputs, otherwise
    previously-stored dedupe hashes would stop matching and duplicate detection
    would silently break across a rotation.
    """
    base_secret = _base_secret()
    if not base_secret:
        raise RuntimeError(
            "No blind-index key available: ensure JWT_SECRET / SESSION_SECRET "
            "is configured."
        )
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_KDF_SALT,
        info=_BLIND_INDEX_INFO,
    )
    return hkdf.derive(base_secret.encode("utf-8"))


@lru_cache(maxsize=1)
def _multifernet() -> MultiFernet:
    keys = _load_keys()
    return MultiFernet([Fernet(k) for k in keys])


def reset_cache() -> None:
    """Clear the cached cipher — call after rotating keys at runtime/in tests."""
    _multifernet.cache_clear()


def encrypt_value(plaintext: Optional[str]) -> Optional[str]:
    """Encrypt a string. Returns None for None/empty input. Never logs the value."""
    if plaintext is None or plaintext == "":
        return None
    token = _multifernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_value(token: Optional[str]) -> Optional[str]:
    """Decrypt a token produced by encrypt_value. Returns None for None/empty.

    Raises ValueError if the token cannot be decrypted with any active key.
    """
    if token is None or token == "":
        return None
    try:
        plaintext = _multifernet().decrypt(token.encode("utf-8"))
    except (InvalidToken, ValueError, TypeError) as exc:
        # Do not include the token/plaintext in the error.
        raise ValueError("Unable to decrypt value with the configured keys.") from exc
    return plaintext.decode("utf-8")


def blind_index(*parts: str) -> str:
    """Deterministic keyed HMAC-SHA256 over the given parts for equality lookups.

    Use for duplicate detection on encrypted fields: identical inputs always map
    to the same hex digest, while the underlying value stays unqueryable. Parts
    are lower-cased and trimmed, then joined with a separator to avoid collisions
    between e.g. ("ab", "c") and ("a", "bc").
    """
    normalized = "|".join((p or "").strip().lower() for p in parts)
    return hmac.new(_blind_index_key(), normalized.encode("utf-8"), hashlib.sha256).hexdigest()
