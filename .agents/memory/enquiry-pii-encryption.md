---
name: Enquiry PII encryption & dedup
description: Why encrypted enquiry columns need a blind-index hash for duplicate detection, and how keys are sourced.
---

# Enquiry PII encryption & duplicate detection

The public enquiry (`/api/v1/public/enquiries`) stores email/phone/message
**encrypted at rest** (Fernet/MultiFernet, `backend/shared/security/encryption.py`).

**Rule:** encrypted columns are not queryable, so duplicate detection cannot
`WHERE email = ?`. Instead store a deterministic HMAC blind index
(`dedupe_hash` = HMAC of normalized `email|company`) and query that.

**Why:** the spec requires duplicate detection on email+company within 24h, but
encryption produces a different ciphertext each call (Fernet has a random IV),
so equality checks on ciphertext never match. The blind index is the standard
"searchable encryption" workaround — deterministic, normalized (lowercase +
trim) before hashing so casing/whitespace variants collide.

**How to apply:** any future "find existing PII row" feature on encrypted columns
must add a matching blind-index column; never try to decrypt-and-scan.

**Keys:** `ENQUIRY_ENCRYPTION_KEYS` (comma-separated; first = primary for
encryption, rest for decrypt/rotation) else HKDF-derived from a stable base
secret. No user-provided secret is required for it to work.

**Gotcha — never derive from the sentinel:** settings marks unset secrets with
`"__unset__"` (which is *truthy*) and only aliases `SESSION_SECRET → JWT_SECRET`,
never the reverse. So derive from `JWT_SECRET` first (settings always resolves it)
and explicitly skip the sentinel, or you silently encrypt with a constant key.

**Gotcha — blind-index key must be rotation-stable:** derive the blind-index
HMAC key from the stable base secret (JWT_SECRET), NOT from the rotating primary
encryption key. If it tracks `ENQUIRY_ENCRYPTION_KEYS[0]`, rotating keys changes
every dedupe_hash and duplicate detection silently breaks for prior rows.

**Audit:** writes go through `backend/shared/audit/` and must store **masked**
PII only (`mask_email` → `j***e@acme.com`), never plaintext.
