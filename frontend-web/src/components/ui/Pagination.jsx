import React from "react";

export default function Pagination({ page, totalPages, onChange, pageSize, onPageSizeChange, total }) {
  const pages = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      {/* Left: total count */}
      <p className="text-xs text-gray-500">
        {total != null ? `${total} record${total !== 1 ? "s" : ""}` : ""}
      </p>

      {/* Center: page buttons */}
      <div className="flex items-center gap-1">
        <PageBtn disabled={page <= 1} onClick={() => onChange(page - 1)} label="←" />
        {pages[0] > 1 && (
          <>
            <PageBtn onClick={() => onChange(1)} label="1" active={false} />
            {pages[0] > 2 && <span className="px-1 text-gray-600">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageBtn key={p} onClick={() => onChange(p)} label={String(p)} active={p === page} />
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-600">…</span>}
            <PageBtn onClick={() => onChange(totalPages)} label={String(totalPages)} active={false} />
          </>
        )}
        <PageBtn disabled={page >= totalPages} onClick={() => onChange(page + 1)} label="→" />
      </div>

      {/* Right: page size */}
      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-400"
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      )}
    </div>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-w-[32px] h-8 px-2 rounded text-xs font-medium transition-colors",
        active
          ? "bg-indigo-600 text-white"
          : "text-gray-400 hover:text-white hover:bg-gray-800",
        disabled ? "opacity-30 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
