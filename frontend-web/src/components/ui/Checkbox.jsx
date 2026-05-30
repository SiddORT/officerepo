import React from "react";

/**
 * Reusable checkbox with label, required asterisk, inline error and optional
 * rich label content (e.g. an embedded Privacy Policy link via `children`).
 */
export default function Checkbox({
  label,
  children,
  required,
  error,
  hint,
  className = "",
  id,
  ...props
}) {
  const inputId = id || props.name || undefined;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label
        htmlFor={inputId}
        className="flex items-start gap-2 cursor-pointer select-none"
      >
        <input
          id={inputId}
          type="checkbox"
          {...props}
          className={[
            "mt-0.5 h-4 w-4 shrink-0 rounded cursor-pointer accent-cyan-500",
            error ? "ring-1 ring-red-500 rounded" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <span className="text-sm t-body leading-snug">
          {children || label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      {error && <p className="text-xs text-red-400 ml-6">{error}</p>}
      {hint && !error && <p className="text-xs t-muted ml-6">{hint}</p>}
    </div>
  );
}
