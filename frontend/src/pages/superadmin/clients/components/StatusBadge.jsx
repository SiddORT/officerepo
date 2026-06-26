import React from "react";
import {
  STATUS_COLORS,
  DB_STATUS_COLORS,
  SUBSCRIPTION_STATUS_COLORS,
  ADMIN_STATUS_COLORS,
} from "../constants";

function Pill({ value, color }) {
  if (!value) return <span className="t-muted">—</span>;
  const c = color || "#64748b";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${c}1a`, color: c, border: `1px solid ${c}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
      {value}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Pill value={status} color={STATUS_COLORS[status]} />;
}

export function DbStatusBadge({ status }) {
  return <Pill value={status} color={DB_STATUS_COLORS[status]} />;
}

export function SubscriptionStatusBadge({ status }) {
  return <Pill value={status} color={SUBSCRIPTION_STATUS_COLORS[status]} />;
}

export function AdminStatusBadge({ status }) {
  return <Pill value={status} color={ADMIN_STATUS_COLORS[status]} />;
}

export default StatusBadge;
