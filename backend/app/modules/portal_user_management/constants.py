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
ACTION_PASSWORD_RESET    = "PASSWORD_RESET"
ACTION_ROLE_ASSIGNED     = "ROLE_ASSIGNED"
ACTION_ROLE_REMOVED      = "ROLE_REMOVED"
ACTION_FORCE_LOGOUT      = "FORCE_LOGOUT"
ACTION_ROLE_CREATED      = "ROLE_CREATED"
ACTION_ROLE_UPDATED      = "ROLE_UPDATED"
ACTION_ROLE_CLONED       = "ROLE_CLONED"
ACTION_ROLE_ACTIVATED    = "ROLE_ACTIVATED"
ACTION_ROLE_DEACTIVATED  = "ROLE_DEACTIVATED"
