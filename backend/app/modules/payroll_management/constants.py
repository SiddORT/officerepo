"""Payroll Management — constants and enumerations."""

# ── Component types ─────────────────────────────────────────────────────────────
COMP_TYPE_EARNING     = "Earning"
COMP_TYPE_DEDUCTION   = "Deduction"
COMP_TYPE_EMPLOYER    = "Employer Contribution"

COMPONENT_TYPES = [COMP_TYPE_EARNING, COMP_TYPE_DEDUCTION, COMP_TYPE_EMPLOYER]

# ── Calculation methods ─────────────────────────────────────────────────────────
CALC_FIXED      = "Fixed"
CALC_PERCENTAGE = "Percentage"
CALC_FORMULA    = "Formula"

CALC_METHODS = [CALC_FIXED, CALC_PERCENTAGE, CALC_FORMULA]

# ── Payroll frequencies ─────────────────────────────────────────────────────────
FREQ_MONTHLY    = "Monthly"
FREQ_BIWEEKLY   = "Bi-Weekly"
FREQ_WEEKLY     = "Weekly"

PAYROLL_FREQUENCIES = [FREQ_MONTHLY, FREQ_BIWEEKLY, FREQ_WEEKLY]

# ── Payroll run statuses ────────────────────────────────────────────────────────
RUN_DRAFT      = "Draft"
RUN_PROCESSING = "Processing"
RUN_PROCESSED  = "Processed"
RUN_APPROVED   = "Approved"
RUN_LOCKED     = "Locked"
RUN_PAID       = "Paid"

PAYROLL_RUN_STATUSES = [
    RUN_DRAFT, RUN_PROCESSING, RUN_PROCESSED,
    RUN_APPROVED, RUN_LOCKED, RUN_PAID,
]

# ── Payslip statuses ────────────────────────────────────────────────────────────
SLIP_DRAFT     = "Draft"
SLIP_GENERATED = "Generated"
SLIP_SENT      = "Sent"

PAYSLIP_STATUSES = [SLIP_DRAFT, SLIP_GENERATED, SLIP_SENT]

# ── Employee run statuses ───────────────────────────────────────────────────────
EMP_RUN_PENDING   = "Pending"
EMP_RUN_COMPUTED  = "Computed"
EMP_RUN_HELD      = "Held"
EMP_RUN_EXCLUDED  = "Excluded"

EMP_RUN_STATUSES = [EMP_RUN_PENDING, EMP_RUN_COMPUTED, EMP_RUN_HELD, EMP_RUN_EXCLUDED]

# ── Statutory component types ───────────────────────────────────────────────────
STATUTORY_PF            = "Provident Fund"
STATUTORY_ESI           = "Employee State Insurance"
STATUTORY_PROF_TAX      = "Professional Tax"
STATUTORY_TDS           = "Tax Deducted at Source"
STATUTORY_GRATUITY      = "Gratuity"
STATUTORY_CUSTOM        = "Custom"

STATUTORY_TYPES = [
    STATUTORY_PF, STATUTORY_ESI, STATUTORY_PROF_TAX,
    STATUTORY_TDS, STATUTORY_GRATUITY, STATUTORY_CUSTOM,
]

# ── Compensation status ─────────────────────────────────────────────────────────
COMP_ACTIVE   = "Active"
COMP_REVISED  = "Revised"
COMP_INACTIVE = "Inactive"

COMPENSATION_STATUSES = [COMP_ACTIVE, COMP_REVISED, COMP_INACTIVE]

# ── Activity actions ────────────────────────────────────────────────────────────
ACT_COMPONENT_CREATED    = "Salary Component Created"
ACT_COMPONENT_UPDATED    = "Salary Component Updated"
ACT_STRUCTURE_CREATED    = "Salary Structure Created"
ACT_STRUCTURE_UPDATED    = "Salary Structure Updated"
ACT_COMPENSATION_ASSIGNED = "Compensation Assigned"
ACT_COMPENSATION_REVISED  = "Compensation Revised"
ACT_CYCLE_CREATED         = "Payroll Cycle Created"
ACT_RUN_INITIATED         = "Payroll Run Initiated"
ACT_RUN_PROCESSED         = "Payroll Run Processed"
ACT_RUN_APPROVED          = "Payroll Run Approved"
ACT_RUN_LOCKED            = "Payroll Run Locked"
ACT_RUN_PAID              = "Payroll Run Marked Paid"
ACT_PAYSLIP_GENERATED     = "Payslip Generated"
ACT_STATUTORY_CREATED     = "Statutory Component Created"

# ── Currency default ────────────────────────────────────────────────────────────
DEFAULT_CURRENCY = "INR"

# ── Default salary components ───────────────────────────────────────────────────
DEFAULT_SALARY_COMPONENTS = [
    {"code": "BASIC",   "name": "Basic Salary",          "type": COMP_TYPE_EARNING,    "calc": CALC_PERCENTAGE, "value": 40.0, "taxable": True,  "pro_rata": True},
    {"code": "HRA",     "name": "House Rent Allowance",  "type": COMP_TYPE_EARNING,    "calc": CALC_PERCENTAGE, "value": 20.0, "taxable": False, "pro_rata": True},
    {"code": "CONV",    "name": "Conveyance Allowance",  "type": COMP_TYPE_EARNING,    "calc": CALC_FIXED,      "value": 1600.0, "taxable": False, "pro_rata": True},
    {"code": "SPEC",    "name": "Special Allowance",     "type": COMP_TYPE_EARNING,    "calc": CALC_PERCENTAGE, "value": 40.0, "taxable": True,  "pro_rata": True},
    {"code": "PF_EMP",  "name": "Provident Fund (Employee)", "type": COMP_TYPE_DEDUCTION, "calc": CALC_PERCENTAGE, "value": 12.0, "taxable": False, "pro_rata": True},
    {"code": "PTAX",    "name": "Professional Tax",      "type": COMP_TYPE_DEDUCTION,  "calc": CALC_FIXED,      "value": 200.0, "taxable": False, "pro_rata": False},
    {"code": "TDS",     "name": "Tax Deducted at Source","type": COMP_TYPE_DEDUCTION,  "calc": CALC_FIXED,      "value": 0.0,  "taxable": False, "pro_rata": False},
    {"code": "PF_ER",   "name": "Provident Fund (Employer)", "type": COMP_TYPE_EMPLOYER, "calc": CALC_PERCENTAGE, "value": 12.0, "taxable": False, "pro_rata": True},
]
