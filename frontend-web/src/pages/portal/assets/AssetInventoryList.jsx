import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  "Available":         { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  "Assigned":          { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  "Draft":             { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
  "Under Maintenance": { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
  "Lost":              { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Damaged":           { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Retired":           { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
  "Disposed":          { bg: "rgba(148,163,184,0.15)",color: "#94a3b8" },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return (
    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

function WarrantyBadge({ days }) {
  if (days === null || days === undefined) return <span style={{ color: "var(--c-muted)", fontSize: 11 }}>—</span>;
  if (days < 0) return <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Expired</span>;
  if (days <= 30) return <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{days}d left</span>;
  return <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{days}d left</span>;
}

const inp = { padding: "7px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 12, color: "var(--c-text)" };

export default function AssetInventoryList() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    portalAssetApi.metaOptions(subdomain, token).then(r => {
      setCategories(r.data?.data?.categories || []);
    }).catch(() => {});
    portalAssetApi.inventoryMeta(subdomain, token).then(r => {
      setStatuses(r.data?.data?.statuses || []);
    }).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetApi.listInventory(subdomain, token, {
      page, page_size: PAGE_SIZE, search: search || undefined,
      status: status || undefined, category_id: categoryId || undefined,
    }).then(r => {
      const d = r.data?.data || {};
      setRows(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subdomain, token, page, search, status, categoryId]);

  useEffect(() => { load(); }, [load]);

  const cell = { padding: "10px 12px", fontSize: 12, color: "var(--c-text)", borderBottom: "1px solid var(--c-border)", verticalAlign: "middle" };
  const hdr  = { ...cell, fontSize: 10, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", background: "var(--c-surface-alt,var(--c-surface))", borderBottom: "2px solid var(--c-border)" };

  return (
    <AssetLayout title="Asset Inventory">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Asset Inventory</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{total} assets total</p>
        </div>
        <button
          onClick={() => navigate(`/portal/${subdomain}/assets/inventory/new`)}
          style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
          + Add Asset
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by number, name, serial…" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={hdr}>Asset #</th>
                <th style={hdr}>Name</th>
                <th style={hdr}>Category</th>
                <th style={hdr}>Branch</th>
                <th style={hdr}>Assigned To</th>
                <th style={hdr}>Status</th>
                <th style={hdr}>Warranty</th>
                <th style={{ ...hdr, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 40 }}>
                  No assets found. Add your first asset to get started.
                </td></tr>
              ) : rows.map(r => (
                <tr key={r.id} style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface-alt,rgba(255,255,255,0.03))"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={cell}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "var(--c-accent)" }}>{r.asset_number}</span>
                  </td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.asset_name}</div>
                    {r.brand && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.brand}{r.model_number ? ` · ${r.model_number}` : ""}</div>}
                  </td>
                  <td style={cell}>
                    <div style={{ fontSize: 12 }}>{r.category_name || "—"}</div>
                    {r.sub_category_name && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.sub_category_name}</div>}
                  </td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.branch_name || "—"}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.assigned_employee_name || <span style={{ color: "var(--c-muted)" }}>—</span>}</td>
                  <td style={cell}><StatusBadge status={r.status} /></td>
                  <td style={cell}>
                    {r.warranty_available ? <WarrantyBadge days={r.warranty_days_remaining} /> : <span style={{ color: "var(--c-muted)", fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={() => navigate(`/portal/${subdomain}/assets/inventory/${r.id}`)}
                        style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text2,var(--c-muted))" }}>
                        View
                      </button>
                      <button onClick={() => navigate(`/portal/${subdomain}/assets/inventory/${r.id}/edit`)}
                        style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-accent)" }}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{total} total · page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page === 1 ? "not-allowed" : "pointer", border: "1px solid var(--c-border)", background: "transparent", color: page === 1 ? "var(--c-muted)" : "var(--c-text)" }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, cursor: page === totalPages ? "not-allowed" : "pointer", border: "1px solid var(--c-border)", background: "transparent", color: page === totalPages ? "var(--c-muted)" : "var(--c-text)" }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AssetLayout>
  );
}
