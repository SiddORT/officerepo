"""Expense & Reimbursements — constants and enums."""
from __future__ import annotations

# ── Claim statuses ────────────────────────────────────────────────────────────
STATUS_DRAFT             = "Draft"
STATUS_SUBMITTED         = "Submitted"
STATUS_UNDER_REVIEW      = "Under Review"
STATUS_APPROVED          = "Approved"
STATUS_PARTIALLY_APPROVED = "Partially Approved"
STATUS_REJECTED          = "Rejected"
STATUS_REIMBURSED        = "Reimbursed"
STATUS_CANCELLED         = "Cancelled"
STATUS_RETURNED          = "Returned For Correction"

ALL_STATUSES = [
    STATUS_DRAFT, STATUS_SUBMITTED, STATUS_UNDER_REVIEW,
    STATUS_APPROVED, STATUS_PARTIALLY_APPROVED, STATUS_REJECTED,
    STATUS_REIMBURSED, STATUS_CANCELLED, STATUS_RETURNED,
]

EDITABLE_STATUSES = {STATUS_DRAFT, STATUS_RETURNED}
TERMINAL_STATUSES = {STATUS_REIMBURSED, STATUS_CANCELLED, STATUS_REJECTED}

# ── Approval statuses ─────────────────────────────────────────────────────────
APPROVAL_PENDING  = "Pending"
APPROVAL_APPROVED = "Approved"
APPROVAL_REJECTED = "Rejected"
APPROVAL_SKIPPED  = "Skipped"

ALL_APPROVAL_STATUSES = [APPROVAL_PENDING, APPROVAL_APPROVED, APPROVAL_REJECTED, APPROVAL_SKIPPED]

# ── Reimbursement methods ─────────────────────────────────────────────────────
REIMB_PAYROLL   = "Payroll"
REIMB_BANK      = "Bank Transfer"
REIMB_CASH      = "Cash"

ALL_REIMB_METHODS = [REIMB_PAYROLL, REIMB_BANK, REIMB_CASH]

# ── Reimbursement statuses ────────────────────────────────────────────────────
REIMB_STATUS_PENDING    = "Pending"
REIMB_STATUS_PROCESSING = "Processing"
REIMB_STATUS_PAID       = "Paid"
REIMB_STATUS_FAILED     = "Failed"

ALL_REIMB_STATUSES = [REIMB_STATUS_PENDING, REIMB_STATUS_PROCESSING, REIMB_STATUS_PAID, REIMB_STATUS_FAILED]

# ── Receipt OCR statuses ──────────────────────────────────────────────────────
OCR_NOT_DONE    = "Not Done"
OCR_PENDING     = "Pending"
OCR_COMPLETE    = "Complete"
OCR_FAILED      = "Failed"

# ── Activity types ────────────────────────────────────────────────────────────
ACT_CREATED              = "created"
ACT_SUBMITTED            = "submitted"
ACT_APPROVED             = "approved"
ACT_PARTIALLY_APPROVED   = "partially_approved"
ACT_REJECTED             = "rejected"
ACT_CANCELLED            = "cancelled"
ACT_RETURNED             = "returned_for_correction"
ACT_REIMBURSED           = "reimbursed"
ACT_RECEIPT_UPLOADED     = "receipt_uploaded"
ACT_RECEIPT_DELETED      = "receipt_deleted"
ACT_ITEM_ADDED           = "item_added"
ACT_ITEM_REMOVED         = "item_removed"
ACT_NOTE_ADDED           = "note_added"

# ── Approval levels ───────────────────────────────────────────────────────────
APPROVAL_LEVEL_MANAGER = 1
APPROVAL_LEVEL_FINANCE = 2

# ── Default expense categories (seed data) ───────────────────────────────────
DEFAULT_CATEGORIES = [
    {"code": "TRAVEL",     "name": "Travel",            "receipt_required": True,  "approval_required": True,  "max_amount": 50000.0},
    {"code": "FUEL",       "name": "Fuel",              "receipt_required": True,  "approval_required": False, "max_amount": 5000.0},
    {"code": "ACCOMM",     "name": "Accommodation",     "receipt_required": True,  "approval_required": True,  "max_amount": 10000.0},
    {"code": "MEALS",      "name": "Meals",             "receipt_required": False, "approval_required": False, "max_amount": 2000.0},
    {"code": "INTERNET",   "name": "Internet",          "receipt_required": True,  "approval_required": False, "max_amount": 2000.0},
    {"code": "MOBILE",     "name": "Mobile",            "receipt_required": True,  "approval_required": False, "max_amount": 1500.0},
    {"code": "TRAINING",   "name": "Training",          "receipt_required": True,  "approval_required": True,  "max_amount": 25000.0},
    {"code": "MEDICAL",    "name": "Medical",           "receipt_required": True,  "approval_required": True,  "max_amount": 10000.0},
    {"code": "OFFICE",     "name": "Office Supplies",   "receipt_required": True,  "approval_required": False, "max_amount": 3000.0},
    {"code": "CLIENT_ENT", "name": "Client Entertainment", "receipt_required": True, "approval_required": True, "max_amount": 15000.0},
    {"code": "MILEAGE",    "name": "Mileage",           "receipt_required": False, "approval_required": False, "max_amount": None},
    {"code": "MISC",       "name": "Miscellaneous",     "receipt_required": False, "approval_required": False, "max_amount": 5000.0},
]

# ── Currencies ────────────────────────────────────────────────────────────────
DEFAULT_CURRENCY = "INR"

# ── Status display colors (Tailwind) ─────────────────────────────────────────
STATUS_COLORS = {
    STATUS_DRAFT:              "slate",
    STATUS_SUBMITTED:          "amber",
    STATUS_UNDER_REVIEW:       "purple",
    STATUS_APPROVED:           "blue",
    STATUS_PARTIALLY_APPROVED: "orange",
    STATUS_REJECTED:           "red",
    STATUS_REIMBURSED:         "emerald",
    STATUS_CANCELLED:          "gray",
    STATUS_RETURNED:           "yellow",
}
