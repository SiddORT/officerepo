import React from "react";

export default function Select({
  label,
  required,
  error,
  hint,
  options = [],
  placeholder = "Select...",
  className = "",
  selectClassName = "",
  ...props
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-sm font-medium t-body">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={[
          "input-field appearance-none cursor-pointer",
          props.disabled ? "opacity-50 cursor-not-allowed" : "",
          selectClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs t-muted">{hint}</p>}
    </div>
  );
}
