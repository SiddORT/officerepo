import React from "react";
import { formatDateTime } from "../constants";

const TYPE_COLORS = {
  lead: "#00aeec",
  activity: "#3b82f6",
  demo: "#a855f7",
  followup: "#f59e0b",
  proposal: "#0ea5e9",
  negotiation: "#f59e0b",
  conversion: "#10b981",
};

export default function Timeline({ events = [] }) {
  if (!events.length) {
    return <p className="text-sm t-muted py-6 text-center">No timeline activity yet.</p>;
  }
  return (
    <ol className="relative space-y-5 pl-6">
      <span
        className="absolute left-[7px] top-1 bottom-1 w-px"
        style={{ background: "var(--c-border)" }}
        aria-hidden
      />
      {events.map((e, i) => {
        const color = TYPE_COLORS[e.type] || "#64748b";
        return (
          <li key={i} className="relative">
            <span
              className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2"
              style={{ background: color, borderColor: "var(--c-surface)" }}
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium t-heading">{e.title}</p>
              <span className="text-xs t-muted">{formatDateTime(e.date)}</span>
            </div>
            {e.detail && <p className="text-sm t-body mt-0.5 break-words">{e.detail}</p>}
          </li>
        );
      })}
    </ol>
  );
}
