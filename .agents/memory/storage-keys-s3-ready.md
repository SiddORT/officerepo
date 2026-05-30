---
name: S3-ready storage keys
description: How file storage is addressed (rootless keys + driver seam) and why DB rows must never store roots/URLs.
---

# S3-ready storage layer

All file storage goes through `backend/shared/storage/file_handler.py`. There is
one helper for both public images and private documents — no module hand-rolls
its own saver.

**Key convention:** DB stores a *rootless storage key* only —
`{scope}/{module}/{entity?}/{filename}` (scope = tenant id, or `"platform"` for
platform-level lead files). e.g. `platform/lead_documents/abc123.pdf`. Never
store the root prefix (`uploads/`, `private_storage/`) and never store a full URL.

**Why:** migrating to S3 then = swap the driver + base only; keys, folder
structure and DB rows stay identical. Storing roots/URLs would couple rows to
local disk and force a data migration on any move.

**How to apply:**
- Save: `save_document(file, scope, module)` (private, sync) or
  `upload_image(file, scope, module)` (public, async). Both return the key.
- Resolve to disk: `physical_path(key, Visibility.PRIVATE|PUBLIC)`.
- Public URL: `public_url(key)` (→ `PUBLIC_URL_BASE`, currently `/uploads`).
- Delete: `delete_file(key, visibility)`.
- Driver seam: module-level `storage = LocalStorage(...)`. Swap that one line
  for `S3Storage(...)` (same surface: physical_path/save/delete/exists/url) to
  migrate — callers unchanged.

**Legacy rows:** older rows persisted the full path (`private_storage/...` /
`uploads/...`). Chosen approach = strip the known root prefix *on read* via
`normalize_key` (no data migration). All resolver functions call it, so both old
full-path rows and new rootless keys resolve correctly.

**Visibility is real:** PUBLIC = served from a base URL (static mount now, CDN
later); PRIVATE = auth-gated, only streamed through authenticated download
endpoints (FileResponse), never URL-addressable (`storage.url` raises for private).
