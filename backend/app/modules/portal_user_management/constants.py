"""Constants for the Client Portal User Management module."""

# ── User / Admin User statuses ────────────────────────────────────────────────
STATUS_ACTIVE      = "Active"
STATUS_INACTIVE    = "Inactive"
STATUS_INVITED     = "Invited"
STATUS_PLACEHOLDER = "Placeholder"

ALL_USER_STATUSES = [STATUS_ACTIVE, STATUS_INACTIVE, STATUS_INVITED, STATUS_PLACEHOLDER]

# ── Role defaults ─────────────────────────────────────────────────────────────
DEFAULT_ROLES = [
    {"name": "Super Admin", "description": "Full access to all workspace features.", "is_system_role": True},
    {"name": "Admin",       "description": "Administrative access with some restrictions.", "is_system_role": True},
    {"name": "Manager",     "description": "Team management capabilities.", "is_system_role": False},
    {"name": "Employee",    "description": "Standard employee access.", "is_system_role": False},
]

SYSTEM_ROLE_NAMES = {"Super Admin", "Admin"}

# ── Login log event types ─────────────────────────────────────────────────────
LOGIN_EVENT_SUCCESS        = "LOGIN_SUCCESS"
LOGIN_EVENT_FAILED         = "LOGIN_FAILED"
LOGIN_EVENT_LOGOUT         = "LOGOUT"
LOGIN_EVENT_FORCED_LOGOUT  = "FORCED_LOGOUT"
LOGIN_EVENT_PASSWORD_RESET = "PASSWORD_RESET"

ALL_LOGIN_EVENTS = [
    LOGIN_EVENT_SUCCESS, LOGIN_EVENT_FAILED, LOGIN_EVENT_LOGOUT,
    LOGIN_EVENT_FORCED_LOGOUT, LOGIN_EVENT_PASSWORD_RESET,
]

# ── Activity log action types ─────────────────────────────────────────────────
ACTION_USER_CREATED      = "USER_CREATED"
ACTION_USER_UPDATED      = "USER_UPDATED"
ACTION_USER_ACTIVATED    = "USER_ACTIVATED"
ACTION_USER_DEACTIVATED  = "USER_DEACTIVATED"
ACTION_USER_INVITED      = "USER_INVITED"
ACTION_INVITE_RESENT     = "INVITE_RESENT"
ACTION_USER_REMOVED      = "USER_REMOVED"
ACTION_PASSWORD_RESET    = "PASSWORD_RESET"
ACTION_ROLE_ASSIGNED     = "ROLE_ASSIGNED"
ACTION_ROLE_REMOVED      = "ROLE_REMOVED"
ACTION_FORCE_LOGOUT      = "FORCE_LOGOUT"
ACTION_ROLE_CREATED      = "ROLE_CREATED"
ACTION_ROLE_UPDATED      = "ROLE_UPDATED"
ACTION_ROLE_CLONED       = "ROLE_CLONED"
ACTION_ROLE_ACTIVATED    = "ROLE_ACTIVATED"
ACTION_ROLE_DEACTIVATED  = "ROLE_DEACTIVATED"
ACTION_ROLE_PERMS_UPDATED = "ROLE_PERMISSIONS_UPDATED"

# ── Permission catalog ────────────────────────────────────────────────────────
# Workspace-level permissions. "Super Admin" and "Admin" system roles get all
# permissions seeded automatically. Custom roles start with none.

MODULE_USERS    = "users"
MODULE_ROLES    = "roles"
MODULE_SESSIONS = "sessions"
MODULE_ORG      = "org"

MODULE_LABELS = {
    MODULE_USERS:    "User Management",
    MODULE_ROLES:    "Roles & Permissions",
    MODULE_SESSIONS: "Sessions & Logs",
    MODULE_ORG:      "Organization",
}

# (name, description, module)
PERMISSION_CATALOG = [
    # User management
    ("user.view",           "View user list and profiles",                    MODULE_USERS),
    ("user.invite",         "Invite new users to the workspace",              MODULE_USERS),
    ("user.edit",           "Edit user profiles and role assignments",        MODULE_USERS),
    ("user.deactivate",     "Activate or deactivate users",                   MODULE_USERS),
    ("user.reset_password", "Reset another user's password",                  MODULE_USERS),
    ("user.force_logout",   "Force-logout all sessions for a user",           MODULE_USERS),
    ("user.remove",         "Remove pending (uninvited) users",               MODULE_USERS),
    # Roles & permissions
    ("role.view",           "View roles and their permission assignments",    MODULE_ROLES),
    ("role.create",         "Create custom roles",                            MODULE_ROLES),
    ("role.edit",           "Edit role name, description and permissions",    MODULE_ROLES),
    ("role.clone",          "Clone an existing role",                         MODULE_ROLES),
    ("role.delete",         "Delete custom roles",                            MODULE_ROLES),
    # Sessions & logs
    ("session.view",        "View active and past sessions",                  MODULE_SESSIONS),
    ("session.terminate",   "Terminate a session",                            MODULE_SESSIONS),
    ("logs.view",           "View login logs and activity logs",              MODULE_SESSIONS),
    # Organization
    ("org.view",            "View organization settings",                     MODULE_ORG),
    ("org.edit",            "Edit organization settings",                     MODULE_ORG),
    ("org.company",         "Manage companies",                               MODULE_ORG),
    ("org.department",      "Manage departments",                             MODULE_ORG),
    ("org.designation",     "Manage designations",                            MODULE_ORG),
]

# Permissions given to "Super Admin" (system role — wildcard shorthand)
SUPER_ADMIN_PERMISSIONS = {p[0] for p in PERMISSION_CATALOG}

# Permissions given to "Admin" (all except delete/remove)
ADMIN_PERMISSIONS = {
    p[0] for p in PERMISSION_CATALOG
    if p[0] not in {"role.delete", "user.remove"}
}
