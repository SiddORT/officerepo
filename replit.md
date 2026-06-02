# Office Repo — Lead Management & Sales Pipeline Platform

A production-grade app with FastAPI backend, React + Tailwind frontend, and PostgreSQL database. Surface area: public Landing + Enquiry capture, a superadmin Lead CRM, and a superadmin Client Management module (with superadmin auth/security). **Client = tenant**: each Client is one organization with its own contacts, commercials, subscription, modules, documents, domains, admin users and an intended per-client database (provisioning deferred — db status defaults "Not Provisioned"). See section 11 for the multi-tenant model.

## Architecture

### Design
- **Platform DB** — PostgreSQL (Replit built-in) stores everything: superadmins, platform_config, enquiries, leads + lead child tables, audit_logs.
- **Auth** — superadmin JWT (access + refresh). No tenant scoping.

### Repository Structure
```
backend/
  main.py                      FastAPI entry point, runs Alembic migrations, seeds superadmin, lifespan
  app/
    config/settings.py         Environment config (DATABASE_URL, JWT_SECRET, etc.)
    core/
      security.py              JWT creation/decoding, bcrypt password hashing, kid embedding
      deps.py                  Superadmin JWT guard dependency
      secret_rotation_monitor.py  Async background monitor for stale PREVIOUS_* secrets
    database/
      platform.py              DB engine + session (get_platform_db)
      migrations/model.py      schema_migrations audit table (historical record)
    platform/
      superadmin/              SuperAdmin model + secret rotation routers
      config/                  PlatformConfig model
    modules/
      auth/                    Superadmin login, refresh, logout
      lead_management/         Lead & Sales Pipeline CRM (superadmin)
                               constants/validators/models/schemas/repository/service/router
                               leads + 8 child tables (activities, demos, follow-ups, notes,
                               documents, proposals, negotiations, conversions)
      client_management/       Client Management — Client = tenant (superadmin)
                               constants/validators/models/schemas/repository/service/router
                               clients + 9 child tables (contacts, billing_profiles,
                               subscriptions, db_connections, modules, documents,
                               activity_logs, domains, admin_users); db provisioning deferred
      enquiry/                 Public GDPR-aware enquiry capture
      csp_report/              CSP violation reporting
      rbac/                    Roles, permissions, user invitations (constants/models/schemas/
                               repository/service/router); admin_invitations table (single-use
                               tokens, SHA-256 hash stored, raw token shown once)
      organization/            Organization settings singleton (id="default" upsert):
                               org_name, legal_entity_name, org_code, website, gst_number,
                               company_registration_number, support/sales/billing email+phone
  shared/storage/             Storage helper (public uploads/ + private_storage/ roots)
  shared/notifications/       Multi-channel notification helpers (email/SMS/WhatsApp/push):
                              base + config + dispatcher + one provider module per channel

frontend-web/
  public/
    ort-logo-dark.png          ORT logo — white text on black (dark theme, use with mix-blend-mode: screen)
    ort-logo-light.jpg         ORT logo — dark text on white (light theme)
  src/
    App.jsx                    Router setup, protected routes
    contexts/AuthContext.jsx   Auth state, login/logout  [// @refresh reset pragma]
    contexts/ThemeContext.jsx  Theme state (light/dark/system); setTheme + toggle + isDark
                               [// @refresh reset pragma — prevents HMR cascade failures]
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
      superadmin/clients/      Client Management (Client = tenant): ClientList, CreateClient,
                               EditClient, ClientDetails (10 tabs: Overview, Contacts,
                               Commercials, Modules, Subscription, Documents, Activities,
                               Database, Domains, Admin Users);
                               components/ (StatusBadge, ClientForm); constants.js
    components/Layout.jsx      Sidebar nav (incl. Calendar for superadmin), logout → /;
                               NotificationBell dropdown (superadmin) → due/overdue items
      superadmin/settings/     SettingsLayout (collapsible inner nav, 4 groups: Account /
                               Organization / Administration / System); ProfileSettings.jsx;
                               GeneralSettings.jsx (Display/DateTime/Navigation prefs: theme
                               light/dark/system with instant preview, searchable timezone
                               picker, date/time format, week start, default landing page,
                               table page size; Save/Discard); OrganizationSettings.jsx
                               (view/edit singleton, IST timestamps); RolesPermissionsPage.jsx
                               (3 tabs); currency/ (CurrencyList etc.)
      login/AcceptInvitePage.jsx  Public invite-acceptance page (login-styled glassmorphic card;
                               validates token → set password → activate → redirect /login)
```

## Running

| Service  | Port | URL            |
|----------|------|----------------|
| Frontend | 5000 | Preview pane   |
| Backend  | 8000 | /docs for API  |

The frontend proxies `/api` to the backend via Vite.

### Database Migrations (Alembic)
Schema changes are managed with Alembic. Migration files live in `alembic/versions/`.
On every startup the backend automatically runs `alembic upgrade head`.

**Workflow for any model change:**
```
# 1. Edit the SQLAlchemy model
# 2. Generate a migration
alembic revision --autogenerate -m "short description"
# 3. Review the generated file in alembic/versions/
# 4. Commit — next startup applies it automatically
```

### Self-hosting (outside Replit)
- `.env.example` (root) + `frontend-web/.env.example` document every config key; copy each to `.env` (git-ignored) and fill in real values.
- `ecosystem.config.cjs` (root) runs the backend (uvicorn) and optional frontend preview under PM2: `set -a && . ./.env && set +a && pm2 start ecosystem.config.cjs`.
- CORS policy lives in one place — `backend/app/core/cors.py` (imported by `main.py` and the tests).

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
- `/superadmin/settings` → protected (redirects to `/settings/profile`); SettingsLayout wraps a left
  collapsible section nav (220 px expanded / 56 px collapsed), 4 groups — **Account** (Profile),
  **Organization** (Organization Settings), **Administration** (Roles & Permissions, Currency),
  **System** (Security, API Docs).
  `/superadmin/settings/profile` (Profile Information + Change Password; universal, reached from the
  topbar profile dropdown "My Profile"); `/superadmin/settings/organization` (view/edit singleton org
  row, gated by `org.view`; 10 fields in Identity + Contact sections, IST timestamps in footer);
  `/superadmin/settings/roles` (Roles & Permissions; nav item gated by `rbac.role.view`; 3 tabs —
  **Users** (invite users by email + copyable invite link, assign roles, resend invite,
  activate/deactivate, remove pending), **Roles** (create/edit/delete roles + permission toggles),
  **Permissions** (read-only catalog of ALL system permissions grouped by module with
  view/create/edit/delete/download action badges))
- `/accept-invite?token=…` → AcceptInvitePage (public, login-styled; set password to activate an
  invited account, then redirect to `/login`)
- `/superadmin/clients` → protected (Client list); `/new`, `/:id`, `/:id/edit` (Client = tenant)
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

# Superadmin — profile & account (self-service Settings)
GET   /api/v1/auth/profile          (own name/email/phone/role)
PATCH /api/v1/auth/profile          ({name?, phone?} — email is read-only)
POST  /api/v1/auth/change-password  ({current_password, new_password min 8})

# Superadmin — general preferences (self-service)
GET   /api/v1/auth/preferences          (returns theme/language/timezone/date_format/time_format/
                                         week_start_day/default_landing_page/table_page_size;
                                         row created with defaults on first call)
PATCH /api/v1/auth/preferences          (partial-update; IANA timezone validated via zoneinfo;
                                         audit-logged with old+new diff; all 8 fields optional)
GET   /api/v1/auth/preferences/options  (no auth required; returns allowed values + labels for
                                         themes/languages/date_formats/time_formats/week_start_days/
                                         landing_pages/table_page_sizes)

# Public — user invitation acceptance (no auth)
GET   /api/v1/auth/invitations/{token}          (returns {email, name, expires_at}; 404 if invalid/expired)
POST  /api/v1/auth/invitations/{token}/accept   ({password min 8} → activates account + sets password)

# Superadmin — RBAC roles, permissions & users (gated by rbac.*/user.* perms)
GET    /api/v1/superadmin/rbac/permissions      (catalog grouped by module: {modules:[{module, module_label, permissions:[{name, description}]}]})
GET    /api/v1/superadmin/rbac/roles            (list)
POST   /api/v1/superadmin/rbac/roles            (create; permission_ids[])
PATCH  /api/v1/superadmin/rbac/roles/{role_id}  (rename/describe + permission_ids[])
DELETE /api/v1/superadmin/rbac/roles/{role_id}  (built-in Superadmin role protected)
GET    /api/v1/superadmin/rbac/users            (list users: id, email, name, is_active, status active|invited|expired, role_ids[])
POST   /api/v1/superadmin/rbac/users            ({email, name?, role_ids[]} → invites; returns {user, invite_token, invite_link, email_sent})
POST   /api/v1/superadmin/rbac/users/{id}/resend-invite  (re-issues token; returns same invite payload)
PATCH  /api/v1/superadmin/rbac/users/{id}/status         ({is_active} bool)
DELETE /api/v1/superadmin/rbac/users/{id}                (removes a pending/invited user)
PUT    /api/v1/superadmin/rbac/admins/{admin_id}/roles  ({role_ids[]} — full-replace set)

# Superadmin — organization settings (singleton)
GET    /api/v1/superadmin/organization   (returns org settings; empty fields null when never saved)
PATCH  /api/v1/superadmin/organization   (upsert; gated by org.view/org.update; writes audit log)

# Superadmin — secret rotation
POST /api/v1/superadmin/rotate-secrets
GET  /api/v1/superadmin/rotation-status

# Superadmin — security panel
GET  /api/v1/superadmin/cors-rejections  (recently blocked CORS origins: origin, hit_count, last method/path, first/last seen)

POST /api/v1/public/enquiries        (public; GDPR-aware lead capture)

# Enquiry Inbox (superadmin)
GET    /api/v1/superadmin/enquiries/meta/options          (statuses, modules)
GET    /api/v1/superadmin/enquiries/dashboard             (counts by status/spam/unassigned)
GET    /api/v1/superadmin/enquiries                       (list: page/page_size/sort/search/status/is_spam/assigned_to)
GET    /api/v1/superadmin/enquiries/{enquiry_id}          (detail: decrypted PII + notes[] + timeline[] + lead{})
PATCH  /api/v1/superadmin/enquiries/{enquiry_id}/status   (New/In Review/Assigned/Closed; Converted is terminal/auto)
PATCH  /api/v1/superadmin/enquiries/{enquiry_id}/assign   ({assigned_to} int; null = unassign)
PATCH  /api/v1/superadmin/enquiries/{enquiry_id}/spam     ({is_spam} bool)
GET/POST/DELETE  .../enquiries/{enquiry_id}/notes[/{note_id}]
GET    /api/v1/superadmin/enquiries/{enquiry_id}/timeline
POST   /api/v1/superadmin/enquiries/{enquiry_id}/convert-to-lead  (blocked if spam or already converted)

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
POST   /api/v1/superadmin/leads/{lead_id}/convert-to-client   (only stage=Won → creates a Client)
POST   /api/v1/superadmin/leads/convert-enquiry/{enquiry_id}  (idempotent)

# Client Management (superadmin) — Client = tenant
GET    /api/v1/superadmin/clients/meta/options          (statuses, contact_types, db_statuses,
                                                         admin_statuses, subscription_statuses,
                                                         billing_cycles, modules, document_types,
                                                         payment_terms, currencies)
GET    /api/v1/superadmin/clients/dashboard             (counts by status)
GET    /api/v1/superadmin/clients                       (list: page/page_size/sort/search/status/industry/country)
POST   /api/v1/superadmin/clients                       (body may include contacts[] = primary contact)
GET    /api/v1/superadmin/clients/{client_id}           (detail: contacts[], billing_profile, db_connection,
                                                         subscription, modules[], documents[], domains[], admin_users[])
PATCH  /api/v1/superadmin/clients/{client_id}
DELETE /api/v1/superadmin/clients/{client_id}           (soft delete / archive)
POST   /api/v1/superadmin/clients/{client_id}/status    ({status})
GET/POST/PATCH/DELETE  .../clients/{client_id}/contacts[/{contact_id}]
GET/PUT                .../clients/{client_id}/billing       (1:1 commercials/billing profile — upsert)
GET/PUT                .../clients/{client_id}/subscription  (1:1 — upsert)
GET    .../clients/{client_id}/modules
POST   .../clients/{client_id}/modules                  (toggle {module_name, is_enabled})
GET/PUT                .../clients/{client_id}/database      (1:1 db connection — upsert; db_status defaults "Not Provisioned")
GET/POST/DELETE        .../clients/{client_id}/domains[/{domain_id}]
GET/POST/PATCH         .../clients/{client_id}/admin-users[/{admin_id}]
GET    .../clients/{client_id}/activities
GET/POST/DELETE        .../clients/{client_id}/documents[/{document_id}]
GET    .../clients/{client_id}/documents/{document_id}/download   (authenticated FileResponse)
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

## Enquiry Inbox (superadmin)
- **Scope**: platform-scoped, superadmin JWT guard, platform DB. Layered architecture
  (`models`/`constants`/`schemas`/`repository`/`admin_service`/`admin_router`).
- **List/Details**: list supports page/sort/search + status/spam/assigned_to filters.
  Detail decrypts PII **only into the response** (encrypted at rest stays encrypted)
  and returns `notes[]`, `timeline[]`, and a resolved `lead{}` object when converted.
- **Status management**: `New / In Review / Assigned / Closed` are settable; `Converted`
  is terminal and reached only via Convert-to-Lead. Re-opening a Closed enquiry clears
  the stale `closed_at`.
- **Assignment**: `assigned_to` (superadmin user id; null = unassign). The frontend
  detail view offers "Assign to me" / "Unassign".
- **Spam management**: orthogonal `is_spam` boolean; spam enquiries cannot be converted.
- **Notes**: superadmin-only internal notes (soft-deleted); add & delete both journal a
  timeline activity.
- **Activity timeline**: every workflow event (created, status_changed, assigned,
  unassigned, note_added, note_deleted, marked_spam, unmarked_spam, converted_to_lead)
  is recorded and surfaced in the Timeline tab.
- **Convert to Lead**: blocked if spam or already converted. Creates a Lead, links it
  bidirectionally (enquiry `converted_lead_id`/`converted_at` ↔ lead `source_enquiry_id`),
  preserves the enquiry message as the lead's first note, sets enquiry status=Converted,
  and writes a masked-PII audit entry. **Both** conversion paths — the inbox
  `convert-to-lead` endpoint and the legacy `leads/convert-enquiry/{id}` route — stamp the
  reverse link, so traceability (Website Enquiry → Lead → Client) holds either way and is
  shown in both records (`SourceEnquiry` on LeadDetails; converted-to bar on EnquiryDetails).
- Frontend: `pages/superadmin/enquiries/{EnquiryList,EnquiryDetails}.jsx` + `constants.js`;
  admin `enquiryInboxApi` in `apiClient.js`; nav item "Enquiries" (before Leads).

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
  converted, records a `lead_conversions` row (client_name + sales-cycle metrics) + audit
  entry, **and provisions a Client record** (the tenant) — see Client Management below.
  Idempotent & duplicate-safe via the lead's converted flag + `clients.lead_id` reverse link.
- **Document/proposal files are PRIVATE**: stored via the shared storage helper
  under the PRIVATE root (`private_storage/`, NOT the public `/uploads` mount) with
  randomized filenames. The DB stores only the **rootless storage key**
  (`{scope}/{module}/{filename}`, e.g. `platform/lead_documents/abc123.pdf`) — never
  a root prefix or full URL — so a future S3 move is "swap driver + base" only.
  Downloads go through **authenticated** endpoints that resolve the key via the
  storage layer (`physical_path(key, Visibility.PRIVATE)`) and return `FileResponse`
  (superadmin guard). Legacy rows that stored the old root-prefixed path still
  resolve (the root prefix is stripped on read). API list responses expose `has_file`
  + a download `url`; the frontend fetches the blob with the JWT and triggers a
  browser download (a plain `<a href>` would not carry auth). `uploads/` and
  `private_storage/` are gitignored.
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
ALLOWED_ORIGINS                     Comma-separated exact CORS origins (auto-detects REPLIT_DOMAINS).
                                    In non-development envs, officerepo.com and all *.officerepo.com
                                    subdomains are ALSO allowed automatically (subdomain regex).
CORS_REJECTION_ALERT_URL            Optional webhook for blocked-origin alerts (blank = log only)
CORS_REJECTION_ALERT_SEVERITY       Severity label in the CORS alert payload (default: warning)
CORS_REJECTION_ALERT_ENV_TAG        Environment tag in the CORS alert payload (default: ENVIRONMENT)
CORS_REJECTION_ALERT_COOLDOWN_MINUTES  Min minutes between webhook alerts per rejected origin
                                    (default: 60, 0 disables; the log line is never throttled)
CORS_REJECTION_RETENTION_DAYS       Prune cors_rejections rows whose last_seen_at is older than this
                                    many days (default: 30, 0 disables time-based pruning). Keeps the
                                    attacker-controlled-Origin table bounded.
CORS_REJECTION_MAX_ORIGINS          Hard cap on distinct origin rows kept; least-recently-seen rows are
                                    evicted beyond the cap (default: 1000, 0 disables the cap)
BACKEND_PORT                        Port uvicorn binds to under PM2 (default: 8000)
FRONTEND_PORT                       Port the frontend preview binds to under PM2 (default: 5000)
TURNSTILE_SECRET_KEY                Cloudflare Turnstile secret (blank = bot check disabled)
ENQUIRY_ENCRYPTION_KEYS             Comma-separated Fernet keys for enquiry PII (1st = primary
                                    for encryption, rest for decryption/rotation). Falls back to
                                    a key derived from SESSION_SECRET/JWT_SECRET via HKDF.
PRIVACY_POLICY_VERSION              Privacy policy version stamped on enquiries (default: 1.0)
ENQUIRY_RETENTION_DAYS              Days until enquiry retention_until expiry (default: 365)
EXCHANGE_RATE_API_KEY               exchangerate-api.com v6 API key. When set, the live "Forex API"
                                    provider is registered and "Run Sync Now" fetches real rates.
                                    Blank = live sync disabled (records explicit Failed log; Manual unaffected).
EXCHANGE_RATE_API_URL               Override the provider base URL (default: https://v6.exchangerate-api.com/v6)
EXCHANGE_RATE_API_TIMEOUT           Per-request HTTP timeout in seconds (default: 10)

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

### 11. Multi-Tenant — Client Management (Client = tenant)

Multi-tenancy is modeled through the **Client Management** module: **a Client IS the
tenant** — one entity, no separate Tenant/subscription/plan/feature-flag modules.
The old tenant-resolver/`X-Tenant-ID`/per-tenant-DB-middleware machinery stays gone;
this module records the tenant and its intended infrastructure as data.

**Module** (`backend/app/modules/client_management/`) mirrors the lead_management layered
architecture exactly (constants/validators/models/schemas/repository/service/router),
superadmin JWT guard, platform DB (`get_platform_db`).

**Tables** (10): `clients` (the tenant) + `client_contacts`, `client_billing_profiles`
(1:1 — Commercials tab), `client_subscriptions` (1:1), `client_db_connections` (1:1),
`client_modules`, `client_documents`, `client_activity_logs`, `client_domains`,
`client_admin_users`. Standard `created_at`/`updated_at`/`is_deleted`/`deleted_at`;
`created_by` where applicable. Each client gets a `client_code` (`CLT-YYYYMMDD-XXXXXXXX`).

- **PII at rest encrypted** (contact email/phone, admin-user email/phone, db password)
  via the shared encryption helper.
- **Database-per-client is DEFERRED**: `client_db_connections` records the *intended*
  connection (name/host/port/username/encrypted password); `database_status` defaults to
  **"Not Provisioned"**. Actual provisioning + a "Provision" action are future work.
- **Currency**: stored as an ISO `currency_code` string on the billing profile. A
  Settings→Currency Management module (`backend/app/modules/currency_management/`,
  `frontend-web/src/pages/superadmin/settings/currency/`) manages the currency catalog,
  the single base currency, and exchange rates — Manual entry plus live "Run Sync Now"
  via a provider abstraction (`providers/`). The built-in `ExchangeRateApiProvider`
  (exchangerate-api.com v6) is registered as the "Forex API" source when
  `EXCHANGE_RATE_API_KEY` is set; otherwise sync records an explicit Failed log and Manual
  entry still works. Every sync fetches rates for active non-base currencies, updates the
  current rate, journals `currency_rate_history`, and writes a Success/Partial/Failed
  `currency_sync_logs` row.
- **Documents** are PRIVATE via the shared storage helper (`scope="platform"`,
  `module="client_documents"`); same rootless-key + authenticated-download pattern as leads.
- **Convert Lead→Client** (extends the existing `convert-to-client`): creates the Client +
  primary contact + subscription placeholder + db connection (Not Provisioned) + admin
  placeholder + activity log; keeps `lead.converted_to_client` + the `lead_conversions` row;
  duplicate-safe via the lead's converted flag and the `clients.lead_id` reverse link.
- Mutations write **masked-PII audit entries** via `backend/shared/audit/`.
- Frontend: `pages/superadmin/clients/{ClientList,CreateClient,EditClient,ClientDetails}.jsx`
  + `components/{StatusBadge,ClientForm}.jsx` + `constants.js`; `clientsApi` in `apiClient.js`;
  nav item "Clients" (after Leads). ClientDetails has 10 tabs: Overview, Contacts, Commercials,
  Modules, Subscription, Documents, Activities, Database, Domains, Admin Users.

Do **not** re-introduce the old tenant-scoping middleware, `X-Tenant-ID` headers, or
tenant-resolver machinery — tenancy now lives in the Client Management data model.

## Notification Management (Settings → Administration)

**Scope**: platform-scoped, superadmin JWT guard, platform DB. Layered architecture
(`constants`/`models`/`schemas`/`repository`/`service`/`router`).

**Tables** (4):
- `notification_channel_configs` — one row per channel (email/sms/whatsapp/push); `config_enc`
  (Fernet-encrypted JSON blob of sensitive fields derived from `SESSION_SECRET`), `is_enabled`.
- `notification_templates` — named templates per channel; `slug`, `subject`, `body`, `variables`
  (JSON), `is_active`, `is_system` (system templates cannot be deleted).
- `notification_event_rules` — per (event_name, channel) pair; `is_enabled`, `template_id` FK,
  `delay_minutes`, `conditions` (JSON).
- `notification_logs` — delivery log per send attempt; `channel`, `event_name`, `recipient`,
  `template_id`, `status` (queued/processing/sent/delivered/failed), `error_message`, `metadata`.

**Channels**: email, sms, whatsapp, push. Sensitive config fields per channel are defined in
`constants.SENSITIVE_FIELDS` and are encrypted at rest; non-sensitive fields are stored in
plain-text `config_plain` (JSON). `test_channel` validates connectivity (provider ping).

**API routes** (`/api/v1/superadmin/notifications`):
```
GET    /channels                          — list all channels with masked config
GET    /channels/{channel}                — single channel detail
PUT    /channels/{channel}                — update config + enable/disable
POST   /channels/{channel}/test           — test channel connectivity

GET    /templates                         — list (?channel= ?active_only=)
POST   /templates                         — create template
GET    /templates/{id}                    — get template
PUT    /templates/{id}                    — update template
DELETE /templates/{id}                    — delete (system templates protected)

GET    /events                            — list all event rules (grouped)
PUT    /events/{event_name}/{channel}     — update rule (enable/disable, template, delay)

GET    /logs                              — list delivery logs (?channel ?status ?event_name ?page)
GET    /usage                             — usage stats (counts by channel/status)
```

**Frontend**: `pages/superadmin/settings/notifications/NotificationsPage.jsx` — 4-tab page
(Channels, Templates, Events, Logs). `notificationsApi` in `apiClient.js`. Route:
`/superadmin/settings/notifications`. Nav item under **Administration** group in SettingsLayout.

**Encryption**: Fernet key derived from `SESSION_SECRET` via SHA-256 (32 bytes → urlsafe-b64).
Sensitive fields per channel are merged into an encrypted JSON blob; non-sensitive fields
remain in `config_plain` so they are readable without decryption for display purposes.

## Security Settings (Settings → Administration)

**Scope**: platform-scoped, superadmin JWT guard, platform DB. Singleton-per-policy design
(all rows keyed `id = "default"`, upserted on first GET). Layered architecture
(`constants`/`models`/`schemas`/`repository`/`service`/`router`).

**Tables** (5 singletons):
- `security_password_policy` — min/max length, character class requirements, expiry, history, force-change-on-first-login.
- `security_login_policy` — max failed attempts, lock duration, CAPTCHA threshold, concurrent logins, remember-me, force-logout-on-password-change.
- `security_session_policy` — access/refresh token expiry, session/idle timeout, max sessions per user.
- `security_2fa_policy` — master enable, enforcement mode (optional/mandatory_all/mandatory_admin/mandatory_selected), allowed methods (email_otp phase 1; totp/sms_otp/backup_codes coming), grace period, recovery options.
- `security_notification_policy` — per-event toggles (login success/failure, account locked, password changed/reset, 2FA enabled/disabled, new device/location), notification channel.

**API routes** (`/api/v1/superadmin/security-settings`):
```
GET/PUT  /password-policy
GET/PUT  /login-policy
GET/PUT  /session-policy
GET/PUT  /2fa-policy
GET/PUT  /notification-policy
```
All routes: superadmin JWT guard; PUT is partial (only provided fields are updated); every
save writes an audit entry with old/new diff via `record_audit`.

**Frontend**: `pages/superadmin/settings/security/SecuritySettingsPage.jsx` — 5-tab page
(Password Policy, Login Policy, Session Policy, Two-Factor Auth, Security Notifications).
`securitySettingsApi` in `apiClient.js`. Route: `/superadmin/settings/security`.
Nav item "Security Settings" under **Administration** group in SettingsLayout (with shield
icon). Each tab has a sticky `SaveBar` that only appears when there are unsaved changes.

**Validation rules** (Pydantic):
- Password: min ≥ 8, max ≤ 128, min ≤ max.
- Login: failed attempts 1–20, lock 1–1440 min, CAPTCHA 1–20.
- Session: access token 5–1440 min, refresh 1–365 days, idle 1–480 min, max sessions 1–50.
- 2FA: enforcement_mode must be one of 4 allowed values; grace_period must be in {0,3,7,15,30}.
- Notifications: channel must be email/sms/whatsapp/push.

The SecuritySettingsPage also hosts two operational tabs: **Secret Rotation** (trigger/view
grace-period status) and **Blocked Origins** (CORS rejection log). These share the same route
and nav item but are not policy singletons — they proxy to existing rotation + CORS endpoints.

## Client Portal — Invite-Based Auth

Client admin users (rows in `client_admin_users`) are onboarded via a single-use invite link
generated by the superadmin from the **Admin Users** tab of a Client record.

### Invite Flow
1. Superadmin clicks **Send Invite** next to an admin user row → `POST /api/v1/superadmin/clients/{id}/admin-users/{aid}/send-invite`.
2. Backend generates a cryptographically random token (`secrets.token_urlsafe(32)`), stores its
   SHA-256 hash in `client_admin_users.invite_token_hash`, and sets `invite_expires_at` (7 days).
3. A notification email is sent if the email channel is configured; the raw invite link is always
   returned so the superadmin can copy it from the modal.
4. Invite link format: `{base}/portal/{subdomain}/accept-invite?token={raw_token}`.
   `{base}` resolved from `APP_BASE_URL` → first `REPLIT_DOMAINS` entry → relative path.
5. User clicks link → `PortalAcceptInvitePage` calls `GET /api/v1/portal/{sub}/invite/{token}`
   (validate) then `POST …/accept` (set password). On success, redirects to portal login.

### Portal JWT
- `create_portal_token` in `security.py` uses `JWT_SECRET` + `token_type: "portal_access"`.
- `decode_portal_token` verifies the claim — superadmin tokens (`type: "access"`) are rejected.
- Token payload: `admin_user_id`, `client_id`, `subdomain`, `email`, `name`.
- Portal JWT stored in `sessionStorage` (key `portal_auth_{subdomain}`) by `PortalAuthContext`.

### Model columns added to `client_admin_users`
`password_hash TEXT`, `invite_token_hash TEXT`, `invite_expires_at DATETIME`,
`invite_accepted_at DATETIME` — all nullable; migration: `portal_auth_invite_columns_on_client_admin_users`.

### API Routes (`/api/v1/portal` — no auth guard)
```
GET  /{subdomain}/invite/{token}          validate invite (returns email, name, workspace, expires_at)
POST /{subdomain}/invite/{token}/accept   {password min 8} → hash + store + activate
POST /{subdomain}/auth/login              {email, password} → portal JWT + user info
```
Subdomain lookup via active `client_domains` row; iterates decrypted `email_encrypted`
for login (small list acceptable at portal scale).

### Frontend
- `pages/portal/PortalAcceptInvitePage.jsx` — glassmorphic page matching admin login style;
  validate → set-password form → success redirect. Wired as `/portal/:subdomain/accept-invite`
  inside `ClientPortalPage` nested routes (public, no PortalProtectedRoute wrapper).
- `PortalLoginPage.jsx` — calls `portalAuthApi.login`; stores JWT via `PortalAuthContext.login`.
- `PortalAuthContext.jsx` — stores `{...userData, token}` in `sessionStorage[portal_auth_{sub}]`.
- `ClientDetails.jsx` AdminUsersTab — **Send Invite** button per row; opens a result modal
  with copyable invite link and email-sent status.
- `portalAuthApi` in `apiClient.js` — uses bare `axios` (not the JWT-intercepted `apiClient`)
  since these are public endpoints that should not carry a superadmin Bearer token.
