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
        style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, background: value ? "var(--c-accent)" : "var(--c-border)", transition: "background 0.2s", flexShrink: 0, position: "relative" }}>
        <span style={{ display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: value ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }} />
      </button>
      <span style={{ fontSize: 13, color: "var(--c-text)" }}>{label}</span>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "personal",   label: "Personal",        icon: "👤" },
  { id: "contact",    label: "Contact & Address", icon: "📍" },
  { id: "employment", label: "Employment",       icon: "💼" },
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
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [options, setOptions] = useState({});

  const blank = {
    company_id: "", department_id: "", designation_id: "",
    first_name: "", middle_name: "", last_name: "", display_name: "",
    gender: "", date_of_birth: "", marital_status: "", blood_group: "", nationality: "",
    personal_email: "", official_email: "", mobile_number: "", alternate_mobile: "", landline_number: "",
    current_address_line_1: "", current_address_line_2: "", current_city: "", current_state: "", current_country: "", current_postal_code: "",
    permanent_same_as_current: true,
    permanent_address_line_1: "", permanent_address_line_2: "", permanent_city: "", permanent_state: "", permanent_country: "", permanent_postal_code: "",
    employee_category: "", employment_type: "", employment_status: "Draft",
    joining_date: "", confirmation_date: "", relieving_date: "",
    reporting_manager_id: "", functional_manager_id: "",
  };
  const [form, setForm] = useState(blank);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load companies, departments, designations
  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200, is_active: true })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
    portalEmployeeApi.options(subdomain, token)
      .then(r => setOptions(r.data.data || {})).catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!form.company_id) return;
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listDesigs(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDesignations(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, form.company_id]);

  // Load existing employee on edit
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
        mobile_number: e.mobile_number || "", alternate_mobile: e.alternate_mobile || "",
        landline_number: e.landline_number || "",
        current_address_line_1: e.current_address_line_1 || "", current_address_line_2: e.current_address_line_2 || "",
        current_city: e.current_city || "", current_state: e.current_state || "",
        current_country: e.current_country || "", current_postal_code: e.current_postal_code || "",
        permanent_same_as_current: e.permanent_same_as_current ?? true,
        permanent_address_line_1: e.permanent_address_line_1 || "", permanent_address_line_2: e.permanent_address_line_2 || "",
        permanent_city: e.permanent_city || "", permanent_state: e.permanent_state || "",
        permanent_country: e.permanent_country || "", permanent_postal_code: e.permanent_postal_code || "",
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
    // Null-ify empty strings for optional fields
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.first_name = form.first_name;
    payload.last_name = form.last_name;
    payload.official_email = form.official_email;
    payload.mobile_number = form.mobile_number;
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

  const genders = options.genders || [];
  const maritalStatuses = options.marital_statuses || [];
  const bloodGroups = options.blood_groups || [];
  const empCategories = options.employee_categories || [];
  const empTypes = options.employment_types || [];
  const empStatuses = options.employment_statuses || [];

  return (
    <EmployeeLayout title={editMode ? "Edit Employee" : "Add Employee"}>
      {/* Back + title */}
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

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 4 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === t.id ? "var(--c-accent)" : "transparent",
              color: tab === t.id ? "#fff" : "var(--c-text2)",
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
              transition: "all 0.15s",
            }}>
            <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Personal ─────────────────────────────────────────────────── */}
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
            <div>
              <Label>Display Name</Label>
              <input value={form.display_name} onChange={e => set("display_name", e.target.value)} style={inp} placeholder="Rajan Sharma (auto-filled if left blank)" />
            </div>
          </Section>

          <Section icon="🪪" title="Personal Details">
            <Grid2>
              <div>
                <Label>Gender</Label>
                <select value={form.gender} onChange={e => set("gender", e.target.value)} style={inp}>
                  <option value="">Select…</option>
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <input type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} style={inp} />
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
            </Grid2>
          </Section>
        </>
      )}

      {/* ── Tab: Contact & Address ─────────────────────────────────────────── */}
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
                <input type="email" value={form.personal_email} onChange={e => set("personal_email", e.target.value)} style={inp} placeholder="rajan@personal.com" />
              </div>
              <div>
                <Label required>Mobile Number</Label>
                <input value={form.mobile_number} onChange={e => set("mobile_number", e.target.value)} style={inp} placeholder="+91 9876543210" />
              </div>
              <div>
                <Label>Alternate Mobile</Label>
                <input value={form.alternate_mobile} onChange={e => set("alternate_mobile", e.target.value)} style={inp} placeholder="+91 9876543210" />
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
              <div>
                <Label>City</Label>
                <input value={form.current_city} onChange={e => set("current_city", e.target.value)} style={inp} placeholder="Mumbai" />
              </div>
              <div>
                <Label>State</Label>
                <input value={form.current_state} onChange={e => set("current_state", e.target.value)} style={inp} placeholder="Maharashtra" />
              </div>
              <div>
                <Label>Country</Label>
                <input value={form.current_country} onChange={e => set("current_country", e.target.value)} style={inp} placeholder="India" />
              </div>
              <div>
                <Label>Postal Code</Label>
                <input value={form.current_postal_code} onChange={e => set("current_postal_code", e.target.value)} style={inp} placeholder="400001" />
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
                <div>
                  <Label>Address Line 1</Label>
                  <input value={form.permanent_address_line_1} onChange={e => set("permanent_address_line_1", e.target.value)} style={inp} placeholder="Flat / House / Building" />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <input value={form.permanent_address_line_2} onChange={e => set("permanent_address_line_2", e.target.value)} style={inp} placeholder="Street / Area / Locality" />
                </div>
                <Grid3>
                  <div>
                    <Label>City</Label>
                    <input value={form.permanent_city} onChange={e => set("permanent_city", e.target.value)} style={inp} placeholder="Delhi" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <input value={form.permanent_state} onChange={e => set("permanent_state", e.target.value)} style={inp} placeholder="Delhi" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <input value={form.permanent_country} onChange={e => set("permanent_country", e.target.value)} style={inp} placeholder="India" />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <input value={form.permanent_postal_code} onChange={e => set("permanent_postal_code", e.target.value)} style={inp} placeholder="110001" />
                  </div>
                </Grid3>
              </>
            )}
          </Section>
        </>
      )}

      {/* ── Tab: Employment ────────────────────────────────────────────────── */}
      {tab === "employment" && (
        <>
          <Section icon="🏢" title="Organization" subtitle="Company, department and designation assignment">
            <div>
              <Label required>Company</Label>
              <select value={form.company_id} onChange={e => { set("company_id", e.target.value); set("department_id", ""); set("designation_id", ""); }} style={inp}>
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
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

          <Section icon="📅" title="Dates">
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
        </>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        {tab !== "personal" && (
          <button onClick={() => setTab(TABS[TABS.findIndex(t => t.id === tab) - 1]?.id || "personal")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text)", fontSize: 13 }}>
            ← Back
          </button>
        )}
        {tab !== "employment" ? (
          <button onClick={() => setTab(TABS[TABS.findIndex(t => t.id === tab) + 1]?.id || "employment")}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>
            Next →
          </button>
        ) : (
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: saving ? "var(--c-border)" : "var(--c-accent)", color: saving ? "var(--c-muted)" : "#fff", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Employee"}
          </button>
        )}
      </div>
    </EmployeeLayout>
  );
}
