"""
Centralized constants & enums for the Currency Management module.

Keeping every controlled vocabulary here means the router, service, schemas and
validators share a single source of truth (no hardcoded strings scattered about).
"""

# ── Currency status ──────────────────────────────────────────────────────────
STATUS_ACTIVE = "Active"
STATUS_INACTIVE = "Inactive"
CURRENCY_STATUSES = [STATUS_ACTIVE, STATUS_INACTIVE]

# ── Rate sources ─────────────────────────────────────────────────────────────
SOURCE_FOREX_API = "Forex API"
SOURCE_MANUAL = "Manual"
SOURCE_INTERNAL = "Internal"
RATE_SOURCES = [SOURCE_FOREX_API, SOURCE_MANUAL, SOURCE_INTERNAL]

# ── Sync log statuses ────────────────────────────────────────────────────────
SYNC_SUCCESS = "Success"
SYNC_FAILED = "Failed"
SYNC_PARTIAL = "Partial Success"
SYNC_STATUSES = [SYNC_SUCCESS, SYNC_FAILED, SYNC_PARTIAL]

# ── Field bounds ─────────────────────────────────────────────────────────────
CURRENCY_CODE_LEN = 3            # ISO 4217 alphabetic code
CURRENCY_NAME_MIN_LEN = 2
CURRENCY_NAME_MAX_LEN = 100
CURRENCY_SYMBOL_MAX_LEN = 8
COUNTRY_MIN_LEN = 2
COUNTRY_MAX_LEN = 100
DECIMAL_PLACES_MIN = 0
DECIMAL_PLACES_MAX = 6
DEFAULT_DECIMAL_PLACES = 2
RATE_MIN = 0.0                   # exclusive lower bound enforced in validators
RATE_MAX = 1_000_000_000.0
ERROR_MESSAGE_MAX_LEN = 2000

# ── List defaults (pagination / sorting) ─────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SORTABLE_CURRENCY_FIELDS = [
    "currency_code", "currency_name", "country", "status", "created_at", "updated_at",
]
DEFAULT_SORT_BY = "currency_code"
DEFAULT_SORT_DIR = "asc"

SORTABLE_HISTORY_FIELDS = ["changed_at", "new_rate", "old_rate"]
SORTABLE_SYNC_FIELDS = ["started_at", "completed_at", "sync_status"]

# ── Audit actions ────────────────────────────────────────────────────────────
AUDIT_ENTITY_CURRENCY = "currency"
AUDIT_ENTITY_CURRENCY_RATE = "currency_rate"
AUDIT_ENTITY_CURRENCY_SYNC = "currency_sync"

AUDIT_CURRENCY_CREATED = "currency.created"
AUDIT_CURRENCY_UPDATED = "currency.updated"
AUDIT_CURRENCY_DELETED = "currency.deleted"
AUDIT_CURRENCY_ACTIVATED = "currency.activated"
AUDIT_CURRENCY_DEACTIVATED = "currency.deactivated"
AUDIT_RATE_UPDATED = "currency.rate_updated"
AUDIT_RATE_OVERRIDDEN = "currency.rate_overridden"
AUDIT_BASE_CURRENCY_CHANGED = "currency.base_changed"
AUDIT_SYNC_RUN = "currency.sync_run"
