"""
Centralized constants & enums for the Client Management module.

Office Repo is a multi-tenant SaaS platform where the business term **Client**
IS the tenant — a single entity that owns one organization, one isolated
database, one set of users, one subscription, one module configuration, one
storage space and one branding configuration. There is intentionally no separate
Tenant entity.

Keeping every controlled vocabulary here means the router, service, schemas and
validators share a single source of truth (no hardcoded strings scattered about).
"""

# ── Numbering ────────────────────────────────────────────────────────────────
CLIENT_CODE_PREFIX = "CLT"

# ── Client lifecycle status ──────────────────────────────────────────────────
STATUS_PROSPECTIVE = "Prospective"
STATUS_TRIAL = "Trial"
STATUS_ACTIVE = "Active"
STATUS_SUSPENDED = "Suspended"
STATUS_EXPIRED = "Expired"
STATUS_ARCHIVED = "Archived"

CLIENT_STATUSES = [
    STATUS_PROSPECTIVE,
    STATUS_TRIAL,
    STATUS_ACTIVE,
    STATUS_SUSPENDED,
    STATUS_EXPIRED,
    STATUS_ARCHIVED,
]

# ── Contact types ────────────────────────────────────────────────────────────
CONTACT_PRIMARY = "Primary"
CONTACT_TYPES = [
    CONTACT_PRIMARY,
    "Finance",
    "HR",
    "IT",
    "Procurement",
    "Decision Maker",
]

# ── Tenant database connection status ────────────────────────────────────────
# DB-per-client is modeled as records now; actual provisioning is deferred.
DB_STATUS_NOT_PROVISIONED = "Not Provisioned"
DB_STATUS_PROVISIONING = "Provisioning"
DB_STATUS_ACTIVE = "Active"
DB_STATUS_FAILED = "Failed"
DB_STATUSES = [
    DB_STATUS_NOT_PROVISIONED,
    DB_STATUS_PROVISIONING,
    DB_STATUS_ACTIVE,
    DB_STATUS_FAILED,
]

# ── Client admin user status ─────────────────────────────────────────────────
ADMIN_STATUS_PLACEHOLDER = "Placeholder"
ADMIN_STATUS_INVITED = "Invited"
ADMIN_STATUS_ACTIVE = "Active"
ADMIN_STATUS_DISABLED = "Disabled"
ADMIN_STATUSES = [
    ADMIN_STATUS_PLACEHOLDER,
    ADMIN_STATUS_INVITED,
    ADMIN_STATUS_ACTIVE,
    ADMIN_STATUS_DISABLED,
]

# ── Subscription ─────────────────────────────────────────────────────────────
SUBSCRIPTION_STATUS_INACTIVE = "Inactive"
SUBSCRIPTION_STATUS_TRIAL = "Trial"
SUBSCRIPTION_STATUS_ACTIVE = "Active"
SUBSCRIPTION_STATUS_EXPIRED = "Expired"
SUBSCRIPTION_STATUS_CANCELLED = "Cancelled"
SUBSCRIPTION_STATUSES = [
    SUBSCRIPTION_STATUS_INACTIVE,
    SUBSCRIPTION_STATUS_TRIAL,
    SUBSCRIPTION_STATUS_ACTIVE,
    SUBSCRIPTION_STATUS_EXPIRED,
    SUBSCRIPTION_STATUS_CANCELLED,
]

BILLING_CYCLES = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"]

# ── Modules (assignable to a client) ─────────────────────────────────────────
# Top-level parent modules
MODULE_ORG        = "Organization Management"
MODULE_HRMS       = "HRMS"
MODULE_ASSET      = "Asset Management"
MODULE_CRM        = "CRM"
MODULE_LMS        = "LMS"
MODULE_BMS        = "BMS"
MODULE_FINANCE    = "Finance & Procurement"
MODULE_TASKS      = "Task & Project Management"
MODULE_HELPDESK   = "Helpdesk"
MODULE_VISITORS   = "Visitor Management"
MODULE_BILLING    = "Billing Management"
MODULE_REPORTS    = "Reports"
MODULE_KNOWLEDGE  = "Knowledge Base"
MODULE_WORKFLOW   = "Workflow Engine"

# Children of Organization Management
MODULE_COMPANIES      = "Companies"
MODULE_BRANCHES       = "Branches"
MODULE_DEPARTMENTS    = "Departments"
MODULE_DESIGNATIONS   = "Designations"
MODULE_EMPLOYEES      = "Employees"
MODULE_EMP_DOCS       = "Employee Documents"

# Children of HRMS
MODULE_RECRUIT        = "Recruitment"
MODULE_INTERVIEW      = "Interview Management"
MODULE_ONBOARDING     = "Employee Onboarding"
MODULE_ATTENDANCE     = "Attendance Management"
MODULE_LEAVE          = "Leave Management"
MODULE_PAYROLL        = "Payroll Management"
MODULE_LOANS          = "Employee Loan Management"
MODULE_EXPENSES       = "Expense & Reimbursements"
MODULE_ESS            = "Employee Self Service"

# Children of Asset Management
MODULE_ASSET_INVENTORY   = "Asset Inventory"
MODULE_ASSET_MAINTENANCE = "Asset Maintenance"
MODULE_ASSET_AUDITS      = "Asset Audits"
MODULE_ASSET_REQUESTS    = "Asset Requests"
MODULE_ASSET_ASSIGNMENT  = "Asset Assignment"
MODULE_ASSET_TRANSFERS   = "Asset Transfers"
MODULE_ASSET_RETURNS     = "Asset Returns"
MODULE_ASSET_DISPOSAL    = "Asset Disposal"

# Children of CRM
MODULE_CRM_LEADS         = "CRM Leads"
MODULE_ACCOUNTS          = "Accounts"
MODULE_CONTACTS          = "Contacts"
MODULE_OPPORTUNITIES     = "Opportunities"
MODULE_CRM_ACTIVITIES    = "CRM Activities"
MODULE_QUOTES            = "Quotes"
MODULE_CUSTOMERS         = "Customers"

# Children of LMS
MODULE_COURSES           = "Courses"
MODULE_LEARNING_PATHS    = "Learning Paths"
MODULE_ASSESSMENTS       = "Assessments"
MODULE_CERTIFICATIONS    = "Certifications"

# Children of BMS
MODULE_PRODUCTS          = "Products"
MODULE_SERVICES          = "Services"
MODULE_BMS_CATEGORIES    = "BMS Categories"
MODULE_BMS_CUSTOMERS     = "BMS Customers"
MODULE_CONTRACTS         = "Contracts"

# Children of Finance & Procurement
MODULE_VENDORS           = "Vendors"
MODULE_PURCHASE_REQUESTS = "Purchase Requests"
MODULE_PURCHASE_ORDERS   = "Purchase Orders"
MODULE_INVOICES          = "Invoices"
MODULE_PAYMENTS          = "Payments"
MODULE_BUDGETS           = "Budgets"
MODULE_COST_CENTERS      = "Cost Centers"

# Children of Task & Project Management
MODULE_PROJECTS          = "Projects"
MODULE_MILESTONES        = "Milestones"
MODULE_TASK_LIST         = "Task List"
MODULE_SPRINTS           = "Sprints"
MODULE_TIMESHEETS        = "Timesheets"

# Children of Helpdesk
MODULE_TICKETS           = "Tickets"
MODULE_SERVICE_CATALOG   = "Service Catalog"
MODULE_SLA               = "SLA Management"
MODULE_ESCALATIONS       = "Escalations"
MODULE_KNOWLEDGE_ARTICLES = "Knowledge Articles"

# Children of Visitor Management
MODULE_VISITOR_REG       = "Visitor Registration"
MODULE_PRE_APPROVALS     = "Pre-Approvals"
MODULE_CHECKIN           = "Check-In / Check-Out"
MODULE_VISITOR_PASSES    = "Visitor Passes"

# Children of Reports
MODULE_REPORTS_ORG       = "Organization Reports"
MODULE_REPORTS_HR        = "HR Reports"
MODULE_REPORTS_ASSETS    = "Asset Reports"
MODULE_REPORTS_FINANCE   = "Finance Reports"
MODULE_REPORTS_SCHEDULED = "Scheduled Reports"

# Children of Workflow Engine
MODULE_WF_APPROVALS      = "Approval Workflows"
MODULE_WF_AUTOMATION     = "Automation Rules"
MODULE_WF_NOTIFICATIONS  = "Notification Templates"
MODULE_WF_ESCALATIONS    = "Escalation Rules"

# ── Parent → children mapping (single source of truth for cascade logic) ─────
PARENT_MODULE_CHILDREN = {
    MODULE_ORG: [MODULE_COMPANIES, MODULE_BRANCHES, MODULE_DEPARTMENTS,
                 MODULE_DESIGNATIONS, MODULE_EMPLOYEES, MODULE_EMP_DOCS],
    MODULE_HRMS: [MODULE_RECRUIT, MODULE_INTERVIEW, MODULE_ONBOARDING,
                  MODULE_ATTENDANCE, MODULE_LEAVE, MODULE_PAYROLL,
                  MODULE_LOANS, MODULE_EXPENSES, MODULE_ESS],
    MODULE_ASSET: [MODULE_ASSET_INVENTORY, MODULE_ASSET_MAINTENANCE,
                   MODULE_ASSET_AUDITS, MODULE_ASSET_REQUESTS,
                   MODULE_ASSET_ASSIGNMENT, MODULE_ASSET_TRANSFERS,
                   MODULE_ASSET_RETURNS, MODULE_ASSET_DISPOSAL],
    MODULE_CRM: [MODULE_CRM_LEADS, MODULE_ACCOUNTS, MODULE_CONTACTS,
                 MODULE_OPPORTUNITIES, MODULE_CRM_ACTIVITIES, MODULE_QUOTES, MODULE_CUSTOMERS],
    MODULE_LMS: [MODULE_COURSES, MODULE_LEARNING_PATHS, MODULE_ASSESSMENTS, MODULE_CERTIFICATIONS],
    MODULE_BMS: [MODULE_PRODUCTS, MODULE_SERVICES, MODULE_BMS_CATEGORIES,
                 MODULE_BMS_CUSTOMERS, MODULE_CONTRACTS],
    MODULE_FINANCE: [MODULE_VENDORS, MODULE_PURCHASE_REQUESTS, MODULE_PURCHASE_ORDERS,
                     MODULE_INVOICES, MODULE_PAYMENTS, MODULE_BUDGETS, MODULE_COST_CENTERS],
    MODULE_TASKS: [MODULE_PROJECTS, MODULE_MILESTONES, MODULE_TASK_LIST,
                   MODULE_SPRINTS, MODULE_TIMESHEETS],
    MODULE_HELPDESK: [MODULE_TICKETS, MODULE_SERVICE_CATALOG, MODULE_SLA,
                      MODULE_ESCALATIONS, MODULE_KNOWLEDGE_ARTICLES],
    MODULE_VISITORS: [MODULE_VISITOR_REG, MODULE_PRE_APPROVALS,
                      MODULE_CHECKIN, MODULE_VISITOR_PASSES],
    MODULE_REPORTS: [MODULE_REPORTS_ORG, MODULE_REPORTS_HR, MODULE_REPORTS_ASSETS,
                     MODULE_REPORTS_FINANCE, MODULE_REPORTS_SCHEDULED],
    MODULE_WORKFLOW: [MODULE_WF_APPROVALS, MODULE_WF_AUTOMATION,
                      MODULE_WF_NOTIFICATIONS, MODULE_WF_ESCALATIONS],
    MODULE_BILLING:  [],
    MODULE_KNOWLEDGE: [],
}

# Reverse map: child name → parent name
CHILD_PARENT_MAP = {
    child: parent
    for parent, children in PARENT_MODULE_CHILDREN.items()
    for child in children
}

# Ordered list of top-level toggleable modules (shown as cards in the admin UI)
TOP_LEVEL_MODULES = [
    MODULE_ORG, MODULE_HRMS, MODULE_ASSET,
    MODULE_CRM, MODULE_LMS, MODULE_BMS,
    MODULE_FINANCE, MODULE_TASKS, MODULE_HELPDESK,
    MODULE_VISITORS, MODULE_BILLING, MODULE_REPORTS,
    MODULE_KNOWLEDGE, MODULE_WORKFLOW,
]

# All client module names (parent + children) seeded as rows in client_modules
CLIENT_MODULES = (
    TOP_LEVEL_MODULES
    # Org children
    + [MODULE_COMPANIES, MODULE_BRANCHES, MODULE_DEPARTMENTS,
       MODULE_DESIGNATIONS, MODULE_EMPLOYEES, MODULE_EMP_DOCS]
    # HRMS children
    + [MODULE_RECRUIT, MODULE_INTERVIEW, MODULE_ONBOARDING, MODULE_ATTENDANCE,
       MODULE_LEAVE, MODULE_PAYROLL, MODULE_LOANS, MODULE_EXPENSES, MODULE_ESS]
    # Asset children
    + [MODULE_ASSET_INVENTORY, MODULE_ASSET_MAINTENANCE, MODULE_ASSET_AUDITS,
       MODULE_ASSET_REQUESTS, MODULE_ASSET_ASSIGNMENT, MODULE_ASSET_TRANSFERS,
       MODULE_ASSET_RETURNS, MODULE_ASSET_DISPOSAL]
    # CRM children
    + [MODULE_CRM_LEADS, MODULE_ACCOUNTS, MODULE_CONTACTS, MODULE_OPPORTUNITIES,
       MODULE_CRM_ACTIVITIES, MODULE_QUOTES, MODULE_CUSTOMERS]
    # LMS children
    + [MODULE_COURSES, MODULE_LEARNING_PATHS, MODULE_ASSESSMENTS, MODULE_CERTIFICATIONS]
    # BMS children
    + [MODULE_PRODUCTS, MODULE_SERVICES, MODULE_BMS_CATEGORIES,
       MODULE_BMS_CUSTOMERS, MODULE_CONTRACTS]
    # Finance children
    + [MODULE_VENDORS, MODULE_PURCHASE_REQUESTS, MODULE_PURCHASE_ORDERS,
       MODULE_INVOICES, MODULE_PAYMENTS, MODULE_BUDGETS, MODULE_COST_CENTERS]
    # Tasks children
    + [MODULE_PROJECTS, MODULE_MILESTONES, MODULE_TASK_LIST,
       MODULE_SPRINTS, MODULE_TIMESHEETS]
    # Helpdesk children
    + [MODULE_TICKETS, MODULE_SERVICE_CATALOG, MODULE_SLA,
       MODULE_ESCALATIONS, MODULE_KNOWLEDGE_ARTICLES]
    # Visitor children
    + [MODULE_VISITOR_REG, MODULE_PRE_APPROVALS, MODULE_CHECKIN, MODULE_VISITOR_PASSES]
    # Reports children
    + [MODULE_REPORTS_ORG, MODULE_REPORTS_HR, MODULE_REPORTS_ASSETS,
       MODULE_REPORTS_FINANCE, MODULE_REPORTS_SCHEDULED]
    # Workflow children
    + [MODULE_WF_APPROVALS, MODULE_WF_AUTOMATION,
       MODULE_WF_NOTIFICATIONS, MODULE_WF_ESCALATIONS]
)

# ── Document type master ──────────────────────────────────────────────────────
DOC_CATEGORY_COMPLIANCE = "compliance"
DOC_CATEGORY_BRANDING = "branding"
DOC_CATEGORY_GENERAL = "general"
DOC_CATEGORIES = [DOC_CATEGORY_COMPLIANCE, DOC_CATEGORY_BRANDING, DOC_CATEGORY_GENERAL]

# System-seeded default document types (seeded on startup if not present)
DEFAULT_DOCUMENT_TYPES = [
    # Compliance
    {"name": "MSME Certificate", "category": DOC_CATEGORY_COMPLIANCE, "sort_order": 10, "is_system": True},
    {"name": "GST Certificate", "category": DOC_CATEGORY_COMPLIANCE, "sort_order": 20, "is_system": True},
    {"name": "Incorporation Certificate", "category": DOC_CATEGORY_COMPLIANCE, "sort_order": 30, "is_system": True},
    {"name": "PAN Card", "category": DOC_CATEGORY_COMPLIANCE, "sort_order": 40, "is_system": True},
    {"name": "Trade License", "category": DOC_CATEGORY_COMPLIANCE, "sort_order": 50, "is_system": True},
    # Branding
    {"name": "Logo", "category": DOC_CATEGORY_BRANDING, "sort_order": 60, "is_system": True},
    {"name": "Brand Guidelines", "category": DOC_CATEGORY_BRANDING, "sort_order": 70, "is_system": True},
    {"name": "Letterhead", "category": DOC_CATEGORY_BRANDING, "sort_order": 80, "is_system": True},
    # General
    {"name": "Proposal", "category": DOC_CATEGORY_GENERAL, "sort_order": 90, "is_system": True},
    {"name": "Agreement", "category": DOC_CATEGORY_GENERAL, "sort_order": 100, "is_system": True},
    {"name": "NDA", "category": DOC_CATEGORY_GENERAL, "sort_order": 110, "is_system": True},
    {"name": "Purchase Order", "category": DOC_CATEGORY_GENERAL, "sort_order": 120, "is_system": True},
    {"name": "Contract", "category": DOC_CATEGORY_GENERAL, "sort_order": 130, "is_system": True},
    {"name": "Invoice", "category": DOC_CATEGORY_GENERAL, "sort_order": 140, "is_system": True},
    {"name": "Receipt", "category": DOC_CATEGORY_GENERAL, "sort_order": 150, "is_system": True},
    {"name": "Other", "category": DOC_CATEGORY_GENERAL, "sort_order": 160, "is_system": True},
]

# Legacy string list (kept for backward-compat validation on old upload endpoint)
DOCUMENT_TYPES = [dt["name"] for dt in DEFAULT_DOCUMENT_TYPES]

# ── Document type audit actions ──────────────────────────────────────────────
AUDIT_DOC_TYPE_CREATED = "CLIENT_DOC_TYPE_CREATED"
AUDIT_DOC_TYPE_UPDATED = "CLIENT_DOC_TYPE_UPDATED"
AUDIT_DOC_TYPE_DELETED = "CLIENT_DOC_TYPE_DELETED"
AUDIT_DOCUMENT_REPLACED = "CLIENT_DOCUMENT_REPLACED"
ACT_DOCUMENT_REPLACED = "Document Replaced"

# ── Payment terms (commercials) ──────────────────────────────────────────────
PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt", "Advance"]

# ── Currencies ───────────────────────────────────────────────────────────────
# The spec calls for "Settings → Currency Management"; that module does not exist
# yet, so currency is stored as an ISO 4217 currency code (plaintext) and the
# allowed list lives here as the single source of truth (frontend mirrors it).
CURRENCY_CODES = [
    "INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD", "JPY", "CNY",
]

# ── Audit actions ────────────────────────────────────────────────────────────
AUDIT_ENTITY = "Client"
AUDIT_CLIENT_CREATED = "CLIENT_CREATED"
AUDIT_CLIENT_UPDATED = "CLIENT_UPDATED"
AUDIT_CLIENT_STATUS_CHANGED = "CLIENT_STATUS_CHANGED"
AUDIT_CONTACT_ADDED = "CLIENT_CONTACT_ADDED"
AUDIT_CONTACT_UPDATED = "CLIENT_CONTACT_UPDATED"
AUDIT_CONTACT_DELETED = "CLIENT_CONTACT_DELETED"
AUDIT_BILLING_UPDATED = "CLIENT_BILLING_UPDATED"
AUDIT_MODULE_ENABLED = "CLIENT_MODULE_ENABLED"
AUDIT_MODULE_DISABLED = "CLIENT_MODULE_DISABLED"
AUDIT_SUBSCRIPTION_UPDATED = "CLIENT_SUBSCRIPTION_UPDATED"
AUDIT_DOCUMENT_UPLOADED = "CLIENT_DOCUMENT_UPLOADED"
AUDIT_DOCUMENT_DELETED = "CLIENT_DOCUMENT_DELETED"
AUDIT_DOMAIN_ADDED = "CLIENT_DOMAIN_ADDED"
AUDIT_DOMAIN_ACTIVATED = "CLIENT_DOMAIN_ACTIVATED"
AUDIT_DOMAIN_DELETED = "CLIENT_DOMAIN_DELETED"
AUDIT_ADMIN_USER_ADDED = "CLIENT_ADMIN_USER_ADDED"
AUDIT_ADMIN_USER_UPDATED = "CLIENT_ADMIN_USER_UPDATED"
AUDIT_ADMIN_USER_INVITED = "CLIENT_ADMIN_USER_INVITED"
PORTAL_INVITE_TOKEN_BYTES = 32
PORTAL_INVITE_EXPIRY_DAYS = 7
AUDIT_DB_UPDATED = "CLIENT_DB_UPDATED"
AUDIT_DB_PROVISIONED = "CLIENT_DB_PROVISIONED"
AUDIT_DB_DEPROVISIONED = "CLIENT_DB_DEPROVISIONED"
AUDIT_LEAD_CONVERTED = "CLIENT_CONVERTED_FROM_LEAD"

# ── Activity-log actions (client-facing timeline) ────────────────────────────
ACT_CLIENT_CREATED = "Client Created"
ACT_CLIENT_UPDATED = "Client Updated"
ACT_STATUS_CHANGED = "Status Changed"
ACT_CONTACT_ADDED = "Contact Added"
ACT_CONTACT_UPDATED = "Contact Updated"
ACT_CONTACT_DELETED = "Contact Deleted"
ACT_BILLING_UPDATED = "Billing Updated"
ACT_MODULE_ENABLED = "Module Enabled"
ACT_MODULE_DISABLED = "Module Disabled"
ACT_SUBSCRIPTION_UPDATED = "Subscription Updated"
ACT_DOCUMENT_UPLOADED = "Document Uploaded"
ACT_DOCUMENT_DELETED = "Document Deleted"
ACT_DOMAIN_ADDED = "Domain Added"
ACT_DOMAIN_ACTIVATED = "Domain Activated"
ACT_DOMAIN_DELETED = "Domain Deleted"

DOMAIN_TYPE_SUBDOMAIN = "subdomain"
DOMAIN_TYPE_DOMAIN = "domain"
DOMAIN_TYPE_CUSTOM = "custom"
DOMAIN_TYPES = [DOMAIN_TYPE_SUBDOMAIN, DOMAIN_TYPE_DOMAIN, DOMAIN_TYPE_CUSTOM]
ACT_ADMIN_USER_ADDED = "Admin User Added"
ACT_ADMIN_USER_INVITED = "Admin User Invited"
ACT_DB_UPDATED = "Database Config Updated"
ACT_DB_PROVISIONED = "Database Provisioned"
ACT_DB_DEPROVISIONED = "Database Deprovisioned"
ACT_TENANT_PROVISIONED = "Tenant Provisioned"
ACT_CONVERTED_FROM_LEAD = "Converted From Lead"

# ── Client file storage ──────────────────────────────────────────────────────
# Clients are platform-managed records (the superadmin CRM), so their documents
# use the "platform" storage scope under the PRIVATE root, served only via
# authenticated download endpoints. These names are the {module} segment of the
# storage key ({scope}/{module}/{filename}).
from backend.shared.storage.file_handler import PLATFORM_SCOPE as CLIENT_STORAGE_SCOPE

CLIENT_DOCUMENTS_MODULE = "client_documents"
