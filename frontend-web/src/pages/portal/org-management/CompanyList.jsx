import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

function StatusBadge({ active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: active ? "rgba(22,163,74,0.12)" : "rgba(107,114,128,0.12)",
      color: active ? "#16a34a" : "#6b7280",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function CompanyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await portalOrgApi.listCompanies(subdomain, token, { page, page_size: pageSize, search: search || undefined, status: status || undefined });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load companies.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, page, search, status]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (co) => {
    setActing(co.id);
    try {
      if (co.is_active) await portalOrgApi.deactivateCompany(subdomain, token, co.id);
      else await portalOrgApi.activateCompany(subdomain, token, co.id);
      load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Action failed.");
    } finally { setActing(null); }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <OrgLayout title="Companies">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Companies</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Legal entities within your organization</p>
          </div>
          <Link to={`/portal/${subdomain}/org/companies/new`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: "var(--c-primary)", color: "#fff" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Company
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <input
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or code…"
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", minWidth: 220 }}
          />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm" style={{ color: "#ef4444" }}>{error}</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <p className="text-sm" style={{ color: "var(--c-muted)" }}>No companies yet. Add your first one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface-alt)", borderBottom: "1px solid var(--c-border)" }}>
                  {["Code", "Company Name", "City / Country", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                      style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((co, i) => (
                  <tr key={co.id}
                    style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none", background: "var(--c-surface)" }}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--c-surface-alt)", color: "var(--c-muted)" }}>
                        {co.company_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/portal/${subdomain}/org/companies/${co.id}/edit`}
                        className="font-medium hover:underline" style={{ color: "var(--c-primary)" }}>
                        {co.company_name}
                      </Link>
                      {co.legal_name && <div className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{co.legal_name}</div>}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--c-muted)" }}>
                      {[co.city, co.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge active={co.is_active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Link to={`/portal/${subdomain}/org/companies/${co.id}/edit`}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: "var(--c-surface-alt)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}>
                          Edit
                        </Link>
                        <button onClick={() => toggleStatus(co)} disabled={acting === co.id}
                          className="text-xs px-2.5 py-1 rounded-lg font-medium"
                          style={{ background: co.is_active ? "rgba(239,68,68,0.08)" : "rgba(22,163,74,0.08)",
                            color: co.is_active ? "#ef4444" : "#16a34a",
                            border: `1px solid ${co.is_active ? "rgba(239,68,68,0.2)" : "rgba(22,163,74,0.2)"}` }}>
                          {acting === co.id ? "…" : co.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm" style={{ color: "var(--c-muted)" }}>
            <span>{total} compan{total === 1 ? "y" : "ies"}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-border)" }}>← Prev</button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-border)" }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </OrgLayout>
  );
}
