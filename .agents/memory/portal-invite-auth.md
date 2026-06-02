---
name: Portal Invite Auth Design
description: How client portal invite links work — token storage, JWT type, and public API client choice.
---

## Token storage
- Raw token: `secrets.token_urlsafe(32)` — returned to caller and embedded in invite link, **never persisted**.
- Stored: SHA-256 hex digest in `client_admin_users.invite_token_hash`.
- Validate/accept: hash the incoming token and query by hash.

## Portal JWT (`token_type: "portal_access"`)
- `create_portal_token` in `security.py` signs with `JWT_SECRET` but adds `token_type: "portal_access"`.
- `decode_portal_token` verifies this claim — rejects superadmin access tokens silently.
- Payload: `admin_user_id`, `client_id`, `subdomain`, `email`, `name`.
- Stored in `sessionStorage` as `portal_auth_{subdomain}` by `PortalAuthContext`.

## Public API calls use bare axios, not apiClient
`portalAuthApi` in `apiClient.js` uses `import axios from "axios"` directly.
`apiClient` has a request interceptor that injects `Authorization: Bearer {superadmin_token}`.
Portal validate/accept/login endpoints must NOT carry a superadmin token — they're public.

**Why:** If `apiClient` is used, the superadmin JWT interceptor fires and the backend may see
an unexpected token on a public route. Bare axios avoids any token injection.

## Workspace ID (subdomain OR client_id)
Invite links use `workspace_id = subdomain or client_id`. When a client has no domain
configured, `client_id` is used directly in the URL path and as the API path param.

`_get_client_by_workspace_id` (service.py): tries subdomain lookup via `ClientDomain` first;
falls back to direct `repo.get_client(db, workspace_id)` so client_id always works.
`_get_client_by_subdomain` is aliased to the same function for backward compatibility.

**Why:** Clients with no domains configured previously produced a broken link
(`/accept-invite?token=…` without a workspace segment) that hit the superadmin
AcceptInvitePage instead of the portal page. Now the link is always `/portal/{id}/accept-invite`.

## Password column
`client_admin_users.password_hash` (Text, nullable) — set on `accept_portal_invite`, verified on `portal_login`.
Invite token cleared (`invite_token_hash = None`) on accept so the link becomes single-use.
