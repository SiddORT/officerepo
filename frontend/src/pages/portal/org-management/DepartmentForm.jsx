import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";

export default function DepartmentForm({ editMode }) {
  const { subdomain, deptId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [siblings, setSiblings] = useState([]);
  const [form, setForm] = useState({
    company_id: searchParams.get("company_id") || "",
    department_code: "", department_name: "",
    parent_id: "", description: "",
  });
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setSiblings((r.data.data?.data || []).filter(d => d.id !== deptId))).catch(() => {});
  }, [subdomain, token, form.company_id, deptId]);

  useEffect(() => {
    if (!editMode || !deptId) return;
    setLoading(true);
    portalOrgApi.getDept(subdomain, token, deptId)
      .then(r => {
        const d = r.data.data;
        setForm({ company_id: d.company_id, department_code: d.department_code,
          department_name: d.department_name, parent_id: d.parent_id || "", description: d.description || "" });
      })
      .catch(() => setError("Failed to load department."))
      .finally(() => setLoading(false));
  }, [editMode, deptId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.company_id) { setError("Select a company."); return; }
    if (!form.department_code.trim()) { setError("Department Code is required."); return; }
    if (!form.department_name.trim()) { setError("Department Name is required."); return; }
    setSaving(true); setError("");
    const payload = {
      ...form,
      department_code: form.department_code.toUpperCase(),
      parent_id: form.parent_id || null,
      description: form.description || null,
    };
    try {
      if (editMode) await portalOrgApi.updateDept(subdomain, token, deptId, payload);
      else await portalOrgApi.createDept(subdomain, token, payload);
      navigate(`/portal/${subdomain}/org/departments`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <OrgLayout title="Department"><div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Department" : "Add Department"}>
      <div style={{ maxWidth: 560 }}>
        <PageHeader
          title={editMode ? "Edit Department" : "Add Department"}
          subtitle="Functional unit within a company"
          actions={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              ← Back
            </button>
          }
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="portal-form-card">
          <div className="portal-form-row" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label className="portal-form-label">Company *</label>
              <select value={form.company_id} onChange={e => set("company_id", e.target.value)} disabled={editMode}
                className="input-field" style={{ cursor: editMode ? "not-allowed" : "pointer" }}>
                <option value="">Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>

          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Code *</label>
              <input value={form.department_code} onChange={e => set("department_code", e.target.value.toUpperCase())}
                placeholder="e.g. HR" className="input-field" style={{ fontFamily: "monospace" }} />
            </div>
            <div>
              <label className="portal-form-label">Department Name *</label>
              <input value={form.department_name} onChange={e => set("department_name", e.target.value)}
                placeholder="Human Resources" className="input-field" />
            </div>
          </div>

          <div className="portal-form-row" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <label className="portal-form-label">Parent Department</label>
              <select value={form.parent_id} onChange={e => set("parent_id", e.target.value)} className="input-field" style={{ cursor: "pointer" }}>
                <option value="">None (top-level)</option>
                {siblings.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>

            <div>
              <label className="portal-form-label">Description</label>
              <textarea value={form.description} onChange={e => set("description", e.target.value)}
                rows={3} placeholder="Brief description…"
                className="input-field" style={{ resize: "vertical", lineHeight: 1.5 }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Department"}
          </button>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
