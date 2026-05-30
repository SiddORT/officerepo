---
name: Naive UTC datetimes
description: Lead-management (and platform) datetime columns are naive UTC; any tz-aware input must be normalized before comparison.
---

# Naive UTC datetimes

All datetime columns in the lead-management module are stored **naive UTC**
(the code uses `datetime.utcnow()` everywhere, no tzinfo).

**Why:** SQLAlchemy comparisons silently break / raise when mixing aware and
naive datetimes, and the frontend sends ISO strings with a `Z` suffix
(`toISOString()`), which parse as tz-aware.

**How to apply:** When accepting datetime query params (e.g. calendar range
filters), parse with `datetime.fromisoformat(v.replace("Z","+00:00"))`, then if
`tzinfo is not None` convert with `.astimezone(timezone.utc).replace(tzinfo=None)`
before passing to repository range queries. Do NOT `.split("+")[0]` to drop the
offset — that mislabels non-UTC local times as UTC.
