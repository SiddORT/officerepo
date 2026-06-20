"""Exit Management — constants and enums."""
from __future__ import annotations

# ── Separation types ──────────────────────────────────────────────────────────
SEP_RESIGNATION        = "Resignation"
SEP_TERMINATION        = "Termination"
SEP_RETIREMENT         = "Retirement"
SEP_CONTRACT_COMPLETE  = "Contract Completion"
SEP_LAYOFF             = "Layoff"
SEP_END_INTERNSHIP     = "End Of Internship"
SEP_ABSCONDING         = "Absconding"
SEP_DECEASED           = "Deceased"

ALL_SEPARATION_TYPES = [
    SEP_RESIGNATION, SEP_TERMINATION, SEP_RETIREMENT,
    SEP_CONTRACT_COMPLETE, SEP_LAYOFF, SEP_END_INTERNSHIP,
    SEP_ABSCONDING, SEP_DECEASED,
]

# ── Resignation statuses ──────────────────────────────────────────────────────
RES_DRAFT        = "Draft"
RES_SUBMITTED    = "Submitted"
RES_UNDER_REVIEW = "Under Review"
RES_APPROVED     = "Approved"
RES_REJECTED     = "Rejected"
RES_WITHDRAWN    = "Withdrawn"

ALL_RESIGNATION_STATUSES = [
    RES_DRAFT, RES_SUBMITTED, RES_UNDER_REVIEW,
    RES_APPROVED, RES_REJECTED, RES_WITHDRAWN,
]

EDITABLE_RESIGNATION_STATUSES = {RES_DRAFT}
TERMINAL_RESIGNATION_STATUSES = {RES_REJECTED, RES_WITHDRAWN}

# ── Reason categories ─────────────────────────────────────────────────────────
REASON_BETTER_OPPORTUNITY = "Better Opportunity"
REASON_RELOCATION         = "Relocation"
REASON_COMPENSATION       = "Compensation"
REASON_HIGHER_EDUCATION   = "Higher Education"
REASON_PERSONAL           = "Personal Reasons"
REASON_WORK_ENVIRONMENT   = "Work Environment"
REASON_CAREER_CHANGE      = "Career Change"
REASON_OTHER              = "Other"

ALL_REASON_CATEGORIES = [
    REASON_BETTER_OPPORTUNITY, REASON_RELOCATION, REASON_COMPENSATION,
    REASON_HIGHER_EDUCATION, REASON_PERSONAL, REASON_WORK_ENVIRONMENT,
    REASON_CAREER_CHANGE, REASON_OTHER,
]

# ── Employee exit statuses (updates employee record) ─────────────────────────
EMP_ACTIVE               = "Active"
EMP_RESIGNATION_SUBMITTED = "Resignation Submitted"
EMP_NOTICE_PERIOD        = "Notice Period"
EMP_CLEARANCE_IN_PROGRESS = "Clearance In Progress"
EMP_SETTLEMENT_PENDING   = "Settlement Pending"
EMP_EXITED               = "Exited"
EMP_TERMINATED           = "Terminated"
EMP_RETIRED              = "Retired"
EMP_ABSCONDED            = "Absconded"

ALL_EXIT_EMP_STATUSES = [
    EMP_ACTIVE, EMP_RESIGNATION_SUBMITTED, EMP_NOTICE_PERIOD,
    EMP_CLEARANCE_IN_PROGRESS, EMP_SETTLEMENT_PENDING,
    EMP_EXITED, EMP_TERMINATED, EMP_RETIRED, EMP_ABSCONDED,
]

# ── Notice period statuses ────────────────────────────────────────────────────
NP_SERVING   = "Serving"
NP_COMPLETED = "Completed"
NP_WAIVED    = "Waived"
NP_EXTENDED  = "Extended"
NP_BUYOUT    = "Buyout"

ALL_NP_STATUSES = [NP_SERVING, NP_COMPLETED, NP_WAIVED, NP_EXTENDED, NP_BUYOUT]

# ── Clearance departments ─────────────────────────────────────────────────────
DEPT_HR      = "HR"
DEPT_IT      = "IT"
DEPT_ADMIN   = "Admin"
DEPT_FINANCE = "Finance"
DEPT_MANAGER = "Manager"

ALL_CLEARANCE_DEPTS = [DEPT_HR, DEPT_IT, DEPT_ADMIN, DEPT_FINANCE, DEPT_MANAGER]

# ── Clearance / task statuses ─────────────────────────────────────────────────
CLR_PENDING     = "Pending"
CLR_IN_PROGRESS = "In Progress"
CLR_COMPLETED   = "Completed"
CLR_WAIVED      = "Waived"

ALL_CLEARANCE_STATUSES = [CLR_PENDING, CLR_IN_PROGRESS, CLR_COMPLETED, CLR_WAIVED]

# ── Exit interview modes ──────────────────────────────────────────────────────
INT_SELF_SERVICE = "Self-Service"
INT_HR_INTERVIEW = "HR Interview"

ALL_INTERVIEW_MODES = [INT_SELF_SERVICE, INT_HR_INTERVIEW]

# ── Question types ────────────────────────────────────────────────────────────
Q_RATING   = "Rating Scale"
Q_MCQ      = "Multiple Choice"
Q_TEXT     = "Text Area"

ALL_QUESTION_TYPES = [Q_RATING, Q_MCQ, Q_TEXT]

# ── Interview statuses ────────────────────────────────────────────────────────
INT_PENDING   = "Pending"
INT_SCHEDULED = "Scheduled"
INT_COMPLETED = "Completed"
INT_SKIPPED   = "Skipped"

ALL_INTERVIEW_STATUSES = [INT_PENDING, INT_SCHEDULED, INT_COMPLETED, INT_SKIPPED]

# ── Settlement statuses ───────────────────────────────────────────────────────
SETTLE_DRAFT      = "Draft"
SETTLE_CALCULATED = "Calculated"
SETTLE_APPROVED   = "Approved"
SETTLE_PAID       = "Paid"

ALL_SETTLEMENT_STATUSES = [SETTLE_DRAFT, SETTLE_CALCULATED, SETTLE_APPROVED, SETTLE_PAID]

# ── Document types ────────────────────────────────────────────────────────────
DOC_EXPERIENCE = "Experience Letter"
DOC_RELIEVING  = "Relieving Letter"
DOC_FNF        = "Full & Final Settlement Letter"
DOC_CLEARANCE  = "Exit Clearance Letter"
DOC_NOC        = "No Objection Certificate"

ALL_DOC_TYPES = [DOC_EXPERIENCE, DOC_RELIEVING, DOC_FNF, DOC_CLEARANCE, DOC_NOC]

# ── Activity types ────────────────────────────────────────────────────────────
ACT_RESIGNATION_SUBMITTED  = "resignation_submitted"
ACT_RESIGNATION_APPROVED   = "resignation_approved"
ACT_RESIGNATION_REJECTED   = "resignation_rejected"
ACT_RESIGNATION_WITHDRAWN  = "resignation_withdrawn"
ACT_NOTICE_STARTED         = "notice_period_started"
ACT_NOTICE_COMPLETED       = "notice_period_completed"
ACT_NOTICE_BUYOUT          = "notice_buyout"
ACT_CLEARANCE_STARTED      = "clearance_started"
ACT_CLEARANCE_TASK_DONE    = "clearance_task_completed"
ACT_CLEARANCE_DONE         = "clearance_completed"
ACT_ASSET_RETURNED         = "asset_returned"
ACT_ASSET_DAMAGED          = "asset_damaged"
ACT_ASSET_LOST             = "asset_lost"
ACT_INTERVIEW_SCHEDULED    = "interview_scheduled"
ACT_INTERVIEW_COMPLETED    = "interview_completed"
ACT_SETTLEMENT_CALCULATED  = "settlement_calculated"
ACT_SETTLEMENT_APPROVED    = "settlement_approved"
ACT_SETTLEMENT_PAID        = "settlement_paid"
ACT_DOC_GENERATED          = "document_generated"
ACT_EMPLOYEE_EXITED        = "employee_exited"

# ── Default clearance checklist templates ─────────────────────────────────────
DEFAULT_CLEARANCE_TEMPLATES = [
    {"department": DEPT_HR,      "task_name": "Document Verification",    "description": "Verify all employee documents are in order",   "is_mandatory": True},
    {"department": DEPT_HR,      "task_name": "Exit Formalities",         "description": "Complete exit paperwork and formalities",      "is_mandatory": True},
    {"department": DEPT_IT,      "task_name": "Email Deactivation",       "description": "Deactivate company email account",             "is_mandatory": True},
    {"department": DEPT_IT,      "task_name": "System Access Removal",    "description": "Remove access from all systems and tools",     "is_mandatory": True},
    {"department": DEPT_ADMIN,   "task_name": "ID Card Return",           "description": "Collect company ID card",                      "is_mandatory": True},
    {"department": DEPT_ADMIN,   "task_name": "Parking Access Removal",   "description": "Deactivate parking access card",               "is_mandatory": False},
    {"department": DEPT_FINANCE, "task_name": "Loan Clearance",           "description": "Verify all outstanding loans are resolved",    "is_mandatory": True},
    {"department": DEPT_FINANCE, "task_name": "Expense Clearance",        "description": "Verify all pending expense claims are settled", "is_mandatory": True},
    {"department": DEPT_MANAGER, "task_name": "Knowledge Transfer",       "description": "Complete knowledge transfer to team",          "is_mandatory": True},
    {"department": DEPT_MANAGER, "task_name": "Handover Completion",      "description": "Complete work handover to replacement",        "is_mandatory": True},
]

# ── Default exit questionnaire ────────────────────────────────────────────────
DEFAULT_QUESTIONS = [
    {"question_text": "How would you rate the overall work environment?",         "question_type": Q_RATING,  "topic": "Work Environment", "display_order": 1},
    {"question_text": "How would you rate your compensation and benefits?",        "question_type": Q_RATING,  "topic": "Compensation",     "display_order": 2},
    {"question_text": "How would you rate your relationship with management?",     "question_type": Q_RATING,  "topic": "Management",       "display_order": 3},
    {"question_text": "How would you rate career growth opportunities here?",      "question_type": Q_RATING,  "topic": "Career Growth",    "display_order": 4},
    {"question_text": "What is the primary reason for your departure?",            "question_type": Q_MCQ,     "topic": "Reason",           "display_order": 5,
     "options": ["Better Opportunity", "Compensation", "Work Environment", "Personal", "Higher Education", "Other"]},
    {"question_text": "What did you enjoy most about working here?",              "question_type": Q_TEXT,    "topic": "Suggestions",      "display_order": 6},
    {"question_text": "What could we have done better to retain you?",            "question_type": Q_TEXT,    "topic": "Suggestions",      "display_order": 7},
    {"question_text": "Would you recommend this company to others?",               "question_type": Q_RATING,  "topic": "Overall",          "display_order": 8},
]

# ── Status colors (Tailwind) ──────────────────────────────────────────────────
RESIGNATION_STATUS_COLORS = {
    RES_DRAFT:        "slate",
    RES_SUBMITTED:    "amber",
    RES_UNDER_REVIEW: "purple",
    RES_APPROVED:     "green",
    RES_REJECTED:     "red",
    RES_WITHDRAWN:    "gray",
}

SETTLEMENT_STATUS_COLORS = {
    SETTLE_DRAFT:      "slate",
    SETTLE_CALCULATED: "amber",
    SETTLE_APPROVED:   "blue",
    SETTLE_PAID:       "emerald",
}
