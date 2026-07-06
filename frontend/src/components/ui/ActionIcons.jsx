import React, { useState } from "react";

const EDIT_PATH = "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z";
const TRASH_PATH = "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";
const EYE_PATH = "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z";
const POWER_PATH = "M12 2v10m6.364-7.364a9 9 0 11-12.728 0";

const TONE_COLORS = {
  default: { rest: "rgba(0,174,236,0)", hover: "rgba(0,174,236,0.13)", borderRest: "var(--c-border)", borderHover: "rgba(0,174,236,0.45)", text: "var(--c-muted)", textHover: "#00aeec" },
  danger: { rest: "rgba(239,68,68,0.06)", hover: "rgba(239,68,68,0.15)", borderRest: "rgba(239,68,68,0.2)", borderHover: "rgba(239,68,68,0.5)", text: "#f87171", textHover: "#f87171" },
  success: { rest: "rgba(34,197,94,0.06)", hover: "rgba(34,197,94,0.15)", borderRest: "rgba(34,197,94,0.2)", borderHover: "rgba(34,197,94,0.5)", text: "#4ade80", textHover: "#4ade80" },
};

function IconBtn({ onClick, title, danger, tone, disabled, className = "", children }) {
  const [hovered, setHovered] = useState(false);
  const t = TONE_COLORS[tone || (danger ? "danger" : "default")];
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
        background: disabled ? "var(--c-surface2)" : hovered ? t.hover : (tone && tone !== "default" ? t.rest : "var(--c-surface2)"),
        borderColor: disabled ? "var(--c-border)" : hovered ? t.borderHover : t.borderRest,
        color: disabled ? "var(--c-muted)" : hovered ? t.textHover : t.text,
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

export function ViewIconBtn({ onClick, title = "View", disabled, className }) {
  return (
    <IconBtn onClick={onClick} title={title} disabled={disabled} className={className}>
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={EYE_PATH} />
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth={2} />
      </svg>
    </IconBtn>
  );
}

export function ToggleStatusIconBtn({ isActive, onClick, title, disabled, className }) {
  return (
    <IconBtn
      onClick={onClick}
      title={title || (isActive ? "Deactivate" : "Activate")}
      tone={isActive ? "danger" : "success"}
      disabled={disabled}
      className={className}
    >
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={POWER_PATH} />
      </svg>
    </IconBtn>
  );
}
