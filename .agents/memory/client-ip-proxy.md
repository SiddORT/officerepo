---
name: Client IP resolution behind Replit proxy
description: How to derive a non-spoofable client IP for rate limiting on Replit
---

For per-IP controls (rate limiting), do NOT trust the left-most
`X-Forwarded-For` entry — it is client-supplied and a bot can prepend arbitrary
fake IPs to rotate past a per-IP limit.

**Rule:** take the entry `TRUSTED_PROXY_HOPS` positions from the RIGHT of the XFF
chain (that segment is appended by trusted infrastructure), falling back to
`request.client.host`. The setting defaults to 1, which selects the right-most
entry — correct for Replit's single trusted proxy hop.

**Why:** trusted proxies append the real connecting IP at the end of the chain;
anything to the left of the trusted segment may be attacker-controlled.

**How to apply:** if Replit's edge ever adds another hop, bump
`TRUSTED_PROXY_HOPS` to match the number of trusted proxies, not a guess.
