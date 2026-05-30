---
name: CORS silent rejection logging
description: How blocked cross-origin requests are made diagnosable server-side
---

Starlette's `CORSMiddleware` rejects disallowed origins **silently**: simple
requests are served without `Access-Control-Allow-Origin` (the browser throws an
opaque CORS error) and preflights get a bare HTTP 400 — neither is logged. A
typo'd `ALLOWED_ORIGINS` entry or missing tenant subdomain is therefore invisible
on the server.

**Solution:** a separate `http` middleware (`make_cors_rejection_logger`, in
`backend/app/core/cors_monitor.py`) inspects the incoming `Origin` and, when it
would be rejected, logs a WARNING and optionally fires a webhook. Origin matching
lives in `backend/app/core/cors.py::is_origin_allowed` and must mirror what
`build_cors_kwargs` actually accepts (exact `ALLOWED_ORIGINS` list + the
officerepo subdomain regex; dev wildcard allows everything; no-Origin = allowed).

**Why:** keep the matching logic in `cors.py` (single source of truth) so the
monitor can't drift from the real CORSMiddleware policy.

**How to apply:**
- It's a no-op in development (wildcard rejects nothing).
- The WARNING log is always emitted; only the webhook is throttled per-origin
  via `CORS_REJECTION_ALERT_COOLDOWN_MINUTES` (in-memory `_last_alert_at`, resets
  on restart) so a retrying bad client can't flood the receiver.
- Webhook reuses the `SECRET_ROTATION_ALERT_*` pattern (URL/severity/env_tag).
- `mask_origin` truncates the attacker-controlled Origin before logging.
- `cors_monitor` dual-imports cors helpers (try `backend.app...` then `app...`)
  because the workspace root has a shadowing `app/` package.

**Persistence + admin panel:** rejections are also recorded (aggregated one row
per masked origin: hit_count, last method/path, first/last seen) in the
`cors_rejections` table via `backend/app/modules/cors_report/` and surfaced in
the superadmin SecurityPage (`GET /api/v1/superadmin/cors-rejections`).
- The masked (truncated) origin is what gets stored — never persist the raw
  attacker-controlled Origin verbatim.
- DB writes happen from the async middleware via `asyncio.to_thread` and are
  fully guarded (`record_rejection_event` never raises) so persistence can never
  break request handling.
