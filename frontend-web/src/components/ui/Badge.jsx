import React from "react";

const VARIANTS = {
  active:    "bg-emerald-900/40 text-emerald-400 border-emerald-700/30",
  suspended: "bg-red-900/40    text-red-400    border-red-700/30",
  inactive:  "bg-gray-700/60   text-gray-400   border-gray-600/30",
  trial:     "bg-amber-900/40  text-amber-400  border-amber-700/30",
  pending:   "bg-blue-900/40   text-blue-400   border-blue-700/30",
  default:   "bg-gray-800      text-gray-300   border-gray-700",
};

export default function Badge({ status, label, variant, className = "" }) {
  const key = variant || status?.toLowerCase() || "default";
  const cls = VARIANTS[key] || VARIANTS.default;
  const text = label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : "");
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls} ${className}`}>
      {text}
    </span>
  );
}
