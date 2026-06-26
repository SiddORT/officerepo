---
name: CSP blocks external images — use emoji flags
description: Why country-flag images don't render and the CSP constraint behind it
---

The app sends a strict Content-Security-Policy with `img-src 'self' data:`
(see `backend/app/core/security_headers.py`). Any `<img src="https://...">`
to an external host (e.g. `flagcdn.com`) is silently blocked — the image just
doesn't appear, no JS error.

**Rule:** for country pickers / flags in the frontend, use Unicode emoji flags
(derived from ISO-2 via regional-indicator code points) rather than external
flag-image CDNs. The landing-page `PhoneInput` already does this.

**Why:** loosening `img-src` to allow a CDN weakens the CSP for the whole app;
emoji flags are zero-network, CSP-safe, and consistent with existing components.

**How to apply:** `flagEmoji(iso2)` in `frontend/src/constants/countryCodes.js`
converts an ISO-2 code to its emoji. Reuse it; don't add external image hosts to CSP.
