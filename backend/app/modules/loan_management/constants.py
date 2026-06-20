"""Employee Loan Management — constants and enumerations."""

# ── Loan type codes (built-in catalog) ─────────────────────────────────────────
LOAN_CODE_SALARY_ADVANCE  = "SALARY_ADVANCE"
LOAN_CODE_EMERGENCY       = "EMERGENCY"
LOAN_CODE_MEDICAL         = "MEDICAL"
LOAN_CODE_EDUCATION       = "EDUCATION"
LOAN_CODE_HOUSING         = "HOUSING"
LOAN_CODE_VEHICLE         = "VEHICLE"
LOAN_CODE_PERSONAL        = "PERSONAL"
LOAN_CODE_EQUIPMENT       = "EQUIPMENT"

# ── Application statuses ────────────────────────────────────────────────────────
APP_DRAFT       = "Draft"
APP_SUBMITTED   = "Submitted"
APP_UNDER_REVIEW = "Under Review"
APP_APPROVED    = "Approved"
APP_REJECTED    = "Rejected"
APP_CANCELLED   = "Cancelled"
APP_DISBURSED   = "Disbursed"
APP_CLOSED      = "Closed"

APPLICATION_STATUSES = [
    APP_DRAFT, APP_SUBMITTED, APP_UNDER_REVIEW,
    APP_APPROVED, APP_REJECTED, APP_CANCELLED,
    APP_DISBURSED, APP_CLOSED,
]

# Terminal statuses (no further workflow transitions allowed)
TERMINAL_STATUSES = {APP_REJECTED, APP_CANCELLED, APP_CLOSED}

# ── Approval statuses ───────────────────────────────────────────────────────────
APPROVAL_PENDING  = "Pending"
APPROVAL_APPROVED = "Approved"
APPROVAL_REJECTED = "Rejected"
APPROVAL_SKIPPED  = "Skipped"

APPROVAL_STATUSES = [APPROVAL_PENDING, APPROVAL_APPROVED, APPROVAL_REJECTED, APPROVAL_SKIPPED]

# ── Repayment schedule installment statuses ─────────────────────────────────────
INST_PENDING  = "Pending"
INST_DEDUCTED = "Deducted"
INST_SKIPPED  = "Skipped"
INST_PAID     = "Paid"
INST_WAIVED   = "Waived"

INSTALLMENT_STATUSES = [INST_PENDING, INST_DEDUCTED, INST_SKIPPED, INST_PAID, INST_WAIVED]

# ── Repayment methods ───────────────────────────────────────────────────────────
REPAY_EMI             = "EMI"              # Equal Monthly Installments
REPAY_FIXED_PRINCIPAL = "Fixed Principal"  # Principal fixed, interest reducing
REPAY_BULLET          = "Bullet"           # Lump sum at end

REPAYMENT_METHODS = [REPAY_EMI, REPAY_FIXED_PRINCIPAL, REPAY_BULLET]

# ── Interest types ──────────────────────────────────────────────────────────────
INTEREST_FREE      = "Interest Free"
INTEREST_FLAT      = "Flat"
INTEREST_REDUCING  = "Reducing Balance"

INTEREST_TYPES = [INTEREST_FREE, INTEREST_FLAT, INTEREST_REDUCING]

# ── Disbursement payment methods ────────────────────────────────────────────────
PAY_BANK_TRANSFER = "Bank Transfer"
PAY_CASH          = "Cash"
PAY_CHEQUE        = "Cheque"

PAYMENT_METHODS = [PAY_BANK_TRANSFER, PAY_CASH, PAY_CHEQUE]

# ── Closure types ───────────────────────────────────────────────────────────────
CLOSURE_REGULAR    = "Regular"
CLOSURE_EARLY      = "Early"
CLOSURE_SETTLEMENT = "Settlement"
CLOSURE_WRITE_OFF  = "Write-Off"

CLOSURE_TYPES = [CLOSURE_REGULAR, CLOSURE_EARLY, CLOSURE_SETTLEMENT, CLOSURE_WRITE_OFF]

# ── Employee categories (for policy scoping) ────────────────────────────────────
EMP_CAT_PERMANENT   = "Permanent"
EMP_CAT_CONTRACT    = "Contract"
EMP_CAT_CONSULTANT  = "Consultant"
EMP_CAT_INTERN      = "Intern"
EMP_CAT_TRAINEE     = "Trainee"

EMPLOYEE_CATEGORIES = [
    EMP_CAT_PERMANENT, EMP_CAT_CONTRACT,
    EMP_CAT_CONSULTANT, EMP_CAT_INTERN, EMP_CAT_TRAINEE,
]

# ── Activity actions ────────────────────────────────────────────────────────────
ACT_LOAN_APPLIED     = "Loan Applied"
ACT_LOAN_SUBMITTED   = "Loan Submitted"
ACT_LOAN_APPROVED    = "Loan Approved"
ACT_LOAN_REJECTED    = "Loan Rejected"
ACT_LOAN_CANCELLED   = "Loan Cancelled"
ACT_LOAN_DISBURSED   = "Loan Disbursed"
ACT_EMI_DEDUCTED     = "EMI Deducted"
ACT_EMI_WAIVED       = "EMI Waived"
ACT_LOAN_CLOSED      = "Loan Closed"
ACT_SCHEDULE_REVISED = "Repayment Schedule Revised"
ACT_LOAN_TYPE_CREATED   = "Loan Type Created"
ACT_LOAN_TYPE_UPDATED   = "Loan Type Updated"
ACT_LOAN_POLICY_CREATED = "Loan Policy Created"
ACT_LOAN_POLICY_UPDATED = "Loan Policy Updated"

# ── Default loan type seeds ─────────────────────────────────────────────────────
DEFAULT_LOAN_TYPES = [
    {"code": LOAN_CODE_SALARY_ADVANCE,  "name": "Salary Advance",  "interest_applicable": False, "description": "Advance against upcoming salary"},
    {"code": LOAN_CODE_EMERGENCY,       "name": "Emergency Loan",  "interest_applicable": False, "description": "For unforeseen emergencies"},
    {"code": LOAN_CODE_MEDICAL,         "name": "Medical Loan",    "interest_applicable": False, "description": "For medical expenses"},
    {"code": LOAN_CODE_EDUCATION,       "name": "Education Loan",  "interest_applicable": True,  "description": "For education and training"},
    {"code": LOAN_CODE_HOUSING,         "name": "Housing Loan",    "interest_applicable": True,  "description": "For housing purchase or renovation"},
    {"code": LOAN_CODE_VEHICLE,         "name": "Vehicle Loan",    "interest_applicable": True,  "description": "For vehicle purchase"},
    {"code": LOAN_CODE_PERSONAL,        "name": "Personal Loan",   "interest_applicable": True,  "description": "General purpose personal loan"},
    {"code": LOAN_CODE_EQUIPMENT,       "name": "Equipment Loan",  "interest_applicable": False, "description": "For work-related equipment purchase"},
]

MODULE_CODE = "EMPLOYEE_LOANS"
DEFAULT_CURRENCY = "INR"
