---
name: .env files are unwritable
description: The platform blocks writing any .env file; use .env.example instead.
---

The `write` tool refuses to create or edit any `.env` file (root or nested,
e.g. `frontend/.env`) — it's treated as a secrets anti-pattern.

**Why:** prevents accidental secret exposure on the filesystem.

**How to apply:** when a task asks for a local `.env`, commit a `.env.example`
template instead and rely on git-ignore for the real `.env`. Development runs
fine without a `.env` because `backend/app/config/settings.py` has dev
fallbacks. Real secrets are provided via the platform env/secrets, not files.
