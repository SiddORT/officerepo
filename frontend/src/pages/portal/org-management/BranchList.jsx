import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { ViewIconBtn, EditIconBtn, ToggleStatusIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";

export default function BranchList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [companies, setCompanies] = useState([]);

  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterCompany) params.company_id = filterCompany;
      const r = await portalOrgApi.listBranches(subdomain, token, params);
      const d = r.data.data || {};
      setRows(d.data || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load branches.");
    } finally { setLoading(false); }
  }, [subdomain, token, page, search, filterStatus, filterCompany]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (b) => {
    if (b.is_active) { setConfirmTarget(b); return; }
    setActionLoading(b.id);
    try {
      await portalOrgApi.activateBranch(subdomain, token, b.id);
      showToast("Branch activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActionLoading(null); }
  };

  const confirmDeactivate = async () => {
    const b = confirmTarget;
    if (!b) return;
    setActionLoading(b.id);
    try {
      await portalOrgApi.deactivateBranch(subdomain, token, b.id);
      showToast("Branch deactivated.");
      setConfirmTarget(null);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActionLoading(null); }
  };

  const confirmDelete = async () => {
    const b = deleteTarget;
    if (!b) return;
    setActionLoading(b.id);
    try {
      await portalOrgApi.deleteBranch(subdomain, token, b.id);
      showToast("Branch deleted.");
      setDeleteTarget(null);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Delete failed.", false); }
    finally { setActionLoading(null); }
  };

  return (
    <OrgLayout title="Branches">
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: toast.ok ? "#10b981" : "#f87171", border: `1px solid ${toast.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>{toast.msg}</div>
      )}

      {/* Header */}
      <PageHeader
        title="Branches"
        subtitle={`${total} total records`}
        actions={
          <button onClick={() => navigate(`/portal/${subdomain}/org/branches/new`)} className="btn-primary">+ Add Branch</button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search branch name or code…"
          className="input-field" style={{ flex: 1, minWidth: 180 }} />
        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Table */}
      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>No branches found</div>
            <div className="t-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {search || filterStatus || filterCompany ? "Try adjusting your filters." : "Add your first branch to get started."}
            </div>
            {!search && !filterStatus && !filterCompany && (
              <button onClick={() => navigate(`/portal/${subdomain}/org/branches/new`)} className="btn-primary">+ Add Branch</button>
            )}
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Branch", "Type", "Company", "Location", "Employees", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => {
                const isExpanded = expandedId === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <tr style={{ opacity: b.is_active ? 1 : 0.55 }}>
                      <td style={{ textAlign: "center", color: "var(--c-muted)", fontSize: 12 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{b.branch_name}</div>
                        <div style={{ fontSize: 11, color: "var(--c-muted)", fontFamily: "monospace", marginTop: 2 }}>{b.branch_code}</div>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--c-muted)" }}>{b.branch_type || "—"}</td>
                      <td style={{ fontSize: 13, color: "var(--c-muted)" }}>{b.company_name || "—"}</td>
                      <td style={{ fontSize: 13 }}>
                        {[b.city, b.state, b.country].filter(Boolean).join(", ") || <span style={{ color: "var(--c-muted)", opacity: 0.5 }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <span style={{ color: "var(--c-text)" }}>{b.active_employees}</span>
                        <span style={{ color: "var(--c-muted)", fontSize: 11 }}> / {b.total_employees}</span>
                      </td>
                      <td><Badge status={b.is_active ? "Active" : "Inactive"} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <ViewIconBtn
                            onClick={() => setExpandedId(isExpanded ? null : b.id)}
                            title={isExpanded ? "Close details" : "View details"} />
                          <EditIconBtn onClick={() => navigate(`/portal/${subdomain}/org/branches/${b.id}/edit`)} title="Edit branch" />
                          <ToggleStatusIconBtn isActive={b.is_active} onClick={() => handleToggle(b)} disabled={actionLoading === b.id}
                            title={b.is_active ? "Deactivate branch" : "Activate branch"} />
                          {!b.is_active && (
                            <DeleteIconBtn onClick={() => setDeleteTarget(b)} disabled={actionLoading === b.id} title="Delete branch" />
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: "var(--c-surface2)" }}>
                        <td colSpan={8} style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)" }}>
                          <div style={{ display: "grid", gap: 20 }}>
                            {/* Address */}
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-accent)", marginBottom: 10 }}>Address</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                                {[
                                  ["Postal Code", b.postal_code],
                                  ["Address Line 1", b.address_line_1],
                                  ["Address Line 2", b.address_line_2],
                                  ["City", b.city],
                                  ["District", b.district],
                                  ["State", b.state],
                                  ["Country", b.country],
                                ].map(([label, val]) => (
                                  <div key={label}>
                                    <div className="portal-form-label" style={{ marginBottom: 3 }}>{label}</div>
                                    <div style={{ fontSize: 13, color: val ? "var(--c-text)" : "var(--c-muted)", opacity: val ? 1 : 0.4 }}>{val || "—"}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Contact */}
                            {(b.phone || b.email || b.branch_manager || b.landline) && (
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-accent)", marginBottom: 10 }}>Contact</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                                  {b.branch_manager && <div><span className="portal-form-label">Manager: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.branch_manager}</span></div>}
                                  {b.phone && <div><span className="portal-form-label">Mobile: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.phone_country_code ? `${b.phone_country_code} ` : ""}{b.phone}</span></div>}
                                  {b.landline && <div><span className="portal-form-label">Landline: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.landline_country_code ? `${b.landline_country_code} ` : ""}{b.landline}</span></div>}
                                  {b.email && <div><span className="portal-form-label">Email: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.email}</span></div>}
                                </div>
                              </div>
                            )}
                            {/* GST */}
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-accent)", marginBottom: 10 }}>GST & Tax</div>
                              {b.gst_registered ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                                  {b.gstin && <div><span className="portal-form-label">GSTIN: </span><span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--c-text)" }}>{b.gstin}</span></div>}
                                  {b.gst_registration_date && <div><span className="portal-form-label">Reg. Date: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{String(b.gst_registration_date).slice(0, 10)}</span></div>}
                                  {b.gst_jurisdiction && <div><span className="portal-form-label">Jurisdiction: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.gst_jurisdiction}</span></div>}
                                  {b.state_code && <div><span className="portal-form-label">State Code: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.state_code}</span></div>}
                                  {b.has_gst_certificate && <div><span className="portal-form-label">Certificate: </span><span className="badge-success" style={{ fontSize: 11 }}>✓ Uploaded</span></div>}
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--c-muted)", opacity: 0.6 }}>Not GST registered</span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPage={setPage} total={total} pageSize={PAGE_SIZE} />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Deactivate Branch"
        message={`Are you sure you want to deactivate "${confirmTarget?.branch_name}"? Employees assigned to it will remain but the branch will be marked inactive.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={actionLoading === confirmTarget?.id}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Branch"
        message={`Permanently delete "${deleteTarget?.branch_name}"? This cannot be undone. Only possible when it has no employees assigned.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={actionLoading === deleteTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OrgLayout>
  );
}
