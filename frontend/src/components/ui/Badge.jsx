import React from "react";

const VARIANTS = {
  active:    { bg: "rgba(16,185,129,0.12)",  text: "#10b981", border: "rgba(16,185,129,0.25)" },
  suspended: { bg: "rgba(239,68,68,0.12)",   text: "#ef4444", border: "rgba(239,68,68,0.25)" },
  inactive:  { bg: "rgba(100,116,139,0.12)", text: "#64748b", border: "rgba(100,116,139,0.25)" },
  trial:     { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  pending:   { bg: "rgba(59,130,246,0.12)",  text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  default:   { bg: "rgba(100,116,139,0.10)", text: "#64748b", border: "rgba(100,116,139,0.2)" },
};

export default function Badge({ status, label, variant, className = "" }) {
  const key = variant || status?.toLowerCase() || "default";
  const style = VARIANTS[key] || VARIANTS.default;
  const text = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` }}
    >
      {text}
    </span>
  );
}
