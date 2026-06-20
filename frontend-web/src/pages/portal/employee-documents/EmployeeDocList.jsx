import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import StatCard from "../shared/StatCard";

const PAGE_SIZE = 20;

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
    { label: "Total", value: stats.total, color: "info" },
    { label: "Pending Verification", value: stats.pending_verification, color: "warning" },
    { label: "Expiring Soon", value: stats.expiring_soon, color: "warning" },
    { label: "Expired", value: stats.expired, color: "danger" },
    { label: "Verified", value: stats.verified, color: "active" },
    { label: "Rejected", value: stats.rejected, color: "danger" },
  ] : [];

  return (
    <PortalLayout title="Employee Documents">
      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 24 }}>
          {statCards.map(c => (
            <StatCard key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Employee Documents"
        subtitle={`${total} documents total`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/types`)} className="btn-secondary">Manage Types</button>
            <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/new`)} className="btn-primary">+ Upload Document</button>
          </div>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search employee, doc type, number…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input-field" style={{ minWidth: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="portal-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Sr.</th>
                <th>Employee</th>
                <th>Document Type</th>
                <th>Doc Number</th>
                <th>Category</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Version</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--c-muted)", padding: 40 }}>
                  No documents found. Upload the first document to get started.
                </td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}`)}>
                  <td style={{ textAlign: "center", color: "var(--c-muted)", fontSize: 12 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.employee_name || "—"}</div>
                    {r.employee_code && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.employee_code}</div>}
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.document_type_name || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{r.document_number || "—"}</td>
                  <td style={{ fontSize: 12 }}>{r.category || "—"}</td>
                  <td>
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
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>
                    {r.version_number > 0 ? `v${r.version_number}` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}`)}
                      className="t-accent" style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>View</button>
                    <button onClick={() => navigate(`/portal/${subdomain}/employee-documents/${r.id}/edit`)}
                      className="t-body" style={{background:"none",border:"none",cursor:"pointer",fontSize:12,marginLeft:10}}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </PortalLayout>
  );
}
