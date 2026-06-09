"""
Module Registry — central catalog of all platform modules.

module_master.name MUST match the string used in client_modules.module_name
so the two tables join cleanly without a foreign-key migration.
"""

MODULE_CATALOG = [
    {
        "code": "USER_MANAGEMENT",
        "name": "User Management",
        "description": "Workspace users, roles, login logs, and session management",
        "route": "user-management",
        "icon": "user-plus",
        "display_order": 1,
        "is_system_module": True,
    },
    {
        "code": "ORGANIZATION",
        "name": "Organization Management",
        "description": "Companies, departments, and designations — foundation for all HR modules",
        "route": "org",
        "icon": "building",
        "display_order": 5,
        "is_system_module": False,
    },
    {
        "code": "employees",
        "name": "Employee Management",
        "description": "Employee records, profiles, and employment history",
        "route": "employees",
        "icon": "id-card",
        "display_order": 10,
        "is_system_module": False,
    },
    {
        "code": "hrms",
        "name": "HRMS",
        "description": "Full human-resource management suite (leave, payroll, attendance)",
        "route": "hrms",
        "icon": "briefcase",
        "display_order": 20,
        "is_system_module": False,
    },
    {
        "code": "assets",
        "name": "Asset Management",
        "description": "Track and manage company assets across locations",
        "route": "assets",
        "icon": "package",
        "display_order": 30,
        "is_system_module": False,
    },
    {
        "code": "helpdesk",
        "name": "Helpdesk",
        "description": "Support ticket and service-request management",
        "route": "helpdesk",
        "icon": "headphones",
        "display_order": 40,
        "is_system_module": False,
    },
    {
        "code": "billing",
        "name": "Billing Management",
        "description": "Invoices, payments, and financial records",
        "route": "billing",
        "icon": "credit-card",
        "display_order": 50,
        "is_system_module": False,
    },
    {
        "code": "reports",
        "name": "Reports",
        "description": "Analytics dashboards and exportable reports",
        "route": "reports",
        "icon": "bar-chart",
        "display_order": 60,
        "is_system_module": False,
    },
    {
        "code": "knowledge",
        "name": "Knowledge Base",
        "description": "Internal wiki, SOPs, and documentation",
        "route": "knowledge",
        "icon": "book",
        "display_order": 70,
        "is_system_module": False,
    },
    {
        "code": "workflow",
        "name": "Workflow Engine",
        "description": "Process automation and approval workflows",
        "route": "workflow",
        "icon": "git-branch",
        "display_order": 80,
        "is_system_module": False,
    },
    {
        "code": "recruitment",
        "name": "Recruitment",
        "description": "Job postings, applicant tracking, and hiring pipelines",
        "route": "recruitment",
        "icon": "user-plus",
        "display_order": 90,
        "is_system_module": False,
    },
]

MODULE_CODES = [m["code"] for m in MODULE_CATALOG]
MODULE_NAMES = [m["name"] for m in MODULE_CATALOG]
