import React, { useEffect } from "react";

export default function Modal({ open, onClose, title, children, size = "md", footer }) {
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", full: "max-w-6xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`relative w-full ${widths[size] || widths.md} rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}
        style={{
          backgroundColor: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          boxShadow: "var(--c-shadow-lg)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--c-border)" }}
        >
          <h3 className="text-base font-semibold t-heading">{title}</h3>
          <button
            onClick={onClose}
            className="t-muted hover:t-body transition-colors p-1 rounded topbar-btn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 py-4 flex items-center justify-end gap-3"
            style={{ borderTop: "1px solid var(--c-border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
