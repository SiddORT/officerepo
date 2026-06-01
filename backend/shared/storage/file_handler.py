"""
Centralized, S3-ready file storage helper.

Design
------
Everything is addressed by a *storage key* — the rootless, folder-structure path
plus filename, e.g. ``platform/lead_documents/abc123.pdf`` or
``42/employee/photo/def456.png``. The convention is::

    {scope}/{module}/{entity}/{filename}

where ``scope`` is the tenant id for tenant files or ``"platform"`` for
platform-level files, and ``entity`` is optional. The storage *key* is the only
thing that should ever be persisted in the database — never a root prefix, never
a full URL.

A *driver* (currently :class:`LocalStorage`) turns a key into a physical
location now, and could turn it into an S3 object/URL later. Public vs. private
is a real distinction: public files are served from a base URL (a static mount
now, a CDN later); private files are auth-gated and only ever streamed through
authenticated download endpoints. Migrating to S3 means swapping the driver and
the base — the keys, folder structure and DB rows stay identical.
"""
import logging
import uuid
from enum import Enum
from pathlib import Path
from typing import Iterable, Optional

from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# ── Roots / served base ──────────────────────────────────────────────────────
# Local-disk roots per visibility. On S3 these become bucket prefixes; the
# served base becomes a CDN / signed-URL base. Callers never reference these.
PUBLIC_ROOT = Path("uploads")
PRIVATE_ROOT = Path("private_storage")

# Base under which public files are served. Static mount today; CDN base on S3.
PUBLIC_URL_BASE = "/uploads"

# Scope used for platform-level (non-tenant) files.
PLATFORM_SCOPE = "platform"


class Visibility(str, Enum):
    """Whether a stored object is openly served (PUBLIC) or auth-gated (PRIVATE)."""
    PUBLIC = "public"
    PRIVATE = "private"


# ── Validation vocabularies (single source of truth) ─────────────────────────
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv",
}
MAX_DOCUMENT_SIZE_MB = 15
MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024


# ── Key helpers ──────────────────────────────────────────────────────────────
def _unique_filename(original: str) -> str:
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def build_storage_key(
    scope: str | int,
    module: str,
    filename: str,
    entity: Optional[str] = None,
) -> str:
    """Compose a rootless storage key ``{scope}/{module}/{entity?}/{filename}``."""
    parts = [str(scope), module]
    if entity:
        parts.append(str(entity))
    parts.append(filename)
    return "/".join(p.strip("/") for p in parts)


def normalize_key(stored: str) -> str:
    """Return the rootless key for a stored value.

    Legacy rows persisted the full path *including* the root (``uploads/...`` or
    ``private_storage/...``). New rows store the rootless key. Stripping a known
    root prefix on read makes both work without a data migration.
    """
    s = str(stored).replace("\\", "/").lstrip("/")
    for root in (str(PUBLIC_ROOT), str(PRIVATE_ROOT)):
        prefix = root.strip("/") + "/"
        if s.startswith(prefix):
            return s[len(prefix):]
    return s


# ── Driver seam ──────────────────────────────────────────────────────────────
class LocalStorage:
    """Local-disk storage driver.

    A future ``S3Storage`` can implement the same surface (``physical_path`` →
    object key, ``url`` → CDN/signed URL, ``save``/``delete`` → bucket ops)
    without any caller changes.
    """

    def __init__(self, public_root: Path, private_root: Path, public_url_base: str):
        self._public_root = public_root
        self._private_root = private_root
        self._public_url_base = public_url_base.rstrip("/")

    def _root(self, visibility: Visibility) -> Path:
        return self._public_root if visibility == Visibility.PUBLIC else self._private_root

    def physical_path(self, key: str, visibility: Visibility) -> Path:
        return self._root(visibility) / key

    def save(self, key: str, contents: bytes, visibility: Visibility) -> None:
        dest = self.physical_path(key, visibility)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            f.write(contents)

    def delete(self, key: str, visibility: Visibility) -> None:
        try:
            p = self.physical_path(key, visibility)
            if p.exists():
                p.unlink()
        except Exception as exc:
            logger.warning("Failed to delete stored file (key=%r, visibility=%s): %s", key, visibility, exc)

    def exists(self, key: str, visibility: Visibility) -> bool:
        return self.physical_path(key, visibility).is_file()

    def url(self, key: str, visibility: Visibility) -> str:
        """Served URL for a PUBLIC key. PRIVATE files are never URL-addressable."""
        if visibility != Visibility.PUBLIC:
            raise ValueError("Private files are not directly URL-addressable.")
        return f"{self._public_url_base}/{key}"


# Active driver. Swap this line for ``S3Storage(...)`` to migrate.
storage = LocalStorage(PUBLIC_ROOT, PRIVATE_ROOT, PUBLIC_URL_BASE)


# ── Public resolver API (operates on stored keys) ────────────────────────────
def physical_path(stored_key: str, visibility: Visibility) -> Path:
    """Resolve a stored key (legacy full path tolerated) to a physical Path."""
    return storage.physical_path(normalize_key(stored_key), visibility)


def public_url(stored_key: str) -> str:
    """Resolve a stored key to its publicly served URL."""
    return storage.url(normalize_key(stored_key), Visibility.PUBLIC)


def file_exists(stored_key: str, visibility: Visibility) -> bool:
    return storage.exists(normalize_key(stored_key), visibility)


def delete_file(stored_key: Optional[str], visibility: Visibility) -> None:
    """Delete a stored file by its key (legacy full path tolerated)."""
    if not stored_key:
        return
    storage.delete(normalize_key(stored_key), visibility)


# ── Save API ─────────────────────────────────────────────────────────────────
def _store_bytes(
    contents: bytes,
    original_filename: Optional[str],
    *,
    scope: str | int,
    module: str,
    visibility: Visibility,
    allowed_extensions: Iterable[str],
    max_size_bytes: int,
    entity: Optional[str] = None,
    allowed_content_types: Optional[Iterable[str]] = None,
    content_type: Optional[str] = None,
) -> str:
    """Validate and persist already-read bytes; return the stored key."""
    if allowed_content_types is not None and content_type not in allowed_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{content_type}'.",
        )

    ext = Path(original_filename or "file").suffix.lower()
    if ext not in set(allowed_extensions):
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext or 'unknown'}'.")

    if len(contents) > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {max_mb} MB.")

    filename = _unique_filename(original_filename or "upload.bin")
    key = build_storage_key(scope, module, filename, entity)
    storage.save(key, contents, visibility)
    return key


async def save_upload(file: UploadFile, **kwargs) -> str:
    """Async save (reads via ``await file.read()``). Returns the stored key."""
    contents = await file.read()
    return _store_bytes(contents, file.filename, content_type=file.content_type, **kwargs)


def save_upload_sync(file: UploadFile, **kwargs) -> str:
    """Sync save (reads via ``file.file.read()``) for sync route handlers."""
    contents = file.file.read()
    return _store_bytes(contents, file.filename, content_type=file.content_type, **kwargs)


# ── Convenience wrappers ─────────────────────────────────────────────────────
async def upload_image(file: UploadFile, scope: str | int, module: str,
                       entity: Optional[str] = None) -> str:
    """Validate & store a PUBLIC image. Returns the rootless storage key."""
    return await save_upload(
        file,
        scope=scope,
        module=module,
        entity=entity,
        visibility=Visibility.PUBLIC,
        allowed_extensions=ALLOWED_IMAGE_EXTENSIONS,
        max_size_bytes=MAX_IMAGE_SIZE_BYTES,
        allowed_content_types=ALLOWED_IMAGE_TYPES,
    )


def save_document(file: UploadFile, scope: str | int, module: str,
                  entity: Optional[str] = None) -> tuple[str, str]:
    """Validate & store a PRIVATE document (sync).

    Returns ``(storage_key, original_filename)``.
    """
    key = save_upload_sync(
        file,
        scope=scope,
        module=module,
        entity=entity,
        visibility=Visibility.PRIVATE,
        allowed_extensions=ALLOWED_DOCUMENT_EXTENSIONS,
        max_size_bytes=MAX_DOCUMENT_SIZE_BYTES,
    )
    return key, (file.filename or Path(key).name)


def replace_image(old_key: Optional[str], new_file: UploadFile, scope: str | int,
                  module: str, entity: Optional[str] = None) -> str:
    """Delete the old PUBLIC image (if any), store the new one, return its key."""
    if old_key:
        delete_file(old_key, Visibility.PUBLIC)
    import asyncio
    return asyncio.get_event_loop().run_until_complete(
        upload_image(new_file, scope, module, entity)
    )
