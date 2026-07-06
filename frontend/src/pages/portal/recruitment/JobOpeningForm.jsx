import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = { job_title: "", requisition_id: "", company_id: "", branch_id: "", department_id: "", designation_id: "", number_of_vacancies: 1, employment_type: "", employee_category: "", experience_required: "", location: "", salary_min: "", salary_max: "", application_deadline: "" };

export default function JobOpeningForm({ editMode = false }) {
  const { subdomain, openingId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...BLANK, requisition_id: searchParams.get("requisition_id") || "" });
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
    if (editMode && openingId) {
      portalRecruitmentApi.getOpening(subdomain, token, openingId).then(r => {
        const d = r.data?.data || {};
        setForm({ job_title: d.job_title || "", requisition_id: d.requisition_id || "", company_id: d.company_id || "", branch_id: d.branch_id || "", department_id: d.department_id || "", designation_id: d.designation_id || "", number_of_vacancies: d.number_of_vacancies || 1, employment_type: d.employment_type || "", employee_category: d.employee_category || "", experience_required: d.experience_required || "", location: d.location || "", salary_min: d.salary_min || "", salary_max: d.salary_max || "", application_deadline: d.application_deadline || "" });
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
    if (!form.job_title) { setError("Job title is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, number_of_vacancies: Number(form.number_of_vacancies) || 1, salary_min: form.salary_min ? Number(form.salary_min) : null, salary_max: form.salary_max ? Number(form.salary_max) : null };
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) await portalRecruitmentApi.updateOpening(subdomain, token, openingId, payload);
      else await portalRecruitmentApi.createOpening(subdomain, token, payload);
      navigate(`/portal/${subdomain}/recruitment/openings`);
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <PageHeader
        title={editMode ? "Edit Job Opening" : "New Job Opening"}
        breadcrumbs={[{ label: "Job Openings", path: `/portal/${subdomain}/recruitment/openings` }, { label: editMode ? "Edit" : "New" }]}
      />
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>}
      <div className="portal-form-card">
        <div className="portal-form-title">Opening Details</div>
        <div><label className="portal-form-label portal-form-label-req">Job Title</label><input value={form.job_title} onChange={f("job_title")} placeholder="e.g. Senior React Developer" className="input-field" /></div>
        <div className="portal-form-row">
          <div><label className="portal-form-label">Linked Requisition ID</label><input value={form.requisition_id} onChange={f("requisition_id")} placeholder="Optional" className="input-field" /></div>
          <div><label className="portal-form-label">No. of Vacancies</label><input type="number" min={1} value={form.number_of_vacancies} onChange={f("number_of_vacancies")} className="input-field" /></div>
          <div><label className="portal-form-label">Location</label><input value={form.location} onChange={f("location")} placeholder="City / Remote" className="input-field" /></div>
        </div>
        <div className="portal-form-row">
          <div>
            <label className="portal-form-label">Company</label>
            <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value, department_id: "", designation_id: "", branch_id: "" }))} className="input-field">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="portal-form-label">Department</label>
            <select value={form.department_id} onChange={f("department_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>
          <div>
            <label className="portal-form-label">Designation</label>
            <select value={form.designation_id} onChange={f("designation_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select designation…</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
            </select>
          </div>
        </div>
        <div className="portal-form-row">
          <div>
            <label className="portal-form-label">Branch</label>
            <select value={form.branch_id} onChange={f("branch_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
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
          <div><label className="portal-form-label">Experience Required</label><input value={form.experience_required} onChange={f("experience_required")} placeholder="e.g. 2-5 years" className="input-field" /></div>
        </div>
        <div className="portal-form-row">
          <div><label className="portal-form-label">Salary Min (₹/yr)</label><input type="number" value={form.salary_min} onChange={f("salary_min")} placeholder="0" className="input-field" /></div>
          <div><label className="portal-form-label">Salary Max (₹/yr)</label><input type="number" value={form.salary_max} onChange={f("salary_max")} placeholder="0" className="input-field" /></div>
          <div><label className="portal-form-label">Application Deadline</label><input type="date" value={form.application_deadline} onChange={f("application_deadline")} className="input-field" /></div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save" : "Create Opening"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
