import React from "react";
import { SCORE_COLORS } from "../constants";

export default function ScoreBadge({ score, label }) {
  const color = SCORE_COLORS[label] || "#64748b";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}40` }}
      >
        {label || "—"}
      </span>
      {score != null && (
        <span className="text-xs font-mono tabular-nums t-muted">{score}</span>
      )}
    </span>
  );
}
