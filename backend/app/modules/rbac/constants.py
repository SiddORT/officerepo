"""
Centralized constants, enums & the canonical permission catalog for RBAC.

The permission catalog is the single source of truth that is seeded into the
``permissions`` table on startup. Each permission belongs to a *module* group
(used to group toggles in the admin UI). Adding a new permission is as simple
as appending to ``PERMISSION_CATALOG`` — startup seeding picks it up and the
built-in Superadmin role is re-synced to hold it automatically.
"""

# ── Built-in role ────────────────────────────────────────────────────────────
# The non-deletable role that holds every permission. Assigned to the default
# superadmin on startup so existing behaviour (full access) is preserved.
SYSTEM_SUPERADMIN_ROLE = "Superadmin"
SYSTEM_SUPERADMIN_DESCRIPTION = "Built-in role with full, unrestricted access to every permission."

# Sentinel returned by permission resolution for an account that holds a system
# role — it short-circuits every permission check (full access).
FULL_ACCESS = "*"

# Email of the default superadmin seeded by the platform (kept in sync with main).
DEFAULT_SUPERADMIN_EMAIL = "admin@officerepo.com"

# ── Module groups (UI grouping + ordering) ───────────────────────────────────
MODULE_RBAC = "rbac"
MODULE_CURRENCY = "currency"

MODULE_LABELS = {
    MODULE_RBAC: "Roles & Permissions",
    MODULE_CURRENCY: "Currency Management",
}

# ── Permission names ─────────────────────────────────────────────────────────
# Roles & Permissions management
PERM_ROLE_VIEW = "rbac.role.view"
PERM_ROLE_CREATE = "rbac.role.create"
PERM_ROLE_UPDATE = "rbac.role.update"
PERM_ROLE_DELETE = "rbac.role.delete"
PERM_ROLE_ASSIGN = "rbac.role.assign"

# Currency Management (first downstream consumer of the framework)
PERM_CURRENCY_VIEW = "currency.view"
PERM_CURRENCY_CREATE = "currency.create"
PERM_CURRENCY_UPDATE = "currency.update"
PERM_CURRENCY_DELETE = "currency.delete"
PERM_CURRENCY_OVERRIDE_RATE = "currency.override_rate"

# Canonical catalog seeded on startup: (name, module, description).
PERMISSION_CATALOG = [
    (PERM_ROLE_VIEW, MODULE_RBAC, "View roles, permissions and assignments"),
    (PERM_ROLE_CREATE, MODULE_RBAC, "Create new roles"),
    (PERM_ROLE_UPDATE, MODULE_RBAC, "Edit roles and their permissions"),
    (PERM_ROLE_DELETE, MODULE_RBAC, "Delete roles"),
    (PERM_ROLE_ASSIGN, MODULE_RBAC, "Assign or revoke roles on admin accounts"),

    (PERM_CURRENCY_VIEW, MODULE_CURRENCY, "View currencies and exchange rates"),
    (PERM_CURRENCY_CREATE, MODULE_CURRENCY, "Add new currencies"),
    (PERM_CURRENCY_UPDATE, MODULE_CURRENCY, "Edit currency details"),
    (PERM_CURRENCY_DELETE, MODULE_CURRENCY, "Delete currencies"),
    (PERM_CURRENCY_OVERRIDE_RATE, MODULE_CURRENCY, "Manually override exchange rates"),
]

# ── List defaults (pagination / sorting) ─────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SORTABLE_ROLE_FIELDS = ["name", "created_at", "updated_at"]
DEFAULT_SORT_BY = "created_at"
DEFAULT_SORT_DIR = "desc"

# ── Field bounds ─────────────────────────────────────────────────────────────
ROLE_NAME_MIN_LEN = 2
ROLE_NAME_MAX_LEN = 60
ROLE_DESC_MAX_LEN = 255

# ── Audit actions ────────────────────────────────────────────────────────────
AUDIT_ENTITY_ROLE = "role"
AUDIT_ENTITY_ADMIN_ROLES = "admin_roles"
AUDIT_ROLE_CREATED = "rbac.role.created"
AUDIT_ROLE_UPDATED = "rbac.role.updated"
AUDIT_ROLE_DELETED = "rbac.role.deleted"
AUDIT_ROLE_PERMISSIONS_CHANGED = "rbac.role.permissions_changed"
AUDIT_ROLES_ASSIGNED = "rbac.admin.roles_assigned"
