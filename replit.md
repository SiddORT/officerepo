# Office Repo — Multi-Tenant SaaS Platform

A production-grade SaaS platform with FastAPI backend, React + Tailwind frontend, and PostgreSQL database.

## Architecture

### Multi-Tenant Design
- **Platform DB** — PostgreSQL (Replit built-in) stores all tenant metadata: tenants, subscriptions, plans, feature flags, mobile device sessions, superadmins
- **Tenant DBs** — Each tenant gets its own database connection (configure via superadmin API)
- **Tenant Resolver** — Detects tenant from `X-Tenant-ID` header, JWT payload, or subdomain

### Repository Structure
```
backend/
  main.py                      FastAPI entry point, creates platform tables, seeds default data, lifespan
  app/
    config/settings.py         Environment config (DATABASE_URL, JWT_SECRET, etc.)
    core/
      security.py              JWT creation/decoding, bcrypt password hashing, kid embedding
      tenant_resolver.py       Multi-strategy tenant detection
      middleware.py            TenantMiddleware — attaches tenant DB to request.state
      db_router.py             FastAPI dependencies for tenant-scoped DB access
      secret_rotation_monitor.py  Async background monitor for stale PREVIOUS_* secrets
    database/
      platform.py              Platform DB engine + session
      tenant.py                Dynamic tenant DB engine pool + initialization
    platform/
      tenants/                 Tenant CRUD + activate/suspend/DB config/IDP config
      subscriptions/           Plans + subscription assignment
      feature_flags/           Per-tenant module enable/disable
      superadmin/              SuperAdmin model
      mobile/                  MobileDeviceSession model
    modules/
      auth/                    Login (superadmin + tenant), refresh, logout
      employee/                Employee + Department CRUD (tenant-scoped)

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
      login/LoginPage.jsx      Tenant holographic login (route: /login) — cyan theme
      login/AdminLoginPage.jsx Platform admin login (route: /admin, hidden) — violet theme
      dashboard/DashboardPage  Module overview dashboard
      superadmin/              Tenant list, create, activate/suspend, feature flags
    components/Layout.jsx      Sidebar navigation, logout → /
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
| Superadmin | admin@officerepo.io     | admin123  |

## Routing
- `/` → LandingPage (public)
- `/login` → LoginPage (tenant only, redirect to dashboard if logged in)
- `/admin` → AdminLoginPage (hidden, not linked anywhere, violet theme)
- `/dashboard` → protected
- `/superadmin` → protected
- `/contact` → EnquiryPage (public lead capture / "Request Demo" form)
- `/privacy-policy` → PrivacyPolicyPage (public, linked from enquiry consent)
- Unknown routes → `/`
- Logout → navigates to `/`

## Branding
- **Product**: Office Repo — "Unified Workplace Management"
- **Made by**: ORT (One Roof Tech) — logo files in `frontend-web/public/`
- Both login pages show: Office Repo wordmark + tagline above card, "by ort_" in card footer

## API Routes

```
POST /api/v1/auth/superadmin/login
POST /api/v1/auth/tenant/login       (requires X-Tenant-ID header)
POST /api/v1/auth/refresh
POST /api/v1/auth/logout

GET  /api/v1/superadmin/tenants
POST /api/v1/superadmin/tenants
POST /api/v1/superadmin/tenants/{id}/activate
POST /api/v1/superadmin/tenants/{id}/suspend
POST /api/v1/superadmin/tenants/{id}/db-connection
POST /api/v1/superadmin/tenants/{id}/idp-config

GET  /api/v1/superadmin/{tenant_id}/features
POST /api/v1/superadmin/{tenant_id}/features

GET  /api/v1/superadmin/subscriptions/plans
POST /api/v1/superadmin/subscriptions/assign

GET  /api/v1/tenant/employees       (requires X-Tenant-ID)
POST /api/v1/tenant/employees
GET  /api/v1/tenant/employees/{id}
PATCH /api/v1/tenant/employees/{id}
DELETE /api/v1/tenant/employees/{id}

POST /api/v1/public/enquiries        (public; GDPR-aware lead capture)
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

## JWT Payload
```json
{
  "user_id": 1,
  "tenant_id": "acme-corp",
  "role": "admin",
  "device_type": "web",
  "email": "user@example.com"
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
TENANT_RESOLVER_STRATEGY            header | subdomain | jwt (default: header)
ENVIRONMENT                         development | production (default: development)
ALLOWED_ORIGINS                     Comma-separated CORS origins (auto-detects REPLIT_DOMAINS)
ENQUIRY_ENCRYPTION_KEYS             Comma-separated Fernet keys for enquiry PII (1st = primary
                                    for encryption, rest for decryption/rotation). Falls back to
                                    a key derived from SESSION_SECRET/JWT_SECRET via HKDF.
PRIVACY_POLICY_VERSION              Privacy policy version stamped on enquiries (default: 1.0)
ENQUIRY_RETENTION_DAYS              Days until enquiry retention_until expiry (default: 365)
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

### 11. Superadmin Panel — Tenant Management Module (priority build)

Features:
- Create / Edit Tenant
- Suspend / Activate Tenant
- Tenant Details view
- Tenant Database Mapping
- Tenant Domain / Subdomain config
- Module Enablement per tenant
- Tenant Status indicator
- Tenant Logo Upload
- Tenant Theme Config
