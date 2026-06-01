---
name: Alembic migration setup
description: How Alembic is configured and the workflow for new schema changes.
---

# Alembic migration setup

## Structure
- `alembic.ini` — at workspace root; `script_location = alembic`; `sqlalchemy.url` is a placeholder (always overridden by env.py)
- `alembic/env.py` — imports `Base` + ALL models; reads `DATABASE_URL` from env; uses `NullPool` for `engine_from_config`
- `alembic/versions/` — all revision files
- First revision: `c4e495a6b65e_initial_schema.py` — NOT NULL fixes on enquiry cols + 2 missing indexes (already applied to live DB)

## How startup works
`_run_migrations()` in `backend/main.py` runs `alembic upgrade head` programmatically via:
```python
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
cfg = AlembicConfig("alembic.ini")
alembic_command.upgrade(cfg, "head")
```
`alembic.ini` is read from the working directory, so the server must start from workspace root (uvicorn command uses `cd /home/runner/workspace`).

## Adding new migrations
```
alembic revision --autogenerate -m "short description"
# review alembic/versions/<hash>_short_description.py
# commit — applied automatically on next startup
```

## Model registration
`alembic/env.py` must import every model module. When adding new model files, add the import there AND in `backend/main.py` (for `Base.metadata`).

## Legacy system
The old custom `MigrationService` + `MIGRATIONS` registry were retired. `schema_migrations` table remains (historical audit). `backend/app/database/migrations/model.py` kept for that table.

**Why replaced:** Alembic provides proper revision chain, downgrade support, and autogenerate — the custom IF NOT EXISTS approach was idempotent but had no downgrade path or drift detection.
