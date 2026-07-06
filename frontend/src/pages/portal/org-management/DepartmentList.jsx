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
    if (!form.company_id) { setEmployees([]); return; }
    const params = { company_id: form.company_id };
    if (editDept?.id) params.department_id = editDept.id;
    portalOrgApi.listActiveEmployees(subdomain, token, params)
      .then(r => setEmployees(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token, form.company_id, editDept]);

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
      <div className="portal-form-card" style={{ width: "100%", maxWidth: 540, maxHeight: "90vh" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-text)" }}>{isEdit ? "Edit Department" : "Add Department"}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 1 }}>Functional unit within a company</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ display: "grid", gap: 14, overflowY: "auto", padding: "10px 0" }}>
          {error && (
            <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171" }}>
              {error}
            </div>
          )}

          <div>
            <label className="portal-form-label">Company *</label>
            <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("parent_id", ""); }}
              disabled={isEdit} className="input-field" style={{ cursor: isEdit ? "not-allowed" : "pointer" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="portal-form-label">Code *</label>
              <input value={form.department_code} onChange={e => set("department_code", e.target.value.toUpperCase())}
                placeholder="e.g. HR" disabled={isEdit} className="input-field" style={{ fontFamily: "monospace", cursor: isEdit ? "not-allowed" : "text" }} />
            </div>
            <div>
              <label className="portal-form-label">Department Name *</label>
              <input value={form.department_name} onChange={e => set("department_name", e.target.value)}
                placeholder="Human Resources" className="input-field" />
            </div>
          </div>

          <div>
            <label className="portal-form-label">Parent Department</label>
            <select value={form.parent_id} onChange={e => set("parent_id", e.target.value)}
              className="input-field" style={{ cursor: "pointer" }}>
              <option value="">None (top-level)</option>
              {siblings.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>

          <div>
            <label className="portal-form-label">Department Head</label>
            <select value={form.head_employee_id} onChange={e => set("head_employee_id", e.target.value)}
              className="input-field" style={{ cursor: "pointer" }}>
              <option value="">None</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </div>

          {form.head_employee_id && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="portal-form-label">Effective From</label>
                <input type="date" value={form.head_effective_from} onChange={e => set("head_effective_from", e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="portal-form-label">Effective To</label>
                <input type="date" value={form.head_effective_to} onChange={e => set("head_effective_to", e.target.value)}
                  className="input-field" />
              </div>
            </div>
          )}

          <div>
            <label className="portal-form-label">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} placeholder="Brief description…"
              className="input-field" style={{ resize: "vertical", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Department"}
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
export default function DepartmentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
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
        company_id: selectedCompany, page, page_size: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, statusFilter, search, page]);

  useEffect(() => { setPage(1); }, [selectedCompany, statusFilter]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    if (d.is_active) { setConfirmTarget(d); return; }
    setActing(d.id);
    try {
      await portalOrgApi.activateDept(subdomain, token, d.id);
      showToast("Department activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const confirmDeactivate = async () => {
    const d = confirmTarget;
    if (!d) return;
    setActing(d.id);
    try {
      await portalOrgApi.deactivateDept(subdomain, token, d.id);
      showToast("Department deactivated.");
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
      await portalOrgApi.deleteDept(subdomain, token, d.id);
      showToast("Department deleted.");
      setDeleteTarget(null);
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Delete failed.", false); }
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
      <PageHeader
        title="Departments"
        subtitle={`Functional units within a company — ${total} total`}
        actions={
          <>
            {selectedCompany && (
              <Link to={`/portal/${subdomain}/org/departments/hierarchy/${selectedCompany}`} className="btn-secondary">
                View Tree
              </Link>
            )}
            {selectedCompany && rows.length === 0 && !loading && (
              <button onClick={handleSeed} disabled={seeding} className="btn-secondary">
                {seeding ? "Seeding…" : "✦ Seed Sample Data"}
              </button>
            )}
            {selectedCompany && (
              <button onClick={() => setModal({ editDept: null })} className="btn-primary">
                + Add Department
              </button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search departments…"
          className="input-field"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto" }}>
          {companies.length === 0 && <option value="">No companies</option>}
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
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
            No companies found.{" "}
            <Link to={`/portal/${subdomain}/org/companies/new`} className="t-accent" style={{ fontWeight: 500 }}>Add a company first.</Link>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            <div style={{ marginBottom: 12 }}>No departments in <strong>{companyName}</strong>.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setModal({ editDept: null })} className="btn-secondary" style={{ color: "var(--c-accent)", borderColor: "var(--c-accent)" }}>
                Add one manually
              </button>
              <button onClick={handleSeed} disabled={seeding} className="btn-secondary">
                {seeding ? "Seeding…" : "✦ Seed sample data"}
              </button>
            </div>
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Code", "Department", "Head", "Employees", "Parent", "Status", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const parent = rows.find(r => r.id === d.parent_id);
                const head = d.head_employee;
                return (
                  <tr key={d.id}>
                    <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {d.department_code}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/portal/${subdomain}/org/departments/${d.id}`)}
                        className="t-accent"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left", fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dotted" }}>
                        {d.department_name}
                      </button>
                      {d.description && <div className="t-muted" style={{ fontSize: 11, marginTop: 1 }}>{d.description.length > 55 ? d.description.slice(0, 55) + "…" : d.description}</div>}
                    </td>
                    <td>
                      {head ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span>👤</span>
                          <span>{head.full_name}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--c-muted)", opacity: 0.55 }}>—</span>
                      )}
                    </td>
                    <td>
                      {d.total_employees != null && (
                        <span className="badge-info">👥 {d.active_employees ?? d.total_employees} / {d.total_employees}</span>
                      )}
                    </td>
                    <td className="t-muted" style={{ fontSize: 12 }}>
                      {parent ? parent.department_name : <span style={{ opacity: 0.5 }}>—</span>}
                    </td>
                    <td><Badge status={d.is_active ? "Active" : "Inactive"} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <ViewIconBtn onClick={() => navigate(`/portal/${subdomain}/org/departments/${d.id}`)} title="View department" />
                        <EditIconBtn onClick={() => setModal({ editDept: d })} title="Edit department" />
                        <ToggleStatusIconBtn isActive={d.is_active} onClick={() => toggleStatus(d)} disabled={acting === d.id}
                          title={d.is_active ? "Deactivate department" : "Activate department"} />
                        {!d.is_active && (
                          <DeleteIconBtn onClick={() => setDeleteTarget(d)} disabled={acting === d.id} title="Delete department" />
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
        title="Deactivate Department"
        message={`Are you sure you want to deactivate "${confirmTarget?.department_name}"? Employees and designations linked to it will remain but the department will be marked inactive.`}
        confirmLabel="Deactivate"
        confirmVariant="danger"
        loading={acting === confirmTarget?.id}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Department"
        message={`Permanently delete "${deleteTarget?.department_name}"? This cannot be undone. Only possible when it has no sub-departments or designations.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={acting === deleteTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </OrgLayout>
  );
}
