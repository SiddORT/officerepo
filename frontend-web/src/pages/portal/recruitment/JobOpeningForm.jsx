import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}</label>;
const Card = ({ title, children }) => <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{title && <div style={{ fontSize: 13, fontWeight: 700, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}{children}</div>;
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>{children}</div>;

const BLANK = { job_title: "", requisition_id: "", company_id: "", branch_id: "", department_id: "", designation_id: "", number_of_vacancies: 1, employment_type: "", employee_category: "", experience_required: "", location: "", salary_min: "", salary_max: "", application_deadline: "" };

export default function JobOpeningForm({ editMode = false }) {
  const { subdomain, openingId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...BLANK, requisition_id: searchParams.get("requisition_id") || "" });
  const [meta, setMeta] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    if (editMode && openingId) {
      portalRecruitmentApi.getOpening(subdomain, token, openingId).then(r => {
        const d = r.data?.data || {};
        setForm({ job_title: d.job_title || "", requisition_id: d.requisition_id || "", company_id: d.company_id || "", branch_id: d.branch_id || "", department_id: d.department_id || "", designation_id: d.designation_id || "", number_of_vacancies: d.number_of_vacancies || 1, employment_type: d.employment_type || "", employee_category: d.employee_category || "", experience_required: d.experience_required || "", location: d.location || "", salary_min: d.salary_min || "", salary_max: d.salary_max || "", application_deadline: d.application_deadline || "" });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.job_title) { setError("Job title is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, number_of_vacancies: Number(form.number_of_vacancies) || 1, salary_min: form.salary_min ? Number(form.salary_min) : null, salary_max: form.salary_max ? Number(form.salary_max) : null };
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) {
        await portalRecruitmentApi.updateOpening(subdomain, token, openingId, payload);
      } else {
        await portalRecruitmentApi.createOpening(subdomain, token, payload);
      }
      navigate(`/portal/${subdomain}/recruitment/openings`);
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/openings`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Job Openings</span>
        <span>/</span><span>{editMode ? "Edit" : "New"}</span>
      </div>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{editMode ? "Edit Job Opening" : "New Job Opening"}</h2>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Opening Details">
          <div><Label req>Job Title</Label><input value={form.job_title} onChange={f("job_title")} placeholder="e.g. Senior React Developer" style={inp} /></div>
          <Row>
            <div><Label>Requisition ID</Label><input value={form.requisition_id} onChange={f("requisition_id")} placeholder="Linked requisition (optional)" style={inp} /></div>
            <div><Label>No. of Vacancies</Label><input type="number" min={1} value={form.number_of_vacancies} onChange={f("number_of_vacancies")} style={inp} /></div>
            <div><Label>Location</Label><input value={form.location} onChange={f("location")} placeholder="City / Remote" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Department ID</Label><input value={form.department_id} onChange={f("department_id")} placeholder="Dept ID" style={inp} /></div>
            <div><Label>Designation ID</Label><input value={form.designation_id} onChange={f("designation_id")} placeholder="Desig ID" style={inp} /></div>
            <div><Label>Company ID</Label><input value={form.company_id} onChange={f("company_id")} placeholder="Company ID" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Employment Type</Label>
              <select value={form.employment_type} onChange={f("employment_type")} style={inp}>
                <option value="">Select…</option>
                {(meta.employment_types || []).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><Label>Employee Category</Label>
              <select value={form.employee_category} onChange={f("employee_category")} style={inp}>
                <option value="">Select…</option>
                {(meta.employee_categories || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Experience Required</Label><input value={form.experience_required} onChange={f("experience_required")} placeholder="e.g. 2-5 years" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Salary Min (₹/yr)</Label><input type="number" value={form.salary_min} onChange={f("salary_min")} placeholder="0" style={inp} /></div>
            <div><Label>Salary Max (₹/yr)</Label><input type="number" value={form.salary_max} onChange={f("salary_max")} placeholder="0" style={inp} /></div>
            <div><Label>Application Deadline</Label><input type="date" value={form.application_deadline} onChange={f("application_deadline")} style={inp} /></div>
          </Row>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings`)} style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : editMode ? "Save" : "Create Opening"}</button>
      </div>
    </div>
  );
}
