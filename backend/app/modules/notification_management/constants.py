"""Constants for Notification Management module."""

# ── Channels ────────────────────────────────────────────────────────────────
CHANNEL_EMAIL     = "email"
CHANNEL_SMS       = "sms"
CHANNEL_WHATSAPP  = "whatsapp"
CHANNEL_PUSH      = "push"

ALL_CHANNELS = (CHANNEL_EMAIL, CHANNEL_SMS, CHANNEL_WHATSAPP, CHANNEL_PUSH)

CHANNEL_LABELS: dict = {
    CHANNEL_EMAIL:    "Email",
    CHANNEL_SMS:      "SMS",
    CHANNEL_WHATSAPP: "WhatsApp",
    CHANNEL_PUSH:     "Push Notifications",
}

# ── Log / delivery statuses ──────────────────────────────────────────────────
STATUS_QUEUED      = "queued"
STATUS_PROCESSING  = "processing"
STATUS_SENT        = "sent"
STATUS_DELIVERED   = "delivered"
STATUS_FAILED      = "failed"

ALL_LOG_STATUSES = (
    STATUS_QUEUED, STATUS_PROCESSING, STATUS_SENT, STATUS_DELIVERED, STATUS_FAILED
)

# ── Template statuses ────────────────────────────────────────────────────────
TEMPLATE_ACTIVE   = "active"
TEMPLATE_INACTIVE = "inactive"

# ── Priority ─────────────────────────────────────────────────────────────────
PRIORITY_HIGH   = "high"
PRIORITY_NORMAL = "normal"
PRIORITY_LOW    = "low"

ALL_PRIORITIES = (PRIORITY_HIGH, PRIORITY_NORMAL, PRIORITY_LOW)

# ── Events ───────────────────────────────────────────────────────────────────
# CRM
EVENT_LEAD_CREATED   = "lead.created"
EVENT_LEAD_ASSIGNED  = "lead.assigned"
EVENT_LEAD_UPDATED   = "lead.updated"
EVENT_LEAD_CONVERTED = "lead.converted"
EVENT_LEAD_CLOSED    = "lead.closed"

# Client management
EVENT_CLIENT_CREATED      = "client.created"
EVENT_CLIENT_ACTIVATED    = "client.activated"
EVENT_CLIENT_DEACTIVATED  = "client.deactivated"

# Subscription
EVENT_SUB_CREATED   = "subscription.created"
EVENT_SUB_RENEWED   = "subscription.renewed"
EVENT_SUB_EXPIRING  = "subscription.expiring"
EVENT_SUB_EXPIRED   = "subscription.expired"

# Invoice
EVENT_INV_GENERATED = "invoice.generated"
EVENT_INV_SENT      = "invoice.sent"
EVENT_INV_PAID      = "invoice.paid"
EVENT_INV_OVERDUE   = "invoice.overdue"

# Payment
EVENT_PAYMENT_RECEIVED = "payment.received"
EVENT_PAYMENT_FAILED   = "payment.failed"

# User / auth
EVENT_USER_CREATED        = "user.created"
EVENT_USER_PASSWORD_RESET = "user.password_reset"
EVENT_USER_LOGIN          = "user.login"
EVENT_USER_2FA_ENABLED    = "user.2fa_enabled"
EVENT_USER_2FA_DISABLED   = "user.2fa_disabled"

# Platform
EVENT_MAINTENANCE   = "platform.maintenance"
EVENT_ANNOUNCEMENT  = "platform.announcement"

ALL_EVENTS = (
    EVENT_LEAD_CREATED, EVENT_LEAD_ASSIGNED, EVENT_LEAD_UPDATED,
    EVENT_LEAD_CONVERTED, EVENT_LEAD_CLOSED,
    EVENT_CLIENT_CREATED, EVENT_CLIENT_ACTIVATED, EVENT_CLIENT_DEACTIVATED,
    EVENT_SUB_CREATED, EVENT_SUB_RENEWED, EVENT_SUB_EXPIRING, EVENT_SUB_EXPIRED,
    EVENT_INV_GENERATED, EVENT_INV_SENT, EVENT_INV_PAID, EVENT_INV_OVERDUE,
    EVENT_PAYMENT_RECEIVED, EVENT_PAYMENT_FAILED,
    EVENT_USER_CREATED, EVENT_USER_PASSWORD_RESET, EVENT_USER_LOGIN,
    EVENT_USER_2FA_ENABLED, EVENT_USER_2FA_DISABLED,
    EVENT_MAINTENANCE, EVENT_ANNOUNCEMENT,
)

EVENT_LABELS: dict = {
    EVENT_LEAD_CREATED:   "Lead Created",
    EVENT_LEAD_ASSIGNED:  "Lead Assigned",
    EVENT_LEAD_UPDATED:   "Lead Updated",
    EVENT_LEAD_CONVERTED: "Lead Converted",
    EVENT_LEAD_CLOSED:    "Lead Closed",
    EVENT_CLIENT_CREATED:     "Client Created",
    EVENT_CLIENT_ACTIVATED:   "Client Activated",
    EVENT_CLIENT_DEACTIVATED: "Client Deactivated",
    EVENT_SUB_CREATED:  "Subscription Created",
    EVENT_SUB_RENEWED:  "Subscription Renewed",
    EVENT_SUB_EXPIRING: "Subscription Expiring",
    EVENT_SUB_EXPIRED:  "Subscription Expired",
    EVENT_INV_GENERATED: "Invoice Generated",
    EVENT_INV_SENT:      "Invoice Sent",
    EVENT_INV_PAID:      "Invoice Paid",
    EVENT_INV_OVERDUE:   "Invoice Overdue",
    EVENT_PAYMENT_RECEIVED: "Payment Received",
    EVENT_PAYMENT_FAILED:   "Payment Failed",
    EVENT_USER_CREATED:        "User Created",
    EVENT_USER_PASSWORD_RESET: "Password Reset",
    EVENT_USER_LOGIN:          "User Login",
    EVENT_USER_2FA_ENABLED:    "2FA Enabled",
    EVENT_USER_2FA_DISABLED:   "2FA Disabled",
    EVENT_MAINTENANCE:  "Maintenance Notice",
    EVENT_ANNOUNCEMENT: "System Announcement",
}

EVENT_GROUP_LABELS: dict = {
    "CRM":          [EVENT_LEAD_CREATED, EVENT_LEAD_ASSIGNED, EVENT_LEAD_UPDATED, EVENT_LEAD_CONVERTED, EVENT_LEAD_CLOSED],
    "Clients":      [EVENT_CLIENT_CREATED, EVENT_CLIENT_ACTIVATED, EVENT_CLIENT_DEACTIVATED],
    "Subscriptions":[EVENT_SUB_CREATED, EVENT_SUB_RENEWED, EVENT_SUB_EXPIRING, EVENT_SUB_EXPIRED],
    "Invoices":     [EVENT_INV_GENERATED, EVENT_INV_SENT, EVENT_INV_PAID, EVENT_INV_OVERDUE],
    "Payments":     [EVENT_PAYMENT_RECEIVED, EVENT_PAYMENT_FAILED],
    "Users":        [EVENT_USER_CREATED, EVENT_USER_PASSWORD_RESET, EVENT_USER_LOGIN, EVENT_USER_2FA_ENABLED, EVENT_USER_2FA_DISABLED],
    "Platform":     [EVENT_MAINTENANCE, EVENT_ANNOUNCEMENT],
}

# ── Sensitive config field names masked on read ──────────────────────────────
MASKED_PLACEHOLDER = "••••••••"

SENSITIVE_FIELDS: dict = {
    CHANNEL_EMAIL:    {"password"},
    CHANNEL_SMS:      {"api_key", "api_secret"},
    CHANNEL_WHATSAPP: {"access_token", "verify_token"},
    CHANNEL_PUSH:     {"server_key"},
}

# ── SMS providers ─────────────────────────────────────────────────────────────
SMS_PROVIDER_TWILIO   = "twilio"
SMS_PROVIDER_MSG91    = "msg91"
SMS_PROVIDER_TEXTLOCAL = "textlocal"
SMS_PROVIDER_AWS_SNS  = "aws_sns"
SMS_PROVIDER_CUSTOM   = "custom"

SMS_PROVIDER_LABELS: dict = {
    SMS_PROVIDER_TWILIO:    "Twilio",
    SMS_PROVIDER_MSG91:     "MSG91",
    SMS_PROVIDER_TEXTLOCAL: "TextLocal",
    SMS_PROVIDER_AWS_SNS:   "AWS SNS",
    SMS_PROVIDER_CUSTOM:    "Custom",
}

# ── Email encryption modes ───────────────────────────────────────────────────
EMAIL_ENC_TLS  = "tls"
EMAIL_ENC_SSL  = "ssl"
EMAIL_ENC_NONE = "none"

# ── RBAC permission names ────────────────────────────────────────────────────
PERM_NOTIF_VIEW   = "notification.view"
PERM_NOTIF_UPDATE = "notification.update"
