"""Constants for the Interview Management module."""

MODULE_NAME  = "Interview Management"
MODULE_ROUTE = "hrms/interviews"

# ── Interview statuses ────────────────────────────────────────────────────────
INT_STATUS_SCHEDULED   = "Scheduled"
INT_STATUS_RESCHEDULED = "Rescheduled"
INT_STATUS_COMPLETED   = "Completed"
INT_STATUS_CANCELLED   = "Cancelled"
INT_STATUS_NO_SHOW     = "No Show"

INTERVIEW_STATUSES = [
    INT_STATUS_SCHEDULED,
    INT_STATUS_RESCHEDULED,
    INT_STATUS_COMPLETED,
    INT_STATUS_CANCELLED,
    INT_STATUS_NO_SHOW,
]

ACTIVE_STATUSES = {INT_STATUS_SCHEDULED, INT_STATUS_RESCHEDULED}

# ── Interview results ─────────────────────────────────────────────────────────
RESULT_PENDING  = "Pending"
RESULT_PASS     = "Pass"
RESULT_FAIL     = "Fail"
RESULT_HOLD     = "Hold"
RESULT_SELECTED = "Selected"
RESULT_REJECTED = "Rejected"

INTERVIEW_RESULTS = [
    RESULT_PENDING,
    RESULT_PASS,
    RESULT_FAIL,
    RESULT_HOLD,
    RESULT_SELECTED,
    RESULT_REJECTED,
]

# ── Interview modes ───────────────────────────────────────────────────────────
MODE_PHYSICAL = "Physical"
MODE_VIDEO    = "Video Conference"
MODE_PHONE    = "Telephonic"

INTERVIEW_MODES = [MODE_PHYSICAL, MODE_VIDEO, MODE_PHONE]

# ── System round types ────────────────────────────────────────────────────────
ROUND_TYPES = [
    "Telephonic Screening",
    "Video Interview",
    "Physical Interview",
    "Technical Interview",
    "Aptitude Test",
    "Coding Test",
    "Group Discussion",
    "Manager Discussion",
    "HR Discussion",
    "Leadership Round",
    "Client Interview",
    "Culture Fit Interview",
]

# ── Recommendations ───────────────────────────────────────────────────────────
REC_STRONG_HIRE = "Strong Hire"
REC_HIRE        = "Hire"
REC_HOLD        = "Hold"
REC_REJECT      = "Reject"

RECOMMENDATIONS = [REC_STRONG_HIRE, REC_HIRE, REC_HOLD, REC_REJECT]

# ── Panel member roles ────────────────────────────────────────────────────────
PANEL_ROLES = ["Lead Interviewer", "Panel Member", "Observer"]

# ── Scorecard criteria ────────────────────────────────────────────────────────
DEFAULT_SCORECARD_CRITERIA = [
    "Technical Skills",
    "Communication",
    "Problem Solving",
    "Cultural Fit",
    "Experience Match",
]

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_PIPELINE_CREATED    = "Pipeline Created"
ACT_PIPELINE_UPDATED    = "Pipeline Updated"
ACT_SCHEDULED           = "Interview Scheduled"
ACT_RESCHEDULED         = "Interview Rescheduled"
ACT_COMPLETED           = "Interview Completed"
ACT_CANCELLED           = "Interview Cancelled"
ACT_NO_SHOW             = "Marked No Show"
ACT_PANEL_ADDED         = "Panel Member Added"
ACT_PANEL_REMOVED       = "Panel Member Removed"
ACT_FEEDBACK_SUBMITTED  = "Feedback Submitted"
ACT_SELECTED            = "Candidate Selected"
ACT_REJECTED            = "Candidate Rejected"
