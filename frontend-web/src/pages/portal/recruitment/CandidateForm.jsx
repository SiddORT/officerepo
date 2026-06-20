import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}</label>;
const Card = ({ title, children }) => <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{title && <div style={{ fontSize: 13, fontWeight: 700, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}{children}</div>;
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>{children}</div>;

const BLANK = { first_name: "", last_name: "", email: "", mobile_number: "", date_of_birth: "", gender: "", total_experience: "", relevant_experience: "", current_company: "", current_designation: "", current_salary: "", expected_salary: "", notice_period: "", source: "", applied_position_id: "", assigned_recruiter: "" };

export default function CandidateForm({ editMode = false }) {
  const { subdomain, candId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [meta, setMeta] = useState({});
  const [openings, setOpenings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page_size: 100, status: "Open" }).then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
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
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Candidates</span>
        <span>/</span><span>{editMode ? "Edit" : "Add New"}</span>
      </div>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{editMode ? "Edit Candidate" : "Add Candidate"}</h2>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Basic Information">
          <Row>
            <div><Label req>First Name</Label><input value={form.first_name} onChange={f("first_name")} placeholder="First name" style={inp} /></div>
            <div><Label req>Last Name</Label><input value={form.last_name} onChange={f("last_name")} placeholder="Last name" style={inp} /></div>
          </Row>
          <Row>
            <div><Label req>Email</Label><input type="email" value={form.email} onChange={f("email")} placeholder="work@email.com" style={inp} /></div>
            <div><Label req>Mobile Number</Label><input value={form.mobile_number} onChange={f("mobile_number")} placeholder="+91 XXXXX XXXXX" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Date of Birth</Label><input type="date" value={form.date_of_birth} onChange={f("date_of_birth")} style={inp} /></div>
            <div><Label>Gender</Label>
              <select value={form.gender} onChange={f("gender")} style={inp}>
                <option value="">Select…</option>
                {(meta.genders || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </Row>
        </Card>
        <Card title="Professional Information">
          <Row>
            <div><Label>Total Experience</Label><input value={form.total_experience} onChange={f("total_experience")} placeholder="e.g. 3 years" style={inp} /></div>
            <div><Label>Relevant Experience</Label><input value={form.relevant_experience} onChange={f("relevant_experience")} placeholder="e.g. 2 years" style={inp} /></div>
            <div><Label>Notice Period</Label><input value={form.notice_period} onChange={f("notice_period")} placeholder="e.g. 30 days" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Current Company</Label><input value={form.current_company} onChange={f("current_company")} placeholder="Company name" style={inp} /></div>
            <div><Label>Current Designation</Label><input value={form.current_designation} onChange={f("current_designation")} placeholder="Job title" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Current Salary (₹/yr)</Label><input type="number" value={form.current_salary} onChange={f("current_salary")} placeholder="0" style={inp} /></div>
            <div><Label>Expected Salary (₹/yr)</Label><input type="number" value={form.expected_salary} onChange={f("expected_salary")} placeholder="0" style={inp} /></div>
          </Row>
        </Card>
        <Card title="Application Information">
          <Row>
            <div><Label>Source</Label>
              <select value={form.source} onChange={f("source")} style={inp}>
                <option value="">Select source…</option>
                {(meta.candidate_sources || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><Label>Applied Position</Label>
              <select value={form.applied_position_id} onChange={f("applied_position_id")} style={inp}>
                <option value="">Select opening…</option>
                {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} ({o.opening_number})</option>)}
              </select>
            </div>
            <div><Label>Assigned Recruiter</Label><input value={form.assigned_recruiter} onChange={f("assigned_recruiter")} placeholder="Recruiter name" style={inp} /></div>
          </Row>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates`)} style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : editMode ? "Save Changes" : "Add Candidate"}</button>
      </div>
    </div>
  );
}
