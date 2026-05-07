import React from "react";

export default function Input({
  label,
  required,
  error,
  hint,
  className = "",
  inputClassName = "",
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
      <input
        {...props}
        className={[
          "w-full px-3 py-2.5 text-sm rounded-lg border bg-gray-900/60 text-gray-100",
          "placeholder-gray-500 focus:outline-none transition-all",
          error
            ? "border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500/40"
            : "border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30",
          props.disabled ? "opacity-50 cursor-not-allowed" : "",
          inputClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}
