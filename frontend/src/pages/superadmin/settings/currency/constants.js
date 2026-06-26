// Currency-management UI constants & helpers. The authoritative controlled
// vocabularies are served by the backend (`currencyApi.options`); these maps
// only drive presentation.

export const CURRENCY_PERMS = {
  view: "currency.view",
  create: "currency.create",
  edit: "currency.edit",
  activate: "currency.activate",
  overrideRate: "currency.override_rate",
  viewHistory: "currency.view_history",
};

export const STATUS_VARIANT = {
  Active: "active",
  Inactive: "inactive",
};

export const SYNC_STATUS_VARIANT = {
  Success: "active",
  Failed: "suspended",
  "Partial Success": "trial",
};

export function toOptions(values = []) {
  return values.map((v) => ({ value: v, label: v }));
}

export { formatDateTime } from "../../../../utils/dateUtils";

export function formatRate(value, decimals = 6) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}
