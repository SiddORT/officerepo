---
name: RBAC permission resolution
description: How effective permissions are resolved and why it's per-request, not JWT-embedded.
---

# RBAC permission resolution

Effective permissions are resolved **per request** (DB lookup via the superadmin's
admin_roles → role_permissions), never embedded in the JWT. The login response and
`/auth/me` return the resolved set for the frontend, but the authoritative check is
the server-side `require_permission` guard reading live DB state each request.

A built-in **system role** (`is_system=true`, e.g. "Superadmin") resolves to the
wildcard `{"*"}`, meaning all permissions; the frontend `hasPermission` treats `"*"`
as "has everything". System roles cannot be edited/deleted and their assignment is
platform-managed (assign_roles preserves existing system-role rows).

**Why:** revocation/role changes must take effect immediately. If permissions were
baked into the JWT, a revoked admin would keep access until token expiry. Per-request
resolution makes a role edit effective on the very next request.

**How to apply:** when wiring a module behind a permission, add a
`require_permission("module.action")` dependency on the route — do not gate on a
claim read from the token. Frontend nav gating via `hasPermission` is UX only; the
server guard is the real boundary.
