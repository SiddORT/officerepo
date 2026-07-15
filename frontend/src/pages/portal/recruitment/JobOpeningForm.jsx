import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = {
  job_title: "", requisition_id: "", company_id: "", branch_id: "",
  department_id: "", designation_id: "", hiring_manager: "",
  number_of_vacancies: 1, employment_type: "", employee_category: "",
  experience_required: "", salary_min: "", salary_max: "",
  application_deadline: "", expected_joining_date: "",
  job_description: "", skills_required: "",
};

const Label = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{required && <span style={{ color: "#f87171" }}> *</span>}
  </label>
);

const Row4 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
    {children}
  </div>
);

export default function JobOpeningForm({ editMode = false }) {
  const { subdomain, openingId } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const fromRequisitionId = searchParams.get("requisition_id") || "";
  const [form, setForm] = useState({ ...BLANK, requisition_id: fromRequisitionId });
  const [requisitionRef, setRequisitionRef] = useState(null);
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
        setForm({
          job_title: d.job_title || "", requisition_id: d.requisition_id || "",
          company_id: d.company_id || "", branch_id: d.branch_id || "",
          department_id: d.department_id || "", designation_id: d.designation_id || "",
          hiring_manager: d.hiring_manager || "",
          number_of_vacancies: d.number_of_vacancies || 1,
          employment_type: d.employment_type || "", employee_category: d.employee_category || "",
          experience_required: d.experience_required || "",
          salary_min: d.salary_min || "", salary_max: d.salary_max || "",
          application_deadline: d.application_deadline || "",
          expected_joining_date: d.expected_joining_date || "",
          job_description: d.job_description || "", skills_required: d.skills_required || "",
        });
      }).catch(() => {});
    } else if (!editMode && fromRequisitionId) {
      portalRecruitmentApi.getRequisition(subdomain, token, fromRequisitionId).then(r => {
        const d = r.data?.data || {};
        setRequisitionRef({ number: d.requisition_number, designation: d.designation_name });
        setForm(prev => ({
          ...prev,
          requisition_id: fromRequisitionId,
          company_id: d.company_id || "",
          branch_id: d.branch_id || "",
          department_id: d.department_id || "",
          designation_id: d.designation_id || "",
          employment_type: d.employment_type || "",
          employee_category: d.employee_category || "",
          hiring_manager: d.hiring_manager || "",
          number_of_vacancies: d.number_of_positions || 1,
          salary_min: d.budget_min || "",
          salary_max: d.budget_max || "",
          expected_joining_date: d.target_joining_date || "",
          job_description: d.job_description || "",
          skills_required: d.skills_required || "",
        }));
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
      const payload = {
        ...form,
        number_of_vacancies: Number(form.number_of_vacancies) || 1,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) await portalRecruitmentApi.updateOpening(subdomain, token, openingId, payload);
      else await portalRecruitmentApi.createOpening(subdomain, token, payload);
      navigate(`/portal/${subdomain}/recruitment/openings`);
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Job Opening" : "New Job Opening"}
        breadcrumbs={[{ label: "Job Openings", path: `/portal/${subdomain}/recruitment/openings` }, { label: editMode ? "Edit" : "New" }]}
      />

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>
          {error}
        </div>
      )}

      {requisitionRef && (
        <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#06b6d4", fontWeight: 600 }}>⟵ Linked Requisition:</span>
          <span className="t-heading">{requisitionRef.number}{requisitionRef.designation ? ` — ${requisitionRef.designation}` : ""}</span>
          <span className="t-muted" style={{ fontSize: 11 }}>Fields pre-filled from requisition. You can still edit them.</span>
        </div>
      )}

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--c-shadow)" }}>

        {/* Job Title — full width */}
        <div>
          <Label required>Job Title</Label>
          <input value={form.job_title} onChange={f("job_title")} placeholder="e.g. Senior React Developer" className="input-field" />
        </div>

        {/* Row 1 — Vacancies | Employment Type | Employee Category | Experience */}
        <Row4>
          <div>
            <Label>No. of Vacancies</Label>
            <input type="number" min={1} value={form.number_of_vacancies} onChange={f("number_of_vacancies")} className="input-field" />
          </div>
          <div>
            <Label>Employment Type</Label>
            <select value={form.employment_type} onChange={f("employment_type")} className="input-field">
              <option value="">Select…</option>
              {(meta.employment_types || []).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <Label>Employee Category</Label>
            <select value={form.employee_category} onChange={f("employee_category")} className="input-field">
              <option value="">Select…</option>
              {(meta.employee_categories || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Experience Required</Label>
            <input value={form.experience_required} onChange={f("experience_required")} placeholder="e.g. 2-5 years" className="input-field" />
          </div>
        </Row4>

        {/* Row 2 — Company | Department | Designation | Branch */}
        <Row4>
          <div>
            <Label>Company</Label>
            <select value={form.company_id} onChange={e => setForm(p => ({ ...p, company_id: e.target.value, department_id: "", designation_id: "", branch_id: "" }))} className="input-field">
              <option value="">Select company…</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Department</Label>
            <select value={form.department_id} onChange={f("department_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select department…</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Designation</Label>
            <select value={form.designation_id} onChange={f("designation_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select designation…</option>
              {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
            </select>
          </div>
          <div>
            <Label>Branch</Label>
            <select value={form.branch_id} onChange={f("branch_id")} className="input-field" disabled={!form.company_id}>
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
        </Row4>

        {/* Hiring Manager — spans first col */}
        <Row4>
          <div>
            <Label>Hiring Manager</Label>
            <input value={form.hiring_manager} onChange={f("hiring_manager")} placeholder="e.g. Ravi Kumar" className="input-field" />
          </div>
        </Row4>

        {/* Row 3 — Salary Min | Salary Max | Application Deadline | Expected Joining Date */}
        <Row4>
          <div>
            <Label>Salary Min (₹/yr)</Label>
            <input type="number" value={form.salary_min} onChange={f("salary_min")} placeholder="e.g. 500000" className="input-field" />
          </div>
          <div>
            <Label>Salary Max (₹/yr)</Label>
            <input type="number" value={form.salary_max} onChange={f("salary_max")} placeholder="e.g. 1200000" className="input-field" />
          </div>
          <div>
            <Label>Application Deadline</Label>
            <input type="date" value={form.application_deadline} onChange={f("application_deadline")} className="input-field" />
          </div>
          <div>
            <Label>Expected Joining Date</Label>
            <input type="date" value={form.expected_joining_date} onChange={f("expected_joining_date")} className="input-field" />
          </div>
        </Row4>

        {/* Job Description — full width */}
        <div>
          <Label>Job Description</Label>
          <textarea
            value={form.job_description}
            onChange={f("job_description")}
            rows={5}
            placeholder="Describe the role, responsibilities, and requirements…"
            className="input-field"
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

        {/* Skills Required — full width */}
        <div>
          <Label>Skills Required</Label>
          <textarea
            value={form.skills_required}
            onChange={f("skills_required")}
            rows={3}
            placeholder="e.g. React, Python, Communication, Team Leadership…"
            className="input-field"
            style={{ resize: "vertical", lineHeight: 1.6 }}
          />
        </div>

      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save Changes" : "Create Opening"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
