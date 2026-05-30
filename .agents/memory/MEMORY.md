# Project Memory — Office Repo

- [Backend test import paths](backend-test-imports.md) — workspace root has a sibling `app/` that shadows `backend/app`; use `backend.app.*` imports and run unittest from workspace root.
- [Client IP behind Replit proxy](client-ip-proxy.md) — left-most X-Forwarded-For is spoofable; take the entry N hops from the RIGHT (TRUSTED_PROXY_HOPS, default 1).
- [Cloudflare Turnstile integration](turnstile-integration.md) — explicit-render widget + CSP allowances + frontend token gating are all required for it to be genuinely "ready".
