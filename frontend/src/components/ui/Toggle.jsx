import React from "react";

export default function Toggle({ checked, onChange, label, disabled = false, size = "md" }) {
  const sizes = {
    sm: { track: "h-5 w-9",  thumb: "h-3.5 w-3.5", on: "translate-x-4", off: "translate-x-0.5" },
    md: { track: "h-6 w-11", thumb: "h-4 w-4",      on: "translate-x-6", off: "translate-x-1" },
    lg: { track: "h-7 w-14", thumb: "h-5 w-5",      on: "translate-x-7", off: "translate-x-1" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <label className={`flex items-center gap-2.5 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex flex-shrink-0 ${s.track} rounded-full transition-colors duration-200 ${disabled ? "cursor-not-allowed" : ""}`}
        style={{ backgroundColor: checked ? "var(--c-accent)" : "var(--c-border)" }}
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200 ${s.thumb} ${checked ? s.on : s.off}`}
        />
      </button>
      {label && <span className="text-sm t-body select-none">{label}</span>}
    </label>
  );
}
