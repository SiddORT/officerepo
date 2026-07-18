---
name: Hostname vs path tenant routing
description: How VITE_BASE_DOMAIN switches the portal between subdomain-based (production) and path-based (Replit/localhost) routing
---

## The rule
`TenantContext` is the single source of truth. Set `VITE_BASE_DOMAIN=uat.officerepo.com` in production; leave it unset (or empty) on Replit/localhost.

## How it works

**TenantContext.jsx** — runs `detectTenant()` once at module load (no re-renders):
- No `VITE_BASE_DOMAIN` → `{ tenant: null, mode: "path" }`
- Hostname === BASE_DOMAIN (main domain) → `{ tenant: null, mode: "path" }`
- Hostname ends with `.BASE_DOMAIN` → `{ tenant: "xyz", mode: "hostname" }`

Exports `{ tenant, mode, baseDomain }` via `useTenant()`.

**App.jsx** — `AppRoutes` early-returns `<ClientPortalPage />` when `mode === "hostname" && tenant`. This bypasses the entire main Routes tree. `TenantProvider` wraps the whole tree (outermost provider).

**ClientPortalPage.jsx**:
- Export reads `subdomain = tenantFromCtx ?? subFromUrl` (hostname mode gets it from context; path mode gets it from `useParams`)
- `PortalProtectedRoute` redirects to `"/login"` (hostname) or `` `/portal/${subdomain}` `` (path)
- `PortalRoutes` declares `const pp = (path) => mode === "hostname" ? path : \`/portal/${subdomain}${path}\`` and uses it for all 18+ `Navigate` destinations

**PortalLoginPage.jsx** — post-login: `navigate(mode === "hostname" ? "/dashboard" : \`/portal/${subdomain}/dashboard\`)`

**ClientLoginPage.jsx** — after workspace lookup:
- hostname mode: `window.location.href = \`${window.location.protocol}//${subdomain}.${baseDomain}/login?email=...\`` (uses `window.location.protocol`, NOT hardcoded `https://`)
- path mode: `navigate(\`/portal/${subdomain}/login?email=...\`)`

**PortalNavContext.jsx** — reads `{ token, subdomain }` from `usePortalAuth()` (not `useParams`)

## Backward compatibility
All `/portal/:subdomain/*` routes remain in `App.jsx` unchanged. Path mode is fully functional for Replit previews and localhost.

**Why:**
User requirement — same codebase must work on Replit, localhost, and VPS through `VITE_BASE_DOMAIN` config only. No infrastructure changes.

**How to apply:**
Any new portal route or internal Navigate in `ClientPortalPage` must use `pp("/path")` not a hardcoded `` `/portal/${subdomain}/path` ``. Any new cross-tenant redirect in `ClientLoginPage` must use `window.location.protocol`.
