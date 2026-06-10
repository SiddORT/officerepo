import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

const inp = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box",
};
const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}
  </label>
);

function StatusBadge({ active }) {
  const s = active
    ? { bg: "rgba(34,197,94,0.1)", color: "#4ade80" }
    : { bg: "rgba(100,116,139,0.15)", color: "var(--c-muted)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmpCountBadge({ count }) {
  if (count == null) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(0,174,236,0.1)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)" }}>
      👥 {count}
    </span>
  );
}

function BranchModal({ subdomain, token, companies, editBranch, onClose, onSaved }) {
  const isEdit = !!editBranch;
  const [form, setForm] = useState({
    company_id:   editBranch?.company_id  || (companies[0]?.id || ""),
    branch_code:  editBranch?.branch_code  || "",
    branch_name:  editBranch?.branch_name  || "",
    branch_type:  editBranch?.branch_type  || "",
    address_line1: editBranch?.address_line1 || "",
    address_line2: editBranch?.address_line2 || "",
    city:          editBranch?.city         || "",
    state:         editBranch?.state        || "",
    country:       editBranch?.country      || "",
    postal_code:   editBranch?.postal_code  || "",
    phone:         editBranch?.phone        || "",
    email:         editBranch?.email        || "",
    description:   editBranch?.description  || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.branch_name.trim()) { setError("Branch name is required."); return; }
    if (!form.company_id) { setError("Please select a company."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
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
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--c-text)", fontSize: 14 }}>{isEdit ? "Edit Branch" : "Add Branch"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "grid", gap: 14 }}>
          {error && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13 }}>{error}</div>}
          <div>
            <Label>Company</Label>
            <select value={form.company_id} onChange={e => set("company_id", e.target.value)} style={inp}>
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><Label>Branch Name</Label><input value={form.branch_name} onChange={e => set("branch_name", e.target.value)} style={inp} placeholder="Mumbai Head Office" /></div>
            <div><Label>Branch Code</Label><input value={form.branch_code} onChange={e => set("branch_code", e.target.value)} style={inp} placeholder="MUM-HO" /></div>
          </div>
          <div>
            <Label>Branch Type</Label>
            <select value={form.branch_type} onChange={e => set("branch_type", e.target.value)} style={inp}>
              <option value="">Select type…</option>
              {BRANCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><Label>Address Line 1</Label><input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} style={inp} placeholder="123 Business Park" /></div>
          <div><Label>Address Line 2</Label><input value={form.address_line2} onChange={e => set("address_line2", e.target.value)} style={inp} placeholder="Floor 5, Tower B" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <div><Label>City</Label><input value={form.city} onChange={e => set("city", e.target.value)} style={inp} placeholder="Mumbai" /></div>
            <div><Label>State</Label><input value={form.state} onChange={e => set("state", e.target.value)} style={inp} placeholder="Maharashtra" /></div>
            <div><Label>Postal Code</Label><input value={form.postal_code} onChange={e => set("postal_code", e.target.value)} style={inp} placeholder="400001" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div><Label>Country</Label><input value={form.country} onChange={e => set("country", e.target.value)} style={inp} placeholder="India" /></div>
            <div><Label>Phone</Label><input value={form.phone} onChange={e => set("phone", e.target.value)} style={inp} placeholder="+91 22 1234 5678" /></div>
          </div>
          <div><Label>Email</Label><input type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inp} placeholder="mumbai@acmetech.in" /></div>
          <div><Label>Description</Label><textarea value={form.description} onChange={e => set("description", e.target.value)} style={{ ...inp, height: 72, resize: "vertical" }} placeholder="Optional notes about this branch…" /></div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </button>
          </div>
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
    setActionLoading(b.id);
    try {
      if (b.is_active) {
        await portalOrgApi.deactivateBranch(subdomain, token, b.id);
        showToast("Branch deactivated.");
      } else {
        await portalOrgApi.activateBranch(subdomain, token, b.id);
        showToast("Branch activated.");
      }
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <OrgLayout title="Branches">
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: toast.ok ? "#4ade80" : "#f87171", border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>{toast.msg}</div>
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-heading)" }}>Branches</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>{total} total record{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Branch</button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search branch name or code…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }} />
        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>No branches found</div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 16 }}>
              {search || filterStatus || filterCompany ? "Try adjusting your filters." : "Add your first branch to get started."}
            </div>
            {!search && !filterStatus && !filterCompany && (
              <button onClick={() => setModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Branch</button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                  {["#", "Branch", "Type", "Company", "Location", "Employees", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width: h === "#" ? 40 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((b, i) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--c-border)", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{b.branch_name}</div>
                      {b.branch_code && <div style={{ fontSize: 11, color: "var(--c-muted)", fontFamily: "monospace" }}>{b.branch_code}</div>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>
                      {b.branch_type
                        ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 999, background: "rgba(168,85,247,0.08)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.15)", fontWeight: 500 }}>{b.branch_type}</span>
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>{b.company_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--c-muted)" }}>
                      {[b.city, b.state, b.country].filter(Boolean).join(", ") || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <EmpCountBadge count={b.total_employees} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge active={b.is_active} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={() => setModal(b)} style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Edit</button>
                        <button
                          onClick={() => handleToggle(b)}
                          disabled={actionLoading === b.id}
                          style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: b.is_active ? "#f87171" : "#4ade80" }}>
                          {actionLoading === b.id ? "…" : b.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--c-muted)" }}>
          <span>{total} total · page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}
    </OrgLayout>
  );
}
