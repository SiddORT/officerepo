const TZ = "Asia/Kolkata";
const LOCALE = "en-IN";

const DATE_OPTS = {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const DATETIME_OPTS = {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(LOCALE, DATE_OPTS);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(LOCALE, DATETIME_OPTS);
}
