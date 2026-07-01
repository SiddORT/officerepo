import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const PAGE_SIZE = 20;

export default function CompanyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await portalOrgApi.listCompanies(subdomain, token, {
        page, page_size: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch { setError("Failed to load companies."); }
    finally { setLoading(false); }
  }, [subdomain, token, page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (co) => {
    if (co.is_active) { setConfirmTarget(co); return; }
    setActing(co.id);
    try {
      await portalOrgApi.activateCompany(subdomain, token, co.id);
      showToast("Company activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const confirmDeactivate = async () => {
    const co = confirmTarget;
    if (!co) return;
    setActing(co.id);
    try {
      await portalOrgApi.deactivateCompany(subdomain, token, co.id);
      showToast("Company deactivated.");
      setConfirmTarget(null);
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
      <PageHeader
        title="Companies"
        subtitle={`Legal entities within your organization — ${total} total`}
        actions={
          <Link to={`/portal/${subdomain}/org/companies/new`} className="btn-primary">
            + Add Company
          </Link>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search companies…"
          className="input-field"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field"
          style={{ width: "auto" }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No companies yet.{" "}
            <Link to={`/portal/${subdomain}/org/companies/new`} className="t-accent" style={{ fontWeight: 500 }}>Add your first one.</Link>
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Code", "Company Name", "Location", "Contact", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((co, i) => (
                <tr key={co.id}>
                  <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      {co.company_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{co.company_name}</div>
                    {co.legal_name && <div className="t-muted" style={{ fontSize: 11, marginTop: 1 }}>{co.legal_name}</div>}
                  </td>
                  <td className="t-muted" style={{ fontSize: 12 }}>
                    {[co.city, co.country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="t-muted" style={{ fontSize: 12 }}>
                    {co.email || co.phone || "—"}
                  </td>
                  <td><Badge status={co.is_active ? "Active" : "Inactive"} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                      <Link to={`/portal/${subdomain}/org/companies/${co.id}`}
                        className="t-accent" style={{ fontSize: 12, fontWeight: 500, textDecoration: "none" }}>View</Link>
                      <Link to={`/portal/${subdomain}/org/companies/${co.id}/edit`}
                        className="t-accent" style={{ fontSize: 12, fontWeight: 500, textDecoration: "none" }}>Edit</Link>
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
      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Deactivate Company"
        message={`Are you sure you want to deactivate "${confirmTarget?.company_name}"? This may affect linked departments, designations and branches.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={acting === confirmTarget?.id}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />
    </OrgLayout>
  );
}
