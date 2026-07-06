---
name: Duplicate SQLAlchemy index names block schema provisioning
description: A column with index=True plus an explicit Index() of the same auto-generated name causes create_all to fail with DuplicateTable — and blocks ALL client-DB tables from provisioning, not just the offending module.
---

SQLAlchemy's default naming convention for `Column(..., index=True)` is `ix_<tablename>_<colname>`. If a model's `__table_args__` also declares `Index("ix_<tablename>_<colname>", "<colname>")` explicitly for the same column, `create_all` tries to create the same-named index twice in one DDL batch and raises `psycopg2.errors.DuplicateTable`.

**Why:** `provision_portal_schema` (in `backend/app/database/client_db.py`) creates every `ClientBase` table for a client DB in a single `create_all()` call. Any one module with this bug aborts the whole batch, so an unrelated module's request (e.g. recruitment) fails with a confusing error pointing at a totally different module's table (e.g. `leave_requests` or `expense_claims`). This bug pattern has recurred independently in multiple modules (leave_management, expense_management) — it's a copy-paste pattern, not a one-off typo.

**How to apply:** If `provision_portal_schema`/`create_all` fails with `DuplicateTable` on an `ix_*` name, don't assume it's a concurrency race — grep the whole `backend/app/modules/**/models.py` tree for columns with `index=True` whose column name matches an explicit `Index("ix_<table>_<col>", "<col>")` in the same class's `__table_args__`, and remove the redundant explicit `Index()` (the column-level `index=True` already creates it). Check every module, not just the one in the stack trace — there is often more than one.
