// Centralized lead-management UI constants (colors, ordering, helpers).
// The authoritative controlled vocabularies are served by the backend
// (`leadsApi.options`); these maps only drive presentation.

export const STAGE_ORDER = [
  "New",
  "Contacted",
  "No Response",
  "Qualified",
  "Demo Scheduled",
  "Demo Completed",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Lost",
];

export const STAGE_COLORS = {
  New: "#64748b",
  Contacted: "#3b82f6",
  "No Response": "#9ca3af",
  Qualified: "#6366f1",
  "Demo Scheduled": "#8b5cf6",
  "Demo Completed": "#a855f7",
  "Proposal Sent": "#0ea5e9",
  Negotiation: "#f59e0b",
  Won: "#10b981",
  Lost: "#ef4444",
};

export const STATUS_COLORS = {
  Open: "#3b82f6",
  Won: "#10b981",
  Lost: "#ef4444",
  Converted: "#10b981",
};

export const SCORE_COLORS = {
  Hot: "#ef4444",
  Warm: "#f59e0b",
  Cold: "#3b82f6",
};

export function toOptions(values = []) {
  return values.map((v) => ({ value: v, label: v }));
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function formatCurrency(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function toInputDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}
