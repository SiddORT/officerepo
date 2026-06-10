// @refresh reset
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi, portalOrgApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";

// ── Design tokens ─────────────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box", outline: "none",
};
const Label = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
  </label>
);
const Grid2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>{children}</div>
);
const Grid3 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>{children}</div>
);

function Section({ icon, title, subtitle, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding: 20, display: "grid", gap: 14 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" onClick={() => onChange(!value)}
        style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, background: value ? "var(--c-accent)" : "var(--c-border)", transition: "background 0.2s", flexShrink: 0 }}>
        <span style={{ display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: value ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }} />
      </button>
      <span style={{ fontSize: 13, color: "var(--c-text)" }}>{label}</span>
    </div>
  );
}

// ── Country codes (emoji flags — no CDN, no CSP issues) ────────────────────────
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
        style={{ ...inp, width: 100, borderRadius: "6px 0 0 6px", borderRight: "none", flexShrink: 0, fontSize: 12, paddingLeft: 6, paddingRight: 2 }}
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
        style={{ ...inp, borderRadius: "0 6px 6px 0", flex: 1 }}
      />
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "personal",   label: "Personal",          icon: "👤", step: 1 },
  { id: "contact",    label: "Contact & Address",  icon: "📍", step: 2 },
  { id: "employment", label: "Employment",         icon: "💼", step: 3 },
];

export default function EmployeeForm({ editMode = false }) {
  const { subdomain, empId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error, setError] = useState("");

  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [options, setOptions] = useState({});

  const todayStr = new Date().toISOString().split("T")[0];

  const blank = {
    company_id: "", branch_id: "", department_id: "", designation_id: "",
    work_mode: "",
    first_name: "", middle_name: "", last_name: "", display_name: "",
    gender: "", date_of_birth: "", marital_status: "", blood_group: "", nationality: "",
    personal_email: "", official_email: "",
    mobile_country_code: "+91", mobile_number: "",
    alternate_mobile_country_code: "+91", alternate_mobile: "",
    landline_number: "",
    resume_url: "", resume_filename: "",
    current_address_line_1: "", current_address_line_2: "",
    current_city: "", current_state: "", current_country: "", current_postal_code: "",
    permanent_same_as_current: true,
    permanent_address_line_1: "", permanent_address_line_2: "",
    permanent_city: "", permanent_state: "", permanent_country: "", permanent_postal_code: "",
    employee_category: "", employment_type: "", employment_status: "Draft",
    joining_date: "", confirmation_date: "", relieving_date: "",
    reporting_manager_id: "", functional_manager_id: "",
  };
  const [form, setForm] = useState(blank);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200, is_active: true })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
    portalEmployeeApi.options(subdomain, token)
      .then(r => setOptions(r.data.data || {})).catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listBranches(subdomain, token, { company_id: form.company_id, page_size: 200, status: "active" })
      .then(r => setBranches(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listDesigs(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDesignations(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, form.company_id]);

  useEffect(() => {
    if (!editMode || !empId) { setLoading(false); return; }
    portalEmployeeApi.get(subdomain, token, empId).then(r => {
      const e = r.data.data || {};
      setForm({
        company_id: e.company_id || "", department_id: e.department_id || "", designation_id: e.designation_id || "",
        first_name: e.first_name || "", middle_name: e.middle_name || "", last_name: e.last_name || "",
        display_name: e.display_name || "",
        gender: e.gender || "", date_of_birth: e.date_of_birth || "", marital_status: e.marital_status || "",
        blood_group: e.blood_group || "", nationality: e.nationality || "",
        personal_email: e.personal_email || "", official_email: e.official_email || "",
        mobile_country_code: e.mobile_country_code || "+91", mobile_number: e.mobile_number || "",
        alternate_mobile_country_code: e.alternate_mobile_country_code || "+91", alternate_mobile: e.alternate_mobile || "",
        landline_number: e.landline_number || "",
        resume_url: e.resume_url || "", resume_filename: e.resume_filename || "",
        current_address_line_1: e.current_address_line_1 || "", current_address_line_2: e.current_address_line_2 || "",
        current_city: e.current_city || "", current_state: e.current_state || "",
        current_country: e.current_country || "", current_postal_code: e.current_postal_code || "",
        permanent_same_as_current: e.permanent_same_as_current ?? true,
        permanent_address_line_1: e.permanent_address_line_1 || "", permanent_address_line_2: e.permanent_address_line_2 || "",
        permanent_city: e.permanent_city || "", permanent_state: e.permanent_state || "",
        permanent_country: e.permanent_country || "", permanent_postal_code: e.permanent_postal_code || "",
        branch_id: e.branch_id || "", work_mode: e.work_mode || "",
        employee_category: e.employee_category || "", employment_type: e.employment_type || "",
        employment_status: e.employment_status || "Draft",
        joining_date: e.joining_date || "", confirmation_date: e.confirmation_date || "",
        relieving_date: e.relieving_date || "",
        reporting_manager_id: e.reporting_manager_id || "", functional_manager_id: e.functional_manager_id || "",
      });
    }).catch(() => setError("Failed to load employee.")).finally(() => setLoading(false));
  }, [editMode, empId, subdomain, token]);

  const validate = () => {
    if (!form.first_name.trim()) return "First name is required.";
    if (!form.last_name.trim()) return "Last name is required.";
    if (!form.official_email.trim()) return "Official email is required.";
    if (!form.mobile_number.trim()) return "Mobile number is required.";
    if (!form.company_id) return "Please select a company.";
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.first_name = form.first_name;
    payload.last_name = form.last_name;
    payload.official_email = form.official_email;
    payload.mobile_number = form.mobile_number;
    payload.mobile_country_code = form.mobile_country_code || "+91";
    payload.alternate_mobile_country_code = form.alternate_mobile_country_code || "+91";
    payload.company_id = form.company_id;
    payload.employment_status = form.employment_status || "Draft";
    payload.permanent_same_as_current = form.permanent_same_as_current;
    try {
      let result;
      if (editMode) {
        result = await portalEmployeeApi.update(subdomain, token, empId, payload);
      } else {
        result = await portalEmployeeApi.create(subdomain, token, payload);
      }
      const id = result.data.data?.id || empId;
      navigate(`/portal/${subdomain}/employees/${id}`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Save failed.");
    } finally { setSaving(false); }
  };

  if (loading) {
    return <EmployeeLayout title={editMode ? "Edit Employee" : "Add Employee"}>
      <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
    </EmployeeLayout>;
  }

  const genders         = options.genders || [];
  const maritalStatuses = options.marital_statuses || [];
  const bloodGroups     = options.blood_groups || [];
  const empCategories   = options.employee_categories || [];
  const empTypes        = options.employment_types || [];
  const empStatuses     = options.employment_statuses || [];
  const tabIdx          = TABS.findIndex(t => t.id === tab);

  return (
    <EmployeeLayout title={editMode ? "Edit Employee" : "Add Employee"}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 20, padding: 0, lineHeight: 1 }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-heading)" }}>
            {editMode ? "Edit Employee" : "Add New Employee"}
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {editMode ? "Update employee information" : "Fill in the details to create a new employee record"}
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 14, border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>
      )}

      {/* Step tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 6, position: "relative" }}>
        {TABS.map((t, i) => {
          const active = tab === t.id;
          const done = i < tabIdx;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 8, border: "none", cursor: "pointer",
                background: active ? "var(--c-accent)" : done ? "rgba(var(--c-accent-rgb,99,102,241),0.08)" : "transparent",
                color: active ? "#fff" : done ? "var(--c-accent)" : "var(--c-text2)",
                fontSize: 13, fontWeight: active ? 700 : 500,
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
              <span style={{ fontSize: 11, fontWeight: 700, width: 18, height: 18, borderRadius: "50%", background: active ? "rgba(255,255,255,0.25)" : done ? "var(--c-accent)" : "var(--c-border)", color: active ? "#fff" : done ? "#fff" : "var(--c-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? "✓" : t.step}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>{t.icon} {t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: Personal ─────────────────────────────────────────────────────── */}
      {tab === "personal" && (
        <>
          <Section icon="👤" title="Name" subtitle="Legal name as on official documents">
            <Grid3>
              <div>
                <Label required>First Name</Label>
                <input value={form.first_name} onChange={e => set("first_name", e.target.value)} style={inp} placeholder="Rajan" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <input value={form.middle_name} onChange={e => set("middle_name", e.target.value)} style={inp} placeholder="Kumar" />
              </div>
              <div>
                <Label required>Last Name</Label>
                <input value={form.last_name} onChange={e => set("last_name", e.target.value)} style={inp} placeholder="Sharma" />
              </div>
            </Grid3>
            <div style={{ maxWidth: 360 }}>
              <Label>Display Name</Label>
              <input value={form.display_name} onChange={e => set("display_name", e.target.value)} style={inp} placeholder="Rajan Sharma (optional)" />
            </div>
          </Section>

          <Section icon="🪪" title="Personal Details">
            <Grid3>
              <div>
                <Label>Gender</Label>
                <select value={form.gender} onChange={e => set("gender", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => set("date_of_birth", e.target.value)}
                  max={todayStr}
                  min="1940-01-01"
                  style={inp}
                />
              </div>
              <div>
                <Label>Marital Status</Label>
                <select value={form.marital_status} onChange={e => set("marital_status", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {maritalStatuses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <select value={form.blood_group} onChange={e => set("blood_group", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {bloodGroups.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <Label>Nationality</Label>
                <input value={form.nationality} onChange={e => set("nationality", e.target.value)} style={inp} placeholder="Indian" />
              </div>
            </Grid3>
          </Section>
        </>
      )}

      {/* ── Tab: Contact & Address ──────────────────────────────────────────── */}
      {tab === "contact" && (
        <>
          <Section icon="📧" title="Contact Information">
            <Grid2>
              <div>
                <Label required>Official Email</Label>
                <input type="email" value={form.official_email} onChange={e => set("official_email", e.target.value)} style={inp} placeholder="rajan@company.com" />
              </div>
              <div>
                <Label>Personal Email</Label>
                <input type="email" value={form.personal_email} onChange={e => set("personal_email", e.target.value)} style={inp} placeholder="rajan@gmail.com" />
              </div>
            </Grid2>
            <Grid2>
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
              <div>
                <Label>Alternate Mobile</Label>
                <PhoneInput
                  countryCode={form.alternate_mobile_country_code}
                  number={form.alternate_mobile}
                  onCountryChange={v => set("alternate_mobile_country_code", v)}
                  onNumberChange={v => set("alternate_mobile", v)}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <Label>Landline</Label>
                <input value={form.landline_number} onChange={e => set("landline_number", e.target.value)} style={inp} placeholder="022-12345678" />
              </div>
            </Grid2>
          </Section>

          <Section icon="🏠" title="Current Address">
            <div>
              <Label>Address Line 1</Label>
              <input value={form.current_address_line_1} onChange={e => set("current_address_line_1", e.target.value)} style={inp} placeholder="Flat / House / Building" />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <input value={form.current_address_line_2} onChange={e => set("current_address_line_2", e.target.value)} style={inp} placeholder="Street / Area / Locality" />
            </div>
            <Grid3>
              <div><Label>City</Label><input value={form.current_city} onChange={e => set("current_city", e.target.value)} style={inp} placeholder="Mumbai" /></div>
              <div><Label>State</Label><input value={form.current_state} onChange={e => set("current_state", e.target.value)} style={inp} placeholder="Maharashtra" /></div>
              <div><Label>Country</Label><input value={form.current_country} onChange={e => set("current_country", e.target.value)} style={inp} placeholder="India" /></div>
              <div><Label>Postal Code</Label><input value={form.current_postal_code} onChange={e => set("current_postal_code", e.target.value)} style={inp} placeholder="400001" /></div>
            </Grid3>
          </Section>

          <Section icon="📦" title="Permanent Address">
            <Toggle
              value={form.permanent_same_as_current}
              onChange={v => set("permanent_same_as_current", v)}
              label="Same as current address"
            />
            {!form.permanent_same_as_current && (
              <>
                <div><Label>Address Line 1</Label><input value={form.permanent_address_line_1} onChange={e => set("permanent_address_line_1", e.target.value)} style={inp} placeholder="Flat / House / Building" /></div>
                <div><Label>Address Line 2</Label><input value={form.permanent_address_line_2} onChange={e => set("permanent_address_line_2", e.target.value)} style={inp} placeholder="Street / Area / Locality" /></div>
                <Grid3>
                  <div><Label>City</Label><input value={form.permanent_city} onChange={e => set("permanent_city", e.target.value)} style={inp} placeholder="Delhi" /></div>
                  <div><Label>State</Label><input value={form.permanent_state} onChange={e => set("permanent_state", e.target.value)} style={inp} placeholder="Delhi" /></div>
                  <div><Label>Country</Label><input value={form.permanent_country} onChange={e => set("permanent_country", e.target.value)} style={inp} placeholder="India" /></div>
                  <div><Label>Postal Code</Label><input value={form.permanent_postal_code} onChange={e => set("permanent_postal_code", e.target.value)} style={inp} placeholder="110001" /></div>
                </Grid3>
              </>
            )}
          </Section>
        </>
      )}

      {/* ── Tab: Employment ─────────────────────────────────────────────────── */}
      {tab === "employment" && (
        <>
          <Section icon="🏢" title="Organization" subtitle="Company, branch, department and designation">
            <div>
              <Label required>Company</Label>
              <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("branch_id", ""); set("department_id", ""); set("designation_id", ""); }} style={inp}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <Grid2>
              <div>
                <Label>Branch</Label>
                <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} style={inp} disabled={!form.company_id}>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Work Mode</Label>
                <select value={form.work_mode} onChange={e => set("work_mode", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {["Onsite", "Work From Home", "Hybrid", "Remote"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </Grid2>
            <Grid2>
              <div>
                <Label>Department</Label>
                <select value={form.department_id} onChange={e => set("department_id", e.target.value)} style={inp} disabled={!form.company_id}>
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Designation</Label>
                <select value={form.designation_id} onChange={e => set("designation_id", e.target.value)} style={inp} disabled={!form.company_id}>
                  <option value="">Select designation…</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                </select>
              </div>
            </Grid2>
          </Section>

          <Section icon="📋" title="Classification">
            <Grid3>
              <div>
                <Label>Category</Label>
                <select value={form.employee_category} onChange={e => set("employee_category", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {empCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <select value={form.employment_type} onChange={e => set("employment_type", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {empTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.employment_status} onChange={e => set("employment_status", e.target.value)} style={inp}>
                  {empStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Grid3>
          </Section>

          <Section icon="📅" title="Employment Dates">
            <Grid3>
              <div>
                <Label>Joining Date</Label>
                <input type="date" value={form.joining_date} onChange={e => set("joining_date", e.target.value)} style={inp} />
              </div>
              <div>
                <Label>Confirmation Date</Label>
                <input type="date" value={form.confirmation_date} onChange={e => set("confirmation_date", e.target.value)} style={inp} />
              </div>
              <div>
                <Label>Relieving Date</Label>
                <input type="date" value={form.relieving_date} onChange={e => set("relieving_date", e.target.value)} style={inp} />
              </div>
            </Grid3>
          </Section>

          <Section icon="📎" title="Resume" subtitle="Link to resume document (Google Drive, Dropbox, etc.)">
            <Grid2>
              <div>
                <Label>Resume / CV URL</Label>
                <input
                  type="url"
                  value={form.resume_url}
                  onChange={e => set("resume_url", e.target.value)}
                  style={inp}
                  placeholder="https://drive.google.com/…"
                />
              </div>
              <div>
                <Label>Document Label</Label>
                <input
                  value={form.resume_filename}
                  onChange={e => set("resume_filename", e.target.value)}
                  style={inp}
                  placeholder="Resume_Rajan_2024.pdf"
                />
              </div>
            </Grid2>
          </Section>
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8, paddingBottom: 24 }}>
        <button onClick={() => navigate(-1)}
          style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text)", fontSize: 13 }}>
          Cancel
        </button>
        {tab !== "personal" && (
          <button onClick={() => setTab(TABS[tabIdx - 1]?.id || "personal")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text)", fontSize: 13 }}>
            ← Back
          </button>
        )}
        {tab !== "employment" ? (
          <button onClick={() => setTab(TABS[tabIdx + 1]?.id || "employment")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: saving ? "var(--c-border)" : "var(--c-accent)", color: saving ? "var(--c-muted)" : "#fff", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "✓ Create Employee"}
          </button>
        )}
      </div>
    </EmployeeLayout>
  );
}
