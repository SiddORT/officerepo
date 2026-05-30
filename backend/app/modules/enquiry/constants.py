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

# Spam protection
RATE_LIMIT_MAX = 5               # max submissions ...
RATE_LIMIT_WINDOW_MINUTES = 60   # ... per this window, per IP
DUPLICATE_WINDOW_MINUTES = 1440  # identical email+company within 24h = duplicate

# Audit actions
AUDIT_ENTITY = "enquiry"
AUDIT_CREATED = "enquiry.created"
AUDIT_CONSENT = "enquiry.consent_given"
AUDIT_MARKETING_CONSENT = "enquiry.marketing_consent_given"

# User-facing messages
SUCCESS_MESSAGE = "Thank you for contacting Office Repo. Our team will reach out shortly."
DUPLICATE_MESSAGE = "We have already received your enquiry. Our team will contact you shortly."
RATE_LIMIT_MESSAGE = "Too many enquiries from your network. Please try again later."
