---
name: App factory & lifespan DB bootstrap
description: How backend/main.py is structured so tests can boot the real app without touching the DB, and the import-path gotcha that follows.
---

`backend/main.py` exposes `create_app(app_settings=settings)` which wires routers
+ middleware but performs NO database side-effects at construction time. All DB
bootstrap (create_all, idempotent ALTER migrations, secret-rotation timestamp
sync, superadmin seed) lives in `init_database()`, which runs ONLY from the
lifespan startup hook. The module-level `app = create_app()` is what
`backend.main:app` serves.

**Why:** importing the app used to run create_all/migrations/seeding at import
time, so tests couldn't import the genuine app object and had to re-assemble the
middleware stack by hand (risking drift). The factory + lifespan split lets tests
do `TestClient(create_app(settings))` (no `with`) to exercise the real wiring
without ever hitting the DB — a plain TestClient does not enter the lifespan.

**How to apply:**
- To exercise the real app in a test without a DB: build settings, then
  `TestClient(create_app(settings))` WITHOUT the `with` context manager.
- The real app exposes `/health` (not `/ping`) — target a route it actually
  serves.
- Import-path gotcha: main.py imports via `backend.app.*`, so the cors-rejection
  monitor it wires is the module `backend.app.core.cors_monitor` (logger name
  `backend.app.core.cors_monitor`), which is a DISTINCT object from the bare
  `app.core.cors_monitor` most test files import. When asserting the real app's
  monitor logs or clearing its `_last_alert_at` throttle, reference the
  `backend.app.core.*` module, not the bare `app.core.*` one.
