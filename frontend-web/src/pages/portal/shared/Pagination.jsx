import React from "react";

export default function Pagination({ page, totalPages, onPage, total, pageSize }) {
  if (!totalPages || totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--c-border)" }}>
      <span className="t-muted" style={{ fontSize: 12 }}>
        {total != null ? `Showing ${from}–${to} of ${total}` : `Page ${page} of ${totalPages}`}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-secondary" style={{ padding: "5px 12px", opacity: page <= 1 ? 0.4 : 1 }}>←</button>
        {page > 2 && <button onClick={() => onPage(1)} className="btn-secondary" style={{ padding: "5px 10px" }}>1</button>}
        {page > 3 && <span className="t-muted" style={{ alignSelf: "center", padding: "0 2px" }}>…</span>}
        {[page - 1, page, page + 1].filter(p => p >= 1 && p <= totalPages).map(p => (
          <button key={p} onClick={() => onPage(p)} className={p === page ? "btn-primary" : "btn-secondary"} style={{ padding: "5px 10px", minWidth: 32 }}>{p}</button>
        ))}
        {page < totalPages - 2 && <span className="t-muted" style={{ alignSelf: "center", padding: "0 2px" }}>…</span>}
        {page < totalPages - 1 && <button onClick={() => onPage(totalPages)} className="btn-secondary" style={{ padding: "5px 10px" }}>{totalPages}</button>}
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="btn-secondary" style={{ padding: "5px 12px", opacity: page >= totalPages ? 0.4 : 1 }}>→</button>
      </div>
    </div>
  );
}
