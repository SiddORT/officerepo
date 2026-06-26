// Centralized client-management UI constants (colors, helpers).
// The authoritative controlled vocabularies are served by the backend
// (`clientsApi.options`); these maps only drive presentation.

export const STATUS_COLORS = {
  Prospective: "#64748b",
  Trial: "#8b5cf6",
  Active: "#10b981",
  Suspended: "#f59e0b",
  Expired: "#ef4444",
  Archived: "#9ca3af",
};

export const DB_STATUS_COLORS = {
  "Not Provisioned": "#9ca3af",
  Provisioning: "#f59e0b",
  Active: "#10b981",
  Failed: "#ef4444",
};

export const SUBSCRIPTION_STATUS_COLORS = {
  Inactive: "#9ca3af",
  Trial: "#8b5cf6",
  Active: "#10b981",
  Expired: "#ef4444",
  Cancelled: "#64748b",
};

export const ADMIN_STATUS_COLORS = {
  Placeholder: "#9ca3af",
  Invited: "#8b5cf6",
  Active: "#10b981",
  Disabled: "#ef4444",
};

export function toOptions(values = []) {
  return values.map((v) => ({ value: v, label: v }));
}

export { formatDate, formatDateTime } from "../../../utils/dateUtils";

export function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function contactName(contact) {
  if (!contact) return "—";
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";
}
