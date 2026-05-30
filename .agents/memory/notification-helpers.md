---
name: Notification helpers
description: How the multi-channel notification helpers are structured and meant to be used
---

`backend/shared/notifications/` provides provider-agnostic helpers for email,
SMS, WhatsApp, and push. Use the singleton: `from backend.shared.notifications import notifier`.

**Design rules (keep these when extending):**
- All credentials come from env vars only (config.py). Never hardcode secrets.
- Every send returns a `NotificationResult` with a `status` of
  `SENT | FAILED | NOT_CONFIGURED`. Missing config returns `NOT_CONFIGURED` and
  logs a warning — it must NOT raise, so the app runs before creds are added.
  **Why:** the user wires the helpers up first and supplies creds later.
- One provider module per channel; swapping a vendor touches only that module.
  (e.g. push uses FCM legacy server key — replace push_provider for HTTP v1.)
- Recipients are masked via the audit `mask_*` helpers before any logging.

**How to apply:** to add a channel, subclass `BaseProvider`, add a config in
config.py with an `is_configured` property, and expose a `send_*` on `Notifier`.
