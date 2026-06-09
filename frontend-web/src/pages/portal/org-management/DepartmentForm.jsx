import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

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
      .then(r => setCompanies(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setSiblings((r.data.data?.data || []).filter(d => d.id !== deptId)))
      .catch(() => {});
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

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_id) { setError("Select a company."); return; }
    if (!form.department_code) { setError("Department Code is required."); return; }
    if (!form.department_name) { setError("Department Name is required."); return; }
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

  const f = (label, key, props = {}) => (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>{label}</label>
      <input value={form[key] || ""} onChange={e => set(key, e.target.value)} {...props}
        className="w-full text-sm rounded-lg px-3 py-2"
        style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
    </div>
  );

  if (loading) return <OrgLayout title="Department"><div className="py-20 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Department" : "Add Department"}>
      <form onSubmit={submit} className="space-y-5 max-w-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>{editMode ? "Edit Department" : "Add Department"}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Functional unit within a company</p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm" style={{ color: "var(--c-muted)" }}>← Back</button>
        </div>

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

        <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Company *</label>
            <select value={form.company_id} onChange={e => set("company_id", e.target.value)} disabled={editMode}
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
              <option value="">Select a company</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Department Code *</label>
              <input value={form.department_code} onChange={e => set("department_code", e.target.value.toUpperCase())}
                placeholder="e.g. HR" className="w-full text-sm rounded-lg px-3 py-2 font-mono"
                style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Department Name *</label>
              <input value={form.department_name} onChange={e => set("department_name", e.target.value)}
                placeholder="Human Resources" className="w-full text-sm rounded-lg px-3 py-2"
                style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>Parent Department</label>
            <select value={form.parent_id} onChange={e => set("parent_id", e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
              <option value="">None (top-level)</option>
              {siblings.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
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
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Department"}
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
