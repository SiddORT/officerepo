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
MODULE_EMPLOYEE = "Employee Management"
MODULE_HRMS = "HRMS"
MODULE_ASSET = "Asset Management"
MODULE_BILLING = "Billing Management"
MODULE_WORKFLOW = "Workflow Engine"
MODULE_REPORTS = "Reports"
MODULE_KNOWLEDGE = "Knowledge Base"
MODULE_HELPDESK = "Helpdesk"
CLIENT_MODULES = [
    MODULE_EMPLOYEE,
    MODULE_HRMS,
    MODULE_ASSET,
    MODULE_BILLING,
    MODULE_WORKFLOW,
    MODULE_REPORTS,
    MODULE_KNOWLEDGE,
    MODULE_HELPDESK,
]

# ── Documents ────────────────────────────────────────────────────────────────
DOCUMENT_TYPES = [
    "Proposal",
    "Agreement",
    "NDA",
    "Purchase Order",
    "Contract",
    "Invoice",
    "Receipt",
    "Other",
]

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
AUDIT_DB_UPDATED = "CLIENT_DB_UPDATED"
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
ACT_DB_UPDATED = "Database Config Updated"
ACT_TENANT_PROVISIONED = "Tenant Provisioned"
ACT_CONVERTED_FROM_LEAD = "Converted From Lead"

# ── Client file storage ──────────────────────────────────────────────────────
# Clients are platform-managed records (the superadmin CRM), so their documents
# use the "platform" storage scope under the PRIVATE root, served only via
# authenticated download endpoints. These names are the {module} segment of the
# storage key ({scope}/{module}/{filename}).
from backend.shared.storage.file_handler import PLATFORM_SCOPE as CLIENT_STORAGE_SCOPE

CLIENT_DOCUMENTS_MODULE = "client_documents"
