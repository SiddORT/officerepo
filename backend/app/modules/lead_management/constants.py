"""
Centralized constants & enums for the Lead Management module.

Keeping every controlled vocabulary here means the router, service, schemas and
validators share a single source of truth (no hardcoded strings scattered about).
"""

# ── Numbering ────────────────────────────────────────────────────────────────
LEAD_NUMBER_PREFIX = "LEAD"

# ── Lead stages (pipeline position) ──────────────────────────────────────────
STAGE_NEW = "New"
STAGE_CONTACTED = "Contacted"
STAGE_NO_RESPONSE = "No Response"
STAGE_QUALIFIED = "Qualified"
STAGE_DEMO_SCHEDULED = "Demo Scheduled"
STAGE_DEMO_COMPLETED = "Demo Completed"
STAGE_PROPOSAL_SENT = "Proposal Sent"
STAGE_NEGOTIATION = "Negotiation"
STAGE_WON = "Won"
STAGE_LOST = "Lost"

LEAD_STAGES = [
    STAGE_NEW,
    STAGE_CONTACTED,
    STAGE_NO_RESPONSE,
    STAGE_QUALIFIED,
    STAGE_DEMO_SCHEDULED,
    STAGE_DEMO_COMPLETED,
    STAGE_PROPOSAL_SENT,
    STAGE_NEGOTIATION,
    STAGE_WON,
    STAGE_LOST,
]

# Stages considered "early" — a demo/proposal/follow-up can still advance a lead
# out of these. "No Response" is treated as early so re-engagement moves it forward.
EARLY_STAGES = (STAGE_NEW, STAGE_CONTACTED, STAGE_NO_RESPONSE, STAGE_QUALIFIED)

# ── Lead lifecycle status ────────────────────────────────────────────────────
STATUS_OPEN = "Open"
STATUS_WON = "Won"
STATUS_LOST = "Lost"
STATUS_CONVERTED = "Converted"

LEAD_STATUSES = [STATUS_OPEN, STATUS_WON, STATUS_LOST, STATUS_CONVERTED]

# ── Lead sources ─────────────────────────────────────────────────────────────
LEAD_SOURCES = [
    "Website",
    "Demo Request",
    "Partner Referral",
    "Manual Entry",
    "LinkedIn",
    "Google Ads",
    "Meta Ads",
    "Email Campaign",
    "Other",
]

# ── Activity types ───────────────────────────────────────────────────────────
ACTIVITY_TYPES = [
    "Call",
    "Email",
    "WhatsApp",
    "Meeting",
    "Demo",
    "Proposal",
    "Follow Up",
    "Internal Note",
]

# ── Demo ─────────────────────────────────────────────────────────────────────
DEMO_TYPES = ["Online", "On-Site", "Hybrid"]
DEMO_STATUS_SCHEDULED = "Scheduled"
DEMO_STATUS_COMPLETED = "Completed"
DEMO_STATUS_RESCHEDULED = "Rescheduled"
DEMO_STATUS_CANCELLED = "Cancelled"
DEMO_STATUSES = [
    DEMO_STATUS_SCHEDULED,
    DEMO_STATUS_COMPLETED,
    DEMO_STATUS_RESCHEDULED,
    DEMO_STATUS_CANCELLED,
]

# ── Follow-ups ───────────────────────────────────────────────────────────────
FOLLOWUP_TYPES = ["Call", "Email", "WhatsApp", "Meeting", "Other"]
FOLLOWUP_PRIORITIES = ["Low", "Medium", "High"]
FOLLOWUP_STATUS_PENDING = "Pending"
FOLLOWUP_STATUS_COMPLETED = "Completed"
FOLLOWUP_STATUS_OVERDUE = "Overdue"
FOLLOWUP_STATUSES = [
    FOLLOWUP_STATUS_PENDING,
    FOLLOWUP_STATUS_COMPLETED,
    FOLLOWUP_STATUS_OVERDUE,
]

# ── Documents ────────────────────────────────────────────────────────────────
DOCUMENT_TYPES = [
    "Requirements",
    "Proposal",
    "NDA",
    "Contract",
    "Presentation",
    "Other",
]

# ── Proposals ────────────────────────────────────────────────────────────────
PROPOSAL_STATUS_DRAFT = "Draft"
PROPOSAL_STATUS_SENT = "Sent"
PROPOSAL_STATUS_ACCEPTED = "Accepted"
PROPOSAL_STATUS_REJECTED = "Rejected"
PROPOSAL_STATUSES = [
    PROPOSAL_STATUS_DRAFT,
    PROPOSAL_STATUS_SENT,
    PROPOSAL_STATUS_ACCEPTED,
    PROPOSAL_STATUS_REJECTED,
]

# ── Negotiation ──────────────────────────────────────────────────────────────
NEGOTIATION_STATUSES = ["Ongoing", "Agreed", "Stalled", "Closed"]

# ── Lost-lead analysis ───────────────────────────────────────────────────────
LOSS_REASONS = [
    "Budget Issue",
    "Competitor Selected",
    "No Response",
    "Requirements Mismatch",
    "Project Delayed",
    "Other",
]

# ── Lead scoring ─────────────────────────────────────────────────────────────
SCORE_LABEL_HOT = "Hot"
SCORE_LABEL_WARM = "Warm"
SCORE_LABEL_COLD = "Cold"
SCORE_HOT_THRESHOLD = 70
SCORE_WARM_THRESHOLD = 40

# ── Audit actions ────────────────────────────────────────────────────────────
AUDIT_ENTITY = "Lead"
AUDIT_LEAD_CREATED = "LEAD_CREATED"
AUDIT_LEAD_UPDATED = "LEAD_UPDATED"
AUDIT_SCORE_OVERRIDE = "LEAD_SCORE_OVERRIDE"
AUDIT_SPOKESPERSON_ADDED = "LEAD_SPOKESPERSON_ADDED"
AUDIT_SPOKESPERSON_UPDATED = "LEAD_SPOKESPERSON_UPDATED"
AUDIT_SPOKESPERSON_DELETED = "LEAD_SPOKESPERSON_DELETED"
AUDIT_ACTIVITY_ADDED = "LEAD_ACTIVITY_ADDED"
AUDIT_DEMO_SCHEDULED = "LEAD_DEMO_SCHEDULED"
AUDIT_DEMO_COMPLETED = "LEAD_DEMO_COMPLETED"
AUDIT_PROPOSAL_SENT = "LEAD_PROPOSAL_SENT"
AUDIT_LEAD_WON = "LEAD_WON"
AUDIT_LEAD_LOST = "LEAD_LOST"
AUDIT_LEAD_CONVERTED = "LEAD_CONVERTED"
AUDIT_ENQUIRY_CONVERTED = "ENQUIRY_CONVERTED_TO_LEAD"

# ── Document upload constraints ──────────────────────────────────────────────
ALLOWED_DOCUMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv",
}
MAX_DOCUMENT_SIZE_MB = 15
MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * 1024 * 1024

# Storage "tenant" bucket for platform-level lead files (leads are not tenant-scoped).
LEAD_STORAGE_BUCKET = "platform"
LEAD_DOCUMENTS_MODULE = "lead_documents"
LEAD_PROPOSALS_MODULE = "lead_proposals"

# Lead artifacts (proposals/contracts/NDAs) are confidential CRM data and must NOT
# be world-readable via the public /uploads static mount. They live under a private
# root served only through authenticated download endpoints.
LEAD_PRIVATE_STORAGE_ROOT = "private_storage"
