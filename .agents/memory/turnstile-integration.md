---
name: Cloudflare Turnstile integration
description: What "Turnstile-ready" actually requires across backend, CSP, and frontend
---

Making Turnstile genuinely "ready" (so flipping the secret on doesn't break the
form) requires three coordinated pieces, not just a backend siteverify call:

1. **Backend** verifies the token only when `TURNSTILE_SECRET_KEY` is set; when
   unset the control is inert and the form works unguarded (good dev default).
2. **CSP** must allow `https://challenges.cloudflare.com` in `script-src`,
   `connect-src`, AND `frame-src`, or the widget silently fails to load/verify.
3. **Frontend** must use explicit render (`api.js?render=explicit` +
   `window.turnstile.render`) with a callback that pushes the token into React
   state; a `data-callback="name"` attribute alone does nothing unless that
   global function exists. Also: gate submit on token presence, reset the widget
   on a 400 (tokens are single-use), and re-render the widget when returning to
   the form (key the effect on the submitted/visible state).

**Why:** a half-wired widget (div present but callback never fires) means the
backend rejects every submission the moment the secret is configured.
