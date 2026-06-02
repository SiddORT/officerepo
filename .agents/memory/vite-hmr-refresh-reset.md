---
name: Vite HMR @refresh reset for context files
description: Context files that export both a Provider component and a use* hook cause HMR cascade failures; fix with // @refresh reset pragma.
---

# Vite Fast Refresh — Context Files with Mixed Exports

## The Rule
Any file that exports BOTH a React component (e.g. `ThemeProvider`) AND a non-component function (e.g. `useTheme`) will trigger a "Could not Fast Refresh" invalidation. Add `// @refresh reset` as the very first line.

**Files that have this pragma:**
- `frontend-web/src/contexts/ThemeContext.jsx`
- `frontend-web/src/contexts/AuthContext.jsx`

## Why
Vite's React Fast Refresh plugin requires a file to export ONLY React components OR ONLY non-components (hooks, utils). Mixed files are "incompatible". Without the pragma, the invalidation cascades through all dependents and their HMR updates can race. In one case this caused `App.jsx` to fail its hot reload — the new route (`/superadmin/settings/general`) wasn't registered, so the catch-all `*` route matched, navigated to `/`, and LandingPage redirected logged-in users to `/dashboard`.

## How to Apply
When creating any new context file that exports both a Provider and a `use*` hook, add `// @refresh reset` as line 0 before the imports. This tells Vite to do a clean full-module reset (not selective fast refresh) when the file changes, which is safe and avoids the cascade race.

## Symptom
A protected route redirects to `/dashboard` (or any catch-all destination) after hot-reload. The browser console shows `"[hmr] Failed to reload /src/App.jsx"`.
