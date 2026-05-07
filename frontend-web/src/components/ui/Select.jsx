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
        <label className="text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        {...props}
        className={[
          "w-full px-3 py-2.5 text-sm rounded-lg border bg-gray-900/60 text-gray-100",
          "focus:outline-none transition-all appearance-none cursor-pointer",
          error
            ? "border-red-500 focus:border-red-400"
            : "border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
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
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
