---
name: CORS single source of truth
description: Where the CORS policy lives and how officerepo.com subdomains are allowed.
---

The CORS policy is defined once in `backend/app/core/cors.py` (mirrors the
`security_headers.py` pattern). `backend/main.py` and
`backend/tests/test_cors_security.py` both import from it, so methods, headers,
and the origin regex cannot drift.

**Rule:** in non-development environments, `https://officerepo.com` and any
`https://<sub>.officerepo.com` are accepted via `allow_origin_regex`
(`OFFICEREPO_ORIGIN_REGEX`) IN ADDITION to the exact `ALLOWED_ORIGINS` list.
Development still uses the wildcard `*`; the production `*`-in-list guard in
settings is unchanged.

**Why:** tenant subdomains shouldn't have to be enumerated one-by-one in
ALLOWED_ORIGINS for the operator's officerepo.com deployment.

**How to apply:** change methods/headers/regex only in `cors.py`. The canonical
methods are `GET/POST/PATCH/DELETE` (no PUT routes exist; OPTIONS preflight is
handled by the middleware itself) and headers include `X-Tenant-ID`. If you add
a PUT route or a new request header, update `cors.py` and the test will follow.
