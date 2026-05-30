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
MODULE_USER = "user"
MODULE_RBAC = "rbac"
MODULE_ENQUIRY = "enquiry"
MODULE_LEAD = "lead"
MODULE_CLIENT = "client"
MODULE_CURRENCY = "currency"

MODULE_LABELS = {
    MODULE_USER: "User Management",
    MODULE_RBAC: "Roles & Permissions",
    MODULE_ENQUIRY: "Enquiry Inbox",
    MODULE_LEAD: "Lead Management",
    MODULE_CLIENT: "Client Management",
    MODULE_CURRENCY: "Currency Management",
}

# ── Standard action vocabulary ───────────────────────────────────────────────
# The canonical CRUD-style actions surfaced (where applicable) per module in the
# read-only Permissions catalog UI.
ACTION_VIEW = "view"
ACTION_CREATE = "create"
ACTION_UPDATE = "update"
ACTION_DELETE = "delete"
ACTION_DOWNLOAD = "download"
STANDARD_ACTIONS = [ACTION_VIEW, ACTION_CREATE, ACTION_UPDATE, ACTION_DELETE, ACTION_DOWNLOAD]


def perm_action(name: str) -> str:
    """Return the trailing action segment of a permission name (``a.b.view`` → ``view``)."""
    return name.rsplit(".", 1)[-1] if name else ""


# ── Permission names ─────────────────────────────────────────────────────────
# User Management (invite admins, manage accounts & their status)
PERM_USER_VIEW = "user.view"
PERM_USER_INVITE = "user.create"
PERM_USER_UPDATE = "user.update"
PERM_USER_DELETE = "user.delete"

# Roles & Permissions management
PERM_ROLE_VIEW = "rbac.role.view"
PERM_ROLE_CREATE = "rbac.role.create"
PERM_ROLE_UPDATE = "rbac.role.update"
PERM_ROLE_DELETE = "rbac.role.delete"
PERM_ROLE_ASSIGN = "rbac.role.assign"

# Enquiry Inbox (public lead capture triage)
PERM_ENQUIRY_VIEW = "enquiry.view"
PERM_ENQUIRY_UPDATE = "enquiry.update"
PERM_ENQUIRY_DELETE = "enquiry.delete"
PERM_ENQUIRY_CONVERT = "enquiry.convert"

# Lead Management & Sales Pipeline
PERM_LEAD_VIEW = "lead.view"
PERM_LEAD_CREATE = "lead.create"
PERM_LEAD_UPDATE = "lead.update"
PERM_LEAD_DELETE = "lead.delete"
PERM_LEAD_DOWNLOAD = "lead.download"
PERM_LEAD_CONVERT = "lead.convert"

# Client Management (Client = tenant)
PERM_CLIENT_VIEW = "client.view"
PERM_CLIENT_CREATE = "client.create"
PERM_CLIENT_UPDATE = "client.update"
PERM_CLIENT_DELETE = "client.delete"
PERM_CLIENT_DOWNLOAD = "client.download"

# Currency Management (first downstream consumer of the framework)
PERM_CURRENCY_VIEW = "currency.view"
PERM_CURRENCY_CREATE = "currency.create"
PERM_CURRENCY_EDIT = "currency.edit"
PERM_CURRENCY_ACTIVATE = "currency.activate"
PERM_CURRENCY_OVERRIDE_RATE = "currency.override_rate"
PERM_CURRENCY_VIEW_HISTORY = "currency.view_history"

# Canonical catalog seeded on startup: (name, module, description).
PERMISSION_CATALOG = [
    (PERM_USER_VIEW, MODULE_USER, "View users and pending invitations"),
    (PERM_USER_INVITE, MODULE_USER, "Invite new users"),
    (PERM_USER_UPDATE, MODULE_USER, "Edit user status (activate / deactivate)"),
    (PERM_USER_DELETE, MODULE_USER, "Remove pending invited users"),

    (PERM_ROLE_VIEW, MODULE_RBAC, "View roles, permissions and assignments"),
    (PERM_ROLE_CREATE, MODULE_RBAC, "Create new roles"),
    (PERM_ROLE_UPDATE, MODULE_RBAC, "Edit roles and their permissions"),
    (PERM_ROLE_DELETE, MODULE_RBAC, "Delete roles"),
    (PERM_ROLE_ASSIGN, MODULE_RBAC, "Assign or revoke roles on admin accounts"),

    (PERM_ENQUIRY_VIEW, MODULE_ENQUIRY, "View enquiries and their details"),
    (PERM_ENQUIRY_UPDATE, MODULE_ENQUIRY, "Update status, assignment, spam flag and notes"),
    (PERM_ENQUIRY_DELETE, MODULE_ENQUIRY, "Delete enquiry notes"),
    (PERM_ENQUIRY_CONVERT, MODULE_ENQUIRY, "Convert enquiries to leads"),

    (PERM_LEAD_VIEW, MODULE_LEAD, "View leads and the sales pipeline"),
    (PERM_LEAD_CREATE, MODULE_LEAD, "Create new leads"),
    (PERM_LEAD_UPDATE, MODULE_LEAD, "Edit leads and pipeline records"),
    (PERM_LEAD_DELETE, MODULE_LEAD, "Delete leads"),
    (PERM_LEAD_DOWNLOAD, MODULE_LEAD, "Download lead documents and proposals"),
    (PERM_LEAD_CONVERT, MODULE_LEAD, "Convert won leads to clients"),

    (PERM_CLIENT_VIEW, MODULE_CLIENT, "View clients and tenant details"),
    (PERM_CLIENT_CREATE, MODULE_CLIENT, "Create new clients"),
    (PERM_CLIENT_UPDATE, MODULE_CLIENT, "Edit clients and sub-records"),
    (PERM_CLIENT_DELETE, MODULE_CLIENT, "Archive / delete clients"),
    (PERM_CLIENT_DOWNLOAD, MODULE_CLIENT, "Download client documents"),

    (PERM_CURRENCY_VIEW, MODULE_CURRENCY, "View currencies and exchange rates"),
    (PERM_CURRENCY_CREATE, MODULE_CURRENCY, "Add new currencies"),
    (PERM_CURRENCY_EDIT, MODULE_CURRENCY, "Edit currency details and base currency"),
    (PERM_CURRENCY_ACTIVATE, MODULE_CURRENCY, "Activate or deactivate currencies"),
    (PERM_CURRENCY_OVERRIDE_RATE, MODULE_CURRENCY, "Update or manually override exchange rates"),
    (PERM_CURRENCY_VIEW_HISTORY, MODULE_CURRENCY, "View rate change history and sync logs"),
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
USER_NAME_MIN_LEN = 1
USER_NAME_MAX_LEN = 255
PASSWORD_MIN_LEN = 8
PASSWORD_MAX_LEN = 128

# ── User invitations ─────────────────────────────────────────────────────────
INVITE_EXPIRY_DAYS = 7
INVITE_TOKEN_BYTES = 32  # passed to secrets.token_urlsafe
# Path on the frontend that accepts an invitation token (used to build the link).
INVITE_ACCEPT_PATH = "/accept-invite"
# Derived user status labels (not stored — computed from is_active + invitations).
USER_STATUS_ACTIVE = "active"
USER_STATUS_INACTIVE = "inactive"   # accepted the invite, then deactivated
USER_STATUS_INVITED = "invited"
USER_STATUS_EXPIRED = "expired"

# ── Audit actions ────────────────────────────────────────────────────────────
AUDIT_ENTITY_ROLE = "role"
AUDIT_ENTITY_ADMIN_ROLES = "admin_roles"
AUDIT_ENTITY_USER = "user"
AUDIT_ROLE_CREATED = "rbac.role.created"
AUDIT_ROLE_UPDATED = "rbac.role.updated"
AUDIT_ROLE_DELETED = "rbac.role.deleted"
AUDIT_ROLE_PERMISSIONS_CHANGED = "rbac.role.permissions_changed"
AUDIT_ROLES_ASSIGNED = "rbac.admin.roles_assigned"
AUDIT_USER_INVITED = "rbac.user.invited"
AUDIT_USER_INVITE_RESENT = "rbac.user.invite_resent"
AUDIT_USER_INVITE_ACCEPTED = "rbac.user.invite_accepted"
AUDIT_USER_ACTIVATED = "rbac.user.activated"
AUDIT_USER_DEACTIVATED = "rbac.user.deactivated"
AUDIT_USER_DELETED = "rbac.user.deleted"
