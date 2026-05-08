import React from "react";

export default function Table({ columns, data, loading, emptyMessage = "No records found.", onSort, sortKey, sortDir }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--c-border)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="t-table-header">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    "text-left px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wider whitespace-nowrap",
                    col.sortable ? "cursor-pointer select-none hover:t-accent transition-colors" : "",
                  ].join(" ")}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span style={{ color: "var(--c-accent)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center t-muted">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center t-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className="t-table-row transition-colors"
                  style={{ borderTop: "1px solid var(--c-border)" }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5 t-body">
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
