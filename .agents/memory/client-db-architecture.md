---
name: Per-client DB architecture
description: Portal user-management tables live in per-client DB, not the platform DB. How the split works and where the seams are.
---

# Per-Client DB Architecture (Portal User Management)

## The split

| DB | Tables |
|----|--------|
| Platform DB | `clients`, `client_admin_users`, all superadmin tables |
| Client DB (per-tenant) | `client_roles`, `client_user_roles`, `client_login_logs`, `client_user_sessions`, `client_portal_activity_logs` |

## Key files

- `backend/app/database/client_db.py` — `ClientBase`, `build_client_db_url(conn)`, `make_client_session(url)`, `provision_portal_schema(url)`
- `portal_user_management/models.py` — uses `ClientBase`; no cross-DB FKs (plain `String(36)` columns for platform refs)
- `portal_user_management/service.py` — all functions take `(platform_db, client_db, ...)` or just one of them
- `portal_user_management/router.py` — `_client_db_dep` FastAPI generator dep; FastAPI deduplicates `get_platform_db` across deps in same request

## URL building

`build_client_db_url(conn)` reuses the platform DB credentials (same PostgreSQL server) but swaps the database name. Passwords are NOT stored in `ClientDbConnection` — always derive from `PLATFORM_DB_URL`.

## Schema provisioning

`provision_portal_schema(url)` is called automatically inside `provision_database()` in `client_management/service.py` right after the PostgreSQL DB is created. It runs `ClientBase.metadata.create_all(engine)` (idempotent).

**Why:** Alembic cannot manage per-tenant DBs; each tenant DB must be bootstrapped separately when provisioned.

## 503 behaviour

If a portal endpoint is called when the client DB is not yet provisioned (`database_status != "Active"`), the `_client_db_dep` dependency raises HTTP 503 with a clear message.

## Alembic note

`portal_user_management/models.py` must NOT be imported in `alembic/env.py`. Models use `ClientBase` (not platform `Base`), so they won't pollute platform autogenerate. Schema is managed entirely by `provision_portal_schema`.

## Login session recording

`portal_auth/router.py` opens a client DB session inside the try/except after login, calls `uum_svc.record_login_session(client_db, platform_db, ...)`, then closes the client session. This is best-effort and never blocks login.
