"""Leave Management — constants and enumerations."""

# ── Leave statuses ─────────────────────────────────────────────────────────────
STATUS_DRAFT     = "Draft"
STATUS_PENDING   = "Pending Approval"
STATUS_APPROVED  = "Approved"
STATUS_REJECTED  = "Rejected"
STATUS_CANCELLED = "Cancelled"

LEAVE_REQUEST_STATUSES = [
    STATUS_DRAFT, STATUS_PENDING, STATUS_APPROVED,
    STATUS_REJECTED, STATUS_CANCELLED,
]

# ── Approval step statuses ─────────────────────────────────────────────────────
APPROVAL_PENDING  = "Pending"
APPROVAL_APPROVED = "Approved"
APPROVAL_REJECTED = "Rejected"
APPROVAL_SKIPPED  = "Skipped"

APPROVAL_STATUSES = [APPROVAL_PENDING, APPROVAL_APPROVED, APPROVAL_REJECTED, APPROVAL_SKIPPED]

# ── Approver levels ────────────────────────────────────────────────────────────
LEVEL_MANAGER   = "Manager"
LEVEL_DEPT_HEAD = "Department Head"
LEVEL_HR        = "HR"
LEVEL_ADMIN     = "Admin"

APPROVER_LEVELS = [LEVEL_MANAGER, LEVEL_DEPT_HEAD, LEVEL_HR, LEVEL_ADMIN]

# ── Accrual frequencies ────────────────────────────────────────────────────────
ACCRUAL_MONTHLY    = "Monthly"
ACCRUAL_QUARTERLY  = "Quarterly"
ACCRUAL_YEARLY     = "Yearly"
ACCRUAL_NONE       = "None"

ACCRUAL_FREQUENCIES = [ACCRUAL_MONTHLY, ACCRUAL_QUARTERLY, ACCRUAL_YEARLY, ACCRUAL_NONE]

# ── Allocation types ───────────────────────────────────────────────────────────
ALLOC_FIXED    = "Fixed"
ALLOC_ACCRUAL  = "Accrual"
ALLOC_PRORATED = "Pro-Rated"

ALLOCATION_TYPES = [ALLOC_FIXED, ALLOC_ACCRUAL, ALLOC_PRORATED]

# ── Employee categories ────────────────────────────────────────────────────────
EMP_PERMANENT   = "Permanent"
EMP_CONTRACT    = "Contract"
EMP_CONSULTANT  = "Consultant"
EMP_INTERN      = "Intern"
EMP_TRAINEE     = "Trainee"

EMPLOYEE_CATEGORIES = [EMP_PERMANENT, EMP_CONTRACT, EMP_CONSULTANT, EMP_INTERN, EMP_TRAINEE]

# ── Policy scope ───────────────────────────────────────────────────────────────
SCOPE_COMPANY    = "Company"
SCOPE_BRANCH     = "Branch"
SCOPE_DEPARTMENT = "Department"
SCOPE_CATEGORY   = "Employee Category"
SCOPE_GLOBAL     = "Global"

POLICY_SCOPES = [SCOPE_GLOBAL, SCOPE_COMPANY, SCOPE_BRANCH, SCOPE_DEPARTMENT, SCOPE_CATEGORY]

# ── Holiday types ──────────────────────────────────────────────────────────────
HOLIDAY_NATIONAL = "National"
HOLIDAY_REGIONAL = "Regional"
HOLIDAY_COMPANY  = "Company Holiday"

HOLIDAY_TYPES = [HOLIDAY_NATIONAL, HOLIDAY_REGIONAL, HOLIDAY_COMPANY]

# ── Weekly off patterns ────────────────────────────────────────────────────────
WEEKLY_OFF_SUNDAY            = "Sunday Only"
WEEKLY_OFF_SAT_SUN           = "Saturday + Sunday"
WEEKLY_OFF_ALT_SAT_SUN       = "Alternate Saturday + Sunday"
WEEKLY_OFF_ROTATIONAL        = "Rotational"

WEEKLY_OFF_PATTERNS = [
    WEEKLY_OFF_SUNDAY, WEEKLY_OFF_SAT_SUN,
    WEEKLY_OFF_ALT_SAT_SUN, WEEKLY_OFF_ROTATIONAL,
]

# ── Comp-off sources ───────────────────────────────────────────────────────────
COMPOFF_WEEKEND  = "Weekend Work"
COMPOFF_HOLIDAY  = "Holiday Work"

COMPOFF_SOURCES = [COMPOFF_WEEKEND, COMPOFF_HOLIDAY]

COMPOFF_PENDING  = "Pending"
COMPOFF_APPROVED = "Approved"
COMPOFF_REJECTED = "Rejected"
COMPOFF_EXPIRED  = "Expired"

COMPOFF_STATUSES = [COMPOFF_PENDING, COMPOFF_APPROVED, COMPOFF_REJECTED, COMPOFF_EXPIRED]

# ── Encashment statuses ────────────────────────────────────────────────────────
ENCASH_PENDING   = "Pending"
ENCASH_APPROVED  = "Approved"
ENCASH_PROCESSED = "Processed"
ENCASH_REJECTED  = "Rejected"

ENCASHMENT_STATUSES = [ENCASH_PENDING, ENCASH_APPROVED, ENCASH_PROCESSED, ENCASH_REJECTED]

# ── Activity actions ───────────────────────────────────────────────────────────
ACT_LEAVE_APPLIED    = "Leave Applied"
ACT_LEAVE_APPROVED   = "Leave Approved"
ACT_LEAVE_REJECTED   = "Leave Rejected"
ACT_LEAVE_CANCELLED  = "Leave Cancelled"
ACT_BALANCE_ADJUSTED = "Balance Adjusted"
ACT_BALANCE_ACCRUED  = "Balance Accrued"
ACT_COMPOFF_CREDITED = "Comp Off Credited"
ACT_COMPOFF_USED     = "Comp Off Used"
ACT_ENCASH_REQUESTED = "Encashment Requested"
ACT_TYPE_CREATED     = "Leave Type Created"
ACT_POLICY_CREATED   = "Policy Created"
ACT_POLICY_UPDATED   = "Policy Updated"
ACT_HOLIDAY_ADDED    = "Holiday Added"
ACT_CARRY_FORWARD    = "Carry Forward Applied"

# ── Half-day options ───────────────────────────────────────────────────────────
HALF_DAY_FIRST  = "First Half"
HALF_DAY_SECOND = "Second Half"
HALF_DAY_OPTIONS = [HALF_DAY_FIRST, HALF_DAY_SECOND]

# ── Default leave types (seeded at startup) ───────────────────────────────────
DEFAULT_LEAVE_TYPES = [
    {"code": "CL",  "name": "Casual Leave",     "paid": True,  "requires_approval": True,  "allow_half_day": True,  "carry_forward": False, "encashment": False, "color": "#3B82F6"},
    {"code": "SL",  "name": "Sick Leave",        "paid": True,  "requires_approval": False, "allow_half_day": True,  "carry_forward": False, "encashment": False, "color": "#EF4444"},
    {"code": "EL",  "name": "Earned Leave",      "paid": True,  "requires_approval": True,  "allow_half_day": True,  "carry_forward": True,  "encashment": True,  "color": "#10B981"},
    {"code": "LOP", "name": "Loss Of Pay",       "paid": False, "requires_approval": True,  "allow_half_day": True,  "carry_forward": False, "encashment": False, "color": "#F59E0B"},
    {"code": "CO",  "name": "Comp Off",          "paid": True,  "requires_approval": True,  "allow_half_day": True,  "carry_forward": False, "encashment": False, "color": "#8B5CF6"},
    {"code": "ML",  "name": "Maternity Leave",   "paid": True,  "requires_approval": True,  "allow_half_day": False, "carry_forward": False, "encashment": False, "color": "#EC4899"},
    {"code": "PL",  "name": "Paternity Leave",   "paid": True,  "requires_approval": True,  "allow_half_day": False, "carry_forward": False, "encashment": False, "color": "#06B6D4"},
    {"code": "BL",  "name": "Bereavement Leave", "paid": True,  "requires_approval": True,  "allow_half_day": False, "carry_forward": False, "encashment": False, "color": "#6B7280"},
]

# ── Day-of-week mapping ────────────────────────────────────────────────────────
# Python weekday(): Monday=0 … Sunday=6
WEEKOFF_DAYS_MAP = {
    WEEKLY_OFF_SUNDAY:      [6],
    WEEKLY_OFF_SAT_SUN:     [5, 6],
    WEEKLY_OFF_ALT_SAT_SUN: [6],   # alternating Sat handled in service
    WEEKLY_OFF_ROTATIONAL:  [],     # custom
}
