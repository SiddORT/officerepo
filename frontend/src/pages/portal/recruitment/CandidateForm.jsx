import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const COUNTRY_CODES = [
  { code: "+91",  label: "🇮🇳 +91",  name: "India" },
  { code: "+1",   label: "🇺🇸 +1",   name: "USA/Canada" },
  { code: "+44",  label: "🇬🇧 +44",  name: "UK" },
  { code: "+971", label: "🇦🇪 +971", name: "UAE" },
  { code: "+65",  label: "🇸🇬 +65",  name: "Singapore" },
  { code: "+61",  label: "🇦🇺 +61",  name: "Australia" },
  { code: "+60",  label: "🇲🇾 +60",  name: "Malaysia" },
  { code: "+66",  label: "🇹🇭 +66",  name: "Thailand" },
  { code: "+880", label: "🇧🇩 +880", name: "Bangladesh" },
  { code: "+92",  label: "🇵🇰 +92",  name: "Pakistan" },
  { code: "+94",  label: "🇱🇰 +94",  name: "Sri Lanka" },
  { code: "+977", label: "🇳🇵 +977", name: "Nepal" },
  { code: "+968", label: "🇴🇲 +968", name: "Oman" },
  { code: "+966", label: "🇸🇦 +966", name: "Saudi Arabia" },
  { code: "+974", label: "🇶🇦 +974", name: "Qatar" },
  { code: "+973", label: "🇧🇭 +973", name: "Bahrain" },
  { code: "+49",  label: "🇩🇪 +49",  name: "Germany" },
  { code: "+33",  label: "🇫🇷 +33",  name: "France" },
  { code: "+39",  label: "🇮🇹 +39",  name: "Italy" },
  { code: "+81",  label: "🇯🇵 +81",  name: "Japan" },
  { code: "+86",  label: "🇨🇳 +86",  name: "China" },
  { code: "+82",  label: "🇰🇷 +82",  name: "South Korea" },
  { code: "+27",  label: "🇿🇦 +27",  name: "South Africa" },
  { code: "+55",  label: "🇧🇷 +55",  name: "Brazil" },
  { code: "+7",   label: "🇷🇺 +7",   name: "Russia" },
];

function PhoneInput({ countryCode, number, onCountryChange, onNumberChange, placeholder, required }) {
  return (
    <div style={{ display: "flex" }}>
      <select
        value={countryCode || "+91"}
        onChange={e => onCountryChange(e.target.value)}
        className="input-field"
        style={{ width: 100, borderRadius: "6px 0 0 6px", borderRight: "none", flexShrink: 0, fontSize: 12, paddingLeft: 6, paddingRight: 2 }}
      >
        {COUNTRY_CODES.map(c => (
          <option key={c.code} value={c.code} title={c.name}>{c.label}</option>
        ))}
      </select>
      <input
        value={number || ""}
        onChange={e => onNumberChange(e.target.value)}
        placeholder={placeholder || "9876543210"}
        required={required}
        className="input-field"
        style={{ borderRadius: "0 6px 6px 0", flex: 1 }}
      />
    </div>
  );
}

const BLANK = {
  first_name: "", last_name: "", email: "",
  mobile_country_code: "+91", mobile_number: "",
  date_of_birth: "", gender: "",
  total_experience: "", relevant_experience: "", notice_period: "",
  current_company: "", current_designation: "",
  current_salary: "", expected_salary: "",
  source: "", applied_position_id: "", assigned_recruiter: "",
};

const Row4 = ({ children }) => (
  <div className="form-grid-4">{children}</div>
);

const Label = ({ children, required }) => (
  <label className={`portal-form-label${required ? " portal-form-label-req" : ""}`}>
    {children}
  </label>
);

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
        setForm({
          first_name: d.first_name || "", last_name: d.last_name || "",
          email: d.email || "",
          mobile_country_code: d.mobile_country_code || "+91",
          mobile_number: d.mobile_number || "",
          date_of_birth: d.date_of_birth || "", gender: d.gender || "",
          total_experience: d.total_experience || "", relevant_experience: d.relevant_experience || "",
          notice_period: d.notice_period || "",
          current_company: d.current_company || "", current_designation: d.current_designation || "",
          current_salary: d.current_salary || "", expected_salary: d.expected_salary || "",
          source: d.source || "", applied_position_id: d.applied_position_id || "",
          assigned_recruiter: d.assigned_recruiter || "",
        });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const onPositionChange = async (openingId) => {
    setForm(p => ({ ...p, applied_position_id: openingId }));
    if (!openingId) return;
    const opening = openings.find(o => o.id === openingId);
    if (!opening?.requisition_id) return;
    try {
      const r = await portalRecruitmentApi.getRequisition(subdomain, token, opening.requisition_id);
      const hiring_manager = r.data?.data?.hiring_manager;
      if (hiring_manager) {
        setForm(p => ({ ...p, assigned_recruiter: p.assigned_recruiter || hiring_manager }));
      }
    } catch (_) {}
  };

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
      payload.mobile_country_code = form.mobile_country_code || "+91";
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

        {/* ── Basic Information ── */}
        <div className="portal-form-card">
          <div className="portal-form-title">Basic Information</div>

          {/* Row 1: First Name | Last Name | Email | Mobile */}
          <Row4>
            <div>
              <Label required>First Name</Label>
              <input value={form.first_name} onChange={f("first_name")} placeholder="First name" className="input-field" />
            </div>
            <div>
              <Label required>Last Name</Label>
              <input value={form.last_name} onChange={f("last_name")} placeholder="Last name" className="input-field" />
            </div>
            <div>
              <Label required>Email</Label>
              <input type="email" value={form.email} onChange={f("email")} placeholder="work@email.com" className="input-field" />
            </div>
            <div>
              <Label required>Mobile Number</Label>
              <PhoneInput
                countryCode={form.mobile_country_code}
                number={form.mobile_number}
                onCountryChange={v => set("mobile_country_code", v)}
                onNumberChange={v => set("mobile_number", v)}
                placeholder="9876543210"
                required
              />
            </div>
          </Row4>

          {/* Row 2: DOB | Gender */}
          <div className="form-grid-4" style={{ marginTop: 14 }}>
            <div>
              <Label>Date of Birth</Label>
              <input type="date" value={form.date_of_birth} onChange={f("date_of_birth")} className="input-field" />
            </div>
            <div>
              <Label>Gender</Label>
              <select value={form.gender} onChange={f("gender")} className="input-field">
                <option value="">Select…</option>
                {(meta.genders || []).map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Professional Information ── */}
        <div className="portal-form-card">
          <div className="portal-form-title">Professional Information</div>

          {/* Row 1: Total Exp | Relevant Exp | Notice Period | Current Company */}
          <Row4>
            <div>
              <Label>Total Experience</Label>
              <input value={form.total_experience} onChange={f("total_experience")} placeholder="e.g. 3 years" className="input-field" />
            </div>
            <div>
              <Label>Relevant Experience</Label>
              <input value={form.relevant_experience} onChange={f("relevant_experience")} placeholder="e.g. 2 years" className="input-field" />
            </div>
            <div>
              <Label>Notice Period</Label>
              <input value={form.notice_period} onChange={f("notice_period")} placeholder="e.g. 30 days" className="input-field" />
            </div>
            <div>
              <Label>Current Company</Label>
              <input value={form.current_company} onChange={f("current_company")} placeholder="Company name" className="input-field" />
            </div>
          </Row4>

          {/* Row 2: Current Designation | Current Salary | Expected Salary */}
          <div className="form-grid-4" style={{ marginTop: 14 }}>
            <div>
              <Label>Current Designation</Label>
              <input value={form.current_designation} onChange={f("current_designation")} placeholder="Job title" className="input-field" />
            </div>
            <div>
              <Label>Current Salary (₹/yr)</Label>
              <input type="number" value={form.current_salary} onChange={f("current_salary")} placeholder="0" className="input-field" />
            </div>
            <div>
              <Label>Expected Salary (₹/yr)</Label>
              <input type="number" value={form.expected_salary} onChange={f("expected_salary")} placeholder="0" className="input-field" />
            </div>
          </div>
        </div>

        {/* ── Application Information ── */}
        <div className="portal-form-card">
          <div className="portal-form-title">Application Information</div>

          {/* Row 1: Source | Applied Position | Recruiter */}
          <Row4>
            <div>
              <Label>Source</Label>
              <select value={form.source} onChange={f("source")} className="input-field">
                <option value="">Select source…</option>
                {(meta.candidate_sources || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <Label>Applied Position</Label>
              <select value={form.applied_position_id} onChange={e => onPositionChange(e.target.value)} className="input-field">
                <option value="">Select opening…</option>
                {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} ({o.opening_number})</option>)}
              </select>
            </div>
            <div>
              <Label>Assigned Recruiter</Label>
              <select value={form.assigned_recruiter} onChange={f("assigned_recruiter")} className="input-field">
                <option value="">Select recruiter…</option>
                {employees.map(e => <option key={e.id} value={e.full_name}>{e.full_name}{e.employee_code ? ` (${e.employee_code})` : ""}</option>)}
                {form.assigned_recruiter && !employees.some(e => e.full_name === form.assigned_recruiter) && (
                  <option value={form.assigned_recruiter}>{form.assigned_recruiter}</option>
                )}
              </select>
            </div>
          </Row4>
        </div>

      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save Changes" : "Add Candidate"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
