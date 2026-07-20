// @refresh reset
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi, portalOrgApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";
import PageHeader from "../shared/PageHeader";
import Toggle from "../../../components/ui/Toggle";
import usePincodeLookup from "../../../hooks/usePincodeLookup";

// ── Design tokens ─────────────────────────────────────────────────────────────
const Grid2 = ({ children }) => (
  <div className="portal-form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>{children}</div>
);
const Grid3 = ({ children }) => (
  <div className="portal-form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>{children}</div>
);

function Section({ icon, title, subtitle, children }) {
  return (
    <div className="portal-form-card" style={{ marginBottom: 16 }}>
      <div className="portal-form-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div>
          <div>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1, fontWeight: 400 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: "grid", gap: 14 }}>{children}</div>
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

const COUNTRY_OPTIONS = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahrain", "Bangladesh", "Belarus", "Belgium", "Bolivia", "Bosnia and Herzegovina",
  "Brazil", "Bulgaria", "Cambodia", "Cameroon", "Canada", "Chile", "China", "Colombia",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Dominican Republic",
  "Ecuador", "Egypt", "Estonia", "Ethiopia", "Finland", "France", "Georgia", "Germany",
  "Ghana", "Greece", "Guatemala", "Honduras", "Hungary", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Libya", "Lithuania", "Luxembourg",
  "Malaysia", "Maldives", "Malta", "Mexico", "Moldova", "Mongolia", "Morocco", "Mozambique",
  "Namibia", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway", "Oman", "Pakistan",
  "Palestine", "Panama", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar",
  "Romania", "Russia", "Rwanda", "Saudi Arabia", "Serbia", "Singapore", "Slovakia",
  "Slovenia", "Somalia", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Tunisia", "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam",
  "Yemen", "Zambia", "Zimbabwe", "Other",
];

const NATIONALITY_OPTIONS = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian",
  "Australian", "Austrian", "Azerbaijani", "Bahraini", "Bangladeshi", "Belarusian", "Belgian",
  "Bolivian", "Bosnian", "Brazilian", "British", "Bulgarian", "Cambodian", "Cameroonian",
  "Canadian", "Chilean", "Chinese", "Colombian", "Congolese", "Croatian", "Cuban", "Cypriot",
  "Czech", "Danish", "Dominican", "Dutch", "Ecuadorian", "Egyptian", "Emirati", "Estonian",
  "Ethiopian", "Filipino", "Finnish", "French", "Georgian", "German", "Ghanaian", "Greek",
  "Guatemalan", "Honduran", "Hungarian", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish",
  "Israeli", "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakhstani", "Kenyan",
  "Kuwaiti", "Kyrgyz", "Laotian", "Latvian", "Lebanese", "Libyan", "Lithuanian", "Luxembourgish",
  "Macedonian", "Malaysian", "Maldivian", "Maltese", "Mexican", "Moldovan", "Mongolian",
  "Moroccan", "Mozambican", "Namibian", "Nepali", "New Zealander", "Nigerian", "Norwegian",
  "Omani", "Pakistani", "Palestinian", "Panamanian", "Paraguayan", "Peruvian", "Polish",
  "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan", "Saudi", "Serbian", "Singaporean",
  "Slovak", "Slovenian", "Somali", "South African", "South Korean", "Spanish", "Sri Lankan",
  "Sudanese", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai",
  "Tunisian", "Turkish", "Turkmen", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan",
  "Vietnamese", "Yemeni", "Zambian", "Zimbabwean", "Other",
];

const Label = ({ children, required }) => (
  <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>
    {children}
  </label>
);

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
  const [nationalityOther, setNationalityOther] = useState("");
  const [currentCountryOther, setCurrentCountryOther] = useState("");
  const [permanentCountryOther, setPermanentCountryOther] = useState("");

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
    current_postal_code: "", current_city: "", current_district: "", current_state: "", current_country: "",
    permanent_same_as_current: true,
    permanent_address_line_1: "", permanent_address_line_2: "",
    permanent_postal_code: "", permanent_city: "", permanent_district: "", permanent_state: "", permanent_country: "",
    employee_category: "", employment_type: "", employment_status: "Draft",
    joining_date: "", confirmation_date: "", relieving_date: "",
    reporting_manager_id: "", functional_manager_id: "",
  };
  const [form, setForm] = useState(blank);
  const displayNameTouched = useRef(editMode);
  const { lookup } = usePincodeLookup();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePincodeChange = async (postalCode, prefix) => {
    const code = (postalCode || "").trim();
    set(`${prefix}_postal_code`, postalCode);
    if (code.length < 5) return;
    const cc = form[`${prefix}_country`] || "IN";
    const result = await lookup(code, cc);
    if (!result) return;
    setForm(f => ({
      ...f,
      [`${prefix}_city`]:     result.city     || f[`${prefix}_city`],
      [`${prefix}_district`]: result.district || f[`${prefix}_district`],
      [`${prefix}_state`]:    result.state    || f[`${prefix}_state`],
      [`${prefix}_country`]:  result.country  || f[`${prefix}_country`],
    }));
  };

  useEffect(() => {
    if (displayNameTouched.current) return;
    const first = (form.first_name || "").trim();
    const last  = (form.last_name  || "").trim();
    const auto  = [first, last].filter(Boolean).join(" ");
    setForm(f => ({ ...f, display_name: auto }));
  }, [form.first_name, form.last_name]);

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
        blood_group: e.blood_group || "", nationality: NATIONALITY_OPTIONS.includes(e.nationality || "") ? (e.nationality || "") : (e.nationality ? "Other" : ""),
        personal_email: e.personal_email || "", official_email: e.official_email || "",
        mobile_country_code: e.mobile_country_code || "+91", mobile_number: e.mobile_number || "",
        alternate_mobile_country_code: e.alternate_mobile_country_code || "+91", alternate_mobile: e.alternate_mobile || "",
        landline_number: e.landline_number || "",
        resume_url: e.resume_url || "", resume_filename: e.resume_filename || "",
        current_address_line_1: e.current_address_line_1 || "", current_address_line_2: e.current_address_line_2 || "",
        current_postal_code: e.current_postal_code || "", current_city: e.current_city || "",
        current_district: e.current_district || "", current_state: e.current_state || "",
        current_country: COUNTRY_OPTIONS.includes(e.current_country || "") ? (e.current_country || "") : (e.current_country ? "Other" : ""),
        permanent_same_as_current: e.permanent_same_as_current ?? true,
        permanent_address_line_1: e.permanent_address_line_1 || "", permanent_address_line_2: e.permanent_address_line_2 || "",
        permanent_postal_code: e.permanent_postal_code || "", permanent_city: e.permanent_city || "",
        permanent_district: e.permanent_district || "", permanent_state: e.permanent_state || "",
        permanent_country: COUNTRY_OPTIONS.includes(e.permanent_country || "") ? (e.permanent_country || "") : (e.permanent_country ? "Other" : ""),
        branch_id: e.branch_id || "", work_mode: e.work_mode || "",
        employee_category: e.employee_category || "", employment_type: e.employment_type || "",
        employment_status: e.employment_status || "Draft",
        joining_date: e.joining_date || "", confirmation_date: e.confirmation_date || "",
        relieving_date: e.relieving_date || "",
        reporting_manager_id: e.reporting_manager_id || "", functional_manager_id: e.functional_manager_id || "",
      });
      if (e.nationality && !NATIONALITY_OPTIONS.includes(e.nationality)) {
        setNationalityOther(e.nationality);
      }
      if (e.current_country && !COUNTRY_OPTIONS.includes(e.current_country)) {
        setCurrentCountryOther(e.current_country);
      }
      if (e.permanent_country && !COUNTRY_OPTIONS.includes(e.permanent_country)) {
        setPermanentCountryOther(e.permanent_country);
      }
    }).catch(() => setError("Failed to load employee.")).finally(() => setLoading(false));
  }, [editMode, empId, subdomain, token]);

  const validate = () => {
    if (!form.first_name.trim()) return "First name is required.";
    if (!form.last_name.trim()) return "Last name is required.";
    if (!form.official_email.trim()) return "Official email is required.";
    if (!form.mobile_number.trim()) return "Mobile number is required.";
    if (!form.company_id) return "Please select a company.";
    if (form.nationality === "Other" && !nationalityOther.trim()) return "Please specify the nationality when selecting 'Other'.";
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true); setError("");
    const payload = { ...form };
    if (payload.nationality === "Other") {
      payload.nationality = nationalityOther.trim() || null;
    }
    if (payload.current_country === "Other") {
      payload.current_country = currentCountryOther.trim() || null;
    }
    if (payload.permanent_country === "Other") {
      payload.permanent_country = permanentCountryOther.trim() || null;
    }
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
      <PageHeader
        title={editMode ? "Edit Employee" : "Add New Employee"}
        subtitle={editMode ? "Update employee information" : "Fill in the details to create a new employee record"}
        breadcrumbs={[
          { label: "Employees", path: `/portal/${subdomain}/employees` },
          { label: editMode ? "Edit" : "New" }
        ]}
      />

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
                <input value={form.first_name} onChange={e => set("first_name", e.target.value)} className="input-field" placeholder="Rajan" />
              </div>
              <div>
                <Label>Middle Name</Label>
                <input value={form.middle_name} onChange={e => set("middle_name", e.target.value)} className="input-field" placeholder="Kumar" />
              </div>
              <div>
                <Label required>Last Name</Label>
                <input value={form.last_name} onChange={e => set("last_name", e.target.value)} className="input-field" placeholder="Sharma" />
              </div>
            </Grid3>
            <div style={{ maxWidth: 360 }}>
              <Label>Display Name</Label>
              <input
                value={form.display_name}
                onChange={e => {
                  displayNameTouched.current = true;
                  set("display_name", e.target.value);
                }}
                className="input-field"
                placeholder="Rajan Sharma (auto-generated)"
              />
            </div>
          </Section>

          <Section icon="🪪" title="Personal Details">
            <Grid3>
              <div>
                <Label>Gender</Label>
                <select value={form.gender} onChange={e => set("gender", e.target.value)} className="input-field">
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
                  className="input-field"
                />
              </div>
              <div>
                <Label>Marital Status</Label>
                <select value={form.marital_status} onChange={e => set("marital_status", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {maritalStatuses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <Label>Blood Group</Label>
                <select value={form.blood_group} onChange={e => set("blood_group", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {bloodGroups.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <Label>Nationality</Label>
                <select
                  value={form.nationality}
                  onChange={e => {
                    set("nationality", e.target.value);
                    if (e.target.value !== "Other") setNationalityOther("");
                  }}
                  className="input-field"
                >
                  <option value="">Select…</option>
                  {NATIONALITY_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {form.nationality === "Other" && (
                  <>
                    <input
                      value={nationalityOther}
                      onChange={e => setNationalityOther(e.target.value)}
                      className="input-field"
                      placeholder="Please specify nationality…"
                      style={{ marginTop: 8, borderColor: error && !nationalityOther.trim() ? "#f87171" : undefined }}
                      autoFocus
                    />
                    {error && !nationalityOther.trim() && (
                      <div style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>Please specify the nationality.</div>
                    )}
                  </>
                )}
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
                <input type="email" value={form.official_email} onChange={e => set("official_email", e.target.value)} className="input-field" placeholder="rajan@company.com" />
              </div>
              <div>
                <Label>Personal Email</Label>
                <input type="email" value={form.personal_email} onChange={e => set("personal_email", e.target.value)} className="input-field" placeholder="rajan@gmail.com" />
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
                <input value={form.landline_number} onChange={e => set("landline_number", e.target.value)} className="input-field" placeholder="022-12345678" />
              </div>
            </Grid2>
          </Section>

          <Section icon="🏠" title="Current Address">
            <Grid2>
              <div>
                <Label>Postal Code</Label>
                <input value={form.current_postal_code} onChange={e => handlePincodeChange(e.target.value, "current")} className="input-field" placeholder="400001" />
              </div>
            </Grid2>
            <div>
              <Label>Address Line 1</Label>
              <input value={form.current_address_line_1} onChange={e => set("current_address_line_1", e.target.value)} className="input-field" placeholder="Flat / House / Building" />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <input value={form.current_address_line_2} onChange={e => set("current_address_line_2", e.target.value)} className="input-field" placeholder="Street / Area / Locality" />
            </div>
            <Grid3>
              <div><Label>City</Label><input value={form.current_city} onChange={e => set("current_city", e.target.value)} className="input-field" placeholder="Mumbai" /></div>
              <div><Label>District</Label><input value={form.current_district} onChange={e => set("current_district", e.target.value)} className="input-field" placeholder="Mumbai Suburban" /></div>
              <div><Label>State</Label><input value={form.current_state} onChange={e => set("current_state", e.target.value)} className="input-field" placeholder="Maharashtra" /></div>
              <div>
                <Label>Country</Label>
                <select
                  value={form.current_country}
                  onChange={e => {
                    set("current_country", e.target.value);
                    if (e.target.value !== "Other") setCurrentCountryOther("");
                  }}
                  className="input-field"
                >
                  <option value="">Select…</option>
                  {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {form.current_country === "Other" && (
                  <input
                    value={currentCountryOther}
                    onChange={e => setCurrentCountryOther(e.target.value)}
                    className="input-field"
                    placeholder="Please specify country…"
                    style={{ marginTop: 8 }}
                    autoFocus
                  />
                )}
              </div>
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
                <Grid2>
                  <div>
                    <Label>Postal Code</Label>
                    <input value={form.permanent_postal_code} onChange={e => handlePincodeChange(e.target.value, "permanent")} className="input-field" placeholder="110001" />
                  </div>
                </Grid2>
                <div><Label>Address Line 1</Label><input value={form.permanent_address_line_1} onChange={e => set("permanent_address_line_1", e.target.value)} className="input-field" placeholder="Flat / House / Building" /></div>
                <div><Label>Address Line 2</Label><input value={form.permanent_address_line_2} onChange={e => set("permanent_address_line_2", e.target.value)} className="input-field" placeholder="Street / Area / Locality" /></div>
                <Grid3>
                  <div><Label>City</Label><input value={form.permanent_city} onChange={e => set("permanent_city", e.target.value)} className="input-field" placeholder="Delhi" /></div>
                  <div><Label>District</Label><input value={form.permanent_district} onChange={e => set("permanent_district", e.target.value)} className="input-field" placeholder="New Delhi" /></div>
                  <div><Label>State</Label><input value={form.permanent_state} onChange={e => set("permanent_state", e.target.value)} className="input-field" placeholder="Delhi" /></div>
                  <div>
                    <Label>Country</Label>
                    <select
                      value={form.permanent_country}
                      onChange={e => {
                        set("permanent_country", e.target.value);
                        if (e.target.value !== "Other") setPermanentCountryOther("");
                      }}
                      className="input-field"
                    >
                      <option value="">Select…</option>
                      {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {form.permanent_country === "Other" && (
                      <input
                        value={permanentCountryOther}
                        onChange={e => setPermanentCountryOther(e.target.value)}
                        className="input-field"
                        placeholder="Please specify country…"
                        style={{ marginTop: 8 }}
                        autoFocus
                      />
                    )}
                  </div>
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
              <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("branch_id", ""); set("department_id", ""); set("designation_id", ""); }} className="input-field">
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <Grid2>
              <div>
                <Label>Branch</Label>
                <select value={form.branch_id} onChange={e => set("branch_id", e.target.value)} className="input-field" disabled={!form.company_id}>
                  <option value="">Select branch…</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Work Mode</Label>
                <select value={form.work_mode} onChange={e => set("work_mode", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {["WFO", "WFH", "Remote", "Hybrid"].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </Grid2>
            <Grid2>
              <div>
                <Label>Department</Label>
                <select value={form.department_id} onChange={e => set("department_id", e.target.value)} className="input-field" disabled={!form.company_id}>
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
                </select>
              </div>
              <div>
                <Label>Designation</Label>
                <select value={form.designation_id} onChange={e => set("designation_id", e.target.value)} className="input-field" disabled={!form.company_id}>
                  <option value="">Select designation…</option>
                  {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
                </select>
              </div>
            </Grid2>
          </Section>

          <Section icon="📅" title="Employment Details">
            <Grid3>
              <div>
                <Label>Employment Category</Label>
                <select value={form.employee_category} onChange={e => set("employee_category", e.target.value)} className="input-field">
                  <option value="">Select category…</option>
                  {empCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Employment Type</Label>
                <select value={form.employment_type} onChange={e => set("employment_type", e.target.value)} className="input-field">
                  <option value="">Select type…</option>
                  {empTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.employment_status} onChange={e => set("employment_status", e.target.value)} className="input-field">
                  {empStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Grid3>
            <Grid3>
              <div><Label>Joining Date</Label><input type="date" value={form.joining_date} onChange={e => set("joining_date", e.target.value)} className="input-field" /></div>
              <div><Label>Confirmation Date</Label><input type="date" value={form.confirmation_date} onChange={e => set("confirmation_date", e.target.value)} className="input-field" /></div>
              <div><Label>Relieving Date</Label><input type="date" value={form.relieving_date} onChange={e => set("relieving_date", e.target.value)} className="input-field" /></div>
            </Grid3>
          </Section>
        </>
      )}

      {/* Footer Actions */}
      <div style={{ display: "flex", gap: 12, marginTop: 24, padding: "20px 0", borderTop: "1px solid var(--c-border)" }}>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        {tabIdx > 0 && <button onClick={() => setTab(TABS[tabIdx - 1].id)} className="btn-secondary">Back</button>}
        {tabIdx < TABS.length - 1 ? (
          <button onClick={() => setTab(TABS[tabIdx + 1].id)} className="btn-primary" style={{ minWidth: 100 }}>Next Step</button>
        ) : (
          <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ minWidth: 120 }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Employee"}
          </button>
        )}
      </div>
    </EmployeeLayout>
  );
}
