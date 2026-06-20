"""Constants for the Interview Management module."""

MODULE_NAME  = "Interview Management"
MODULE_ROUTE = "hrms/interviews"

# ── Interview statuses ────────────────────────────────────────────────────────
INT_STATUS_SCHEDULED  = "Scheduled"
INT_STATUS_COMPLETED  = "Completed"
INT_STATUS_CANCELLED  = "Cancelled"
INT_STATUS_NO_SHOW    = "No Show"

INTERVIEW_STATUSES = [
    INT_STATUS_SCHEDULED,
    INT_STATUS_COMPLETED,
    INT_STATUS_CANCELLED,
    INT_STATUS_NO_SHOW,
]

# ── Interview results ─────────────────────────────────────────────────────────
RESULT_PENDING  = "Pending"
RESULT_PASS     = "Pass"
RESULT_FAIL     = "Fail"
RESULT_HOLD     = "Hold"
RESULT_SELECTED = "Selected"

INTERVIEW_RESULTS = [
    RESULT_PENDING,
    RESULT_PASS,
    RESULT_FAIL,
    RESULT_HOLD,
    RESULT_SELECTED,
]

# ── Interview modes ───────────────────────────────────────────────────────────
INTERVIEW_MODES = [
    "In-person",
    "Video Call",
    "Phone",
]

# ── Round types ───────────────────────────────────────────────────────────────
ROUND_TYPES = [
    "HR Round",
    "Technical Round",
    "Managerial Round",
    "Final Round",
    "Aptitude Test",
    "Group Discussion",
    "Culture Fit",
    "Background Check",
]

# ── Feedback ratings ──────────────────────────────────────────────────────────
FEEDBACK_RATINGS = [
    "Excellent",
    "Good",
    "Average",
    "Below Average",
    "Poor",
]

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_SCHEDULED  = "Interview Scheduled"
ACT_UPDATED    = "Interview Updated"
ACT_COMPLETED  = "Interview Completed"
ACT_CANCELLED  = "Interview Cancelled"
ACT_NO_SHOW    = "Marked No Show"
ACT_RESULT_SET = "Result Updated"
