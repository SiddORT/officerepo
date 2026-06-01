// Centralized enquiry-inbox UI constants (colors, helpers).
// The authoritative status vocabulary is served by the backend
// (`enquiryInboxApi.options`); these maps only drive presentation.

export const STATUS_COLORS = {
  New: "#3b82f6",
  "In Review": "#8b5cf6",
  Assigned: "#f59e0b",
  Converted: "#10b981",
  Closed: "#64748b",
};

export const ACTIVITY_COLORS = {
  created: "#06b6d4",
  status_changed: "#8b5cf6",
  assigned: "#f59e0b",
  unassigned: "#9ca3af",
  marked_spam: "#ef4444",
  unmarked_spam: "#10b981",
  note_added: "#3b82f6",
  note_deleted: "#ef4444",
  converted_to_lead: "#10b981",
};

export const ACTIVITY_LABELS = {
  created: "Created",
  status_changed: "Status Changed",
  assigned: "Assigned",
  unassigned: "Unassigned",
  marked_spam: "Marked Spam",
  unmarked_spam: "Unmarked Spam",
  note_added: "Note Added",
  note_deleted: "Note Deleted",
  converted_to_lead: "Converted to Lead",
};

export function toOptions(values = []) {
  return values.map((v) => ({ value: v, label: v }));
}

export { formatDate, formatDateTime } from "../../../utils/dateUtils";

export function activityLabel(type) {
  return ACTIVITY_LABELS[type] || type;
}
