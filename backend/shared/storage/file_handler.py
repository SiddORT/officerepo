"""
Centralized file upload/storage helper.
Strategy: local storage now; swap LocalStorage for S3Storage later.
"""
import os
import uuid
import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_ROOT = Path("uploads")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024


def _tenant_folder(tenant_id: int, module: str) -> Path:
    folder = UPLOAD_ROOT / str(tenant_id) / module
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _unique_filename(original: str) -> str:
    ext = Path(original).suffix.lower()
    return f"{uuid.uuid4().hex}{ext}"


def _sanitize_filename(filename: str) -> str:
    return "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()


async def upload_image(
    file: UploadFile,
    tenant_id: int,
    module: str,
) -> str:
    """
    Validate, store and return relative file path.
    Raises HTTPException on validation failure.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, GIF, WebP, SVG.",
        )

    ext = Path(file.filename or "file").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file extension '{ext}'.")

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE_MB} MB.",
        )

    folder = _tenant_folder(tenant_id, module)
    filename = _unique_filename(file.filename or "upload.bin")
    dest = folder / filename

    with open(dest, "wb") as f:
        f.write(contents)

    return str(dest)


def delete_file(file_path: str) -> None:
    """Delete a file by its stored path. Silently ignores missing files."""
    try:
        p = Path(file_path)
        if p.exists():
            p.unlink()
    except Exception:
        pass


def replace_file(
    old_path: str | None,
    new_file: UploadFile,
    tenant_id: int,
    module: str,
) -> str:
    """Delete old file (if any) synchronously, then upload new one. Returns new path."""
    if old_path:
        delete_file(old_path)
    import asyncio
    return asyncio.get_event_loop().run_until_complete(
        upload_image(new_file, tenant_id, module)
    )
