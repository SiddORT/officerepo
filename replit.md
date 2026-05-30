# Office Repo — Lead Management & Sales Pipeline Platform

A production-grade single-platform app with FastAPI backend, React + Tailwind frontend, and PostgreSQL database. Surface area: public Landing + Enquiry capture and a superadmin Lead CRM (with superadmin auth/security). The multi-tenant system was removed; this is now a single platform (no tenants/subscriptions/plans/feature-flags/employee modules).

## Architecture

### Design
- **Platform DB** — PostgreSQL (Replit built-in) stores everything: superadmins, platform_config, enquiries, leads + lead child tables, audit_logs.
- **Auth** — superadmin JWT (access + refresh). No tenant scoping.

### Repository Structure
```
backend/
  main.py                      FastAPI entry point, creates tables, seeds superadmin, lifespan
  app/
    config/settings.py         Environment config (DATABASE_URL, JWT_SECRET, etc.)
    core/
      security.py              JWT creation/decoding, bcrypt password hashing, kid embedding
      deps.py                  Superadmin JWT guard dependency
      secret_rotation_monitor.py  Async background monitor for stale PREVIOUS_* secrets
    database/
      platform.py              DB engine + session (get_platform_db)
    platform/
      superadmin/              SuperAdmin model + secret rotation routers
      config/                  PlatformConfig model
    modules/
      auth/                    Superadmin login, refresh, logout
      lead_management/         Lead & Sales Pipeline CRM (superadmin)
                               constants/validators/models/schemas/repository/service/router
                               leads + 8 child tables (activities, demos, follow-ups, notes,
                               documents, proposals, negotiations, conversions)
      enquiry/                 Public GDPR-aware enquiry capture
      csp_report/              CSP violation reporting
  shared/storage/             Storage helper (public uploads/ + private_storage/ roots)
  shared/notifications/       Multi-channel notification helpers (email/SMS/WhatsApp/push):
                              base + config + dispatcher + one provider module per channel

frontend-web/
  public/
    ort-logo-dark.png          ORT logo — white text on black (dark theme, use with mix-blend-mode: screen)
    ort-logo-light.jpg         ORT logo — dark text on white (light theme)
  src/
    App.jsx                    Router setup, protected routes
    contexts/AuthContext.jsx   Auth state, login/logout
    services/apiClient.js      Axios client with JWT interceptor + auto-refresh
    pages/
      landing/LandingPage.jsx  Futuristic public landing page (route: /)
      login/AdminLoginPage.jsx Superadmin login (routes: /login and /admin) — full-bleed office background + floating glassmorphic card with mouse-driven 3D tilt, cyan accent
      dashboard/DashboardPage  Superadmin overview (quick links to Leads/Calendar/Security/API docs)
      superadmin/leads/        Lead CRM: LeadList, CreateLead, EditLead, LeadDetails,
                               CalendarPage (month grid of demos/follow-ups/next-actions)
                               (tabs: Overview, Spokespersons, Activities, Demos, Follow-ups,
                               Notes, Documents, Proposals, Negotiations, Conversions, Timeline);
                               LeadList shows a "Needs attention" notifications panel;
                               LeadDetails header has Auto/Hot/Warm/Cold score override control;
                               components/ (StageBadge, ScoreBadge, Timeline, LeadForm);
                               constants.js (helpers + enum→option mappers)
    components/Layout.jsx      Sidebar nav (incl. Calendar for superadmin), logout → /;
                               NotificationBell dropdown (superadmin) → due/overdue items
```

## Running

| Service  | Port | URL            |
|----------|------|----------------|
| Frontend | 5000 | Preview pane   |
| Backend  | 8000 | /docs for API  |

The frontend proxies `/api` to the backend via Vite.

## Default Credentials

| Role       | Email                   | Password  |
|------------|-------------------------|-----------|
| Superadmin | admin@officerepo.com    | admin123  |

## Routing
- `/` → LandingPage (public)
- `/login` → AdminLoginPage (superadmin login, redirect to dashboard if logged in)
- `/admin` → AdminLoginPage (same superadmin login; full-bleed office background + floating glass card with 3D tilt, cyan accent)
- `/dashboard` → protected
- `/superadmin/leads/calendar` → protected (superadmin Calendar; route declared before `/leads/:id`)
- `/superadmin/security` → protected (secret rotation status)
- `/contact` → EnquiryPage (public lead capture / "Request Demo" form)
- `/privacy-policy` → PrivacyPolicyPage (public, linked from enquiry consent)
- Unknown routes → `/`
- Logout → navigates to `/`

## Branding
- **Product**: Office Repo — "Unified Workplace Management"
- **Made by**: ORT (One Roof Tech) — logo files in `frontend-web/public/`
- The login page shows: Office Repo wordmark + tagline above card, "by ort_" in card footer

## API Routes

```
POST /api/v1/auth/superadmin/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

# Superadmin — secret rotation
POST /api/v1/superadmin/rotate-secrets
GET  /api/v1/superadmin/rotation-status

POST /api/v1/public/enquiries        (public; GDPR-aware lead capture)

# Lead Management & Sales Pipeline (superadmin)
GET    /api/v1/superadmin/leads/meta/options
GET    /api/v1/superadmin/leads/dashboard               (stats + due/overdue counts + notifications[])
GET    /api/v1/superadmin/leads/calendar/events         (?start&end ISO — demos/follow-ups/next-actions)
GET    /api/v1/superadmin/leads                          (list: page/page_size/sort/search/filters)
POST   /api/v1/superadmin/leads                          (body may include spokespersons[] = non-primary contacts)
GET    /api/v1/superadmin/leads/{lead_id}
PATCH  /api/v1/superadmin/leads/{lead_id}
DELETE /api/v1/superadmin/leads/{lead_id}                (soft delete)
POST   /api/v1/superadmin/leads/{lead_id}/stage          (advance pipeline stage)
POST   /api/v1/superadmin/leads/{lead_id}/lost           (mark lost + reason)
POST   /api/v1/superadmin/leads/{lead_id}/score-label    (manual Hot/Warm/Cold override; null = auto)
GET/POST/PATCH/DELETE  .../leads/{lead_id}/spokespersons[/{spokesperson_id}]
GET/POST/PATCH/DELETE  .../leads/{lead_id}/activities[/{activity_id}]
GET/POST/PATCH/DELETE  .../leads/{lead_id}/demos[/{demo_id}]
GET/POST/PATCH/DELETE  .../leads/{lead_id}/followups[/{followup_id}]
GET/POST/DELETE        .../leads/{lead_id}/notes[/{note_id}]
GET/POST/DELETE        .../leads/{lead_id}/documents[/{document_id}]
GET    .../leads/{lead_id}/documents/{document_id}/download   (authenticated FileResponse)
GET/POST/PATCH         .../leads/{lead_id}/proposals[/{proposal_id}]
GET    .../leads/{lead_id}/proposals/{proposal_id}/download   (authenticated FileResponse)
GET/POST               .../leads/{lead_id}/negotiations
GET    /api/v1/superadmin/leads/{lead_id}/timeline
GET    /api/v1/superadmin/leads/{lead_id}/conversions
POST   /api/v1/superadmin/leads/{lead_id}/convert-to-client   (only stage=Won)
POST   /api/v1/superadmin/leads/convert-enquiry/{enquiry_id}  (idempotent)
```

## Public Enquiries (GDPR-aware lead capture)
- `POST /api/v1/public/enquiries` — no auth. Body: `full_name`, `work_email`,
  `phone_number`, `company_name`, `interested_module?`, `message`,
  `consent_given` (required `true`), `marketing_consent?`, `referrer_url?`,
  `website_url` (honeypot — must stay empty), `turnstile_token?`.
- **PII at rest is encrypted** (email/phone/message via Fernet/MultiFernet).
  A `dedupe_hash` (HMAC of `email|company`) enables duplicate detection since
  encrypted columns can't be queried.
- **Consent**: `consent_given` + `consent_timestamp`, `marketing_consent` +
  `marketing_consent_timestamp` stored independently; `privacy_policy_version`
  recorded per submission. Compliance fields: `retention_until`,
  `deletion_requested`, `deletion_requested_at`.
- **Spam controls**: honeypot (`website_url`), duplicate detection (email+company
  within 24h → 409), rate limit 5/IP/hr (→ 429), stores `ip_address`,
  `user_agent`, `referrer_url`. Honeypot trips silently.
- Each row gets an `enquiry_number` (`ENQ-YYYYMMDD-XXXXXXXX`).
- Audit entries written via `backend/shared/audit/` with **masked PII**
  (e.g. `j***e@acme.com`).

## Lead Management & Sales Pipeline (superadmin)
- **Scope**: platform-scoped, superadmin JWT guard, platform DB (`get_platform_db`).
- **Tables** (UUID `String(36)` PKs): `leads` + 8 child tables — activities, demos,
  follow-ups, notes, documents, proposals, negotiations, conversions. Standard
  `created_at`/`updated_at`/`is_deleted`/`deleted_at` columns; `created_by` where applicable.
- **PII at rest encrypted** (contact email/phone via shared encryption helper);
  `dedupe_hash` blind index for duplicate detection.
- **Pipeline stages** ordered (see `STAGE_ORDER`, includes "No Response" after Contacted);
  `/stage` advances, `/lost` records reason. Each lead gets a `lead_number`
  (`LEAD-YYYYMMDD-XXXXXXXX`).
- **Lead scoring** computed from demo/proposal/revenue/company-size/users →
  Hot / Warm / Cold (`ScoreBadge`). A manual `score_label_override` (set via
  `/score-label`, null = auto) takes precedence over the computed label.
- **Phone country code**: leads store a plaintext `country_code` alongside the encrypted phone.
- **Spokespersons**: each lead can have multiple contacts (name/designation/email/phone/
  country_code/is_primary); email & phone are encrypted PII. CRUD writes masked-PII audit entries.
  The lead's legacy `contact_*` columns mirror **exactly one primary** LeadSpokesperson row;
  additional people are non-primary rows. Lead create/update accept a `spokespersons[]` array
  (each may carry an `id` on update; `update_lead` reconciles via full-replace of non-primary rows)
  and the lead form edits them inline (top contact fields = primary; "Additional Spokespersons"
  section = non-primary). Sync is bidirectional: editing legacy contact fields updates the primary
  row and vice-versa; demoting/deleting a primary promotes the next remaining contact.
  `get_lead_detail` returns only non-primary rows (for edit prefill).
- **Activities** carry a free-text `next_action` (what to do next) plus `next_action_date`.
  The timeline explicitly surfaces both `next_action` and `next_action_date` on activity events
  (detail text appends "(by YYYY-MM-DD)").
- **Dashboard notifications**: `/dashboard` returns due/overdue counts + a `notifications[]`
  list (type, urgency=due|overdue, date, lead_id, lead_name, title) surfaced in the LeadList
  panel and the topbar NotificationBell.
- **Calendar**: `/calendar/events?start&end` returns scheduled demos + pending follow-ups +
  activity next-actions ({id,type,date,lead_id,lead_name,title,status}); times are naive UTC
  (router `_parse_dt` normalizes tz-aware input to UTC-naive to match DB columns).
- **Conversion metrics** computed: lead age, sales cycle, time-to-demo, time-to-proposal,
  time-to-conversion (surfaced in the Conversions tab).
- **Convert Enquiry→Lead**: idempotent (reuses existing lead via `source_enquiry_id`,
  ignoring soft-delete). **Convert Lead→Client**: only when stage = Won; marks the lead
  converted and records a `lead_conversions` row (client_name + sales-cycle metrics) +
  audit entry. No tenant/subscription is created (multi-tenant removed; conversion is a
  record-only step to be rebuilt later).
- **Document/proposal files are PRIVATE**: stored under `LEAD_PRIVATE_STORAGE_ROOT`
  (`private_storage/`, NOT the public `/uploads` mount) with randomized filenames.
  Downloads go through **authenticated** endpoints returning `FileResponse` (superadmin
  guard). API list responses expose `has_file` + a download `url`; the frontend fetches
  the blob with the JWT and triggers a browser download (a plain `<a href>` would not
  carry auth). `uploads/` and `private_storage/` are gitignored.
- Mutations write **masked-PII audit entries** via `backend/shared/audit/`.

## JWT Payload
```json
{
  "user_id": 1,
  "role": "superadmin",
  "device_type": "web",
  "email": "admin@officerepo.com"
}
```

## Environment Variables
```
DATABASE_URL                        PostgreSQL connection string (auto-set by Replit)
JWT_SECRET                          JWT signing key (falls back to SESSION_SECRET)
REFRESH_SECRET                      Refresh token signing key
PREVIOUS_JWT_SECRET                 Old JWT secret during grace period rotation
PREVIOUS_REFRESH_SECRET             Old refresh secret during grace period rotation
PREVIOUS_SECRET_ISSUED_AT           ISO-8601 UTC timestamp when rotation was done
PREVIOUS_SECRET_GRACE_HOURS         Grace period in hours (default: 168 = 7 days)
PREVIOUS_SECRET_CHECK_INTERVAL_HOURS  How often monitor runs (default: 1)
ROTATE_SECRETS_COOLDOWN_MINUTES     Min minutes between rotations via API (default: 60, 0 disables)
SECRET_ROTATION_ALERT_URL           Optional webhook URL for stale-secret alerts
ENVIRONMENT                         development | production (default: development)
ALLOWED_ORIGINS                     Comma-separated CORS origins (auto-detects REPLIT_DOMAINS)
ENQUIRY_ENCRYPTION_KEYS             Comma-separated Fernet keys for enquiry PII (1st = primary
                                    for encryption, rest for decryption/rotation). Falls back to
                                    a key derived from SESSION_SECRET/JWT_SECRET via HKDF.
PRIVACY_POLICY_VERSION              Privacy policy version stamped on enquiries (default: 1.0)
ENQUIRY_RETENTION_DAYS              Days until enquiry retention_until expiry (default: 365)

# Notifications (all optional — each channel stays disabled until its vars are set)
SMTP_HOST                           SMTP server host (enables email)
SMTP_PORT                           SMTP port (default: 587)
SMTP_USERNAME                       SMTP login username
SMTP_PASSWORD                       SMTP login password
SMTP_FROM                           From address (falls back to SMTP_USERNAME)
SMTP_USE_TLS                        STARTTLS toggle (default: true)
TWILIO_ACCOUNT_SID                  Twilio account SID (enables SMS + WhatsApp)
TWILIO_AUTH_TOKEN                   Twilio auth token
TWILIO_SMS_FROM                     Twilio SMS sender number (enables SMS)
TWILIO_WHATSAPP_FROM                Twilio WhatsApp sender (enables WhatsApp; "whatsapp:" auto-prefixed)
FCM_SERVER_KEY                      Firebase Cloud Messaging server key (enables push)
```

## Stack
- **Python 3.11** + **FastAPI** + **SQLAlchemy** + **psycopg2** + **httpx**
- **Node 18** + **React 18** + **Vite** + **TailwindCSS** + **Axios**
- **PostgreSQL** (Replit built-in)

---

## User Preferences & Development Standards

> These standards apply to ALL future work on this project.

### 1. Code Architecture

**Backend — clean layered architecture (mandatory):**
- `router` layer — HTTP endpoints only, delegates to service
- `service` layer — business logic
- `repository` layer — DB queries only
- `schema` layer — Pydantic request/response models
- `model` layer — SQLAlchemy ORM models

**Frontend — structured and reusable:**
- Reusable components in `src/components/`
- Centralized API client (`src/services/apiClient.js`)
- Reusable form components and validation utilities
- Centralized constants and enums

**Never hardcode:** secrets, URLs, tenant configs, environment-specific values — always use environment variables.

**Always create reusable:** constants, enums, helper utilities, validation helpers.

---

### 2. UI / UX Standards

- All mandatory fields display a **red asterisk (*)**
- All forms have uniform spacing, padding, border radius, label positioning, and responsive layout
- Theme support: **dark + light** — centralized theme configuration
- Responsive: desktop, tablet, mobile

**Standard button variants:** primary, secondary, danger, disabled

**Reusable components to build and use:**
`Input`, `Select`, `Textarea`, `Modal`, `Table`, `FormWrapper`, `PageHeader`, `ConfirmDialog`, `Loader`, `EmptyState`, `Pagination`

**Tailwind practices:** reusable utility classes, no inline styling, reusable layout wrappers.

---

### 3. Form Validation Standards

**All inputs must validate:**
- Trim whitespace automatically
- Min/max length
- Required field
- Email format
- Numeric / phone format
- Dropdown selection
- File size and extension
- Prevent XSS / SQL-injection style inputs

**Frontend:** instant inline validation, red border on invalid fields, user-friendly messages.

**Backend:** schema-level (Pydantic), API-level, sanitize before DB operations.

---

### 4. Database Standards

- `snake_case` naming throughout
- `created_at` and `updated_at` on every table
- `created_by` where applicable
- Soft delete: `is_deleted`, `deleted_at`
- UUID support where needed
- Foreign key constraints, normalized schema, audit-ready structure
- Proper indexing
- **Never** store file blobs in DB — store file path + metadata only

---

### 5. File Upload / Storage Standards

Centralized storage helper at `backend/shared/storage/`.

Capabilities: upload, unique filename generation, auto-create tenant folder, validate size/extension, return path, delete, replace.

Storage structure:
```
uploads/
  {tenant_id}/
    {module_name}/
      files...
```

Abstraction layer for easy future migration from local → AWS S3.

---

### 5b. Notification Helpers

Centralized, provider-agnostic helpers at `backend/shared/notifications/`.

```python
from backend.shared.notifications import notifier
result = notifier.send_email(to="a@b.com", subject="Hi", body="...")  # also send_sms / send_whatsapp / send_push
if not result.success:
    ...  # result.status: SENT | FAILED | NOT_CONFIGURED  (recipient is masked in logs)
```

- **Channels**: email (SMTP), SMS + WhatsApp (Twilio REST via httpx), push (FCM legacy server key).
- **Config-driven**: every credential comes from env vars (see Environment Variables);
  `notifier.configured_channels()` reports which are live.
- **Explicit, non-crashing**: a missing config returns `NOT_CONFIGURED` (never raises),
  so the helpers can be wired now and "go live" the moment creds are added.
- **Abstraction layer**: swap a vendor by editing one provider module; callers are unchanged.
- Recipients are masked (reusing the audit `mask_*` helpers) before logging.

---

### 6. API Standards

- Versioned: `/api/v1/`
- Standard response format:
  ```json
  { "success": true, "message": "", "data": {}, "errors": [] }
  ```
- Pagination, filtering, sorting, search on all list endpoints
- Proper HTTP status codes, exception handling, auth middleware

---

### 7. Security Standards

- JWT auth + refresh token
- Role-based permissions
- Tenant isolation (no cross-tenant data leakage)
- Sanitize all inputs and uploaded filenames

---

### 8. Audit & Logging Standards

Reusable audit log helper tracking: create, update, delete, login, file upload, permission changes.

---

### 9. Performance Standards

- DB connection pooling
- Lazy loading where required
- Optimized queries, reusable DB sessions
- Avoid duplicate API calls and unnecessary re-renders

---

### 10. Accessibility & Usability

- Keyboard-friendly forms
- Proper labels and placeholders
- Loading indicators and disabled button states
- Confirmation dialogs before all destructive actions

---

### 11. Multi-Tenant — REMOVED

The multi-tenant system (tenants, subscriptions, plans, feature flags, employee
module, tenant-scoped DBs, tenant resolver/middleware) has been fully removed.
This is now a single platform. Do **not** re-introduce tenant scoping, `X-Tenant-ID`
headers, per-tenant DBs, or subscription/plan modules unless explicitly requested.
Lead→Client conversion is currently a record-only step (writes a `lead_conversions`
row) and is intended to be rebuilt later.
