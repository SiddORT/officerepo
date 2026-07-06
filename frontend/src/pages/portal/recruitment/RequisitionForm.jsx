import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = { department_id: "", designation_id: "", company_id: "", branch_id: "", hiring_manager: "", number_of_positions: 1, employment_type: "", employee_category: "", reason_for_hiring: "", budget_min: "", budget_max: "", target_joining_date: "", job_description: "", skills_required: "" };

export default function RequisitionForm({ editMode = false }) {
  const { subdomain, reqId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [meta, setMeta] = useState({});
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200, is_active: true })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
    if (editMode && reqId) {
      portalRecruitmentApi.getRequisition(subdomain, token, reqId).then(r => {
        const d = r.data?.data || {};
        setForm({ department_id: d.department_id || "", designation_id: d.designation_id || "", company_id: d.company_id || "", branch_id: d.branch_id || "", hiring_manager: d.hiring_manager || "", number_of_positions: d.number_of_positions || 1, employment_type: d.employment_type || "", employee_category: d.employee_category || "", reason_for_hiring: d.reason_for_hiring || "", budget_min: d.budget_min || "", budget_max: d.budget_max || "", target_joining_date: d.target_joining_date || "", job_description: d.job_description || "", skills_required: d.skills_required || "" });
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!form.company_id) { setDepartments([]); setDesignations([]); setBranches([]); return; }
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listDesigs(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDesignations(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listBranches(subdomain, token, { company_id: form.company_id, page_size: 200, status: "active" })
      .then(r => setBranches(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, form.company_id]);

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
      <PageHeader
        title={editMode ? "Edit Requisition" : "New Job Requisition"}
        breadcrumbs={[{ label: "Requisitions", path: `/portal/${subdomain}/recruitment/requisitions` }, { label: editMode ? "Edit" : "New" }]}
      />
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="portal-form-card">
          <div className="portal-form-title">Position Details</div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Company</label>
              <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value, department_id: "", designation_id: "", branch_id: "" }))} className="input-field">
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Department</label>
              <select value={form.department_id} onChange={f("department_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Designation</label>
              <select value={form.designation_id} onChange={f("designation_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select designation…</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Branch</label>
              <select value={form.branch_id} onChange={f("branch_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Hiring Manager</label><input value={form.hiring_manager} onChange={f("hiring_manager")} placeholder="Name" className="input-field" /></div>
            <div><label className="portal-form-label">No. of Positions</label><input type="number" min={1} value={form.number_of_positions} onChange={f("number_of_positions")} className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Employment Type</label>
              <select value={form.employment_type} onChange={f("employment_type")} className="input-field">
                <option value="">Select…</option>
                {(meta.employment_types || []).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Employee Category</label>
              <select value={form.employee_category} onChange={f("employee_category")} className="input-field">
                <option value="">Select…</option>
                {(meta.employee_categories || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Reason for Hiring</label>
              <select value={form.reason_for_hiring} onChange={f("reason_for_hiring")} className="input-field">
                <option value="">Select…</option>
                {(meta.hiring_reasons || []).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="portal-form-card">
          <div className="portal-form-title">Budget & Timeline</div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Budget Min (₹)</label><input type="number" value={form.budget_min} onChange={f("budget_min")} placeholder="0" className="input-field" /></div>
            <div><label className="portal-form-label">Budget Max (₹)</label><input type="number" value={form.budget_max} onChange={f("budget_max")} placeholder="0" className="input-field" /></div>
            <div><label className="portal-form-label">Target Joining Date</label><input type="date" value={form.target_joining_date} onChange={f("target_joining_date")} className="input-field" /></div>
          </div>
        </div>

        <div className="portal-form-card">
          <div className="portal-form-title">Job Details</div>
          <div><label className="portal-form-label">Job Description</label><textarea value={form.job_description} onChange={f("job_description")} rows={4} placeholder="Describe the role, responsibilities, and requirements…" className="input-field" style={{ resize: "vertical" }} /></div>
          <div><label className="portal-form-label">Skills Required</label><textarea value={form.skills_required} onChange={f("skills_required")} rows={2} placeholder="e.g. React, Python, Communication…" className="input-field" style={{ resize: "vertical" }} /></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save Changes" : "Create Requisition"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
