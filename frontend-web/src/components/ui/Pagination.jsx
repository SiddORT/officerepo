import React, { useState } from "react";

export default function Pagination({ page, totalPages, onChange, pageSize, onPageSizeChange, total }) {
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <p className="text-xs t-muted">
        {total != null ? `${total} record${total !== 1 ? "s" : ""}` : ""}
      </p>

      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)} label="←" />
        {pages[0] > 1 && (
          <>
            <PageBtn onClick={() => onChange(1)} label="1" active={false} />
            {pages[0] > 2 && <span className="px-1 t-muted text-xs">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageBtn key={p} onClick={() => onChange(p)} label={String(p)} active={p === page} />
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 t-muted text-xs">…</span>}
            <PageBtn onClick={() => onChange(totalPages)} label={String(totalPages)} active={false} />
          </>
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)} label="→" />
      </div>

      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-xs rounded px-2 py-1 t-muted"
          style={{
            backgroundColor: "var(--c-surface2)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text2)",
          }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      )}
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  const [hovered, setHovered] = useState(false);
  const isArrow = label === "←" || label === "→";

  const baseStyle = {
    minWidth: 32, height: 32, padding: "0 8px",
    borderRadius: 8, fontSize: 12, fontWeight: 600,
    transition: "all 0.18s ease",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "1px solid transparent",
  };

  const activeStyle = {
    background: "linear-gradient(135deg, #00aeec, #8b5cf6)",
    color: "#fff",
    boxShadow: "0 2px 12px rgba(0,174,236,0.35), 0 1px 4px rgba(139,92,246,0.22)",
    border: "1px solid transparent",
    transform: "translateY(-1px)",
  };

  const hoveredStyle = {
    background: "linear-gradient(135deg, rgba(0,174,236,0.12), rgba(139,92,246,0.10))",
    color: "#00aeec",
    border: "1px solid rgba(0,174,236,0.35)",
    boxShadow: "0 2px 8px rgba(0,174,236,0.15)",
    transform: "translateY(-1px)",
  };

  const idleStyle = {
    background: "var(--c-surface2)",
    color: "var(--c-text2)",
    border: "1px solid var(--c-border)",
  };

  let computedStyle = { ...baseStyle };
  if (active)               computedStyle = { ...baseStyle, ...activeStyle };
  else if (hovered && !disabled) computedStyle = { ...baseStyle, ...hoveredStyle };
  else                      computedStyle = { ...baseStyle, ...idleStyle };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={computedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}
