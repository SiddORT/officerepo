import React from "react";

export default function Textarea({
  label,
  required,
  error,
  hint,
  value = "",
  maxLength,
  showCount = false,
  rows = 5,
  className = "",
  textareaClassName = "",
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
      <textarea
        {...props}
        value={value}
        rows={rows}
        maxLength={maxLength}
        className={[
          "input-field resize-y",
          error ? "border-red-500 focus:border-red-400" : "",
          props.disabled ? "opacity-50 cursor-not-allowed" : "",
          textareaClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {error && <p className="text-xs text-red-400">{error}</p>}
          {hint && !error && <p className="text-xs t-muted">{hint}</p>}
        </div>
        {showCount && maxLength && (
          <span className="text-xs t-muted shrink-0">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
