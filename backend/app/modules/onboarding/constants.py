"""Constants for the Employee Onboarding module."""

MODULE_NAME  = "Employee Onboarding"
MODULE_ROUTE = "hrms/onboarding"

# ── Onboarding statuses ───────────────────────────────────────────────────────
OB_STATUS_PREBOARDING     = "Preboarding"
OB_STATUS_IN_PROGRESS     = "Onboarding In Progress"
OB_STATUS_READY           = "Ready For Activation"
OB_STATUS_COMPLETED       = "Completed"
OB_STATUS_ON_HOLD         = "On Hold"
OB_STATUS_CANCELLED       = "Cancelled"
OB_STATUS_DEFERRED        = "Deferred"

ONBOARDING_STATUSES = [
    OB_STATUS_PREBOARDING,
    OB_STATUS_IN_PROGRESS,
    OB_STATUS_READY,
    OB_STATUS_COMPLETED,
    OB_STATUS_ON_HOLD,
    OB_STATUS_CANCELLED,
    OB_STATUS_DEFERRED,
]

ACTIVE_OB_STATUSES = {OB_STATUS_PREBOARDING, OB_STATUS_IN_PROGRESS, OB_STATUS_READY}
TERMINAL_OB_STATUSES = {OB_STATUS_COMPLETED, OB_STATUS_CANCELLED}

# ── Task statuses ─────────────────────────────────────────────────────────────
TASK_STATUS_PENDING     = "Pending"
TASK_STATUS_IN_PROGRESS = "In Progress"
TASK_STATUS_COMPLETED   = "Completed"
TASK_STATUS_SKIPPED     = "Skipped"

TASK_STATUSES = [TASK_STATUS_PENDING, TASK_STATUS_IN_PROGRESS, TASK_STATUS_COMPLETED, TASK_STATUS_SKIPPED]

# ── Task categories ───────────────────────────────────────────────────────────
TASK_CAT_HR      = "HR"
TASK_CAT_IT      = "IT"
TASK_CAT_ADMIN   = "Admin"
TASK_CAT_MANAGER = "Manager"
TASK_CAT_FINANCE = "Finance"

TASK_CATEGORIES = [TASK_CAT_HR, TASK_CAT_IT, TASK_CAT_ADMIN, TASK_CAT_MANAGER, TASK_CAT_FINANCE]

# ── Account types + statuses ──────────────────────────────────────────────────
ACCOUNT_TYPES = [
    "Official Email",
    "Employee Portal Access",
    "VPN Access",
    "HRMS Access",
    "Project Tools",
    "Slack / Teams",
    "GitHub / GitLab",
    "Other",
]

ACCOUNT_STATUS_PENDING   = "Pending"
ACCOUNT_STATUS_CREATED   = "Created"
ACCOUNT_STATUS_ACTIVE    = "Active"
ACCOUNT_STATUS_SUSPENDED = "Suspended"

ACCOUNT_STATUSES = [
    ACCOUNT_STATUS_PENDING,
    ACCOUNT_STATUS_CREATED,
    ACCOUNT_STATUS_ACTIVE,
    ACCOUNT_STATUS_SUSPENDED,
]

# ── Training types + statuses ─────────────────────────────────────────────────
TRAINING_TYPES = [
    "Mandatory",
    "Policy",
    "Compliance",
    "Technical",
    "Soft Skills",
    "Optional",
]

TRAINING_STATUS_ASSIGNED    = "Assigned"
TRAINING_STATUS_IN_PROGRESS = "In Progress"
TRAINING_STATUS_COMPLETED   = "Completed"
TRAINING_STATUS_SKIPPED     = "Skipped"

TRAINING_STATUSES = [
    TRAINING_STATUS_ASSIGNED,
    TRAINING_STATUS_IN_PROGRESS,
    TRAINING_STATUS_COMPLETED,
    TRAINING_STATUS_SKIPPED,
]

# ── Employee categories ───────────────────────────────────────────────────────
EMPLOYEE_CATEGORIES = [
    "Full-Time Employee",
    "Part-Time Employee",
    "Intern",
    "Contractor",
    "Consultant",
    "Remote Employee",
    "Probationer",
]

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_STARTED          = "Onboarding Started"
ACT_TASK_UPDATED     = "Task Status Updated"
ACT_ASSET_ASSIGNED   = "Asset Assigned"
ACT_ASSET_RETURNED   = "Asset Returned"
ACT_ACCOUNT_ADDED    = "Account Provisioned"
ACT_TRAINING_ADDED   = "Training Assigned"
ACT_STATUS_CHANGED   = "Status Changed"
ACT_ACTIVATED        = "Employee Activated"
ACT_CANCELLED        = "Onboarding Cancelled"
ACT_NOTE_ADDED       = "Note Added"

# ── Default template tasks ────────────────────────────────────────────────────
DEFAULT_TEMPLATE_TASKS = {
    "Full-Time Employee": [
        {"task_name": "Collect Signed Offer Letter",       "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 1},
        {"task_name": "Collect Aadhar Card & PAN Card",    "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 2},
        {"task_name": "Background Verification",           "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 3,  "is_mandatory": True,  "sequence": 3},
        {"task_name": "NDA Signing",                       "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 4},
        {"task_name": "Create Official Email Account",     "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 5},
        {"task_name": "Assign Laptop / Desktop",           "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 6},
        {"task_name": "Setup System Access & Credentials", "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 7},
        {"task_name": "Desk Allocation",                   "category": TASK_CAT_ADMIN,   "owner_team": "Admin",   "due_offset_days": 0,  "is_mandatory": True,  "sequence": 8},
        {"task_name": "Access Card Issuance",              "category": TASK_CAT_ADMIN,   "owner_team": "Admin",   "due_offset_days": 1,  "is_mandatory": False, "sequence": 9},
        {"task_name": "Assign Buddy",                      "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 0,  "is_mandatory": False, "sequence": 10},
        {"task_name": "Team Introduction",                 "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 1,  "is_mandatory": False, "sequence": 11},
        {"task_name": "Goal Setting (30-60-90 Day Plan)",  "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 7,  "is_mandatory": False, "sequence": 12},
    ],
    "Intern": [
        {"task_name": "Collect ID Proof",                  "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 1},
        {"task_name": "NDA / Agreement Signing",           "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 2},
        {"task_name": "Create Email Account",              "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 3},
        {"task_name": "Assign Workstation",                "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 4},
        {"task_name": "Intern Orientation",                "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 1,  "is_mandatory": True,  "sequence": 5},
    ],
    "Contractor": [
        {"task_name": "Collect Contract Agreement",        "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 1},
        {"task_name": "Collect ID Proof",                  "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 2},
        {"task_name": "Create System Access",              "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 3},
        {"task_name": "Project Briefing",                  "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 1,  "is_mandatory": True,  "sequence": 4},
    ],
    "Remote Employee": [
        {"task_name": "Collect Signed Offer Letter",       "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 1},
        {"task_name": "ID & Document Collection",          "category": TASK_CAT_HR,      "owner_team": "HR",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 2},
        {"task_name": "Create Official Email Account",     "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 3},
        {"task_name": "Setup VPN Access",                  "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 1,  "is_mandatory": True,  "sequence": 4},
        {"task_name": "Ship Laptop / Equipment",           "category": TASK_CAT_IT,      "owner_team": "IT",      "due_offset_days": 0,  "is_mandatory": True,  "sequence": 5},
        {"task_name": "Virtual Team Introduction",         "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 1,  "is_mandatory": False, "sequence": 6},
        {"task_name": "Remote Goal Setting",               "category": TASK_CAT_MANAGER, "owner_team": "Manager", "due_offset_days": 7,  "is_mandatory": False, "sequence": 7},
    ],
}
