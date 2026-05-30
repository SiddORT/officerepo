import React from "react";

// Compact funnel icon button that toggles a filter panel. Shows an active-filter
// count badge when one or more filters are applied.
export default function FilterToggleButton({ active = false, count = 0, onClick, title = "Filters" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={title}
      title={title}
      className="relative inline-flex items-center justify-center rounded-lg transition-colors flex-shrink-0"
      style={{
        width: 40,
        height: 40,
        background: active ? "var(--c-surface2)" : "var(--c-surface)",
        border: "1px solid var(--c-border)",
        color: active || count > 0 ? "var(--c-accent)" : "var(--c-muted)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-surface2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = active ? "var(--c-surface2)" : "var(--c-surface)")}
    >
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-8.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 text-[10px] font-medium tabular-nums leading-none flex items-center justify-center rounded-full"
          style={{ minWidth: 16, height: 16, padding: "0 4px", background: "var(--c-accent)", color: "#fff" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
