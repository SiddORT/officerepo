---
name: Client = tenant multi-tenancy model
description: How multi-tenancy is modeled in Office Repo after it was reinstated as Client Management.
---

# Client = tenant

Multi-tenancy lives in the **Client Management** module (`backend/app/modules/client_management/`,
frontend `pages/superadmin/clients/`). A **Client IS the tenant** — one entity, no separate
Tenant/subscription-plan/feature-flag machinery, no `X-Tenant-ID` header, no tenant-resolver
middleware, no per-tenant request scoping. Tenancy is modeled as **data**, not request routing.

**Why:** the user explicitly asked to rebuild multi-tenant as a Client module where the client is
the tenant. This **overrides** the older "Multi-Tenant — REMOVED" preference that used to be in
section 11 of `replit.md` (that section was rewritten to describe this model). Do not "restore"
single-platform assumptions or delete the clients module on the basis of stale memory/preferences.

**How to apply:**
- Mirror the `lead_management` layered architecture (constants/validators/models/schemas/
  repository/service/router); superadmin JWT guard; platform DB (`get_platform_db`).
- **Database-per-client is DEFERRED**: `client_db_connections` only records the *intended*
  connection; `database_status` defaults to `"Not Provisioned"`. Real provisioning + a
  "Provision" button are future work — do not attempt to actually spin up DBs.
- Lead→Client conversion is duplicate-safe via the lead's converted flag + `clients.lead_id`
  reverse link; it creates Client + primary contact + subscription/db/admin placeholders + activity log.
- Currency is an ISO `currency_code` string (no Settings→Currency module exists — documented deviation).
