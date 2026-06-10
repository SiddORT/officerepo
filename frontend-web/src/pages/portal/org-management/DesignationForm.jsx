import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{editMode ? "Edit Designation" : "Add Designation"}</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Job title or role within the organization</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label>Company *</Label>
              <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); }}
                disabled={editMode} style={{ ...inputStyle, cursor: editMode ? "not-allowed" : "pointer" }}>
                <option value="">Select a company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>

            <div>
              <Label>Department</Label>
              <select value={form.department_id} onChange={e => set("department_id", e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="">All departments (cross-department)</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "9px 22px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Designation"}
          </button>
          <button onClick={() => navigate(-1)}
            style={{ padding: "9px 18px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: "var(--c-text)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
