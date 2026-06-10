import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

const STATUS = {
  Active:   { bg: "rgba(34,197,94,0.1)",   color: "#4ade80" },
  Inactive: { bg: "rgba(100,116,139,0.15)", color: "var(--c-muted)" },
};

function StatusBadge({ active }) {
  const s = active ? STATUS.Active : STATUS.Inactive;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const PAGE_SIZE = 20;

export default function CompanyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await portalOrgApi.listCompanies(subdomain, token, {
        page, page_size: PAGE_SIZE, ...(statusFilter ? { status: statusFilter } : {}),
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch { setError("Failed to load companies."); }
    finally { setLoading(false); }
  }, [subdomain, token, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (co) => {
    setActing(co.id);
    try {
      if (co.is_active) await portalOrgApi.deactivateCompany(subdomain, token, co.id);
      else await portalOrgApi.activateCompany(subdomain, token, co.id);
      showToast(co.is_active ? "Company deactivated." : "Company activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <OrgLayout title="Companies">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Companies</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Legal entities within your organization — {total} total</p>
        </div>
        <Link to={`/portal/${subdomain}/org/companies/new`}
          style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
          + Add Company
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["", "Active", "Inactive"].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: statusFilter === s ? "var(--c-accent)" : "var(--c-surface)",
              color: statusFilter === s ? "#fff" : "var(--c-muted)",
              border: `1px solid ${statusFilter === s ? "var(--c-accent)" : "var(--c-border)"}`,
            }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No companies yet.{" "}
            <Link to={`/portal/${subdomain}/org/companies/new`} style={{ color: "var(--c-accent)", fontWeight: 500 }}>Add your first one.</Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["#", "Code", "Company Name", "Location", "Contact", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((co, i) => (
                <tr key={co.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                  <td style={{ padding: "12px 14px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      {co.company_code}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{co.company_name}</div>
                    {co.legal_name && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{co.legal_name}</div>}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                    {[co.city, co.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                    {co.email || co.phone || "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}><StatusBadge active={co.is_active} /></td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link to={`/portal/${subdomain}/org/companies/${co.id}/edit`}
                        style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, textDecoration: "none" }}>Edit</Link>
                      <button onClick={() => toggleStatus(co)} disabled={acting === co.id}
                        style={{ fontSize: 12, color: co.is_active ? "#f87171" : "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-muted)" }}>
          <span>Page {page} of {totalPages} — {total} companies</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>→</button>
          </div>
        </div>
      )}
    </OrgLayout>
  );
}
