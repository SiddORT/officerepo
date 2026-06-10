"""Constants for Superadmin → Asset Management Setup."""

ASSET_STATUS_ACTIVE = "Active"
ASSET_STATUS_INACTIVE = "Inactive"
ASSET_STATUSES = [ASSET_STATUS_ACTIVE, ASSET_STATUS_INACTIVE]

DEFAULT_CATEGORIES = [
    {"category_code": "IT",   "category_name": "IT Assets",          "icon": "💻", "display_order": 1},
    {"category_code": "FURN", "category_name": "Furniture",           "icon": "🪑", "display_order": 2},
    {"category_code": "ELEC", "category_name": "Electronics",         "icon": "⚡", "display_order": 3},
    {"category_code": "VEH",  "category_name": "Vehicles",            "icon": "🚗", "display_order": 4},
    {"category_code": "SW",   "category_name": "Software Licenses",   "icon": "📦", "display_order": 5},
    {"category_code": "NET",  "category_name": "Network Equipment",   "icon": "🌐", "display_order": 6},
    {"category_code": "SEC",  "category_name": "Security Equipment",  "icon": "🔒", "display_order": 7},
    {"category_code": "OFC",  "category_name": "Office Equipment",    "icon": "🖨️", "display_order": 8},
]

DEFAULT_SUB_CATEGORIES = [
    {"sub_category_code": "IT-LAP",  "sub_category_name": "Laptop",       "category_code": "IT"},
    {"sub_category_code": "IT-DES",  "sub_category_name": "Desktop",      "category_code": "IT"},
    {"sub_category_code": "IT-MON",  "sub_category_name": "Monitor",      "category_code": "IT"},
    {"sub_category_code": "IT-KEY",  "sub_category_name": "Keyboard",     "category_code": "IT"},
    {"sub_category_code": "IT-MOU",  "sub_category_name": "Mouse",        "category_code": "IT"},
    {"sub_category_code": "IT-PRN",  "sub_category_name": "Printer",      "category_code": "IT"},
    {"sub_category_code": "IT-SCN",  "sub_category_name": "Scanner",      "category_code": "IT"},
    {"sub_category_code": "FU-CHR",  "sub_category_name": "Chair",        "category_code": "FURN"},
    {"sub_category_code": "FU-TBL",  "sub_category_name": "Table",        "category_code": "FURN"},
    {"sub_category_code": "FU-WRK",  "sub_category_name": "Workstation",  "category_code": "FURN"},
    {"sub_category_code": "SW-M365", "sub_category_name": "Microsoft 365","category_code": "SW"},
    {"sub_category_code": "SW-ADO",  "sub_category_name": "Adobe",        "category_code": "SW"},
    {"sub_category_code": "SW-AV",   "sub_category_name": "Antivirus",    "category_code": "SW"},
]

DEFAULT_ASSET_MASTERS = [
    {
        "asset_code": "AM-LAP-001", "asset_name": "Dell Latitude 5440",
        "category_code": "IT", "sub_category_code": "IT-LAP",
        "brand": "Dell", "model_number": "Latitude 5440",
        "manufacturer": "Dell Technologies", "warranty_period_months": 36,
        "serial_number_required": True, "warranty_tracking_enabled": True,
        "depreciation_applicable": True, "expected_life_years": 4,
    },
    {
        "asset_code": "AM-LAP-002", "asset_name": "HP EliteBook 840",
        "category_code": "IT", "sub_category_code": "IT-LAP",
        "brand": "HP", "model_number": "EliteBook 840",
        "manufacturer": "HP Inc.", "warranty_period_months": 36,
        "serial_number_required": True, "warranty_tracking_enabled": True,
        "depreciation_applicable": True, "expected_life_years": 4,
    },
    {
        "asset_code": "AM-LAP-003", "asset_name": "Lenovo ThinkPad T14",
        "category_code": "IT", "sub_category_code": "IT-LAP",
        "brand": "Lenovo", "model_number": "ThinkPad T14",
        "manufacturer": "Lenovo", "warranty_period_months": 36,
        "serial_number_required": True, "warranty_tracking_enabled": True,
        "depreciation_applicable": True, "expected_life_years": 4,
    },
    {
        "asset_code": "AM-MON-001", "asset_name": 'Dell Monitor 24"',
        "category_code": "IT", "sub_category_code": "IT-MON",
        "brand": "Dell", "model_number": "P2422H",
        "manufacturer": "Dell Technologies", "warranty_period_months": 36,
        "serial_number_required": True, "depreciation_applicable": True,
        "expected_life_years": 6,
    },
    {
        "asset_code": "AM-PRN-001", "asset_name": "HP LaserJet Printer",
        "category_code": "IT", "sub_category_code": "IT-PRN",
        "brand": "HP", "model_number": "LaserJet Pro M404dn",
        "manufacturer": "HP Inc.", "warranty_period_months": 12,
        "serial_number_required": True, "maintenance_tracking_enabled": True,
        "depreciation_applicable": True, "expected_life_years": 5,
    },
    {
        "asset_code": "AM-MOB-001", "asset_name": "iPhone 15",
        "category_code": "ELEC", "sub_category_code": None,
        "brand": "Apple", "model_number": "A3089",
        "manufacturer": "Apple Inc.", "warranty_period_months": 12,
        "serial_number_required": True, "warranty_tracking_enabled": True,
        "depreciation_applicable": True, "expected_life_years": 3,
    },
]

ACTION_CATEGORY_CREATED = "asset_category.created"
ACTION_CATEGORY_UPDATED = "asset_category.updated"
ACTION_CATEGORY_ACTIVATED = "asset_category.activated"
ACTION_CATEGORY_DEACTIVATED = "asset_category.deactivated"

ACTION_SUBCAT_CREATED = "asset_sub_category.created"
ACTION_SUBCAT_UPDATED = "asset_sub_category.updated"
ACTION_SUBCAT_ACTIVATED = "asset_sub_category.activated"
ACTION_SUBCAT_DEACTIVATED = "asset_sub_category.deactivated"

ACTION_MASTER_CREATED = "asset_master.created"
ACTION_MASTER_UPDATED = "asset_master.updated"
ACTION_MASTER_ACTIVATED = "asset_master.activated"
ACTION_MASTER_DEACTIVATED = "asset_master.deactivated"
