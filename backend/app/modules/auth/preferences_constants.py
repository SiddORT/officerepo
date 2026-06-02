"""
Constants for superadmin general preferences.

All allowed values are defined here so schemas, services, and the
frontend options endpoint share a single source of truth.
"""

ALLOWED_THEMES = frozenset({"light", "dark", "system"})

ALLOWED_LANGUAGES = frozenset({"en"})

ALLOWED_DATE_FORMATS = frozenset({"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY"})

ALLOWED_TIME_FORMATS = frozenset({"12h", "24h"})

ALLOWED_WEEK_START_DAYS = frozenset({"monday", "sunday", "saturday"})

ALLOWED_LANDING_PAGES = frozenset({
    "/dashboard",
    "/superadmin/leads",
    "/superadmin/clients",
    "/superadmin/enquiries",
})

ALLOWED_TABLE_PAGE_SIZES = frozenset({10, 25, 50, 100})

DEFAULTS: dict = {
    "theme": "system",
    "language": "en",
    "timezone": "UTC",
    "date_format": "DD/MM/YYYY",
    "time_format": "12h",
    "week_start_day": "monday",
    "default_landing_page": "/dashboard",
    "table_page_size": 25,
}

LANDING_PAGE_LABELS: dict = {
    "/dashboard": "Dashboard",
    "/superadmin/leads": "Lead Management",
    "/superadmin/clients": "Client Management",
    "/superadmin/enquiries": "Enquiry Inbox",
}

LANGUAGE_LABELS: dict = {
    "en": "English",
}
