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
        <label className="text-sm font-medium t-body">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        {...props}
        className={[
          "input-field",
          error ? "border-red-500 focus:border-red-400" : "",
          props.disabled ? "opacity-50 cursor-not-allowed" : "",
          inputClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs t-muted">{hint}</p>}
    </div>
  );
}
