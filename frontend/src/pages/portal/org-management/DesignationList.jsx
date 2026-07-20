import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { ViewIconBtn, EditIconBtn, ToggleStatusIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";

// ── Level badge ───────────────────────────────────────────────────────────────
const LEVEL_LABELS = { 1:"Executive",2:"Director",3:"Head of Dept",4:"Manager",5:"Team Lead",6:"Senior",7:"Employee" };

function LevelBadge({ level }) {
  if (level == null) return <span className="t-muted" style={{ fontSize: 12 }}>—</span>;
  return (
    <span className="badge-purple">
      L{level}{LEVEL_LABELS[level] ? ` · ${LEVEL_LABELS[level]}` : ""}
    </span>
  );
}

function EmpCountBadge({ count }) {
  if (!count) return <span className="t-muted" style={{ fontSize: 12, opacity: 0.5 }}>0</span>;
  return (
    <span className="badge-info">
      {count} emp
    </span>
  );
}

function genDesigCode(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map(w => w[0].toUpperCase()).join("");
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
  const [autoCode, setAutoCode] = useState(!isEdit);

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
      <div className="portal-form-card" style={{ width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{isEdit ? "Edit Designation" : "Add Designation"}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 1 }}>Job title or role within the organization</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: "14px 0", display: "grid", gap: 14 }}>
          {error && (
            <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <div>
            <label className="portal-form-label">Company *</label>
            <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); }}
              disabled={isEdit} className="input-field" style={{ cursor: isEdit ? "not-allowed" : "pointer" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div>
            <label className="portal-form-label">Department</label>
            <select value={form.department_id} onChange={e => set("department_id", e.target.value)} className="input-field" style={{ cursor: "pointer" }}>
              <option value="">All departments (cross-department)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>

          <div className="form-grid-2" style={{ gap: 12 }}>
            <div>
              <label className="portal-form-label">Designation Name *</label>
              <input
                value={form.designation_name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    designation_name: name,
                    designation_code: autoCode ? genDesigCode(name) : f.designation_code,
                  }));
                }}
                placeholder="Manager" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">
                Code *
                {autoCode && !isEdit && (
                  <span style={{ fontSize: 10, color: "var(--c-accent)", marginLeft: 6, fontWeight: 400 }}>auto</span>
                )}
              </label>
              <input
                value={form.designation_code}
                onChange={e => {
                  setAutoCode(false);
                  set("designation_code", e.target.value.toUpperCase());
                }}
                placeholder="MGR" disabled={isEdit} className="input-field" style={{ fontFamily: "monospace", cursor: isEdit ? "not-allowed" : "text" }} />
            </div>
          </div>

          <div>
            <label className="portal-form-label">Seniority Level</label>
            <select value={form.level} onChange={e => set("level", e.target.value)} className="input-field" style={{ cursor: "pointer" }}>
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
            <label className="portal-form-label">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} placeholder="Brief description of this role…"
              className="input-field" style={{ resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Designation"}
          </button>
          <button onClick={onClose} disabled={saving} className="btn-secondary" style={{ flex: 1 }}>
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
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
        ...(search ? { search } : {}),
        page, page_size: PAGE_SIZE,
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, selectedDept, statusFilter, search, page]);

  useEffect(() => { setPage(1); }, [selectedCompany, selectedDept, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    if (d.is_active) { setConfirmTarget(d); return; }
    setActing(d.id);
    try {
      await portalOrgApi.activateDesig(subdomain, token, d.id);
      showToast("Designation activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const confirmDeactivate = async () => {
    const d = confirmTarget;
    if (!d) return;
    setActing(d.id);
    try {
      await portalOrgApi.deactivateDesig(subdomain, token, d.id);
      showToast("Designation deactivated.");
      setConfirmTarget(null);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const confirmDelete = async () => {
    const d = deleteTarget;
    if (!d) return;
    setActing(d.id);
    try {
      await portalOrgApi.deleteDesig(subdomain, token, d.id);
      showToast("Designation deleted.");
      setDeleteTarget(null);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Delete failed.", false); }
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
      <PageHeader
        title="Designations"
        subtitle={`Job titles and seniority levels — ${total} total`}
        actions={
          <>
            {selectedCompany && rows.length === 0 && !loading && (
              <button onClick={handleSeed} disabled={seeding} className="btn-secondary">
                {seeding ? "Seeding…" : "🌱 Seed Sample Data"}
              </button>
            )}
            {selectedCompany && (
              <button onClick={() => setModal({ editDesig: null })} className="btn-primary">
                + Add Designation
              </button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search designations…"
          className="input-field"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="portal-table-wrap">
        {companies.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            <Link to={`/portal/${subdomain}/org/companies/new`} className="t-accent" style={{ fontWeight: 500 }}>Add a company first.</Link>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No designations found.{" "}
            <button onClick={() => setModal({ editDesig: null })} className="t-accent" style={{ fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}>
              Add one
            </button>
            {" "}or{" "}
            <button onClick={handleSeed} disabled={seeding} className="t-accent" style={{ fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "inherit" }}>
              {seeding ? "seeding…" : "seed sample data"}
            </button>.
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Code", "Designation", "Department", "Level", "Employees", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const dept = departments.find(x => x.id === d.department_id);
                return (
                  <tr key={d.id}>
                    <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {d.designation_code}
                      </span>
                    </td>
                    <td>
                      <Link to={`/portal/${subdomain}/org/designations/${d.id}`}
                        className="t-accent" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        {d.designation_name}
                      </Link>
                      {d.description && <div className="t-muted" style={{ fontSize: 11, marginTop: 1 }}>{d.description}</div>}
                    </td>
                    <td>
                      {dept
                        ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "rgba(100,116,139,0.1)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{dept.department_name}</span>
                        : <span className="t-muted" style={{ opacity: 0.4, fontSize: 12 }}>—</span>}
                    </td>
                    <td>
                      <LevelBadge level={d.level} />
                    </td>
                    <td>
                      <EmpCountBadge count={d.total_employees} />
                    </td>
                    <td><Badge status={d.is_active ? "Active" : "Inactive"} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <ViewIconBtn onClick={() => navigate(`/portal/${subdomain}/org/designations/${d.id}`)} title="View designation" />
                        <EditIconBtn onClick={() => setModal({ editDesig: d })} title="Edit designation" />
                        <ToggleStatusIconBtn isActive={d.is_active} onClick={() => toggleStatus(d)} disabled={acting === d.id}
                          title={d.is_active ? "Deactivate designation" : "Activate designation"} />
                        {!d.is_active && (
                          <DeleteIconBtn onClick={() => setDeleteTarget(d)} disabled={acting === d.id} title="Delete designation" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPage={setPage} total={total} pageSize={PAGE_SIZE} />

      <ConfirmDialog
        open={!!confirmTarget}
        title="Deactivate Designation"
        message={`Are you sure you want to deactivate "${confirmTarget?.designation_name}"? Employees assigned to it will remain but the designation will be marked inactive.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={acting === confirmTarget?.id}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Designation"
        message={`Permanently delete "${deleteTarget?.designation_name}"? This cannot be undone. Only possible when it has no employees assigned.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={acting === deleteTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OrgLayout>
  );
}
