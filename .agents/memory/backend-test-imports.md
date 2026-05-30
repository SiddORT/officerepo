---
name: Backend test import paths
description: How to import and run backend tests given the shadowing app/ directory at the workspace root
---

The workspace root contains an `app/` directory that shadows `backend/app/` when
Python resolves the bare `app` package.

**Why:** `backend/__init__.py` makes pytest treat the workspace root as the import
root, so `import app.config...` finds the wrong (root-level) `app`. `conftest.py`
in `backend/tests/` works around this *for pytest* by forcing `backend/` to
sys.path[0] and evicting stale `app.*` modules.

**How to apply:**
- pytest is NOT installed in this environment; the suites are `unittest.TestCase`.
- The app itself runs as `backend.main:app` from the workspace root, so the
  canonical import root is the workspace root using `backend.*` imports.
- For new test files, import via `backend.app.*` (not bare `app.*`) and run from
  the workspace root: `python -m unittest backend.tests.<module> -v`.
- `test_csp.py` uses bare `app.*` and only runs cleanly with cwd=`backend/`
  (`cd backend && python -m unittest tests.test_csp`); don't copy that pattern.

**Test-ordering artifact (pre-existing, not a regression):**
`test_settings_secrets_guard` asserts (via `assertLogs`) that importing
`backend.app.config.settings` emits a WARNING. That warning fires only on the
*first* import of the module. In a full-suite run any earlier test that imports
settings caches it, so the guard test sees no new warning and "fails". It passes
in isolation. Don't chase this when validating unrelated work — confirm by running
the suite without your new files; the failure count stays the same.
