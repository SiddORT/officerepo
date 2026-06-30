import React, { useState } from "react";

const EDIT_PATH = "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH = "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";

function IconBtn({ onClick, title, danger, disabled, className = "", children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={className}
      style={{
        width: 30,
        height: 30,
        borderRadius: 7,
        border: "1px solid",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
        flexShrink: 0,
        opacity: disabled ? 0.35 : 1,
        background: disabled
          ? "var(--c-surface2)"
          : danger
            ? hovered ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)"
            : hovered ? "rgba(0,174,236,0.13)" : "var(--c-surface2)",
        borderColor: disabled
          ? "var(--c-border)"
          : danger
            ? hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"
            : hovered ? "rgba(0,174,236,0.45)" : "var(--c-border)",
        color: disabled
          ? "var(--c-muted)"
          : danger
            ? "#f87171"
            : hovered ? "#00aeec" : "var(--c-muted)",
      }}
    >
      {children}
    </button>
  );
}

export function EditIconBtn({ onClick, title = "Edit", disabled, className }) {
  return (
    <IconBtn onClick={onClick} title={title} disabled={disabled} className={className}>
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={EDIT_PATH} />
      </svg>
    </IconBtn>
  );
}

export function DeleteIconBtn({ onClick, title = "Delete", disabled, className }) {
  return (
    <IconBtn onClick={onClick} title={title} danger disabled={disabled} className={className}>
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TRASH_PATH} />
      </svg>
    </IconBtn>
  );
}
