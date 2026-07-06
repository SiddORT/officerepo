---
name: Vite dev server sends its own separate CSP header
description: Frontend allowlist changes (e.g. new external API for a fetch call) must be made in vite.config.js's dev CSP, not just the backend's CSP module.
---

The Vite dev server (`frontend/vite.config.js`) sets its own `Content-Security-Policy`
response header (a `DEV_CSP` constant with a relaxed `script-src`/`connect-src` for HMR)
independently of the backend's CSP header (`backend/app/core/security_headers.py`).

**Why:** Since the frontend HTML/JS is served BY the Vite dev server (not proxied through
the backend), the browser enforces Vite's CSP header for frontend-originated fetches —
not the backend's. Adding an allowed origin only to the backend's `CSP_POLICY` has no
effect on client-side `fetch()` calls made from pages served by Vite; the browser will
still block them under Vite's stricter `connect-src`.

**How to apply:** Whenever a frontend feature needs to fetch a new external origin
client-side (e.g. a third-party lookup API), add that origin to `connect-src` in BOTH
`backend/app/core/security_headers.py` (CSP_POLICY, for production/SSR-style responses)
AND `frontend/vite.config.js` (DEV_CSP, for the dev server) — otherwise it silently works
in one environment and breaks in the other.
