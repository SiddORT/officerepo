"""Constants for Employee Document Management module."""

MODULE_NAME = "Organization Management"

# ── Document categories ───────────────────────────────────────────────────────
CATEGORY_IDENTITY   = "Identity Documents"
CATEGORY_EMPLOYMENT = "Employment Documents"
CATEGORY_EDUCATION  = "Education Documents"
CATEGORY_PREV_EMP   = "Previous Employment"
CATEGORY_COMPLIANCE = "Compliance Documents"
CATEGORY_OTHER      = "Other Documents"

DOCUMENT_CATEGORIES = [
    CATEGORY_IDENTITY,
    CATEGORY_EMPLOYMENT,
    CATEGORY_EDUCATION,
    CATEGORY_PREV_EMP,
    CATEGORY_COMPLIANCE,
    CATEGORY_OTHER,
]

# ── Document statuses ─────────────────────────────────────────────────────────
STATUS_PENDING_UPLOAD = "Pending Upload"
STATUS_UPLOADED       = "Uploaded"
STATUS_UNDER_REVIEW   = "Under Review"
STATUS_VERIFIED       = "Verified"
STATUS_REJECTED       = "Rejected"
STATUS_EXPIRED        = "Expired"

DOCUMENT_STATUSES = [
    STATUS_PENDING_UPLOAD,
    STATUS_UPLOADED,
    STATUS_UNDER_REVIEW,
    STATUS_VERIFIED,
    STATUS_REJECTED,
    STATUS_EXPIRED,
]

# ── Allowed file types ────────────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_UPLOADED   = "Document Uploaded"
ACT_UPDATED    = "Document Updated"
ACT_REPLACED   = "Document Replaced"
ACT_VERIFIED   = "Document Verified"
ACT_REJECTED   = "Document Rejected"
ACT_SUBMITTED  = "Submitted for Review"
ACT_DELETED    = "Document Deleted"

# ── Default document types to seed ───────────────────────────────────────────
DEFAULT_DOCUMENT_TYPES = [
    # Identity
    {"code": "AADHAR",      "name": "Aadhar Card",                  "category": CATEGORY_IDENTITY,   "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": True},
    {"code": "PAN",         "name": "PAN Card",                     "category": CATEGORY_IDENTITY,   "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": True},
    {"code": "PASSPORT",    "name": "Passport",                     "category": CATEGORY_IDENTITY,   "expiry_tracking": True,  "verification_required": True,  "mandatory_onboarding": False},
    {"code": "DL",          "name": "Driving License",              "category": CATEGORY_IDENTITY,   "expiry_tracking": True,  "verification_required": False, "mandatory_onboarding": False},
    {"code": "VOTER_ID",    "name": "Voter ID",                     "category": CATEGORY_IDENTITY,   "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": False},
    # Employment
    {"code": "RESUME",      "name": "Resume",                       "category": CATEGORY_EMPLOYMENT, "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": True},
    {"code": "OFFER_LETTER","name": "Offer Letter",                 "category": CATEGORY_EMPLOYMENT, "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": True},
    {"code": "APPT_LETTER", "name": "Appointment Letter",           "category": CATEGORY_EMPLOYMENT, "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": True},
    {"code": "EMP_AGREE",   "name": "Employment Agreement",         "category": CATEGORY_EMPLOYMENT, "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": True},
    {"code": "NDA",         "name": "NDA",                          "category": CATEGORY_EMPLOYMENT, "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    # Education
    {"code": "DEGREE",      "name": "Degree Certificate",           "category": CATEGORY_EDUCATION,  "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    {"code": "DIPLOMA",     "name": "Diploma Certificate",          "category": CATEGORY_EDUCATION,  "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    {"code": "MARKSHEET",   "name": "Marksheet",                    "category": CATEGORY_EDUCATION,  "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": False},
    # Previous employment
    {"code": "EXP_LETTER",  "name": "Experience Letter",            "category": CATEGORY_PREV_EMP,   "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    {"code": "RELIEVE_LTR", "name": "Relieving Letter",             "category": CATEGORY_PREV_EMP,   "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    {"code": "SALARY_SLIP", "name": "Salary Slip",                  "category": CATEGORY_PREV_EMP,   "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": False},
    # Compliance
    {"code": "VISA",        "name": "Visa",                         "category": CATEGORY_COMPLIANCE, "expiry_tracking": True,  "verification_required": True,  "mandatory_onboarding": False},
    {"code": "WORK_PERMIT", "name": "Work Permit",                  "category": CATEGORY_COMPLIANCE, "expiry_tracking": True,  "verification_required": True,  "mandatory_onboarding": False},
    # Other
    {"code": "MED_CERT",    "name": "Medical Certificate",          "category": CATEGORY_OTHER,      "expiry_tracking": True,  "verification_required": False, "mandatory_onboarding": False},
    {"code": "BGV_REPORT",  "name": "Background Verification Report","category": CATEGORY_OTHER,     "expiry_tracking": False, "verification_required": True,  "mandatory_onboarding": False},
    {"code": "OTHER",       "name": "Other",                        "category": CATEGORY_OTHER,      "expiry_tracking": False, "verification_required": False, "mandatory_onboarding": False},
]
