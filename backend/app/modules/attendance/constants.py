"""Constants for the Attendance Management module."""

MODULE_NAME = "Attendance Management"

# ── Shift types ───────────────────────────────────────────────────────────────
SHIFT_TYPE_GENERAL     = "General"
SHIFT_TYPE_MORNING     = "Morning"
SHIFT_TYPE_EVENING     = "Evening"
SHIFT_TYPE_NIGHT       = "Night"
SHIFT_TYPE_ROTATIONAL  = "Rotational"
SHIFT_TYPE_FLEXIBLE    = "Flexible"

SHIFT_TYPES = [
    SHIFT_TYPE_GENERAL, SHIFT_TYPE_MORNING, SHIFT_TYPE_EVENING,
    SHIFT_TYPE_NIGHT, SHIFT_TYPE_ROTATIONAL, SHIFT_TYPE_FLEXIBLE,
]

# ── Attendance statuses ───────────────────────────────────────────────────────
ATT_PRESENT    = "Present"
ATT_ABSENT     = "Absent"
ATT_HALF_DAY   = "Half Day"
ATT_LATE       = "Late"
ATT_EARLY_EXIT = "Early Exit"
ATT_ON_LEAVE   = "On Leave"
ATT_HOLIDAY    = "Holiday"
ATT_WEEK_OFF   = "Week Off"

ATTENDANCE_STATUSES = [
    ATT_PRESENT, ATT_ABSENT, ATT_HALF_DAY, ATT_LATE,
    ATT_EARLY_EXIT, ATT_ON_LEAVE, ATT_HOLIDAY, ATT_WEEK_OFF,
]

# ── Attendance sources ────────────────────────────────────────────────────────
SRC_WEB_CHECKIN  = "Web Check-In"
SRC_MOBILE       = "Mobile Check-In"
SRC_QR           = "QR Code Check-In"
SRC_BIOMETRIC    = "Biometric Device"
SRC_RFID         = "RFID Card"
SRC_MANUAL       = "Manual Entry"
SRC_API          = "API Integration"

ATTENDANCE_SOURCES = [
    SRC_WEB_CHECKIN, SRC_MOBILE, SRC_QR,
    SRC_BIOMETRIC, SRC_RFID, SRC_MANUAL, SRC_API,
]

# ── Work modes (mirrors Employee Master) ──────────────────────────────────────
WORK_MODE_ONSITE = "Onsite"
WORK_MODE_WFH    = "Work From Home"
WORK_MODE_HYBRID = "Hybrid"
WORK_MODE_REMOTE = "Remote"

WORK_MODES = [WORK_MODE_ONSITE, WORK_MODE_WFH, WORK_MODE_HYBRID, WORK_MODE_REMOTE]

# ── Attendance location types ─────────────────────────────────────────────────
LOC_OFFICE      = "Office"
LOC_WFH         = "Work From Home"
LOC_CLIENT_SITE = "Client Site"
LOC_REMOTE      = "Remote"

LOCATION_TYPES = [LOC_OFFICE, LOC_WFH, LOC_CLIENT_SITE, LOC_REMOTE]

# ── Calendar display codes ────────────────────────────────────────────────────
LOCATION_CODES = {
    LOC_OFFICE:      "P",
    LOC_WFH:         "WFH",
    LOC_CLIENT_SITE: "CS",
    LOC_REMOTE:      "R",
}

# ── Weekdays ──────────────────────────────────────────────────────────────────
WEEKDAY_MONDAY    = "Monday"
WEEKDAY_TUESDAY   = "Tuesday"
WEEKDAY_WEDNESDAY = "Wednesday"
WEEKDAY_THURSDAY  = "Thursday"
WEEKDAY_FRIDAY    = "Friday"
WEEKDAY_SATURDAY  = "Saturday"
WEEKDAY_SUNDAY    = "Sunday"

WEEKDAYS = [
    WEEKDAY_MONDAY, WEEKDAY_TUESDAY, WEEKDAY_WEDNESDAY,
    WEEKDAY_THURSDAY, WEEKDAY_FRIDAY, WEEKDAY_SATURDAY, WEEKDAY_SUNDAY,
]

# Python weekday() → name (0=Monday)
WEEKDAY_MAP = {0: WEEKDAY_MONDAY, 1: WEEKDAY_TUESDAY, 2: WEEKDAY_WEDNESDAY,
               3: WEEKDAY_THURSDAY, 4: WEEKDAY_FRIDAY, 5: WEEKDAY_SATURDAY,
               6: WEEKDAY_SUNDAY}

# ── Regularization statuses ───────────────────────────────────────────────────
REG_PENDING  = "Pending"
REG_APPROVED = "Approved"
REG_REJECTED = "Rejected"

REGULARIZATION_STATUSES = [REG_PENDING, REG_APPROVED, REG_REJECTED]

# ── Overtime types ────────────────────────────────────────────────────────────
OT_WEEKDAY = "Weekday"
OT_WEEKEND = "Weekend"
OT_HOLIDAY = "Holiday"

OVERTIME_TYPES = [OT_WEEKDAY, OT_WEEKEND, OT_HOLIDAY]
OT_APPROVAL_STATUSES = [REG_PENDING, REG_APPROVED, REG_REJECTED]

# ── Assignment scopes ─────────────────────────────────────────────────────────
ASSIGN_EMPLOYEE   = "Employee"
ASSIGN_DEPARTMENT = "Department"
ASSIGN_BRANCH     = "Branch"
ASSIGN_COMPANY    = "Company"

ASSIGNMENT_SCOPES = [ASSIGN_EMPLOYEE, ASSIGN_DEPARTMENT, ASSIGN_BRANCH, ASSIGN_COMPANY]

# ── Device vendors (future biometric) ────────────────────────────────────────
DEVICE_VENDORS = ["eSSL", "ZKTeco", "Matrix", "Suprema", "FingerTec", "Other"]

DEVICE_STATUS_ACTIVE   = "Active"
DEVICE_STATUS_INACTIVE = "Inactive"
DEVICE_STATUS_ERROR    = "Error"
DEVICE_STATUSES = [DEVICE_STATUS_ACTIVE, DEVICE_STATUS_INACTIVE, DEVICE_STATUS_ERROR]

SYNC_METHOD_REST     = "REST API"
SYNC_METHOD_SDK      = "Device SDK"
SYNC_METHOD_WEBHOOK  = "Webhook"
SYNC_METHOD_FILE     = "File Import"
SYNC_METHOD_SCHEDULE = "Scheduled Sync"
SYNC_METHODS = [SYNC_METHOD_REST, SYNC_METHOD_SDK, SYNC_METHOD_WEBHOOK, SYNC_METHOD_FILE, SYNC_METHOD_SCHEDULE]

SYNC_LOG_STATUS_SUCCESS = "Success"
SYNC_LOG_STATUS_FAILED  = "Failed"
SYNC_LOG_STATUS_PARTIAL = "Partial"
SYNC_LOG_STATUSES = [SYNC_LOG_STATUS_SUCCESS, SYNC_LOG_STATUS_FAILED, SYNC_LOG_STATUS_PARTIAL]

# ── Activity actions ──────────────────────────────────────────────────────────
ACT_CHECKIN              = "Check-In"
ACT_CHECKOUT             = "Check-Out"
ACT_RECORD_UPDATED       = "Attendance Updated"
ACT_REGULARIZATION_REQ   = "Regularization Requested"
ACT_REGULARIZATION_APP   = "Regularization Approved"
ACT_REGULARIZATION_REJ   = "Regularization Rejected"
ACT_OVERTIME_RECORDED    = "Overtime Recorded"
ACT_DEVICE_REGISTERED    = "Device Registered"
ACT_SYNC_TRIGGERED       = "Sync Triggered"
ACT_SHIFT_CREATED        = "Shift Created"
ACT_SHIFT_ASSIGNED       = "Shift Assigned"
ACT_POLICY_UPDATED       = "Policy Updated"
ACT_WFH_CHECKIN          = "WFH Check-In"
ACT_WFH_CHECKOUT         = "WFH Check-Out"
ACT_LOCATION_CHANGED     = "Work Location Changed"
ACT_SCHEDULE_SET         = "Work Schedule Set"

# ── Default policy values ─────────────────────────────────────────────────────
DEFAULT_GRACE_PERIOD_MINS  = 15
DEFAULT_MIN_WORKING_HOURS  = 8.0
DEFAULT_HALF_DAY_HOURS     = 4.0
DEFAULT_OT_THRESHOLD_HOURS = 9.0
DEFAULT_MAX_WFH_DAYS       = 10
