import React, { useState, useEffect } from "react";

const storageName = (key) => `collapsible-filters:${key}`;

const readStored = (storageKey, defaultOpen) => {
  if (!storageKey || typeof window === "undefined") return defaultOpen;
  try {
    const v = window.sessionStorage.getItem(storageName(storageKey));
    return v === null ? defaultOpen : v === "1";
  } catch {
    return defaultOpen;
  }
};

// Shared open/close state with sessionStorage persistence so a page can drive
// both an external toggle (e.g. a funnel icon button) and the panel together.
export function useCollapsibleFilters(storageKey, defaultOpen = true) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen));

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageName(storageKey), open ? "1" : "0");
    } catch {
      /* ignore storage failures */
    }
  }, [open, storageKey]);

  const toggle = () => setOpen((o) => !o);
  return { open, toggle, setOpen };
}

export default function CollapsibleFilters({
  children,
  label = "Filters",
  activeCount = 0,
  defaultOpen = true,
  storageKey,
  open: controlledOpen,
  onToggle,
  onClear,
  hideHeader = false,
}) {
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(() => readStored(storageKey, defaultOpen));
  const open = isControlled ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isControlled || !storageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageName(storageKey), internalOpen ? "1" : "0");
    } catch {
      /* ignore storage failures */
    }
  }, [internalOpen, isControlled, storageKey]);

  const toggle = () => {
    const next = !open;
    if (!isControlled) setInternalOpen(next);
    if (onToggle) onToggle(next);
  };

  const clearButton = onClear && activeCount > 0 && (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg transition-colors self-center ml-auto"
      style={{ color: "var(--c-muted)", background: "transparent", border: "1px solid var(--c-border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-text)"; e.currentTarget.style.background = "var(--c-surface2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-muted)"; e.currentTarget.style.background = "transparent"; }}
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Clear all
    </button>
  );

  // Header-less mode: the panel is toggled by an external control (funnel icon).
  // Render only the body when open; nothing when closed.
  if (hideHeader) {
    if (!open) return null;
    return (
      <div
        className="rounded-xl"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <div className="flex flex-wrap gap-3 px-4 py-3">
          {children}
          {clearButton}
        </div>
      </div>
    );
  }

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
        <span className="flex items-center gap-3">
          {onClear && activeCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onClear(); }
              }}
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer"
              style={{ color: "var(--c-muted)", background: "transparent", border: "1px solid var(--c-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-text)"; e.currentTarget.style.background = "var(--c-surface2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-muted)"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all
            </span>
          )}
          <svg
            className="w-4 h-4 transition-transform duration-200"
            style={{ color: "var(--c-muted)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 px-4 pb-3 pt-1" style={{ borderTop: "1px solid var(--c-border)" }}>
          {children}
        </div>
      )}
    </div>
  );
}
