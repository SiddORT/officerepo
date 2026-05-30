---
name: RBAC user lifecycle & permission catalog invariants
description: Durable rules for the invite/account lifecycle and the read-only permission catalog in the RBAC module.
---

# User lifecycle invariants
The single source of truth for "did this user ever onboard" is the latest invitation's `accepted_at`, NOT `is_active`. `is_active` only says whether the account is currently enabled. Derive status from both.

- **Status is derived, never stored**: active | inactive | invited | expired. `inactive` = accepted then deactivated (reactivatable); `invited`/`expired` = never accepted (pending).
- **Why distinguish inactive vs expired**: a deactivated-but-onboarded user must NOT be treated as a pending invite — otherwise the UI offers "resend/remove" instead of "reactivate", and a hard-delete would wipe an onboarded account. This was a real bug.
- **Guard rules (apply on every lifecycle action):**
  - Activate: only if the user has accepted (else 400 "not accepted yet"). Reject no-op toggles.
  - Deactivate: never self (400). Reject no-op toggles.
  - Resend invite: blocked if `is_active` OR already accepted (a resend issues a new invitation row, which would reset accepted state).
  - Hard delete: pending-only (never accepted). Onboarded users are deactivated, never deleted, to preserve audit trails. Default superadmin is never removable.
- Invite tokens: only the sha256 hash is stored; the raw token is returned once at invite/resend time. Frontend builds the copyable link from `window.location.origin + INVITE_ACCEPT_PATH` (robust against APP_BASE_URL/REPLIT_DOMAINS misconfig). Acceptance endpoints are PUBLIC (no auth) and validate revoked/accepted/expired.

# Permission catalog
- Catalog perms are **display + role-building only**. Existing leads/clients/enquiries routes still use the plain superadmin JWT guard — they are NOT rewired to enforce catalog perms. Only the new `user.*` perms are actually enforced (on the rbac /users endpoints). Don't assume a catalog entry implies a route enforces it.
- Catalog perms follow `module.action` naming; the action is the last dot-segment (view/create/update/delete/download).
