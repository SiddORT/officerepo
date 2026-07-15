"""Organization Management — constants."""

MODULE_NAME = "Organization Management"
MODULE_CODE = "ORGANIZATION"

STATUS_ACTIVE   = "Active"
STATUS_INACTIVE = "Inactive"
ALL_STATUSES    = [STATUS_ACTIVE, STATUS_INACTIVE]

# Branch types
BRANCH_TYPES = [
    "Head Office",
    "Corporate Office",
    "Regional Office",
    "Branch Office",
    "Warehouse",
    "Project Site",
]

# Employee work modes
WORK_MODES = ["Onsite", "Work From Home", "Hybrid", "Remote"]

# Activity log actions — companies
ACTION_COMPANY_CREATED      = "COMPANY_CREATED"
ACTION_COMPANY_UPDATED      = "COMPANY_UPDATED"
ACTION_COMPANY_ACTIVATED    = "COMPANY_ACTIVATED"
ACTION_COMPANY_DEACTIVATED  = "COMPANY_DEACTIVATED"
ACTION_COMPANY_DELETED      = "COMPANY_DELETED"

# Activity log actions — branches
ACTION_BRANCH_CREATED       = "BRANCH_CREATED"
ACTION_BRANCH_UPDATED       = "BRANCH_UPDATED"
ACTION_BRANCH_ACTIVATED     = "BRANCH_ACTIVATED"
ACTION_BRANCH_DEACTIVATED   = "BRANCH_DEACTIVATED"
ACTION_BRANCH_DELETED       = "BRANCH_DELETED"

# Activity log actions — departments
ACTION_DEPT_CREATED         = "DEPARTMENT_CREATED"
ACTION_DEPT_UPDATED         = "DEPARTMENT_UPDATED"
ACTION_DEPT_HEAD_CHANGED    = "DEPARTMENT_HEAD_CHANGED"
ACTION_DEPT_ACTIVATED       = "DEPARTMENT_ACTIVATED"
ACTION_DEPT_DEACTIVATED     = "DEPARTMENT_DEACTIVATED"
ACTION_DEPT_DELETED         = "DEPARTMENT_DELETED"

# Activity log actions — designations
ACTION_DESIG_CREATED        = "DESIGNATION_CREATED"
ACTION_DESIG_UPDATED        = "DESIGNATION_UPDATED"
ACTION_DESIG_ACTIVATED      = "DESIGNATION_ACTIVATED"
ACTION_DESIG_DEACTIVATED    = "DESIGNATION_DEACTIVATED"
ACTION_DESIG_DELETED        = "DESIGNATION_DELETED"

# Activity log actions — company documents
ACTION_COMPANY_DOC_UPLOADED = "COMPANY_DOCUMENT_UPLOADED"
ACTION_COMPANY_DOC_DELETED  = "COMPANY_DOCUMENT_DELETED"

# File storage — company documents are stored in the shared private storage under
# a client-scoped path so a future S3 move is "swap driver + base" only.
from backend.shared.storage.file_handler import PLATFORM_SCOPE as _PLATFORM_SCOPE
ORG_STORAGE_SCOPE   = _PLATFORM_SCOPE   # "platform" scope (shared storage root)
ORG_DOCUMENTS_MODULE = "org_company_documents"  # {scope}/{module}/{filename}

# Allowed document types shown in the frontend picker
COMPANY_DOC_TYPES = [
    "Certificate of Incorporation",
    "GST Certificate",
    "PAN Copy",
    "TAN Certificate",
    "MSME Certificate",
    "Trade License",
    "Shop & Establishment License",
    "Other",
]
