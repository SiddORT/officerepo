import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box" };
const hdr = { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface-alt,var(--c-surface))", whiteSpace: "nowrap" };
const cell = { padding: "10px 12px", borderBottom: "1px solid var(--c-border)", fontSize: 13, verticalAlign: "middle" };

const PAGE_SIZE = 20;

const STATUS_COLORS = {
  "Pending Upload": { bg: "rgba(251,191,36,0.12)", color: "#f59e0b" },
  "Uploaded":       { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  "Under Review":   { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  "Verified":       { bg: "rgba(34,197,94,0.12)",  color: "#22c55e" },
  "Rejected":       { bg: "rgba(239,68,68,0.12)",  color: "#ef4444" },
  "Expired":        { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "rgba(156,163,175,0.12)", color: "#9ca3af" };
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>{status}</span>;
}

export default function EmployeeDocList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);

  const load = () => {
    setLoading(true);
    portalEmpDocApi.list(subdomain, token, { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined, category: category || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    portalEmpDocApi.metaOptions(subdomain, token).then(r => { const d = r.data?.data || {}; setStatuses(d.statuses || []); setCategories(d.categories || []); }).catch(() => {});
    portalEmpDocApi.dashboard(subdomain, token).then(r => setStats(r.data?.data || null)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [page, search, status, category]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statCards = stats ? [
    { label: "Total", value: stats.total, color: "#818cf8" },
    { label: "Pending Verification", value: stats.pending_verification, color: "#60a5fa" },
    { label: "Expiring Soon", value: stats.expiring_soon, color: "#f59e0b" },
    { label: "Expired", value: stats.expired, color: "#ef4444" },
    { label: "Verified", value: stats.verified, color: "#22c55e" },
    { label: "Rejected", value: stats.rejected, color: "#f87171" },
  ] : [];

  return (
    <PortalLayout title="Employee Documents">
      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
          {statCards.map(c => (
            <div key={c.label} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Employee Documents</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{total} documents total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/types`)} style={{ padding: "8px 14px", borderRadius: 7, fontWeight: 600, fontSize: 12, background: "none", color: "var(--c-accent)", border: "1px solid var(--c-accent)", cursor: "pointer" }}>Manage Types</button>
          <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/new`)} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>+ Upload Document</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search employee, doc type, number…" style={{ ...inp, flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={{ ...hdr, width: 40 }}>Sr.</th>
              <th style={hdr}>Employee</th>
              <th style={hdr}>Document Type</th>
              <th style={hdr}>Doc Number</th>
              <th style={hdr}>Category</th>
              <th style={hdr}>Expiry</th>
              <th style={hdr}>Status</th>
              <th style={hdr}>Version</th>
              <th style={{ ...hdr, textAlign: "right" }}>Actions</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 40 }}>
                  No documents found. Upload the first document to get started.
                </td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}`)} style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface-alt,rgba(255,255,255,0.03))"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ ...cell, textAlign: "center", color: "var(--c-muted)", fontSize: 12 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={cell}>
                    <div style={{ fontWeight: 600 }}>{r.employee_name || "—"}</div>
                    {r.employee_code && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.employee_code}</div>}
                  </td>
                  <td style={{ ...cell, fontWeight: 500 }}>{r.document_type_name || "—"}</td>
                  <td style={{ ...cell, fontSize: 12, color: "var(--c-muted)" }}>{r.document_number || "—"}</td>
                  <td style={{ ...cell, fontSize: 12 }}>{r.category || "—"}</td>
                  <td style={cell}>
                    {r.expiry_date ? (
                      <div>
                        <div style={{ fontSize: 12 }}>{r.expiry_date}</div>
                        {r.days_remaining != null && (
                          <div style={{ fontSize: 11, color: r.days_remaining < 0 ? "#ef4444" : r.days_remaining < 30 ? "#f59e0b" : "var(--c-muted)" }}>
                            {r.days_remaining < 0 ? `${Math.abs(r.days_remaining)}d overdue` : `${r.days_remaining}d left`}
                          </div>
                        )}
                      </div>
                    ) : <span style={{ color: "var(--c-muted)" }}>—</span>}
                  </td>
                  <td style={cell}><StatusBadge status={r.status} /></td>
                  <td style={{ ...cell, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>
                    {r.version_number > 0 ? `v${r.version_number}` : "—"}
                  </td>
                  <td style={{ ...cell, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}`)}
                      style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View</button>
                    <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}/edit`)}
                      style={{ background: "none", border: "none", color: "var(--c-muted)", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderTop: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>←</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
