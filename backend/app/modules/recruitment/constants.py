"""Constants for the Recruitment module."""

MODULE_NAME = "Recruitment"   # must match module_master.name in the catalog
MODULE_ROUTE = "recruitment"

# ── Requisition statuses ──────────────────────────────────────────────────────
REQ_STATUS_DRAFT     = "Draft"
REQ_STATUS_SUBMITTED = "Submitted"
REQ_STATUS_APPROVED  = "Approved"
REQ_STATUS_REJECTED  = "Rejected"
REQ_STATUS_CLOSED    = "Closed"

REQUISITION_STATUSES = [
    REQ_STATUS_DRAFT,
    REQ_STATUS_SUBMITTED,
    REQ_STATUS_APPROVED,
    REQ_STATUS_REJECTED,
    REQ_STATUS_CLOSED,
]

# ── Job Opening statuses ──────────────────────────────────────────────────────
OPENING_STATUS_OPEN    = "Open"
OPENING_STATUS_ON_HOLD = "On Hold"
OPENING_STATUS_CLOSED  = "Closed"
OPENING_STATUS_FILLED  = "Filled"

OPENING_STATUSES = [
    OPENING_STATUS_OPEN,
    OPENING_STATUS_ON_HOLD,
    OPENING_STATUS_CLOSED,
    OPENING_STATUS_FILLED,
]

# ── Candidate statuses ────────────────────────────────────────────────────────
CAND_STATUS_APPLIED    = "Applied"
CAND_STATUS_SCREENING  = "Screening"
CAND_STATUS_SHORTLISTED= "Shortlisted"
CAND_STATUS_INTERVIEW  = "Interview Scheduled"
CAND_STATUS_SELECTED   = "Selected"
CAND_STATUS_OFFERED    = "Offered"
CAND_STATUS_JOINED     = "Joined"
CAND_STATUS_REJECTED   = "Rejected"
CAND_STATUS_WITHDRAWN  = "Withdrawn"

CANDIDATE_STATUSES = [
    CAND_STATUS_APPLIED,
    CAND_STATUS_SCREENING,
    CAND_STATUS_SHORTLISTED,
    CAND_STATUS_INTERVIEW,
    CAND_STATUS_SELECTED,
    CAND_STATUS_OFFERED,
    CAND_STATUS_JOINED,
    CAND_STATUS_REJECTED,
    CAND_STATUS_WITHDRAWN,
]

# ── Offer statuses ────────────────────────────────────────────────────────────
OFFER_STATUS_DRAFT    = "Draft"
OFFER_STATUS_SENT     = "Sent"
OFFER_STATUS_ACCEPTED = "Accepted"
OFFER_STATUS_REJECTED = "Rejected"
OFFER_STATUS_EXPIRED  = "Expired"

OFFER_STATUSES = [
    OFFER_STATUS_DRAFT,
    OFFER_STATUS_SENT,
    OFFER_STATUS_ACCEPTED,
    OFFER_STATUS_REJECTED,
    OFFER_STATUS_EXPIRED,
]

# ── Employment types ──────────────────────────────────────────────────────────
EMPLOYMENT_TYPES = [
    "Permanent",
    "Temporary",
    "Contract",
    "Part Time",
    "Full Time",
    "Freelance",
]

# ── Employee categories ───────────────────────────────────────────────────────
EMPLOYEE_CATEGORIES = [
    "Employee",
    "Intern",
    "Consultant",
    "Contractor",
    "Trainee",
    "Apprentice",
]

# ── Reason for hiring ─────────────────────────────────────────────────────────
HIRING_REASONS = [
    "New Position",
    "Replacement",
    "Expansion",
    "Temporary Requirement",
]

# ── Candidate sources ─────────────────────────────────────────────────────────
CANDIDATE_SOURCES = [
    "Referral",
    "LinkedIn",
    "Job Portal",
    "Company Website",
    "Walk In",
    "Recruitment Agency",
    "Internal Database",
]

# ── Candidate document types ──────────────────────────────────────────────────
CAND_DOC_TYPES = [
    "Resume",
    "Portfolio",
    "Identity Proof",
    "Educational Certificate",
    "Experience Letter",
    "Other",
]

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_REQUISITION_CREATED  = "Requisition Created"
ACT_OPENING_CREATED      = "Opening Created"
ACT_CANDIDATE_ADDED      = "Candidate Added"
ACT_STATUS_CHANGED       = "Status Changed"
ACT_OFFER_SENT           = "Offer Sent"
ACT_OFFER_ACCEPTED       = "Offer Accepted"
ACT_OFFER_REJECTED       = "Offer Rejected"
ACT_EMPLOYEE_CREATED     = "Employee Created"
ACT_DOC_UPLOADED         = "Document Uploaded"
ACT_INTERVIEW_SCHEDULED  = "Interview Scheduled"

# ── Candidate gender ──────────────────────────────────────────────────────────
GENDERS = ["Male", "Female", "Other", "Prefer not to say"]

# ── File storage ──────────────────────────────────────────────────────────────
STORAGE_SCOPE       = "platform"
STORAGE_MODULE      = "recruitment"
ALLOWED_EXTENSIONS  = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
