import React from "react";
import { STAGE_COLORS, STATUS_COLORS } from "../constants";

function pill(color, text) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${color}1f`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {text}
    </span>
  );
}

export function StageBadge({ stage }) {
  if (!stage) return <span className="t-muted">—</span>;
  return pill(STAGE_COLORS[stage] || "#64748b", stage);
}

export function StatusBadge({ status }) {
  if (!status) return <span className="t-muted">—</span>;
  return pill(STATUS_COLORS[status] || "#64748b", status);
}

export default StageBadge;
