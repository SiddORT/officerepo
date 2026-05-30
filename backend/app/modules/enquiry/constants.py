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

# Spam protection
RATE_LIMIT_MAX = 5            # max submissions ...
RATE_LIMIT_WINDOW_MINUTES = 60  # ... per this window, per IP
DUPLICATE_WINDOW_MINUTES = 60   # identical email+message within this window = duplicate
