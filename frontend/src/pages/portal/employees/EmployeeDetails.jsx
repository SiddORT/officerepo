// @refresh reset
import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Toggle from "../../../components/ui/Toggle";
import Modal from "../../../components/ui/Modal";
import { EditIconBtn } from "../../../components/ui/ActionIcons";

// ── Design tokens ──────────────────────────────────────────────────────────────
const Val = ({ children }) => (
  <div className={children ? "t-body" : "t-muted"} style={{ fontSize: 13, paddingTop: 1 }}>{children || "—"}</div>
);
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
    <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
    <span className="t-muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
    <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
  </div>
);

// ── Country codes ─────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" }, { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" }, { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" }, { code: "+61", label: "🇦🇺 +61" },
  { code: "+60", label: "🇲🇾 +60" }, { code: "+66", label: "🇹🇭 +66" },
  { code: "+880", label: "🇧🇩 +880" }, { code: "+92", label: "🇵🇰 +92" },
  { code: "+94", label: "🇱🇰 +94" }, { code: "+977", label: "🇳🇵 +977" },
  { code: "+968", label: "🇴🇲 +968" }, { code: "+966", label: "🇸🇦 +966" },
  { code: "+974", label: "🇶🇦 +974" }, { code: "+973", label: "🇧🇭 +973" },
  { code: "+49", label: "🇩🇪 +49" }, { code: "+33", label: "🇫🇷 +33" },
  { code: "+39", label: "🇮🇹 +39" }, { code: "+81", label: "🇯🇵 +81" },
  { code: "+86", label: "🇨🇳 +86" }, { code: "+82", label: "🇰🇷 +82" },
  { code: "+27", label: "🇿🇦 +27" }, { code: "+55", label: "🇧🇷 +55" },
  { code: "+7", label: "🇷🇺 +7" },
];

function PhoneInput({ countryCode, number, onCountryChange, onNumberChange, placeholder }) {
  return (
    <div style={{ display: "flex" }}>
      <select value={countryCode || "+91"} onChange={e => onCountryChange(e.target.value)}
        className="input-field"
        style={{ width: 100, borderRadius: "6px 0 0 6px", borderRight: "none", flexShrink: 0, fontSize: 12, paddingLeft: 6, paddingRight: 2 }}>
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input value={number || ""} onChange={e => onNumberChange(e.target.value)}
        placeholder={placeholder || "9876543210"}
        className="input-field"
        style={{ borderRadius: "0 6px 6px 0", flex: 1 }} />
    </div>
  );
}

function tenureDetail(dateStr) {
  const start = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y} yr${y > 1 ? "s" : ""}`);
  if (m > 0) parts.push(`${m} mo`);
  return parts.length ? parts.join(" ") : "< 1 mo";
}

function Avatar({ name, size = 56 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, var(--c-accent), #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, color: "#fff" }}>
      {initials}
    </div>
  );
}

const TABS = [
  { id: "overview",   label: "Overview",   icon: "👤" },
  { id: "employment", label: "Employment",  icon: "💼" },
  { id: "education",  label: "Education",   icon: "🎓" },
  { id: "experience", label: "Experience",  icon: "🏢" },
  { id: "family",     label: "Family",      icon: "👨‍👩‍👧" },
  { id: "contacts",   label: "Contacts",    icon: "🆘" },
  { id: "bank",       label: "Bank & IDs",  icon: "🏦" },
  { id: "activity",   label: "Activity",    icon: "📋" },
];

// ── Inline form helpers ────────────────────────────────────────────────────────
const emptyEdu = () => ({ qualification: "", degree: "", specialization: "", institution_name: "", university: "", country: "", start_year: "", end_year: "", percentage: "", cgpa: "", is_completed: true, remarks: "" });
const emptyPrev = () => ({ company_name: "", designation: "", department: "", employment_type: "", start_date: "", end_date: "", last_salary: "", reporting_manager_name: "", reporting_manager_contact: "", reason_for_leaving: "", remarks: "" });
const emptyContact = () => ({ contact_name: "", relationship: "", mobile_country_code: "+91", mobile_number: "", alternate_country_code: "+91", alternate_number: "", address: "" });
const emptyFamily = () => ({ member_name: "", relationship: "", date_of_birth: "", gender: "", occupation: "", phone_country_code: "+91", phone: "", is_dependent: false, is_nominee: false, nomination_percentage: "", remarks: "" });

const Label = ({ children, required }) => (
  <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>{children}</label>
);
const Card = ({ children, style = {} }) => (
  <div className="portal-form-card" style={style}>{children}</div>
);
const CardHeader = ({ icon, title }) => (
  <div className="portal-form-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 15 }}>{icon}</span>
    <span>{title}</span>
  </div>
);
const Grid2 = ({ children }) => (
  <div className="portal-form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>{children}</div>
);
const Grid3 = ({ children }) => (
  <div className="portal-form-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>{children}</div>
);

// ── Education Modal ────────────────────────────────────────────────────────────
function EduModal({ subdomain, token, empId, editRow, onClose, onSaved }) {
  const [form, setForm] = useState(editRow ? { ...editRow, start_year: editRow.start_year || "", end_year: editRow.end_year || "", percentage: editRow.percentage || "", cgpa: editRow.cgpa || "" } : emptyEdu());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setErr("");
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.is_completed = form.is_completed;
    try {
      if (editRow?.id) await portalEmployeeApi.updateEducation(subdomain, token, empId, editRow.id, payload);
      else await portalEmployeeApi.addEducation(subdomain, token, empId, payload);
      onSaved();
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title={editRow ? "Edit Education" : "Add Education"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div><Label>Qualification</Label><input value={form.qualification || ""} onChange={e => set("qualification", e.target.value)} className="input-field" placeholder="Bachelor's / Master's / PhD" /></div>
          <div><Label>Degree</Label><input value={form.degree || ""} onChange={e => set("degree", e.target.value)} className="input-field" placeholder="B.Tech / MBA / M.Sc" /></div>
        </Grid2>
        <div><Label>Specialization</Label><input value={form.specialization || ""} onChange={e => set("specialization", e.target.value)} className="input-field" placeholder="Computer Science / Finance" /></div>
        <Grid2>
          <div><Label>Institution</Label><input value={form.institution_name || ""} onChange={e => set("institution_name", e.target.value)} className="input-field" placeholder="IIT Bombay" /></div>
          <div><Label>University</Label><input value={form.university || ""} onChange={e => set("university", e.target.value)} className="input-field" placeholder="University of Mumbai" /></div>
        </Grid2>
        <Grid3>
          <div><Label>Start Year</Label><input type="number" min="1970" max="2030" value={form.start_year || ""} onChange={e => set("start_year", e.target.value)} className="input-field" placeholder="2018" /></div>
          <div><Label>End Year</Label><input type="number" min="1970" max="2030" value={form.end_year || ""} onChange={e => set("end_year", e.target.value)} className="input-field" placeholder="2022" /></div>
          <div><Label>Country</Label><input value={form.country || ""} onChange={e => set("country", e.target.value)} className="input-field" placeholder="India" /></div>
        </Grid3>
        <Grid2>
          <div><Label>Percentage (%)</Label><input type="number" step="0.01" value={form.percentage || ""} onChange={e => set("percentage", e.target.value)} className="input-field" placeholder="78.5" /></div>
          <div><Label>CGPA</Label><input type="number" step="0.01" value={form.cgpa || ""} onChange={e => set("cgpa", e.target.value)} className="input-field" placeholder="8.2" /></div>
        </Grid2>
        <div><Label>Remarks</Label><input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} className="input-field" placeholder="Distinction / Honours / etc." /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Toggle value={form.is_completed} onChange={v => set("is_completed", v)} label="Completed" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Previous Employment Modal ──────────────────────────────────────────────────
function PrevEmpModal({ subdomain, token, empId, editRow, onClose, onSaved }) {
  const [form, setForm] = useState(editRow ? { ...editRow, last_salary: editRow.last_salary || "", start_date: editRow.start_date || "", end_date: editRow.end_date || "" } : emptyPrev());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setErr("");
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    try {
      if (editRow?.id) await portalEmployeeApi.updateHistory(subdomain, token, empId, editRow.id, payload);
      else await portalEmployeeApi.addHistory(subdomain, token, empId, payload);
      onSaved();
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title={editRow ? "Edit Employment History" : "Add Employment History"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div><Label>Company Name</Label><input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)} className="input-field" placeholder="Infosys Ltd." /></div>
          <div><Label>Designation</Label><input value={form.designation || ""} onChange={e => set("designation", e.target.value)} className="input-field" placeholder="Senior Developer" /></div>
        </Grid2>
        <Grid2>
          <div><Label>Department</Label><input value={form.department || ""} onChange={e => set("department", e.target.value)} className="input-field" placeholder="Engineering" /></div>
          <div><Label>Employment Type</Label><input value={form.employment_type || ""} onChange={e => set("employment_type", e.target.value)} className="input-field" placeholder="Full Time" /></div>
        </Grid2>
        <Grid3>
          <div><Label>Start Date</Label><input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} className="input-field" /></div>
          <div><Label>End Date</Label><input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} className="input-field" /></div>
          <div><Label>Last CTC (₹)</Label><input type="number" value={form.last_salary || ""} onChange={e => set("last_salary", e.target.value)} className="input-field" placeholder="800000" /></div>
        </Grid3>
        <Grid2>
          <div><Label>Reporting Manager</Label><input value={form.reporting_manager_name || ""} onChange={e => set("reporting_manager_name", e.target.value)} className="input-field" placeholder="Suresh Gupta" /></div>
          <div><Label>Manager Contact</Label><input value={form.reporting_manager_contact || ""} onChange={e => set("reporting_manager_contact", e.target.value)} className="input-field" placeholder="+91 9876543210" /></div>
        </Grid2>
        <div><Label>Reason for Leaving</Label><input value={form.reason_for_leaving || ""} onChange={e => set("reason_for_leaving", e.target.value)} className="input-field" placeholder="Better opportunity" /></div>
        <div><Label>Remarks</Label><input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} className="input-field" /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Family Member Modal ────────────────────────────────────────────────────────
function FamilyModal({ subdomain, token, empId, editRow, familyRelationships, onClose, onSaved }) {
  const [form, setForm] = useState(editRow ? {
    ...editRow,
    date_of_birth: editRow.date_of_birth || "",
    phone: editRow.phone || "",
    phone_country_code: editRow.phone_country_code || "+91",
    nomination_percentage: editRow.nomination_percentage || "",
  } : emptyFamily());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.member_name?.trim()) { setErr("Member name is required."); return; }
    setSaving(true); setErr("");
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.member_name = form.member_name;
    payload.is_dependent = form.is_dependent;
    payload.is_nominee = form.is_nominee;
    payload.phone_country_code = form.phone_country_code || "+91";
    try {
      if (editRow?.id) await portalEmployeeApi.updateFamilyMember(subdomain, token, empId, editRow.id, payload);
      else await portalEmployeeApi.addFamilyMember(subdomain, token, empId, payload);
      onSaved();
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Modal open title={editRow ? "Edit Family Member" : "Add Family Member"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div>
            <Label>Name *</Label>
            <input value={form.member_name} onChange={e => set("member_name", e.target.value)} className="input-field" placeholder="Sunita Sharma" />
          </div>
          <div>
            <Label>Relationship</Label>
            <select value={form.relationship || ""} onChange={e => set("relationship", e.target.value)} className="input-field">
              <option value="">Select…</option>
              {(familyRelationships || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </Grid2>
        <Grid3>
          <div>
            <Label>Date of Birth</Label>
            <input type="date" value={form.date_of_birth || ""} onChange={e => set("date_of_birth", e.target.value)} max={todayStr} className="input-field" />
          </div>
          <div>
            <Label>Gender</Label>
            <select value={form.gender || ""} onChange={e => set("gender", e.target.value)} className="input-field">
              <option value="">Select…</option>
              {["Male", "Female", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <Label>Occupation</Label>
            <input value={form.occupation || ""} onChange={e => set("occupation", e.target.value)} className="input-field" placeholder="Teacher / Student" />
          </div>
        </Grid3>
        <div>
          <Label>Phone</Label>
          <PhoneInput
            countryCode={form.phone_country_code}
            number={form.phone}
            onCountryChange={v => set("phone_country_code", v)}
            onNumberChange={v => set("phone", v)}
            placeholder="9876543210"
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Toggle value={form.is_dependent} onChange={v => set("is_dependent", v)} label="Is Dependent" />
          <Toggle value={form.is_nominee} onChange={v => set("is_nominee", v)} label="Insurance Nominee" />
        </div>
        {form.is_nominee && (
          <div style={{ maxWidth: 220 }}>
            <Label>Nomination % </Label>
            <input type="number" min="0" max="100" value={form.nomination_percentage || ""} onChange={e => set("nomination_percentage", e.target.value)} className="input-field" placeholder="100" />
          </div>
        )}
        <div>
          <Label>Remarks</Label>
          <input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} className="input-field" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Emergency Contact Modal ────────────────────────────────────────────────────
function ContactModal({ subdomain, token, empId, editRow, relationships, onClose, onSaved }) {
  const [form, setForm] = useState(editRow ? {
    ...editRow,
    mobile_country_code: editRow.mobile_country_code || "+91",
    alternate_country_code: editRow.alternate_country_code || "+91",
  } : emptyContact());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.contact_name?.trim()) { setErr("Contact name is required."); return; }
    if (!form.mobile_number?.trim()) { setErr("Mobile number is required."); return; }
    setSaving(true); setErr("");
    const payload = { ...form };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    payload.contact_name = form.contact_name;
    payload.mobile_number = form.mobile_number;
    payload.mobile_country_code = form.mobile_country_code || "+91";
    payload.alternate_country_code = form.alternate_country_code || "+91";
    try {
      if (editRow?.id) await portalEmployeeApi.updateContact(subdomain, token, empId, editRow.id, payload);
      else await portalEmployeeApi.addContact(subdomain, token, empId, payload);
      onSaved();
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <Modal open title={editRow ? "Edit Emergency Contact" : "Add Emergency Contact"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div>
            <Label>Contact Name *</Label>
            <input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} className="input-field" placeholder="Sunita Sharma" />
          </div>
          <div>
            <Label>Relationship</Label>
            <select value={form.relationship || ""} onChange={e => set("relationship", e.target.value)} className="input-field">
              <option value="">Select…</option>
              {(relationships || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </Grid2>
        <div>
          <Label>Mobile Number *</Label>
          <PhoneInput
            countryCode={form.mobile_country_code}
            number={form.mobile_number}
            onCountryChange={v => set("mobile_country_code", v)}
            onNumberChange={v => set("mobile_number", v)}
            placeholder="9876543210"
          />
        </div>
        <div>
          <Label>Alternate Number</Label>
          <PhoneInput
            countryCode={form.alternate_country_code}
            number={form.alternate_number}
            onCountryChange={v => set("alternate_country_code", v)}
            onNumberChange={v => set("alternate_number", v)}
            placeholder="9876543210"
          />
        </div>
        <div>
          <Label>Address</Label>
          <input value={form.address || ""} onChange={e => set("address", e.target.value)} className="input-field" placeholder="Full address" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function EmployeeDetails() {
  const { subdomain, empId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [options, setOptions] = useState({});
  const [edu, setEdu] = useState([]);
  const [history, setHistory] = useState([]);
  const [family, setFamily] = useState([]);
  const [contacts, setContacts] = useState([]);

  const [showEdu, setShowEdu] = useState(false);
  const [showPrev, setShowPrev] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await portalEmployeeApi.get(subdomain, token, empId);
      setDoc(r.data.data);
    } catch (e) { setError("Failed to load employee."); }
    finally { setLoading(false); }
  }, [subdomain, token, empId]);

  const loadExtra = useCallback(() => {
    portalEmployeeApi.options(subdomain, token).then(r => setOptions(r.data.data || {}));
    portalEmployeeApi.listEducation(subdomain, token, empId).then(r => setEdu(r.data.data?.items || []));
    portalEmployeeApi.listHistory(subdomain, token, empId).then(r => setHistory(r.data.data?.items || []));
    portalEmployeeApi.listFamilyMembers(subdomain, token, empId).then(r => setFamily(r.data.data?.items || []));
    portalEmployeeApi.listContacts(subdomain, token, empId).then(r => setContacts(r.data.data?.items || []));
  }, [subdomain, token, empId]);

  useEffect(() => { load(); loadExtra(); }, [load, loadExtra]);

  if (loading) return <EmployeeLayout><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)" }}>Loading…</div></EmployeeLayout>;
  if (!doc) return <EmployeeLayout><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)" }}>{error || "Not found"}</div></EmployeeLayout>;

  return (
    <EmployeeLayout title={doc.full_name}>
      <PageHeader
        title={doc.full_name}
        subtitle={`${doc.employee_code || "No Code"} · ${doc.designation_name || "No Designation"}`}
        breadcrumbs={[
          { label: "Employees", path: `/portal/${subdomain}/employees` },
          { label: "Details" }
        ]}
        actions={
          <Link to={`/portal/${subdomain}/employees/${empId}/edit`}>
            <button className="btn-primary">Edit Profile</button>
          </Link>
        }
      />

      {/* Main Info Card */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <Avatar name={doc.full_name} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{doc.full_name}</h2>
              <Badge status={doc.employment_status} />
              {doc.is_active ? <Badge status="Active" /> : <Badge status="Inactive" />}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div className="t-body" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>📧 {doc.official_email}</div>
              <div className="t-body" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>📱 {doc.mobile_country_code} {doc.mobile_number}</div>
              <div className="t-body" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>🏢 {doc.company_name}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", whiteSpace: "nowrap",
              background: tab === t.id ? "var(--c-surface2)" : "transparent",
              color: tab === t.id ? "var(--c-accent)" : "var(--c-text2)",
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500, transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <Card>
              <CardHeader icon="👤" title="Personal Details" />
              <div style={{ padding: 20, display: "grid", gap: 16 }}>
                <Grid3>
                  <div><Label>Gender</Label><Val>{doc.gender}</Val></div>
                  <div><Label>Date of Birth</Label><Val>{doc.date_of_birth}</Val></div>
                  <div><Label>Marital Status</Label><Val>{doc.marital_status}</Val></div>
                </Grid3>
                <Grid3>
                  <div><Label>Blood Group</Label><Val>{doc.blood_group}</Val></div>
                  <div><Label>Nationality</Label><Val>{doc.nationality}</Val></div>
                  <div><Label>Personal Email</Label><Val>{doc.personal_email}</Val></div>
                </Grid3>
              </div>
            </Card>

            <Card>
              <CardHeader icon="📍" title="Current Address" />
              <div style={{ padding: 20, display: "grid", gap: 16 }}>
                <Grid2>
                  <div><Label>Postal Code</Label><Val>{doc.current_postal_code}</Val></div>
                </Grid2>
                <div><Label>Address Line 1</Label><Val>{doc.current_address_line_1}</Val></div>
                <div><Label>Address Line 2</Label><Val>{doc.current_address_line_2}</Val></div>
                <Grid2>
                  <div><Label>City</Label><Val>{doc.current_city}</Val></div>
                  <div><Label>District</Label><Val>{doc.current_district}</Val></div>
                </Grid2>
                <Grid2>
                  <div><Label>State</Label><Val>{doc.current_state}</Val></div>
                  <div><Label>Country</Label><Val>{doc.current_country}</Val></div>
                </Grid2>
              </div>
            </Card>

            <Card>
              <CardHeader icon="🏠" title="Permanent Address" />
              <div style={{ padding: 20, display: "grid", gap: 16 }}>
                {doc.permanent_same_as_current ? (
                  <div style={{ padding: 12, borderRadius: 8, background: "var(--c-surface2)", fontSize: 13, textAlign: "center" }}>Same as current address</div>
                ) : (
                  <>
                    <Grid2>
                      <div><Label>Postal Code</Label><Val>{doc.permanent_postal_code}</Val></div>
                    </Grid2>
                    <div><Label>Address Line 1</Label><Val>{doc.permanent_address_line_1}</Val></div>
                    <div><Label>Address Line 2</Label><Val>{doc.permanent_address_line_2}</Val></div>
                    <Grid2>
                      <div><Label>City</Label><Val>{doc.permanent_city}</Val></div>
                      <div><Label>District</Label><Val>{doc.permanent_district}</Val></div>
                    </Grid2>
                    <Grid2>
                      <div><Label>State</Label><Val>{doc.permanent_state}</Val></div>
                      <div><Label>Country</Label><Val>{doc.permanent_country}</Val></div>
                    </Grid2>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === "employment" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            <Card>
              <CardHeader icon="🏢" title="Organizational Units" />
              <div style={{ padding: 20, display: "grid", gap: 16 }}>
                <Grid2>
                  <div><Label>Company</Label><Val>{doc.company_name}</Val></div>
                  <div><Label>Branch</Label><Val>{doc.branch_name}</Val></div>
                </Grid2>
                <Grid2>
                  <div><Label>Department</Label><Val>{doc.department_name}</Val></div>
                  <div><Label>Designation</Label><Val>{doc.designation_name}</Val></div>
                </Grid2>
              </div>
            </Card>
            <Card>
              <CardHeader icon="📅" title="Service Details" />
              <div style={{ padding: 20, display: "grid", gap: 16 }}>
                <Grid2>
                  <div><Label>Category</Label><Val>{doc.employee_category}</Val></div>
                  <div><Label>Type</Label><Val>{doc.employment_type}</Val></div>
                </Grid2>
                <Grid2>
                  <div><Label>Joining Date</Label><Val>{doc.joining_date}</Val></div>
                  <div><Label>Service Tenure</Label><Val>{doc.joining_date ? tenureDetail(doc.joining_date) : "—"}</Val></div>
                </Grid2>
                <Grid2>
                  <div><Label>Confirmation Date</Label><Val>{doc.confirmation_date}</Val></div>
                  <div><Label>Relieving Date</Label><Val>{doc.relieving_date}</Val></div>
                </Grid2>
                <Grid2>
                  <div><Label>Work Mode</Label><Val>{doc.work_mode}</Val></div>
                </Grid2>
              </div>
            </Card>
          </div>
        )}

        {tab === "education" && (
          <Card>
            <CardHeader icon="🎓" title="Education Qualifications" />
            <div style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Degree / Qualification</th>
                      <th>Institution / University</th>
                      <th>Year</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>
                        <button onClick={() => { setEditRow(null); setShowEdu(true); }} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add New</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {edu.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>No education records added.</td></tr>
                    ) : edu.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.degree}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.qualification} · {r.specialization}</div>
                        </td>
                        <td>
                          <div>{r.institution_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.university}, {r.country}</div>
                        </td>
                        <td>{r.start_year} — {r.end_year || "Present"}</td>
                        <td>
                          {r.percentage && <div>{r.percentage}%</div>}
                          {r.cgpa && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.cgpa} CGPA</div>}
                        </td>
                        <td>{r.is_completed ? <Badge status="Active" /> : <Badge status="Pending" />}</td>
                        <td style={{ textAlign: "right" }}>
                          <EditIconBtn onClick={() => { setEditRow(r); setShowEdu(true); }} title="Edit education" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {tab === "experience" && (
          <Card>
            <CardHeader icon="🏢" title="Employment History" />
            <div style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Company & Role</th>
                      <th>Duration</th>
                      <th>Manager</th>
                      <th>Reason for Leaving</th>
                      <th style={{ textAlign: "right" }}>
                        <button onClick={() => { setEditRow(null); setShowPrev(true); }} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add History</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>No employment history added.</td></tr>
                    ) : history.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.company_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.designation} · {r.department}</div>
                        </td>
                        <td>
                          <div>{r.start_date} — {r.end_date || "Present"}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.employment_type}</div>
                        </td>
                        <td>
                          <div>{r.reporting_manager_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.reporting_manager_contact}</div>
                        </td>
                        <td>{r.reason_for_leaving}</td>
                        <td style={{ textAlign: "right" }}>
                          <EditIconBtn onClick={() => { setEditRow(r); setShowPrev(true); }} title="Edit experience" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {tab === "family" && (
          <Card>
            <CardHeader icon="👨‍👩‍👧" title="Family Members" />
            <div style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Member Name</th>
                      <th>Relationship</th>
                      <th>Details</th>
                      <th>Benefits</th>
                      <th style={{ textAlign: "right" }}>
                        <button onClick={() => { setEditRow(null); setShowFamily(true); }} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Member</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>No family members added.</td></tr>
                    ) : family.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.member_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.gender} · {r.date_of_birth}</div>
                        </td>
                        <td>{r.relationship}</td>
                        <td>
                          <div>{r.occupation}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.phone_country_code} {r.phone}</div>
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            {r.is_dependent && <Badge status="Active" />}
                            {r.is_nominee && <Badge status="Purple" />}
                          </div>
                          {r.is_nominee && r.nomination_percentage && <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{r.nomination_percentage}% share</div>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <EditIconBtn onClick={() => { setEditRow(r); setShowFamily(true); }} title="Edit family member" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {tab === "contacts" && (
          <Card>
            <CardHeader icon="🆘" title="Emergency Contacts" />
            <div style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Contact Name</th>
                      <th>Relationship</th>
                      <th>Phone Numbers</th>
                      <th>Address</th>
                      <th style={{ textAlign: "right" }}>
                        <button onClick={() => { setEditRow(null); setShowContact(true); }} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add Contact</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>No emergency contacts added.</td></tr>
                    ) : contacts.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.contact_name}</td>
                        <td>{r.relationship}</td>
                        <td>
                          <div>{r.mobile_country_code} {r.mobile_number}</div>
                          {r.alternate_number && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.alternate_country_code} {r.alternate_number} (Alt)</div>}
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 12 }}>{r.address}</td>
                        <td style={{ textAlign: "right" }}>
                          <EditIconBtn onClick={() => { setEditRow(r); setShowContact(true); }} title="Edit emergency contact" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showEdu && <EduModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} onClose={() => setShowEdu(false)} onSaved={() => { setShowEdu(false); loadExtra(); }} />}
      {showPrev && <PrevEmpModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} onClose={() => setShowPrev(false)} onSaved={() => { setShowPrev(false); loadExtra(); }} />}
      {showFamily && <FamilyModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} familyRelationships={options.family_relationships} onClose={() => setShowFamily(false)} onSaved={() => { setShowFamily(false); loadExtra(); }} />}
      {showContact && <ContactModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} relationships={options.family_relationships} onClose={() => setShowContact(false)} onSaved={() => { setShowContact(false); loadExtra(); }} />}
    </EmployeeLayout>
  );
}
