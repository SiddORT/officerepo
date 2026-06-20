import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";

export default function DesignationForm({ editMode }) {
  const { subdomain, desigId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    company_id: searchParams.get("company_id") || "",
    department_id: searchParams.get("department_id") || "",
    designation_code: "", designation_name: "",
    level: "", description: "",
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
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, form.company_id]);

  useEffect(() => {
    if (!editMode || !desigId) return;
    setLoading(true);
    portalOrgApi.getDesig(subdomain, token, desigId)
      .then(r => {
        const d = r.data.data;
        setForm({ company_id: d.company_id, department_id: d.department_id || "",
          designation_code: d.designation_code, designation_name: d.designation_name,
          level: d.level != null ? String(d.level) : "", description: d.description || "" });
      })
      .catch(() => setError("Failed to load designation."))
      .finally(() => setLoading(false));
  }, [editMode, desigId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
      if (editMode) await portalOrgApi.updateDesig(subdomain, token, desigId, payload);
      else await portalOrgApi.createDesig(subdomain, token, payload);
      navigate(`/portal/${subdomain}/org/designations`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <OrgLayout title="Designation"><div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Designation" : "Add Designation"}>
      <div style={{ maxWidth: 560 }}>
        <PageHeader
          title={editMode ? "Edit Designation" : "Add Designation"}
          subtitle="Job title or role within the organization"
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
              <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); }}
                disabled={editMode} className="input-field" style={{ cursor: editMode ? "not-allowed" : "pointer" }}>
                <option value="">Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <label className="portal-form-label">Department</label>
              <select value={form.department_id} onChange={e => set("department_id", e.target.value)}
                className="input-field" style={{ cursor: "pointer" }}>
                <option value="">All departments (cross-department)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>
          </div>

          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Code *</label>
              <input value={form.designation_code} onChange={e => set("designation_code", e.target.value.toUpperCase())}
                placeholder="MGR" className="input-field" style={{ fontFamily: "monospace" }} />
            </div>
            <div>
              <label className="portal-form-label">Designation Name *</label>
              <input value={form.designation_name} onChange={e => set("designation_name", e.target.value)}
                placeholder="Manager" className="input-field" />
            </div>
          </div>

          <div className="portal-form-row" style={{ gridTemplateColumns: "1fr" }}>
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
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Designation"}
          </button>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
