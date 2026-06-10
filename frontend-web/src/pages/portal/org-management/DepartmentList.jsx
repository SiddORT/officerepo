import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
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

function EmpCountBadge({ total, active }) {
  if (total == null) return null;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(0,174,236,0.1)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)" }}>
      👥 {active ?? total} / {total}
    </span>
  );
}

// ── Dept Create / Edit Modal ──────────────────────────────────────────────────
function DeptModal({ subdomain, token, companies, editDept, onClose, onSaved }) {
  const isEdit = !!editDept;
  const [siblings, setSiblings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    company_id:          editDept?.company_id || (companies[0]?.id || ""),
    department_code:     editDept?.department_code || "",
    department_name:     editDept?.department_name || "",
    parent_id:           editDept?.parent_id || "",
    head_employee_id:    editDept?.head_employee_id || "",
    head_effective_from: editDept?.head_effective_from || "",
    head_effective_to:   editDept?.head_effective_to || "",
    description:         editDept?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setSiblings((r.data.data?.data || []).filter(d => d.id !== editDept?.id)))
      .catch(() => {});
  }, [subdomain, token, form.company_id, editDept]);

  useEffect(() => {
    portalOrgApi.listActiveEmployees(subdomain, token)
      .then(r => setEmployees(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  const handleSubmit = async () => {
    if (!form.company_id) { setError("Select a company."); return; }
    if (!form.department_code.trim()) { setError("Department Code is required."); return; }
    if (!form.department_name.trim()) { setError("Department Name is required."); return; }
    setSaving(true); setError("");
    const payload = {
      ...form,
      department_code:     form.department_code.toUpperCase(),
      parent_id:           form.parent_id || null,
      head_employee_id:    form.head_employee_id || null,
      head_effective_from: form.head_effective_from || null,
      head_effective_to:   form.head_effective_to || null,
      description:         form.description || null,
    };
    try {
      if (isEdit) await portalOrgApi.updateDept(subdomain, token, editDept.id, payload);
      else await portalOrgApi.createDept(subdomain, token, payload);
      onSaved();
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 540, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--c-border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{isEdit ? "Edit Department" : "Add Department"}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 1 }}>Functional unit within a company</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "grid", gap: 14, overflowY: "auto" }}>
          {error && (
            <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <div>
            <Label>Company *</Label>
            <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("parent_id", ""); }}
              disabled={isEdit} style={{ ...inputStyle, cursor: isEdit ? "not-allowed" : "pointer" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Code *</Label>
              <input value={form.department_code} onChange={e => set("department_code", e.target.value.toUpperCase())}
                placeholder="e.g. HR" disabled={isEdit} style={{ ...inputStyle, fontFamily: "monospace", cursor: isEdit ? "not-allowed" : "text" }} />
            </div>
            <div>
              <Label>Department Name *</Label>
              <input value={form.department_name} onChange={e => set("department_name", e.target.value)}
                placeholder="Human Resources" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Parent Department</Label>
            <select value={form.parent_id} onChange={e => set("parent_id", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">None (top-level)</option>
              {siblings.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>

          <div>
            <Label>Department Head</Label>
            <select value={form.head_employee_id} onChange={e => set("head_employee_id", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">None</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>

          {form.head_employee_id && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label>Effective From</Label>
                <input type="date" value={form.head_effective_from} onChange={e => set("head_effective_from", e.target.value)}
                  style={inputStyle} />
              </div>
              <div>
                <Label>Effective To</Label>
                <input type="date" value={form.head_effective_to} onChange={e => set("head_effective_to", e.target.value)}
                  style={inputStyle} />
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} placeholder="Brief description…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
          </button>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main list ─────────────────────────────────────────────────────────────────
export default function DepartmentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => {
        const list = r.data.data?.data || [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0].id);
      }).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const r = await portalOrgApi.listDepts(subdomain, token, {
        company_id: selectedCompany, page_size: 200,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    setActing(d.id);
    try {
      if (d.is_active) await portalOrgApi.deactivateDept(subdomain, token, d.id);
      else await portalOrgApi.activateDept(subdomain, token, d.id);
      showToast(d.is_active ? "Department deactivated." : "Department activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const handleSeed = async () => {
    if (!selectedCompany) return;
    setSeeding(true);
    try {
      const r = await portalOrgApi.seedDepts(subdomain, token, selectedCompany);
      const msg = r.data.data?.message || "Sample departments created.";
      showToast(msg);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Seed failed.", false); }
    finally { setSeeding(false); }
  };

  const handleSaved = () => {
    setModal(null);
    showToast(modal?.editDept ? "Department updated." : "Department created.");
    load();
  };

  const companyName = companies.find(c => c.id === selectedCompany)?.company_name || "";

  return (
    <OrgLayout title="Departments">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", maxWidth: 340 }}>
          {toast.msg}
        </div>
      )}

      {modal && (
        <DeptModal
          subdomain={subdomain}
          token={token}
          companies={companies}
          editDept={modal.editDept}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Departments</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Functional units within a company — {total} total</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selectedCompany && (
            <Link to={`/portal/${subdomain}/org/departments/hierarchy/${selectedCompany}`}
              style={{ padding: "8px 14px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: "var(--c-text)", textDecoration: "none", border: "1px solid var(--c-border)", whiteSpace: "nowrap" }}>
              View Tree
            </Link>
          )}
          {selectedCompany && rows.length === 0 && !loading && (
            <button onClick={handleSeed} disabled={seeding}
              style={{ padding: "8px 14px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: seeding ? "var(--c-muted)" : "var(--c-text)", border: "1px solid var(--c-border)", cursor: seeding ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {seeding ? "Seeding…" : "✦ Seed Sample Data"}
            </button>
          )}
          {selectedCompany && (
            <button onClick={() => setModal({ editDept: null })}
              style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Add Department
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
          {companies.length === 0 && <option value="">No companies</option>}
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>

        {["", "Active", "Inactive"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
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

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {companies.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No companies found.{" "}
            <Link to={`/portal/${subdomain}/org/companies/new`} style={{ color: "var(--c-accent)", fontWeight: 500 }}>Add a company first.</Link>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}>No departments in <strong>{companyName}</strong>.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setModal({ editDept: null })}
                style={{ color: "var(--c-accent)", fontWeight: 500, background: "none", border: "1px solid var(--c-accent)", cursor: "pointer", padding: "6px 14px", borderRadius: 6, fontSize: 13 }}>
                Add one manually
              </button>
              <button onClick={handleSeed} disabled={seeding}
                style={{ color: "var(--c-text)", fontWeight: 500, background: "none", border: "1px solid var(--c-border)", cursor: "pointer", padding: "6px 14px", borderRadius: 6, fontSize: 13 }}>
                {seeding ? "Seeding…" : "✦ Seed sample data"}
              </button>
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["Code", "Department", "Head", "Employees", "Parent", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const parent = rows.find(r => r.id === d.parent_id);
                const head = d.head_employee;
                return (
                  <tr key={d.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {d.department_code}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <button
                        onClick={() => navigate(`/portal/${subdomain}/org/departments/${d.id}`)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-accent)", textDecoration: "underline", textDecorationStyle: "dotted" }}>{d.department_name}</div>
                      </button>
                      {d.description && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{d.description.length > 55 ? d.description.slice(0, 55) + "…" : d.description}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {head ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 14 }}>👤</span>
                          <span>{head.full_name}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--c-muted)", opacity: 0.55 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <EmpCountBadge total={d.total_employees} active={d.active_employees} />
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                      {parent ? parent.department_name : <span style={{ opacity: 0.5 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge active={d.is_active} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setModal({ editDept: d })}
                          style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          Edit
                        </button>
                        <button onClick={() => toggleStatus(d)} disabled={acting === d.id}
                          style={{ fontSize: 12, color: d.is_active ? "#f87171" : "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                          {acting === d.id ? "…" : d.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </OrgLayout>
  );
}
