import React, { useState } from "react";

export default function Table({
  columns, data, loading, emptyMessage = "No records found.",
  onSort, sortKey, sortDir, className = "",
}) {
  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div
      className={`overflow-hidden rounded-xl ${className}`}
      style={{
        border: "1px solid var(--c-border)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,174,236,0.05)",
        position: "relative",
      }}
    >
      {/* Gradient top accent bar */}
      <div style={{
        height: 3,
        background: "linear-gradient(90deg, #00aeec 0%, #ff7a1a 100%)",
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 1,
      }} />

      <div className="overflow-x-auto" style={{ paddingTop: 3 }}>
        <table className="w-full text-sm">

          {/* Header */}
          <thead>
            <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
              {columns.map((col, ci) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && onSort?.(col.key)}
                  style={{ width: col.width }}
                  className={[
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap select-none",
                    col.sortable ? "cursor-pointer" : "",
                  ].join(" ")}
                >
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={
                      col.sortable && sortKey === col.key
                        ? { background: "linear-gradient(135deg,#00aeec,#ff7a1a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                        : { color: "var(--c-muted)" }
                    }
                  >
                    {col.label}
                    {col.sortable && (
                      <span style={{
                        opacity: sortKey === col.key ? 1 : 0.3,
                        fontSize: 10,
                        color: sortKey === col.key ? "#00aeec" : "var(--c-muted)",
                      }}>
                        {sortKey === col.key && sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "conic-gradient(from 0deg, #00aeec, #ff7a1a, transparent)",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <span className="text-xs t-muted tracking-wide">Loading data…</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: "var(--c-surface2)",
                      border: "1px solid var(--c-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-muted)" }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium t-body">{emptyMessage}</p>
                      <p className="text-xs t-muted mt-0.5">Nothing to display yet</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderTop: "1px solid var(--c-border)",
                    background: hoveredRow === i
                      ? "linear-gradient(90deg, rgba(0,174,236,0.04) 0%, rgba(255,122,26,0.03) 100%)"
                      : "transparent",
                    transition: "background 0.15s ease",
                    position: "relative",
                  }}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.key}
                      className="px-4 py-3.5 t-body"
                      style={{
                        borderLeft: ci === 0 && hoveredRow === i
                          ? "2px solid #00aeec"
                          : ci === 0 ? "2px solid transparent" : undefined,
                        transition: "border-color 0.15s ease",
                      }}
                    >
                      {col.render ? col.render(row[col.key], row, i) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
