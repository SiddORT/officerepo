import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = { first_name: "", last_name: "", email: "", mobile_number: "", date_of_birth: "", gender: "", total_experience: "", relevant_experience: "", current_company: "", current_designation: "", current_salary: "", expected_salary: "", notice_period: "", source: "", applied_position_id: "", assigned_recruiter: "" };

export default function CandidateForm({ editMode = false }) {
  const { subdomain, candId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [meta, setMeta] = useState({});
  const [openings, setOpenings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page_size: 100, status: "Open" }).then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listActiveEmployees(subdomain, token, {}).then(r => setEmployees(r.data.data?.data || [])).catch(() => {});
    if (editMode && candId) {
      portalRecruitmentApi.getCandidate(subdomain, token, candId).then(r => {
        const d = r.data?.data || {};
        setForm({ first_name: d.first_name || "", last_name: d.last_name || "", email: d.email || "", mobile_number: d.mobile_number || "", date_of_birth: d.date_of_birth || "", gender: d.gender || "", total_experience: d.total_experience || "", relevant_experience: d.relevant_experience || "", current_company: d.current_company || "", current_designation: d.current_designation || "", current_salary: d.current_salary || "", expected_salary: d.expected_salary || "", notice_period: d.notice_period || "", source: d.source || "", applied_position_id: d.applied_position_id || "", assigned_recruiter: d.assigned_recruiter || "" });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!form.first_name) { setError("First name is required."); return; }
    if (!form.last_name) { setError("Last name is required."); return; }
    if (!form.email) { setError("Email is required."); return; }
    if (!form.mobile_number) { setError("Mobile number is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (payload.current_salary) payload.current_salary = Number(payload.current_salary);
      if (payload.expected_salary) payload.expected_salary = Number(payload.expected_salary);
      Object.keys(payload).forEach(k => { if (payload[k] === "") delete payload[k]; });
      if (editMode) {
        await portalRecruitmentApi.updateCandidate(subdomain, token, candId, payload);
        navigate(`/portal/${subdomain}/recruitment/candidates/${candId}`);
      } else {
        const r = await portalRecruitmentApi.createCandidate(subdomain, token, payload);
        navigate(`/portal/${subdomain}/recruitment/candidates/${r.data?.data?.id || ""}`);
      }
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Candidate" : "Add Candidate"}
        breadcrumbs={[{ label: "Candidates", path: `/portal/${subdomain}/recruitment/candidates` }, { label: editMode ? "Edit" : "Add New" }]}
      />
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="portal-form-card">
          <div className="portal-form-title">Basic Information</div>
          <div className="portal-form-row">
            <div><label className="portal-form-label portal-form-label-req">First Name</label><input value={form.first_name} onChange={f("first_name")} placeholder="First name" className="input-field" /></div>
            <div><label className="portal-form-label portal-form-label-req">Last Name</label><input value={form.last_name} onChange={f("last_name")} placeholder="Last name" className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label portal-form-label-req">Email</label><input type="email" value={form.email} onChange={f("email")} placeholder="work@email.com" className="input-field" /></div>
            <div><label className="portal-form-label portal-form-label-req">Mobile Number</label><input value={form.mobile_number} onChange={f("mobile_number")} placeholder="+91 XXXXX XXXXX" className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Date of Birth</label><input type="date" value={form.date_of_birth} onChange={f("date_of_birth")} className="input-field" /></div>
            <div>
              <label className="portal-form-label">Gender</label>
              <select value={form.gender} onChange={f("gender")} className="input-field">
                <option value="">Select…</option>
                {(meta.genders || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="portal-form-card">
          <div className="portal-form-title">Professional Information</div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Total Experience</label><input value={form.total_experience} onChange={f("total_experience")} placeholder="e.g. 3 years" className="input-field" /></div>
            <div><label className="portal-form-label">Relevant Experience</label><input value={form.relevant_experience} onChange={f("relevant_experience")} placeholder="e.g. 2 years" className="input-field" /></div>
            <div><label className="portal-form-label">Notice Period</label><input value={form.notice_period} onChange={f("notice_period")} placeholder="e.g. 30 days" className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Current Company</label><input value={form.current_company} onChange={f("current_company")} placeholder="Company name" className="input-field" /></div>
            <div><label className="portal-form-label">Current Designation</label><input value={form.current_designation} onChange={f("current_designation")} placeholder="Job title" className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Current Salary (₹/yr)</label><input type="number" value={form.current_salary} onChange={f("current_salary")} placeholder="0" className="input-field" /></div>
            <div><label className="portal-form-label">Expected Salary (₹/yr)</label><input type="number" value={form.expected_salary} onChange={f("expected_salary")} placeholder="0" className="input-field" /></div>
          </div>
        </div>

        <div className="portal-form-card">
          <div className="portal-form-title">Application Information</div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Source</label>
              <select value={form.source} onChange={f("source")} className="input-field">
                <option value="">Select source…</option>
                {(meta.candidate_sources || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Applied Position</label>
              <select value={form.applied_position_id} onChange={f("applied_position_id")} className="input-field">
                <option value="">Select opening…</option>
                {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} ({o.opening_number})</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Assigned Recruiter</label>
              <select value={form.assigned_recruiter} onChange={f("assigned_recruiter")} className="input-field">
                <option value="">Select recruiter…</option>
                {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name}{e.employee_code ? ` (${e.employee_code})` : ""}</option>)}
                {form.assigned_recruiter && !employees.some(e => e.full_name === form.assigned_recruiter) && (
                  <option value={form.assigned_recruiter}>{form.assigned_recruiter}</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save Changes" : "Add Candidate"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
