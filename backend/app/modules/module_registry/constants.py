"""
Module Registry — central catalog of all platform modules.

module_master.name MUST match the string used in client_modules.module_name
so the two tables join cleanly without a foreign-key migration.

parent_module_code = None  → top-level module (shown as a card in admin UI)
parent_module_code = <code> → child module (shown inside parent modal + portal sidebar)
"""

MODULE_CATALOG = [
    # ── System (always present, not client-toggleable) ────────────────────────
    {
        "code": "USER_MANAGEMENT",
        "name": "User Management",
        "description": "Workspace users, roles, login logs, and session management",
        "route": "user-management",
        "icon": "user-plus",
        "display_order": 1,
        "is_system_module": True,
        "parent_module_code": None,
    },

    # ── Top-level business modules ────────────────────────────────────────────
    {
        "code": "ORGANIZATION",
        "name": "Organization Management",
        "description": "Manage companies, organization structure and employees",
        "route": "org",
        "icon": "building",
        "display_order": 10,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "hrms",
        "name": "HRMS",
        "description": "Manage the complete employee lifecycle — recruitment, attendance, leave, and payroll",
        "route": "hrms",
        "icon": "briefcase",
        "display_order": 20,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "assets",
        "name": "Asset Management",
        "description": "Manage company assets and assignments across locations and teams",
        "route": "assets",
        "icon": "package",
        "display_order": 30,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "crm",
        "name": "CRM",
        "description": "Customer relationship management — leads, accounts, contacts, and opportunities",
        "route": "crm",
        "icon": "users",
        "display_order": 40,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "lms",
        "name": "LMS",
        "description": "Learning management — courses, assessments, and certifications",
        "route": "lms",
        "icon": "academic-cap",
        "display_order": 50,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "bms",
        "name": "BMS",
        "description": "Business management — products, services, and contracts",
        "route": "bms",
        "icon": "briefcase-alt",
        "display_order": 60,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "finance",
        "name": "Finance & Procurement",
        "description": "Vendors, purchase orders, invoices, payments, and budgets",
        "route": "finance",
        "icon": "currency",
        "display_order": 70,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "tasks",
        "name": "Task & Project Management",
        "description": "Projects, milestones, sprints, tasks, and timesheets",
        "route": "tasks",
        "icon": "clipboard-list",
        "display_order": 80,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "helpdesk",
        "name": "Helpdesk",
        "description": "Support ticket and service-request management with SLA tracking",
        "route": "helpdesk",
        "icon": "headphones",
        "display_order": 90,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "visitors",
        "name": "Visitor Management",
        "description": "Visitor registration, pre-approvals, check-in/check-out, and visitor passes",
        "route": "visitors",
        "icon": "id-card",
        "display_order": 100,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "billing",
        "name": "Billing Management",
        "description": "Invoices, payments, and financial records for the workspace",
        "route": "billing",
        "icon": "credit-card",
        "display_order": 110,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "reports",
        "name": "Reports",
        "description": "Analytics dashboards and exportable reports across all modules",
        "route": "reports",
        "icon": "bar-chart",
        "display_order": 120,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "knowledge",
        "name": "Knowledge Base",
        "description": "Internal wiki, SOPs, and documentation with version control",
        "route": "knowledge",
        "icon": "book",
        "display_order": 130,
        "is_system_module": False,
        "parent_module_code": None,
    },
    {
        "code": "workflow",
        "name": "Workflow Engine",
        "description": "Process automation and multi-step approval workflows",
        "route": "workflow",
        "icon": "git-branch",
        "display_order": 140,
        "is_system_module": False,
        "parent_module_code": None,
    },

    # ── Children of Organization Management ──────────────────────────────────
    {"code": "org_companies",    "name": "Companies",          "description": "Manage company entities and corporate profiles",          "route": "org/companies",     "icon": "building", "display_order": 1001, "is_system_module": False, "parent_module_code": "ORGANIZATION"},
    {"code": "org_branches",     "name": "Branches",           "description": "Office branches and geographic locations",               "route": "org/branches",      "icon": "building", "display_order": 1002, "is_system_module": False, "parent_module_code": "ORGANIZATION"},
    {"code": "org_departments",  "name": "Departments",        "description": "Departments and organisational units",                  "route": "org/departments",   "icon": "building", "display_order": 1003, "is_system_module": False, "parent_module_code": "ORGANIZATION"},
    {"code": "org_designations", "name": "Designations",       "description": "Job titles and designations catalog",                   "route": "org/designations",  "icon": "building", "display_order": 1004, "is_system_module": False, "parent_module_code": "ORGANIZATION"},
    {"code": "org_employees",    "name": "Employees",          "description": "Employee profiles, records and lifecycle management",    "route": "employees",         "icon": "user-plus","display_order": 1005, "is_system_module": False, "parent_module_code": "ORGANIZATION"},
    {"code": "org_emp_docs",     "name": "Employee Documents", "description": "Employee document management and storage",              "route": "employee-documents","icon": "book",     "display_order": 1006, "is_system_module": False, "parent_module_code": "ORGANIZATION"},

    # ── Children of HRMS ─────────────────────────────────────────────────────
    {"code": "recruitment",       "name": "Recruitment",            "description": "Job postings, applicant tracking, and hiring pipelines",           "route": "recruitment",       "icon": "user-plus", "display_order": 2001, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_interview",    "name": "Interview Management",   "description": "Schedule and track interview rounds for candidates",               "route": "hrms/interviews",   "icon": "briefcase", "display_order": 2002, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_onboarding",   "name": "Employee Onboarding",    "description": "Structured onboarding workflows for new hires",                    "route": "hrms/onboarding",   "icon": "briefcase", "display_order": 2003, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_attendance",   "name": "Attendance Management",  "description": "Track daily attendance, shifts, and working hours",                "route": "hrms/attendance",   "icon": "briefcase", "display_order": 2004, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_leave",        "name": "Leave Management",       "description": "Leave policies, requests, approvals, and holiday calendar",         "route": "hrms/leave",        "icon": "briefcase", "display_order": 2005, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_payroll",      "name": "Payroll Management",     "description": "Payroll processing, salary components, and disbursement",           "route": "hrms/payroll",      "icon": "briefcase", "display_order": 2006, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_loans",        "name": "Employee Loan Management","description": "Employee loan requests, approvals, and repayment tracking",        "route": "hrms/loans",        "icon": "briefcase", "display_order": 2007, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_expenses",     "name": "Expense & Reimbursements","description": "Employee expense claims and reimbursement workflows",              "route": "hrms/expenses",     "icon": "briefcase", "display_order": 2008, "is_system_module": False, "parent_module_code": "hrms"},
    {"code": "hrms_ess",          "name": "Employee Self Service",  "description": "Self-service portal for employees — leave, payslips, and requests", "route": "hrms/ess",          "icon": "briefcase", "display_order": 2009, "is_system_module": False, "parent_module_code": "hrms"},

    # ── Children of Asset Management ─────────────────────────────────────────
    {"code": "assets_inventory",   "name": "Asset Inventory",  "description": "Catalog and track all company assets",                        "route": "assets/inventory",    "icon": "package", "display_order": 3001, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_maintenance", "name": "Asset Maintenance","description": "Maintenance schedules and service logs for assets",            "route": "assets/maintenance",  "icon": "package", "display_order": 3002, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_audits",      "name": "Asset Audits",     "description": "Periodic asset audits and verification workflows",             "route": "assets/audits",       "icon": "package", "display_order": 3003, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_requests",    "name": "Asset Requests",   "description": "Employee asset request and assignment management",             "route": "assets/requests",     "icon": "package", "display_order": 3004, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_assignment",  "name": "Asset Assignment", "description": "Assign assets to employees and track assignments",             "route": "assets/assignments",  "icon": "package", "display_order": 3005, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_transfers",   "name": "Asset Transfers",  "description": "Transfer assets between locations and employees",              "route": "assets/transfers",    "icon": "package", "display_order": 3006, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_returns",     "name": "Asset Returns",    "description": "Manage asset returns and condition assessments",               "route": "assets/returns",      "icon": "package", "display_order": 3007, "is_system_module": False, "parent_module_code": "assets"},
    {"code": "assets_disposal",    "name": "Asset Disposal",   "description": "Asset retirement, disposal, and write-off workflows",         "route": "assets/disposal",     "icon": "package", "display_order": 3008, "is_system_module": False, "parent_module_code": "assets"},

    # ── Children of CRM ───────────────────────────────────────────────────────
    {"code": "crm_leads",         "name": "CRM Leads",       "description": "Track and manage sales leads and prospects",                  "route": "crm/leads",         "icon": "users", "display_order": 4001, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_accounts",      "name": "Accounts",        "description": "Manage customer accounts and business relationships",         "route": "crm/accounts",      "icon": "users", "display_order": 4002, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_contacts",      "name": "Contacts",        "description": "Contact directory linked to accounts and leads",              "route": "crm/contacts",      "icon": "users", "display_order": 4003, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_opportunities", "name": "Opportunities",   "description": "Sales opportunities and pipeline stage management",          "route": "crm/opportunities", "icon": "users", "display_order": 4004, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_activities",    "name": "CRM Activities",  "description": "Calls, meetings, emails, and tasks linked to CRM records",   "route": "crm/activities",    "icon": "users", "display_order": 4005, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_quotes",        "name": "Quotes",          "description": "Create and manage sales quotations",                          "route": "crm/quotes",        "icon": "users", "display_order": 4006, "is_system_module": False, "parent_module_code": "crm"},
    {"code": "crm_customers",     "name": "Customers",       "description": "Converted customer records and account management",           "route": "crm/customers",     "icon": "users", "display_order": 4007, "is_system_module": False, "parent_module_code": "crm"},

    # ── Children of LMS ───────────────────────────────────────────────────────
    {"code": "lms_courses",        "name": "Courses",        "description": "Create and manage training courses and content",              "route": "lms/courses",       "icon": "academic-cap", "display_order": 5001, "is_system_module": False, "parent_module_code": "lms"},
    {"code": "lms_paths",          "name": "Learning Paths", "description": "Structured learning journeys combining multiple courses",     "route": "lms/paths",         "icon": "academic-cap", "display_order": 5002, "is_system_module": False, "parent_module_code": "lms"},
    {"code": "lms_assessments",    "name": "Assessments",    "description": "Quizzes, tests, and skill assessments for learners",          "route": "lms/assessments",   "icon": "academic-cap", "display_order": 5003, "is_system_module": False, "parent_module_code": "lms"},
    {"code": "lms_certifications", "name": "Certifications", "description": "Issue and track certificates upon course completion",         "route": "lms/certifications","icon": "academic-cap", "display_order": 5004, "is_system_module": False, "parent_module_code": "lms"},

    # ── Children of BMS ───────────────────────────────────────────────────────
    {"code": "bms_products",    "name": "Products",       "description": "Product catalog and pricing management",                     "route": "bms/products",   "icon": "briefcase-alt", "display_order": 6001, "is_system_module": False, "parent_module_code": "bms"},
    {"code": "bms_services",    "name": "Services",       "description": "Service offerings and service pricing",                      "route": "bms/services",   "icon": "briefcase-alt", "display_order": 6002, "is_system_module": False, "parent_module_code": "bms"},
    {"code": "bms_categories",  "name": "BMS Categories", "description": "Product and service category management",                    "route": "bms/categories", "icon": "briefcase-alt", "display_order": 6003, "is_system_module": False, "parent_module_code": "bms"},
    {"code": "bms_customers",   "name": "BMS Customers",  "description": "Customer records linked to products and services",           "route": "bms/customers",  "icon": "briefcase-alt", "display_order": 6004, "is_system_module": False, "parent_module_code": "bms"},
    {"code": "bms_contracts",   "name": "Contracts",      "description": "Customer contracts, renewals, and SLA agreements",           "route": "bms/contracts",  "icon": "briefcase-alt", "display_order": 6005, "is_system_module": False, "parent_module_code": "bms"},

    # ── Children of Finance & Procurement ─────────────────────────────────────
    {"code": "finance_vendors",   "name": "Vendors",           "description": "Vendor directory and supplier relationship management",   "route": "finance/vendors",           "icon": "currency", "display_order": 7001, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_pr",        "name": "Purchase Requests", "description": "Internal purchase requests and approval workflows",       "route": "finance/purchase-requests",  "icon": "currency", "display_order": 7002, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_po",        "name": "Purchase Orders",   "description": "Purchase order creation, approval, and tracking",        "route": "finance/purchase-orders",    "icon": "currency", "display_order": 7003, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_invoices",  "name": "Invoices",          "description": "Vendor invoices and payable management",                  "route": "finance/invoices",           "icon": "currency", "display_order": 7004, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_payments",  "name": "Payments",          "description": "Payment records and disbursement tracking",               "route": "finance/payments",           "icon": "currency", "display_order": 7005, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_budgets",   "name": "Budgets",           "description": "Budget planning, allocation, and variance tracking",      "route": "finance/budgets",            "icon": "currency", "display_order": 7006, "is_system_module": False, "parent_module_code": "finance"},
    {"code": "finance_cc",        "name": "Cost Centers",      "description": "Cost center hierarchy and expense allocation",            "route": "finance/cost-centers",       "icon": "currency", "display_order": 7007, "is_system_module": False, "parent_module_code": "finance"},

    # ── Children of Task & Project Management ─────────────────────────────────
    {"code": "tasks_projects",   "name": "Projects",    "description": "Project planning, tracking, and team management",               "route": "tasks/projects",   "icon": "clipboard-list", "display_order": 8001, "is_system_module": False, "parent_module_code": "tasks"},
    {"code": "tasks_milestones", "name": "Milestones",  "description": "Key project milestones and deadline tracking",                  "route": "tasks/milestones", "icon": "clipboard-list", "display_order": 8002, "is_system_module": False, "parent_module_code": "tasks"},
    {"code": "tasks_list",       "name": "Task List",   "description": "Individual tasks, assignments, and priorities",                 "route": "tasks/list",       "icon": "clipboard-list", "display_order": 8003, "is_system_module": False, "parent_module_code": "tasks"},
    {"code": "tasks_sprints",    "name": "Sprints",     "description": "Agile sprint planning and backlog management",                  "route": "tasks/sprints",    "icon": "clipboard-list", "display_order": 8004, "is_system_module": False, "parent_module_code": "tasks"},
    {"code": "tasks_timesheets", "name": "Timesheets",  "description": "Employee time logging and project billing",                     "route": "tasks/timesheets", "icon": "clipboard-list", "display_order": 8005, "is_system_module": False, "parent_module_code": "tasks"},

    # ── Children of Helpdesk ──────────────────────────────────────────────────
    {"code": "helpdesk_tickets",    "name": "Tickets",            "description": "Support tickets and incident management",              "route": "helpdesk/tickets",   "icon": "headphones", "display_order": 9001, "is_system_module": False, "parent_module_code": "helpdesk"},
    {"code": "helpdesk_catalog",    "name": "Service Catalog",    "description": "Service offerings and request categories",            "route": "helpdesk/catalog",   "icon": "headphones", "display_order": 9002, "is_system_module": False, "parent_module_code": "helpdesk"},
    {"code": "helpdesk_sla",        "name": "SLA Management",     "description": "Service level agreements and response time policies",  "route": "helpdesk/sla",       "icon": "headphones", "display_order": 9003, "is_system_module": False, "parent_module_code": "helpdesk"},
    {"code": "helpdesk_escalations","name": "Escalations",        "description": "Escalation rules and ticket routing logic",           "route": "helpdesk/escalations","icon": "headphones", "display_order": 9004, "is_system_module": False, "parent_module_code": "helpdesk"},
    {"code": "helpdesk_knowledge",  "name": "Knowledge Articles", "description": "Help articles and self-service knowledge base",       "route": "helpdesk/knowledge", "icon": "headphones", "display_order": 9005, "is_system_module": False, "parent_module_code": "helpdesk"},

    # ── Children of Visitor Management ───────────────────────────────────────
    {"code": "visitors_reg",      "name": "Visitor Registration",   "description": "Register visitors and capture visit details",         "route": "visitors/registration",  "icon": "id-card", "display_order": 10001, "is_system_module": False, "parent_module_code": "visitors"},
    {"code": "visitors_approvals","name": "Pre-Approvals",          "description": "Pre-approve expected visitors and appointments",      "route": "visitors/pre-approvals", "icon": "id-card", "display_order": 10002, "is_system_module": False, "parent_module_code": "visitors"},
    {"code": "visitors_checkin",  "name": "Check-In / Check-Out",   "description": "Real-time visitor check-in and check-out tracking",   "route": "visitors/check-in",      "icon": "id-card", "display_order": 10003, "is_system_module": False, "parent_module_code": "visitors"},
    {"code": "visitors_passes",   "name": "Visitor Passes",         "description": "Issue and manage visitor access passes",              "route": "visitors/passes",        "icon": "id-card", "display_order": 10004, "is_system_module": False, "parent_module_code": "visitors"},

    # ── Children of Reports ───────────────────────────────────────────────────
    {"code": "reports_org",      "name": "Organization Reports", "description": "Reports on company structure, headcount, and org data", "route": "reports/org",       "icon": "bar-chart", "display_order": 12001, "is_system_module": False, "parent_module_code": "reports"},
    {"code": "reports_hr",       "name": "HR Reports",           "description": "Attendance, leave, payroll, and recruitment analytics", "route": "reports/hr",        "icon": "bar-chart", "display_order": 12002, "is_system_module": False, "parent_module_code": "reports"},
    {"code": "reports_assets",   "name": "Asset Reports",        "description": "Asset utilization, maintenance, and audit reports",    "route": "reports/assets",    "icon": "bar-chart", "display_order": 12003, "is_system_module": False, "parent_module_code": "reports"},
    {"code": "reports_finance",  "name": "Finance Reports",      "description": "Spend analysis, budget variance, and PO reports",      "route": "reports/finance",   "icon": "bar-chart", "display_order": 12004, "is_system_module": False, "parent_module_code": "reports"},
    {"code": "reports_scheduled","name": "Scheduled Reports",    "description": "Automated report delivery on a configured schedule",   "route": "reports/scheduled", "icon": "bar-chart", "display_order": 12005, "is_system_module": False, "parent_module_code": "reports"},

    # ── Children of Workflow Engine ───────────────────────────────────────────
    {"code": "wf_approvals",     "name": "Approval Workflows",     "description": "Multi-step approval chains for business processes",   "route": "workflow/approvals",     "icon": "git-branch", "display_order": 14001, "is_system_module": False, "parent_module_code": "workflow"},
    {"code": "wf_automation",    "name": "Automation Rules",       "description": "Trigger-based automation rules across modules",       "route": "workflow/automation",    "icon": "git-branch", "display_order": 14002, "is_system_module": False, "parent_module_code": "workflow"},
    {"code": "wf_notifications", "name": "Notification Templates", "description": "Email, SMS, and in-app notification templates",       "route": "workflow/notifications", "icon": "git-branch", "display_order": 14003, "is_system_module": False, "parent_module_code": "workflow"},
    {"code": "wf_escalations",   "name": "Escalation Rules",       "description": "Automatic escalation triggers and assignment rules",  "route": "workflow/escalations",   "icon": "git-branch", "display_order": 14004, "is_system_module": False, "parent_module_code": "workflow"},
]

MODULE_CODES = [m["code"] for m in MODULE_CATALOG]
MODULE_NAMES = [m["name"] for m in MODULE_CATALOG]
