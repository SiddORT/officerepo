import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import PhoneInput from "../../../components/ui/PhoneInput";
import usePincodeLookup from "../../../hooks/usePincodeLookup";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

function genBranchCode(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  const head = words[0].slice(0, 3).toUpperCase();
  const tail = words.slice(1).map(w => w[0].toUpperCase()).join("");
  return `${head}-${tail}`;
}

function BranchModal({ subdomain, token, companies, editBranch, onClose, onSaved }) {
  const isEdit = !!editBranch;
  const [form, setForm] = useState({
    company_id:        editBranch?.company_id         || (companies[0]?.id || ""),
    branch_code:       editBranch?.branch_code         || "",
    branch_name:       editBranch?.branch_name         || "",
    branch_type:       editBranch?.branch_type         || "",
    postal_code:       editBranch?.postal_code         || "",
    address_line1:     editBranch?.address_line_1      || "",
    address_line2:     editBranch?.address_line_2      || "",
    city:              editBranch?.city                || "",
    district:          editBranch?.district            || "",
    state:             editBranch?.state               || "",
    country:           editBranch?.country             || "",
    phone:             editBranch?.phone               || "",
    phone_country_code: editBranch?.phone_country_code || "+91",
    email:             editBranch?.email               || "",
    description:       editBranch?.description         || "",
  });
  const [autoCode, setAutoCode] = useState(!isEdit && !editBranch?.branch_code);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const { lookup } = usePincodeLookup();

  const handlePincodeChange = async (e) => {
    const raw = e.target.value;
    set("postal_code", raw);
    const code = raw.trim();
    if (code.length < 5) return;
    const cc = form.country || "IN";
    const result = await lookup(code, cc);
    if (!result) return;
    setForm(f => ({
      ...f,
      city:     result.city     || f.city,
      district: result.district || f.district,
      state:    result.state    || f.state,
      country:  result.country  || f.country,
    }));
  };

  const handleSave = async () => {
    if (!form.branch_name.trim()) { setError("Branch name is required."); return; }
    if (!form.company_id) { setError("Please select a company."); return; }
    setSaving(true); setError("");
    try {
      const { address_line1, address_line2, ...rest } = form;
      const payload = { ...rest, address_line_1: address_line1, address_line_2: address_line2 };
      Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
      payload.branch_name = form.branch_name;
      payload.company_id = form.company_id;
      if (isEdit) await portalOrgApi.updateBranch(subdomain, token, editBranch.id, payload);
      else await portalOrgApi.createBranch(subdomain, token, payload);
      onSaved();
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const BRANCH_TYPES = ["Head Office", "Corporate Office", "Regional Office", "Branch Office", "Warehouse", "Project Site"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div className="portal-form-card" style={{ width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ paddingBottom: 10, borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--c-text)", fontSize: 15 }}>{isEdit ? "Edit Branch" : "Add Branch"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "14px 0", display: "grid", gap: 14 }}>
          {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13 }}>{error}</div>}
          <div>
            <label className="portal-form-label">Company</label>
            <select value={form.company_id} onChange={e => set("company_id", e.target.value)} className="input-field">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Branch Name</label>
              <input
                value={form.branch_name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    branch_name: name,
                    branch_code: autoCode ? genBranchCode(name) : f.branch_code,
                  }));
                }}
                className="input-field"
                placeholder="Mumbai Head Office"
              />
            </div>
            <div>
              <label className="portal-form-label">
                Branch Code
                {autoCode && !isEdit && (
                  <span style={{ fontSize: 10, color: "var(--c-accent)", marginLeft: 6, fontWeight: 400 }}>auto</span>
                )}
              </label>
              <input
                value={form.branch_code}
                onChange={e => {
                  setAutoCode(false);
                  set("branch_code", e.target.value.toUpperCase());
                }}
                className="input-field"
                placeholder="MUM-HO"
                style={{ textTransform: "uppercase" }}
              />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Branch Type</label>
            <select value={form.branch_type} onChange={e => set("branch_type", e.target.value)} className="input-field">
              <option value="">Select type…</option>
              {BRANCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Postal Code</label><input value={form.postal_code} onChange={handlePincodeChange} className="input-field" placeholder="400001" /></div>
          </div>
          <div><label className="portal-form-label">Address Line 1</label><input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} className="input-field" placeholder="123 Business Park" /></div>
          <div><label className="portal-form-label">Address Line 2</label><input value={form.address_line2} onChange={e => set("address_line2", e.target.value)} className="input-field" placeholder="Floor 5, Tower B" /></div>
          <div className="portal-form-row" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
            <div><label className="portal-form-label">City</label><input value={form.city} onChange={e => set("city", e.target.value)} className="input-field" placeholder="Mumbai" /></div>
            <div><label className="portal-form-label">District</label><input value={form.district} onChange={e => set("district", e.target.value)} className="input-field" placeholder="Mumbai Suburban" /></div>
            <div><label className="portal-form-label">State</label><input value={form.state} onChange={e => set("state", e.target.value)} className="input-field" placeholder="Maharashtra" /></div>
            <div><label className="portal-form-label">Country</label><input value={form.country} onChange={e => set("country", e.target.value)} className="input-field" placeholder="India" /></div>
          </div>
          <PhoneInput
            label="Phone"
            dialCode={form.phone_country_code}
            onDialCodeChange={v => set("phone_country_code", v)}
            number={form.phone}
            onNumberChange={v => set("phone", v)}
          />
          <div><label className="portal-form-label">Email</label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} className="input-field" placeholder="mumbai@acmetech.in" /></div>
          <div><label className="portal-form-label">Description</label><textarea value={form.description} onChange={e => set("description", e.target.value)} className="input-field" style={{ height: 72, resize: "vertical" }} placeholder="Optional notes about this branch…" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
            {saving ? "Saving…" : isEdit ? "Update" : "Create"}
          </button>
          <button onClick={onClose} style={{ flex: 1 }} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function BranchList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

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
  const [modal, setModal] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

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

  return (
    <OrgLayout title="Branches">
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", background: toast.ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: toast.ok ? "#10b981" : "#f87171", border: `1px solid ${toast.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>{toast.msg}</div>
      )}

      {modal !== null && (
        <BranchModal
          subdomain={subdomain} token={token} companies={companies}
          editBranch={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); showToast(modal === "new" ? "Branch created." : "Branch updated."); }}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Branches"
        subtitle={`${total} total records`}
        actions={
          <button onClick={() => setModal("new")} className="btn-primary">+ Add Branch</button>
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
              <button onClick={() => setModal("new")} className="btn-primary">+ Add Branch</button>
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
                    <tr>
                      <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{b.branch_name}</div>
                        {b.branch_code && <div className="t-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{b.branch_code}</div>}
                      </td>
                      <td>
                        {b.branch_type
                          ? <span className="badge-purple">{b.branch_type}</span>
                          : <span className="t-muted" style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td className="t-body">{b.company_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                      <td className="t-muted" style={{ fontSize: 12 }}>
                        {[b.city, b.state, b.country].filter(Boolean).join(", ") || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td>
                        {b.total_employees != null && <span className="badge-info">👥 {b.total_employees}</span>}
                      </td>
                      <td>
                        <Badge status={b.is_active ? "Active" : "Inactive"} />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : b.id)}
                            className="t-accent"
                            style={{ fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                            {isExpanded ? "Close" : "View"}
                          </button>
                          <button onClick={() => setModal(b)} className="t-accent" style={{ fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Edit</button>
                          <button
                            onClick={() => handleToggle(b)}
                            disabled={actionLoading === b.id}
                            style={{ fontSize: 12, color: b.is_active ? "#f87171" : "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                            {actionLoading === b.id ? "…" : b.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: "var(--c-surface2)" }}>
                        <td colSpan={8} style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>Postal Code</div>
                              <div style={{ fontSize: 13, color: b.postal_code ? "var(--c-text)" : "var(--c-muted)", opacity: b.postal_code ? 1 : 0.5 }}>{b.postal_code || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>Address Line 1</div>
                              <div style={{ fontSize: 13, color: b.address_line_1 ? "var(--c-text)" : "var(--c-muted)", opacity: b.address_line_1 ? 1 : 0.5 }}>{b.address_line_1 || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>Address Line 2</div>
                              <div style={{ fontSize: 13, color: b.address_line_2 ? "var(--c-text)" : "var(--c-muted)", opacity: b.address_line_2 ? 1 : 0.5 }}>{b.address_line_2 || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>City</div>
                              <div style={{ fontSize: 13, color: b.city ? "var(--c-text)" : "var(--c-muted)", opacity: b.city ? 1 : 0.5 }}>{b.city || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>District</div>
                              <div style={{ fontSize: 13, color: b.district ? "var(--c-text)" : "var(--c-muted)", opacity: b.district ? 1 : 0.5 }}>{b.district || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>State</div>
                              <div style={{ fontSize: 13, color: b.state ? "var(--c-text)" : "var(--c-muted)", opacity: b.state ? 1 : 0.5 }}>{b.state || "—"}</div>
                            </div>
                            <div>
                              <div className="portal-form-label" style={{ marginBottom: 3 }}>Country</div>
                              <div style={{ fontSize: 13, color: b.country ? "var(--c-text)" : "var(--c-muted)", opacity: b.country ? 1 : 0.5 }}>{b.country || "—"}</div>
                            </div>
                            {(b.phone || b.email) && (
                              <div style={{ gridColumn: "1 / -1", paddingTop: 12, borderTop: "1px solid var(--c-border)", display: "flex", gap: 24 }}>
                                {b.phone && <div><span className="portal-form-label">Phone: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.phone}</span></div>}
                                {b.email && <div><span className="portal-form-label">Email: </span><span style={{ fontSize: 13, color: "var(--c-text)" }}>{b.email}</span></div>}
                              </div>
                            )}
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
    </OrgLayout>
  );
}
