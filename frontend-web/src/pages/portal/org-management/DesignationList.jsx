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

// ── Level badge ───────────────────────────────────────────────────────────────
const LEVEL_COLORS = [
  null,
  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
  { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
  { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
  { bg: "rgba(6,182,212,0.15)",  color: "#06b6d4" },
  { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },
  { bg: "rgba(100,116,139,0.15)",color: "#94a3b8" },
  { bg: "rgba(100,116,139,0.12)",color: "#94a3b8" },
  { bg: "rgba(100,116,139,0.10)",color: "#94a3b8" },
  { bg: "rgba(100,116,139,0.08)",color: "#94a3b8" },
];
const LEVEL_LABELS = { 1:"Executive",2:"Director",3:"Head of Dept",4:"Manager",5:"Team Lead",6:"Senior",7:"Employee" };

function LevelBadge({ level }) {
  if (level == null) return <span style={{ color: "var(--c-muted)", fontSize: 12 }}>—</span>;
  const s = LEVEL_COLORS[level] || LEVEL_COLORS[7];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.color}40`, whiteSpace: "nowrap" }}>
      L{level}{LEVEL_LABELS[level] ? ` · ${LEVEL_LABELS[level]}` : ""}
    </span>
  );
}

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
  if (!count) return <span style={{ fontSize: 12, color: "var(--c-muted)", opacity: 0.5 }}>0</span>;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(0,174,236,0.1)", color: "var(--c-accent)" }}>
      {count} emp
    </span>
  );
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function DesigModal({ subdomain, token, companies, allDepartments, editDesig, onClose, onSaved }) {
  const isEdit = !!editDesig;
  const [departments, setDepartments] = useState(
    editDesig ? allDepartments.filter(d => d.company_id === editDesig.company_id) : []
  );
  const [form, setForm] = useState({
    company_id:       editDesig?.company_id || (companies[0]?.id || ""),
    department_id:    editDesig?.department_id || "",
    designation_code: editDesig?.designation_code || "",
    designation_name: editDesig?.designation_name || "",
    level:            editDesig?.level != null ? String(editDesig.level) : "",
    description:      editDesig?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token, form.company_id]);

  const handleSubmit = async () => {
    if (!form.company_id) { setError("Select a company."); return; }
    if (!form.designation_code.trim()) { setError("Designation Code is required."); return; }
    if (!form.designation_name.trim()) { setError("Designation Name is required."); return; }
    setSaving(true); setError("");
    const payload = {
      ...form,
      designation_code: form.designation_code.toUpperCase(),
      department_id: form.department_id || null,
      level: form.level ? parseInt(form.level, 10) : null,
      description: form.description || null,
    };
    try {
      if (isEdit) await portalOrgApi.updateDesig(subdomain, token, editDesig.id, payload);
      else await portalOrgApi.createDesig(subdomain, token, payload);
      onSaved();
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--c-border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{isEdit ? "Edit Designation" : "Add Designation"}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 1 }}>Job title or role within the organization</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: 20, display: "grid", gap: 14 }}>
          {error && (
            <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <div>
            <Label>Company *</Label>
            <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); }}
              disabled={isEdit} style={{ ...inputStyle, cursor: isEdit ? "not-allowed" : "pointer" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div>
            <Label>Department</Label>
            <select value={form.department_id} onChange={e => set("department_id", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">All departments (cross-department)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Code *</Label>
              <input value={form.designation_code} onChange={e => set("designation_code", e.target.value.toUpperCase())}
                placeholder="MGR" style={{ ...inputStyle, fontFamily: "monospace" }} />
            </div>
            <div>
              <Label>Designation Name *</Label>
              <input value={form.designation_name} onChange={e => set("designation_name", e.target.value)}
                placeholder="Manager" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Seniority Level</Label>
            <select value={form.level} onChange={e => set("level", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Not set —</option>
              <option value="1">Level 1 — Executive / CEO</option>
              <option value="2">Level 2 — Director</option>
              <option value="3">Level 3 — Head of Department</option>
              <option value="4">Level 4 — Manager</option>
              <option value="5">Level 5 — Team Lead</option>
              <option value="6">Level 6 — Senior Employee</option>
              <option value="7">Level 7 — Employee</option>
              <option value="8">Level 8</option>
              <option value="9">Level 9</option>
              <option value="10">Level 10</option>
            </select>
          </div>

          <div>
            <Label>Description</Label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} placeholder="Brief description of this role…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Designation"}
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
export default function DesignationList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => {
        const list = r.data.data?.data || [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0].id);
      }).catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!selectedCompany) return;
    setSelectedDept("");
    portalOrgApi.listDepts(subdomain, token, { company_id: selectedCompany, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, selectedCompany]);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const r = await portalOrgApi.listDesigs(subdomain, token, {
        company_id: selectedCompany,
        ...(selectedDept ? { department_id: selectedDept } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        page, page_size: PAGE_SIZE,
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, selectedDept, statusFilter, page]);

  useEffect(() => { setPage(1); }, [selectedCompany, selectedDept, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    setActing(d.id);
    try {
      if (d.is_active) await portalOrgApi.deactivateDesig(subdomain, token, d.id);
      else await portalOrgApi.activateDesig(subdomain, token, d.id);
      showToast(d.is_active ? "Designation deactivated." : "Designation activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const handleSeed = async () => {
    if (!selectedCompany) return;
    setSeeding(true);
    try {
      const r = await portalOrgApi.seedDesigs(subdomain, token, selectedCompany);
      showToast(r.data?.data?.message || "Seeded.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Seed failed.", false); }
    finally { setSeeding(false); }
  };

  const handleSaved = () => {
    setModal(null);
    showToast(modal?.editDesig ? "Designation updated." : "Designation created.");
    load();
  };

  return (
    <OrgLayout title="Designations">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {modal && (
        <DesigModal
          subdomain={subdomain} token={token}
          companies={companies} allDepartments={departments}
          editDesig={modal.editDesig}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Designations</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Job titles and seniority levels — {total} total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedCompany && rows.length === 0 && !loading && (
            <button onClick={handleSeed} disabled={seeding}
              style={{ padding: "8px 14px", borderRadius: 7, fontWeight: 500, fontSize: 12, background: "rgba(0,174,236,0.08)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)", cursor: seeding ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {seeding ? "Seeding…" : "🌱 Seed Sample Data"}
            </button>
          )}
          {selectedCompany && (
            <button onClick={() => setModal({ editDesig: null })}
              style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
              + Add Designation
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
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
            <Link to={`/portal/${subdomain}/org/companies/new`} style={{ color: "var(--c-accent)", fontWeight: 500 }}>Add a company first.</Link>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No designations found.{" "}
            <button onClick={() => setModal({ editDesig: null })} style={{ color: "var(--c-accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}>
              Add one
            </button>
            {" "}or{" "}
            <button onClick={handleSeed} disabled={seeding} style={{ color: "var(--c-accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}>
              {seeding ? "seeding…" : "seed sample data"}
            </button>.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["#", "Code", "Designation", "Department", "Level", "Employees", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const dept = departments.find(x => x.id === d.department_id);
                return (
                  <tr key={d.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td style={{ padding: "12px 14px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {d.designation_code}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <Link to={`/portal/${subdomain}/org/designations/${d.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--c-accent)", textDecoration: "none" }}>
                        {d.designation_name}
                      </Link>
                      {d.description && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{d.description}</div>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {dept
                        ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(100,116,139,0.1)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{dept.department_name}</span>
                        : <span style={{ opacity: 0.4, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <LevelBadge level={d.level} />
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <EmpCountBadge count={d.total_employees} />
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge active={d.is_active} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button onClick={() => setModal({ editDesig: d })}
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

      {Math.ceil(total / PAGE_SIZE) > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
          <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 12 }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(Math.ceil(total / PAGE_SIZE), p + 1))} disabled={page === Math.ceil(total / PAGE_SIZE)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 12 }}>Next →</button>
          </div>
        </div>
      )}
    </OrgLayout>
  );
}
