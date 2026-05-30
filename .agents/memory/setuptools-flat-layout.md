---
name: setuptools flat-layout deployment build
description: Why the deployment build needs explicit setuptools package discovery in pyproject.toml.
---

# setuptools flat-layout build failure

The deployment build runs `pip install -e .`. The repo root holds several top-level
directories (`app/`, `backend/`, plus data dirs `uploads/`, `attached_assets/`,
`private_storage/`). With no explicit package config, setuptools flat-layout
auto-discovery sees multiple top-level candidates and aborts:
"Multiple top-level packages discovered in a flat-layout".

**Rule:** `pyproject.toml` must declare a `[build-system]` and pin
`[tool.setuptools.packages.find]` to the real package only (`include = ["backend*"]`,
`namespaces = false`), excluding the data dirs.

**Why:** the data dirs are not packages, and the production server imports
`backend.app.*` — never the legacy top-level `app/` package (that one is used only by
tests, which resolve it via the working directory, not the installed wheel). So the
editable install only needs `backend`.

**How to apply:** if a new top-level dir appears at repo root and the deployment build
starts failing on package discovery, do NOT widen `include`; add the dir to `exclude`
(or keep `include` narrowed to `backend*`). Verify with `pip install -e .` +
`python -c "import backend.main"`.
