---
name: Organization settings singleton + migration guard
description: Pattern for the organization_settings singleton row and the fix for an empty autogenerate migration when the table already existed at generation time.
---

# Organization settings singleton

- Fixed PK `id = "default"` — the repo upsert always targets this row; the service calls `get` → if None returns an empty-defaults dict (never 404).
- Gated by `org.view` (GET) and `org.update` (PATCH); both perms are in the catalog so the system Superadmin role always holds them.

# Empty migration body pitfall

When `alembic revision --autogenerate` is run while the target table ALREADY exists in the DB (because `create_all` ran first on a fresh DB), autogenerate finds no diff and emits an empty `pass` body.

**Fix:** in the upgrade function, guard with `inspector.get_table_names()` before `op.create_table`:

```python
def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "my_table" not in inspector.get_table_names():
        op.create_table("my_table", ...)
```

**Why:** The project bootstrap (`_run_migrations()` in main.py) runs `create_all` on fresh DBs then stamps head — so the table may exist before migrations run. On existing DBs being upgraded, the table may NOT exist, so the guard lets the migration create it safely on both paths. Without the guard, the migration silently skips the table on the second path.

**How to apply:** Any time autogenerate produces a `pass` body for a table that was present when you ran the command — check whether `create_all` beat you to it, and add the `inspector` guard.
