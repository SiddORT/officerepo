import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

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
      .then(r => setCompanies(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || []))
      .catch(() => {});
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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_id) { setError("Select a company."); return; }
    if (!form.designation_code) { setError("Designation Code is required."); return; }
    if (!form.designation_name) { setError("Designation Name is required."); return; }
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

  if (loading) return <OrgLayout title="Designation"><div className="py-20 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Designation" : "Add Designation"}>
      <form onSubmit={submit} className="space-y-5 max-w-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>{editMode ? "Edit Designation" : "Add Designation"}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Job title or role within the org</p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm" style={{ color: "var(--c-muted)" }}>← Back</button>
        </div>

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Company *</label>
            <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); }} disabled={editMode}
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Department</label>
            <select value={form.department_id} onChange={e => set("department_id", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
              <option value="">All departments (cross-department)</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Designation Code *</label>
              <input value={form.designation_code} onChange={e => set("designation_code", e.target.value.toUpperCase())}
                placeholder="e.g. MGR" className="w-full text-sm rounded-lg px-3 py-2 font-mono"
                style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Designation Name *</label>
              <input value={form.designation_name} onChange={e => set("designation_name", e.target.value)}
                placeholder="Manager" className="w-full text-sm rounded-lg px-3 py-2"
                style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>
              Seniority Level <span style={{ color: "var(--c-muted)", fontWeight: 400 }}>(1 = senior)</span>
            </label>
            <input type="number" min={1} value={form.level} onChange={e => set("level", e.target.value)}
              placeholder="e.g. 2"
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={3} placeholder="Brief description…"
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", resize: "vertical" }} />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: saving ? "var(--c-muted)" : "var(--c-primary)" }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Designation"}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            Cancel
          </button>
        </div>
      </form>
    </OrgLayout>
  );
}
