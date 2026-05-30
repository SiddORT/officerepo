import React, { useState, useEffect } from "react";

export default function CollapsibleFilters({
  children,
  label = "Filters",
  activeCount = 0,
  defaultOpen = true,
  storageKey,
  open: controlledOpen,
  onToggle,
}) {
  const isControlled = controlledOpen !== undefined;

  const readStored = () => {
    if (!storageKey || typeof window === "undefined") return defaultOpen;
    try {
      const v = window.sessionStorage.getItem(`collapsible-filters:${storageKey}`);
      return v === null ? defaultOpen : v === "1";
    } catch {
      return defaultOpen;
    }
  };

  const [internalOpen, setInternalOpen] = useState(readStored);
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled || !storageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(`collapsible-filters:${storageKey}`, internalOpen ? "1" : "0");
    } catch {
      /* ignore storage failures */
    }
  }, [internalOpen, isControlled, storageKey]);

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    if (onToggle) onToggle(next);
  };

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-surface2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: "var(--c-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-8.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-sm font-semibold t-heading">{label}</span>
          {activeCount > 0 && (
            <span
              className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-full leading-none"
              style={{ background: "var(--c-accent)", color: "#fff" }}
            >
              {activeCount}
            </span>
          )}
        </span>
        <svg
          className="w-4 h-4 transition-transform duration-200"
          style={{ color: "var(--c-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 px-4 pb-3 pt-1" style={{ borderTop: "1px solid var(--c-border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
