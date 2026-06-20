import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}</label>;
const Card = ({ title, children }) => <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{title && <div style={{ fontSize: 13, fontWeight: 700, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}{children}</div>;
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>{children}</div>;

const BLANK = { department_id: "", designation_id: "", company_id: "", branch_id: "", hiring_manager: "", number_of_positions: 1, employment_type: "", employee_category: "", reason_for_hiring: "", budget_min: "", budget_max: "", target_joining_date: "", job_description: "", skills_required: "" };

export default function RequisitionForm({ editMode = false }) {
  const { subdomain, reqId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [meta, setMeta] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    if (editMode && reqId) {
      portalRecruitmentApi.getRequisition(subdomain, token, reqId).then(r => {
        const d = r.data?.data || {};
        setForm({ department_id: d.department_id || "", designation_id: d.designation_id || "", company_id: d.company_id || "", branch_id: d.branch_id || "", hiring_manager: d.hiring_manager || "", number_of_positions: d.number_of_positions || 1, employment_type: d.employment_type || "", employee_category: d.employee_category || "", reason_for_hiring: d.reason_for_hiring || "", budget_min: d.budget_min || "", budget_max: d.budget_max || "", target_joining_date: d.target_joining_date || "", job_description: d.job_description || "", skills_required: d.skills_required || "" });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.department_id) { setError("Department is required."); return; }
    if (!form.designation_id) { setError("Designation is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, number_of_positions: Number(form.number_of_positions) || 1, budget_min: form.budget_min ? Number(form.budget_min) : null, budget_max: form.budget_max ? Number(form.budget_max) : null };
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) {
        await portalRecruitmentApi.updateRequisition(subdomain, token, reqId, payload);
        navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}`);
      } else {
        const r = await portalRecruitmentApi.createRequisition(subdomain, token, payload);
        navigate(`/portal/${subdomain}/recruitment/requisitions/${r.data?.data?.id || ""}`);
      }
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Job Requisitions</span>
        <span>/</span><span>{editMode ? "Edit" : "New"}</span>
      </div>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{editMode ? "Edit Requisition" : "New Job Requisition"}</h2>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Position Details">
          <Row>
            <div><Label req>Department ID</Label><input value={form.department_id} onChange={f("department_id")} placeholder="Department ID" style={inp} /></div>
            <div><Label req>Designation ID</Label><input value={form.designation_id} onChange={f("designation_id")} placeholder="Designation ID" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Company ID</Label><input value={form.company_id} onChange={f("company_id")} placeholder="Company ID" style={inp} /></div>
            <div><Label>Branch ID</Label><input value={form.branch_id} onChange={f("branch_id")} placeholder="Branch ID" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Hiring Manager</Label><input value={form.hiring_manager} onChange={f("hiring_manager")} placeholder="Name" style={inp} /></div>
            <div><Label>No. of Positions</Label><input type="number" min={1} value={form.number_of_positions} onChange={f("number_of_positions")} style={inp} /></div>
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
            <div><Label>Reason for Hiring</Label>
              <select value={form.reason_for_hiring} onChange={f("reason_for_hiring")} style={inp}>
                <option value="">Select…</option>
                {(meta.hiring_reasons || []).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </Row>
        </Card>
        <Card title="Budget & Timeline">
          <Row>
            <div><Label>Budget Min (₹)</Label><input type="number" value={form.budget_min} onChange={f("budget_min")} placeholder="0" style={inp} /></div>
            <div><Label>Budget Max (₹)</Label><input type="number" value={form.budget_max} onChange={f("budget_max")} placeholder="0" style={inp} /></div>
            <div><Label>Target Joining Date</Label><input type="date" value={form.target_joining_date} onChange={f("target_joining_date")} style={inp} /></div>
          </Row>
        </Card>
        <Card title="Job Details">
          <div><Label>Job Description</Label><textarea value={form.job_description} onChange={f("job_description")} rows={4} placeholder="Describe the role, responsibilities, and requirements…" style={{ ...inp, resize: "vertical" }} /></div>
          <div><Label>Skills Required</Label><textarea value={form.skills_required} onChange={f("skills_required")} rows={2} placeholder="e.g. React, Python, Communication…" style={{ ...inp, resize: "vertical" }} /></div>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions`)} style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : editMode ? "Save Changes" : "Create Requisition"}</button>
      </div>
    </div>
  );
}
