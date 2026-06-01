---
name: RBAC invite system
description: Key design decisions for the user invite + permission system in Office Repo.
---

# RBAC invite system — key design decisions

## Permission resolution
- Holding ANY `is_system=True` role returns `{FULL_ACCESS}` ("*") which short-circuits every
  permission check. This means new catalog permissions are automatically granted to system-role
  holders without any migration.
- Permissions are resolved per-request from the DB (not baked into JWT) so revocations are
  instant.

**Why:** Baking permissions into JWT would mean a 7-day access-token lifetime could bypass
revocations. Per-request resolution pays a small DB cost for immediate consistency.

## Invitation lifecycle & `_is_onboarded` logic
- "Onboarded" = account has a usable password (inv is None OR inv.accepted_at is not None).
- Pending invite = `accepted_at is None AND is_revoked=False AND not expired`.
- Derived status (NOT stored): active → "active"; onboarded+inactive → "inactive"
  (re-activatable); pending → "invited"; revoked/expired → "expired".
- Only pending users can be hard-deleted. Onboarded users are deactivated only (preserve audit).

**Why:** Keeps audit trail for all users who ever accepted an invite, while allowing cleanup
of unsent/expired invites.

## Assign-roles endpoint
- `PUT /api/v1/superadmin/rbac/admins/{admin_id}/roles` (not POST, not "assign-roles")
- Full-replace semantics: the payload replaces the admin's non-system roles entirely.
- System roles held by the admin are ALWAYS preserved (re-added after clear) regardless of payload.

## Invite link building
- `APP_BASE_URL` env var overrides; falls back to first entry of `REPLIT_DOMAINS`.
- Raw token shown once to inviter (copyable link in UI); only SHA-256 hash stored in DB.
- Resending revokes all open (unaccepted, non-revoked) invitations before issuing a new token.
