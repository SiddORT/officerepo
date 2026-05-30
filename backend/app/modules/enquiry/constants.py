"""
Centralized constants & enums for the enquiry module.
"""

# Modules a prospect can express interest in (kept in sync with the platform).
INTERESTED_MODULES = [
    "employee",
    "hrms",
    "assets",
    "billing",
    "workflow",
    "reports",
]

# Field length bounds
NAME_MIN_LEN = 2
NAME_MAX_LEN = 100
COMPANY_MIN_LEN = 2
COMPANY_MAX_LEN = 150
MESSAGE_MIN_LEN = 20
MESSAGE_MAX_LEN = 1000

# Defaults
DEFAULT_SOURCE = "Website"
DEFAULT_STATUS = "New"

# Enquiry reference number prefix — e.g. ENQ-20260530-1A2B3C4D
ENQUIRY_NUMBER_PREFIX = "ENQ"

# ── Superadmin Inbox — status management ─────────────────────────────────────
STATUS_NEW = "New"
STATUS_IN_REVIEW = "In Review"
STATUS_ASSIGNED = "Assigned"
STATUS_CONVERTED = "Converted"
STATUS_CLOSED = "Closed"

# Statuses a superadmin may set manually. "Converted" is terminal and reached
# only via Convert-to-Lead, so it is not in the manually-settable set.
ENQUIRY_STATUSES = [STATUS_NEW, STATUS_IN_REVIEW, STATUS_ASSIGNED, STATUS_CLOSED]
ALL_ENQUIRY_STATUSES = ENQUIRY_STATUSES + [STATUS_CONVERTED]
TERMINAL_STATUSES = {STATUS_CONVERTED}

# ── Activity timeline event types ────────────────────────────────────────────
ACTIVITY_CREATED = "created"
ACTIVITY_STATUS_CHANGED = "status_changed"
ACTIVITY_ASSIGNED = "assigned"
ACTIVITY_UNASSIGNED = "unassigned"
ACTIVITY_NOTE_ADDED = "note_added"
ACTIVITY_NOTE_DELETED = "note_deleted"
ACTIVITY_MARKED_SPAM = "marked_spam"
ACTIVITY_UNMARKED_SPAM = "unmarked_spam"
ACTIVITY_CONVERTED = "converted_to_lead"

# ── List defaults (pagination / sorting) ─────────────────────────────────────
DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SORTABLE_FIELDS = ["created_at", "status", "company_name", "full_name"]
DEFAULT_SORT_BY = "created_at"
DEFAULT_SORT_DIR = "desc"

# Note bounds
NOTE_MIN_LEN = 1
NOTE_MAX_LEN = 2000

# Spam protection
RATE_LIMIT_MAX = 5               # max submissions ...
RATE_LIMIT_WINDOW_MINUTES = 60   # ... per this window, per IP
DUPLICATE_WINDOW_MINUTES = 1440  # identical email+company within 24h = duplicate

# Audit actions
AUDIT_ENTITY = "enquiry"
AUDIT_CREATED = "enquiry.created"
AUDIT_CONSENT = "enquiry.consent_given"
AUDIT_MARKETING_CONSENT = "enquiry.marketing_consent_given"
AUDIT_STATUS_CHANGED = "enquiry.status_changed"
AUDIT_ASSIGNED = "enquiry.assigned"
AUDIT_NOTE_ADDED = "enquiry.note_added"
AUDIT_NOTE_DELETED = "enquiry.note_deleted"
AUDIT_MARKED_SPAM = "enquiry.marked_spam"
AUDIT_UNMARKED_SPAM = "enquiry.unmarked_spam"
AUDIT_CONVERTED = "enquiry.converted_to_lead"

# User-facing messages
SUCCESS_MESSAGE = "Thank you for contacting Office Repo. Our team will reach out shortly."
DUPLICATE_MESSAGE = "We have already received your enquiry. Our team will contact you shortly."
RATE_LIMIT_MESSAGE = "Too many enquiries from your network. Please try again later."
