# Office Repo — Multi-Tenant SaaS Platform

A production-ready SaaS foundation with FastAPI backend, React + Tailwind frontend, and PostgreSQL database.

## Architecture

### Multi-Tenant Design
- **Platform DB** — PostgreSQL (Replit built-in) stores all tenant metadata: tenants, subscriptions, plans, feature flags, mobile device sessions, superadmins
- **Tenant DBs** — Each tenant gets its own database connection (configure via superadmin API)
- **Tenant Resolver** — Detects tenant from `X-Tenant-ID` header, JWT payload, or subdomain

### Repository Structure
```
backend/
  main.py                      FastAPI entry point, creates platform tables, seeds default data
  app/
    config/settings.py         Environment config (DATABASE_URL, JWT_SECRET, etc.)
    core/
      security.py              JWT creation/decoding, bcrypt password hashing
      tenant_resolver.py       Multi-strategy tenant detection
      middleware.py            TenantMiddleware — attaches tenant DB to request.state
      db_router.py             FastAPI dependencies for tenant-scoped DB access
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
  src/
    App.jsx                    Router setup, protected routes
    contexts/AuthContext.jsx   Auth state, login/logout
    services/apiClient.js      Axios client with JWT interceptor + auto-refresh
    pages/
      login/LoginPage.jsx      Super admin + tenant login
      dashboard/DashboardPage  Module overview dashboard
      superadmin/              Tenant list, create, activate/suspend, feature flags
    components/Layout.jsx      Sidebar navigation
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
```

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
DATABASE_URL         PostgreSQL connection string (auto-set by Replit)
JWT_SECRET           JWT signing key (uses SESSION_SECRET if not set)
REFRESH_SECRET       Refresh token signing key
TENANT_RESOLVER_STRATEGY  header | subdomain | jwt (default: header)
```

## Stack
- **Python 3.11** + **FastAPI** + **SQLAlchemy** + **psycopg2**
- **Node 18** + **React 18** + **Vite** + **TailwindCSS** + **Axios**
- **PostgreSQL** (Replit built-in)
