---
name: Global portal email uniqueness
description: How cross-workspace email uniqueness is enforced for portal admin users and the email-first login flow.
---

## Rule
`client_admin_users.email_hash` (SHA-256 of lowercased email, unique index) enforces platform-wide email uniqueness across all workspaces. One email → one workspace, always.

**Why:** Multi-tenant login by email alone is ambiguous if the same email can exist in multiple client DBs. Global uniqueness removes the ambiguity, enabling a simple email→workspace lookup.

**How to apply:**
- `_assert_email_globally_unique(db, email, exclude_user_id=None)` — call before any create/update that sets an email on `ClientAdminUser`.
- `_email_hash(email)` — SHA-256 of `email.strip().lower()`.
- `lookup_workspace_by_email(db, email)` — public service fn, raises 404 if not found, returns `{subdomain, workspace_name}`.
- Endpoint: `POST /api/v1/portal/lookup-workspace` (no auth, registered on the portal_auth router prefix).
- Frontend flow: `/client-login` → email input → lookup API → redirect to `/portal/{subdomain}/login?email=...` → PortalLoginPage pre-fills email from `?email=` query param.
- Landing page "Sign In" / "Enter Workspace" now navigates to `/client-login` instead of showing the inline LoginPanel.
