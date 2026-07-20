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
  { id: "bank",       label: "Bank & IDs",  icon: "🏦" },
  { id: "activity",   label: "Activity",    icon: "📋" },
];

// ── Inline form helpers ────────────────────────────────────────────────────────
const emptyEdu = () => ({ qualification: "", degree: "", specialization: "", institution_name: "", university: "", country: "", start_year: "", end_year: "", percentage: "", cgpa: "", is_completed: true, remarks: "" });
const emptyPrev = () => ({ company_name: "", designation: "", department: "", employment_type: "", start_date: "", end_date: "", last_salary: "", reporting_manager_name: "", reporting_manager_contact: "", reason_for_leaving: "", remarks: "" });
const emptyFamily = () => ({ member_name: "", relationship: "", date_of_birth: "", gender: "", occupation: "", phone_country_code: "+91", phone: "", alternate_phone_country_code: "+91", alternate_phone: "", email: "", address: "", is_dependent: false, is_nominee: false, nomination_percentage: "", is_emergency_contact: false, remarks: "" });

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
    alternate_phone: editRow.alternate_phone || "",
    alternate_phone_country_code: editRow.alternate_phone_country_code || "+91",
    email: editRow.email || "",
    address: editRow.address || "",
    nomination_percentage: editRow.nomination_percentage || "",
    is_emergency_contact: editRow.is_emergency_contact || false,
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
    payload.is_emergency_contact = form.is_emergency_contact;
    payload.phone_country_code = form.phone_country_code || "+91";
    payload.alternate_phone_country_code = form.alternate_phone_country_code || "+91";
    try {
      if (editRow?.id) await portalEmployeeApi.updateFamilyMember(subdomain, token, empId, editRow.id, payload);
      else await portalEmployeeApi.addFamilyMember(subdomain, token, empId, payload);
      onSaved();
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Modal open title={editRow ? "Edit Family / Contact" : "Add Family / Contact"} onClose={onClose}>
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
        <div>
          <Label>Alternate Phone</Label>
          <PhoneInput
            countryCode={form.alternate_phone_country_code}
            number={form.alternate_phone}
            onCountryChange={v => set("alternate_phone_country_code", v)}
            onNumberChange={v => set("alternate_phone", v)}
            placeholder="9876543210"
          />
        </div>
        <div>
          <Label>Email</Label>
          <input type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} className="input-field" placeholder="email@example.com" />
        </div>
        <div>
          <Label>Address</Label>
          <textarea value={form.address || ""} onChange={e => set("address", e.target.value)} className="input-field" placeholder="Full address" rows={2} style={{ resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <Toggle value={form.is_dependent} onChange={v => set("is_dependent", v)} label="Is Dependent" />
          <Toggle value={form.is_nominee} onChange={v => set("is_nominee", v)} label="Insurance Nominee" />
          <Toggle value={form.is_emergency_contact} onChange={v => set("is_emergency_contact", v)} label="Is Emergency Contact" />
        </div>
        {form.is_nominee && (
          <div style={{ maxWidth: 220 }}>
            <Label>Nomination %</Label>
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
  const [bankDetails, setBankDetails] = useState(null);
  const [govIds, setGovIds] = useState(null);
  const [activities, setActivities] = useState([]);
  const [photos, setPhotos] = useState([]);

  const [bankEditing, setBankEditing] = useState(false);
  const [bankForm, setBankForm] = useState({});
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState("");

  const [govEditing, setGovEditing] = useState(false);
  const [govForm, setGovForm] = useState({});
  const [govSaving, setGovSaving] = useState(false);
  const [govError, setGovError] = useState("");

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoLabel, setPhotoLabel] = useState("");
  const [photoIsIcon, setPhotoIsIcon] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const [showEdu, setShowEdu] = useState(false);
  const [showPrev, setShowPrev] = useState(false);
  const [showFamily, setShowFamily] = useState(false);
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
    portalEmployeeApi.getBankDetails(subdomain, token, empId).then(r => {
      const d = r.data.data;
      setBankDetails(d);
      setBankForm(d || {});
    }).catch(() => {});
    portalEmployeeApi.getGovIds(subdomain, token, empId).then(r => {
      const d = r.data.data;
      setGovIds(d);
      setGovForm(d || {});
    }).catch(() => {});
    portalEmployeeApi.listActivities(subdomain, token, empId).then(r => setActivities(r.data.data || [])).catch(() => {});
    portalEmployeeApi.listPhotos(subdomain, token, empId).then(r => setPhotos(r.data.data?.items || [])).catch(() => {});
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
            <CardHeader icon="👨‍👩‍👧" title="Family & Contacts" />
            <div style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Relationship</th>
                      <th>Contact</th>
                      <th>Flags</th>
                      <th style={{ textAlign: "right" }}>
                        <button onClick={() => { setEditRow(null); setShowFamily(true); }} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>+ Add</button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {family.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--c-muted)", padding: 32 }}>No family members or emergency contacts added.</td></tr>
                    ) : family.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600 }}>{r.member_name}</span>
                            {r.is_emergency_contact && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10, background: "rgba(239,68,68,0.12)", color: "#f87171", whiteSpace: "nowrap" }}>🆘 Emergency Contact</span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{r.gender}{r.date_of_birth ? ` · ${r.date_of_birth}` : ""}</div>
                        </td>
                        <td>{r.relationship}</td>
                        <td>
                          <div style={{ fontSize: 12 }}>{r.phone_country_code} {r.phone}</div>
                          {r.alternate_phone && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{r.alternate_phone_country_code} {r.alternate_phone} (Alt)</div>}
                          {r.email && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>✉ {r.email}</div>}
                          {r.address && <div style={{ fontSize: 11, color: "var(--c-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.address}</div>}
                        </td>
                        <td style={{ verticalAlign: "middle" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {r.is_dependent && <Badge status="Active" />}
                            {r.is_nominee && <Badge status="Purple" />}
                          </div>
                          {r.is_nominee && r.nomination_percentage && <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2 }}>{r.nomination_percentage}% share</div>}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <EditIconBtn onClick={() => { setEditRow(r); setShowFamily(true); }} title="Edit" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {tab === "bank" && (
          <div style={{ display: "grid", gap: 20 }}>
            {/* Bank Details Section */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
                <CardHeader icon="🏦" title="Bank Account Details" />
                <button
                  onClick={() => { setBankEditing(!bankEditing); setBankError(""); if (!bankEditing) setBankForm(bankDetails || {}); }}
                  className={bankEditing ? "btn-secondary" : "btn-primary"}
                  style={{ fontSize: 12, padding: "6px 14px" }}
                >
                  {bankEditing ? "Cancel" : "Edit"}
                </button>
              </div>
              {bankError && <div style={{ margin: "0 20px 12px", padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13 }}>{bankError}</div>}
              <div style={{ padding: "12px 20px 20px", display: "grid", gap: 16 }}>
                {!bankEditing ? (
                  bankDetails ? (
                    <>
                      <Grid2>
                        <div><Label>Account Holder</Label><Val>{bankDetails.account_holder_name}</Val></div>
                        <div><Label>Bank Name</Label><Val>{bankDetails.bank_name}</Val></div>
                      </Grid2>
                      <Grid2>
                        <div><Label>Branch</Label><Val>{bankDetails.branch_name}</Val></div>
                        <div><Label>Account Type</Label><Val>{bankDetails.account_type}</Val></div>
                      </Grid2>
                      <Grid2>
                        <div><Label>Account Number</Label><Val>{bankDetails.account_number}</Val></div>
                        <div><Label>IFSC Code</Label><Val>{bankDetails.ifsc_code}</Val></div>
                      </Grid2>
                      <Grid2>
                        <div><Label>SWIFT Code</Label><Val>{bankDetails.swift_code}</Val></div>
                        <div><Label>UPI ID</Label><Val>{bankDetails.upi_id}</Val></div>
                      </Grid2>
                      <Divider label="Payroll" />
                      <Grid3>
                        <div><Label>Salary Cycle</Label><Val>{bankDetails.salary_cycle}</Val></div>
                        <div><Label>Credit Day</Label><Val>{bankDetails.salary_credit_date ? `Day ${bankDetails.salary_credit_date}` : null}</Val></div>
                        <div><Label>Gratuity</Label><Val>{bankDetails.gratuity_applicable ? "Applicable" : "Not Applicable"}</Val></div>
                      </Grid3>
                      <Divider label="Statutory" />
                      <Grid3>
                        <div><Label>PF Account</Label><Val>{bankDetails.pf_account_number}</Val></div>
                        <div><Label>PF UAN</Label><Val>{bankDetails.pf_uan_number}</Val></div>
                        <div><Label>ESI Number</Label><Val>{bankDetails.esi_number}</Val></div>
                      </Grid3>
                      <Grid3>
                        <div><Label>TDS</Label><Val>{bankDetails.tds_applicable ? `${bankDetails.tds_percentage || 0}%` : "Not Applicable"}</Val></div>
                        <div><Label>PAN Linked</Label><Val>{bankDetails.pan_linked_to_account ? "Yes" : "No"}</Val></div>
                      </Grid3>
                    </>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No bank details recorded. Click Edit to add.</div>
                  )
                ) : (
                  <>
                    <Grid2>
                      <div><Label>Account Holder Name</Label><input value={bankForm.account_holder_name || ""} onChange={e => setBankForm(f => ({ ...f, account_holder_name: e.target.value }))} className="input-field" /></div>
                      <div><Label>Bank Name</Label><input value={bankForm.bank_name || ""} onChange={e => setBankForm(f => ({ ...f, bank_name: e.target.value }))} className="input-field" /></div>
                    </Grid2>
                    <Grid2>
                      <div><Label>Branch Name</Label><input value={bankForm.branch_name || ""} onChange={e => setBankForm(f => ({ ...f, branch_name: e.target.value }))} className="input-field" /></div>
                      <div>
                        <Label>Account Type</Label>
                        <select value={bankForm.account_type || ""} onChange={e => setBankForm(f => ({ ...f, account_type: e.target.value }))} className="input-field">
                          <option value="">Select…</option>
                          {["Savings", "Current", "Salary"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </Grid2>
                    <Grid2>
                      <div><Label>Account Number</Label><input value={bankForm.account_number || ""} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} className="input-field" /></div>
                      <div><Label>IFSC Code</Label><input value={bankForm.ifsc_code || ""} onChange={e => setBankForm(f => ({ ...f, ifsc_code: e.target.value }))} className="input-field" /></div>
                    </Grid2>
                    <Grid2>
                      <div><Label>SWIFT Code</Label><input value={bankForm.swift_code || ""} onChange={e => setBankForm(f => ({ ...f, swift_code: e.target.value }))} className="input-field" /></div>
                      <div><Label>UPI ID</Label><input value={bankForm.upi_id || ""} onChange={e => setBankForm(f => ({ ...f, upi_id: e.target.value }))} className="input-field" /></div>
                    </Grid2>
                    <Divider label="Payroll" />
                    <Grid3>
                      <div>
                        <Label>Salary Cycle</Label>
                        <select value={bankForm.salary_cycle || ""} onChange={e => setBankForm(f => ({ ...f, salary_cycle: e.target.value }))} className="input-field">
                          <option value="">Select…</option>
                          {["Monthly", "Weekly", "Bi-weekly"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div><Label>Salary Credit Day (1-31)</Label><input type="number" min="1" max="31" value={bankForm.salary_credit_date || ""} onChange={e => setBankForm(f => ({ ...f, salary_credit_date: e.target.value ? Number(e.target.value) : null }))} className="input-field" /></div>
                    </Grid3>
                    <Divider label="Statutory" />
                    <Grid3>
                      <div><Label>PF Account Number</Label><input value={bankForm.pf_account_number || ""} onChange={e => setBankForm(f => ({ ...f, pf_account_number: e.target.value }))} className="input-field" /></div>
                      <div><Label>PF UAN Number</Label><input value={bankForm.pf_uan_number || ""} onChange={e => setBankForm(f => ({ ...f, pf_uan_number: e.target.value }))} className="input-field" /></div>
                      <div><Label>ESI Number</Label><input value={bankForm.esi_number || ""} onChange={e => setBankForm(f => ({ ...f, esi_number: e.target.value }))} className="input-field" /></div>
                    </Grid3>
                    <Grid3>
                      <div><Label>TDS %</Label><input type="number" step="0.01" value={bankForm.tds_percentage || ""} onChange={e => setBankForm(f => ({ ...f, tds_percentage: e.target.value || null }))} className="input-field" placeholder="10.00" /></div>
                    </Grid3>
                    <div style={{ display: "flex", gap: 16 }}>
                      <Toggle value={!!bankForm.gratuity_applicable} onChange={v => setBankForm(f => ({ ...f, gratuity_applicable: v }))} label="Gratuity Applicable" />
                      <Toggle value={!!bankForm.tds_applicable} onChange={v => setBankForm(f => ({ ...f, tds_applicable: v }))} label="TDS Applicable" />
                      <Toggle value={!!bankForm.pan_linked_to_account} onChange={v => setBankForm(f => ({ ...f, pan_linked_to_account: v }))} label="PAN Linked to Account" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                      <button onClick={() => { setBankEditing(false); setBankError(""); }} className="btn-secondary">Cancel</button>
                      <button disabled={bankSaving} className="btn-primary" onClick={async () => {
                        setBankSaving(true); setBankError("");
                        try {
                          const payload = { ...bankForm };
                          Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
                          const r = await portalEmployeeApi.upsertBankDetails(subdomain, token, empId, payload);
                          setBankDetails(r.data.data); setBankForm(r.data.data || {}); setBankEditing(false);
                        } catch (e) { setBankError(e?.response?.data?.detail || "Save failed."); }
                        finally { setBankSaving(false); }
                      }}>
                        {bankSaving ? "Saving…" : "Save Bank Details"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Government IDs Section */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
                <CardHeader icon="🪪" title="Government IDs" />
                <button
                  onClick={() => { setGovEditing(!govEditing); setGovError(""); if (!govEditing) setGovForm(govIds || {}); }}
                  className={govEditing ? "btn-secondary" : "btn-primary"}
                  style={{ fontSize: 12, padding: "6px 14px" }}
                >
                  {govEditing ? "Cancel" : "Edit"}
                </button>
              </div>
              {govError && <div style={{ margin: "0 20px 12px", padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13 }}>{govError}</div>}
              <div style={{ padding: "12px 20px 20px", display: "grid", gap: 16 }}>
                {!govEditing ? (
                  govIds ? (
                    <Grid3>
                      <div><Label>PAN Number</Label><Val>{govIds.pan_number}</Val></div>
                      <div><Label>Aadhaar Number</Label><Val>{govIds.aadhar_number}</Val></div>
                      <div><Label>Passport Number</Label><Val>{govIds.passport_number}</Val></div>
                      <div><Label>Driving Licence</Label><Val>{govIds.driving_license_number}</Val></div>
                      <div><Label>Voter ID</Label><Val>{govIds.voter_id_number}</Val></div>
                    </Grid3>
                  ) : (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No government IDs recorded. Click Edit to add.</div>
                  )
                ) : (
                  <>
                    <Grid3>
                      <div><Label>PAN Number</Label><input value={govForm.pan_number || ""} onChange={e => setGovForm(f => ({ ...f, pan_number: e.target.value }))} className="input-field" placeholder="ABCDE1234F" /></div>
                      <div><Label>Aadhaar Number</Label><input value={govForm.aadhar_number || ""} onChange={e => setGovForm(f => ({ ...f, aadhar_number: e.target.value }))} className="input-field" placeholder="1234 5678 9012" /></div>
                      <div><Label>Passport Number</Label><input value={govForm.passport_number || ""} onChange={e => setGovForm(f => ({ ...f, passport_number: e.target.value }))} className="input-field" placeholder="A1234567" /></div>
                      <div><Label>Driving Licence</Label><input value={govForm.driving_license_number || ""} onChange={e => setGovForm(f => ({ ...f, driving_license_number: e.target.value }))} className="input-field" placeholder="MH0120210001234" /></div>
                      <div><Label>Voter ID</Label><input value={govForm.voter_id_number || ""} onChange={e => setGovForm(f => ({ ...f, voter_id_number: e.target.value }))} className="input-field" placeholder="ABC1234567" /></div>
                    </Grid3>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                      <button onClick={() => { setGovEditing(false); setGovError(""); }} className="btn-secondary">Cancel</button>
                      <button disabled={govSaving} className="btn-primary" onClick={async () => {
                        setGovSaving(true); setGovError("");
                        try {
                          const payload = { ...govForm };
                          Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
                          const r = await portalEmployeeApi.upsertGovIds(subdomain, token, empId, payload);
                          setGovIds(r.data.data); setGovForm(r.data.data || {}); setGovEditing(false);
                        } catch (e) { setGovError(e?.response?.data?.detail || "Save failed."); }
                        finally { setGovSaving(false); }
                      }}>
                        {govSaving ? "Saving…" : "Save IDs"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === "activity" && (
          <Card>
            <CardHeader icon="📋" title="Activity Timeline" />
            <div style={{ padding: "8px 20px 20px" }}>
              {activities.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No activity recorded yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {activities.map((a, idx) => (
                    <div key={a.id} style={{ display: "flex", gap: 16, position: "relative" }}>
                      {/* Timeline line */}
                      {idx < activities.length - 1 && (
                        <div style={{ position: "absolute", left: 19, top: 36, bottom: 0, width: 2, background: "var(--c-border)" }} />
                      )}
                      {/* Icon */}
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--c-surface2)", border: "2px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, marginTop: 4, zIndex: 1 }}>
                        {a.action?.includes("PHOTO") ? "📷" :
                         a.action?.includes("BANK") ? "🏦" :
                         a.action?.includes("GOV") ? "🪪" :
                         a.action?.includes("EDUCATION") ? "🎓" :
                         a.action?.includes("FAMILY") ? "👨‍👩‍👧" :
                         a.action?.includes("CONTACT") || a.action?.includes("EMERGENCY") ? "🆘" :
                         a.action?.includes("CREATED") ? "✨" :
                         a.action?.includes("UPDATED") ? "✏️" :
                         a.action?.includes("ACTIVATED") ? "✅" :
                         a.action?.includes("DEACTIVATED") ? "🚫" : "📋"}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, paddingBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>
                            {a.action?.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                          <span className="t-muted" style={{ fontSize: 11 }}>
                            {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                          </span>
                        </div>
                        {a.notes && <div className="t-muted" style={{ fontSize: 12, marginTop: 3 }}>{a.notes}</div>}
                        {a.actor_id && <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>by {a.actor_id}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === "overview" && photos.length === 0 && !showPhotoUpload && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 16px" }}>
              <CardHeader icon="📷" title="Photos" />
              <button onClick={() => setShowPhotoUpload(true)} className="btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}>Upload Photo</button>
            </div>
            <div style={{ padding: "0 20px 20px", textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No photos uploaded yet.</div>
          </Card>
        )}

        {tab === "overview" && (photos.length > 0 || showPhotoUpload) && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 4px" }}>
              <CardHeader icon="📷" title="Photos" />
              <button onClick={() => { setShowPhotoUpload(!showPhotoUpload); setPhotoLabel(""); setPhotoIsIcon(false); setPhotoError(""); }} className={showPhotoUpload ? "btn-secondary" : "btn-primary"} style={{ fontSize: 12, padding: "6px 14px" }}>
                {showPhotoUpload ? "Cancel" : "Upload Photo"}
              </button>
            </div>

            {showPhotoUpload && (
              <div style={{ padding: "8px 20px 16px", borderBottom: "1px solid var(--c-border)", display: "grid", gap: 12 }}>
                {photoError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13 }}>{photoError}</div>}
                <Grid2>
                  <div>
                    <Label>Label (e.g. Passport Size, Headshot)</Label>
                    <input value={photoLabel} onChange={e => setPhotoLabel(e.target.value)} className="input-field" placeholder="Passport Size" />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <Toggle value={photoIsIcon} onChange={setPhotoIsIcon} label="Set as Profile Icon" />
                  </div>
                </Grid2>
                <div>
                  <Label>Image File (JPG, PNG, WEBP — max 5 MB)</Label>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={photoUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setPhotoUploading(true); setPhotoError("");
                      const fd = new FormData();
                      fd.append("file", file);
                      if (photoLabel) fd.append("label", photoLabel);
                      fd.append("is_profile_icon", photoIsIcon ? "true" : "false");
                      try {
                        await portalEmployeeApi.uploadPhoto(subdomain, token, empId, fd);
                        setShowPhotoUpload(false); setPhotoLabel(""); setPhotoIsIcon(false);
                        loadExtra(); load();
                      } catch (err) { setPhotoError(err?.response?.data?.detail || "Upload failed."); }
                      finally { setPhotoUploading(false); e.target.value = ""; }
                    }}
                    className="input-field" style={{ padding: "6px 10px" }}
                  />
                </div>
                {photoUploading && <div style={{ fontSize: 12, color: "var(--c-muted)" }}>Uploading…</div>}
              </div>
            )}

            <div style={{ padding: "16px 20px 20px", display: "flex", flexWrap: "wrap", gap: 16 }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ position: "relative", width: 140, border: `2px solid ${photo.is_profile_icon ? "var(--c-accent)" : "var(--c-border)"}`, borderRadius: 10, overflow: "visible", background: "var(--c-surface2)" }}>
                  {photo.is_profile_icon && (
                    <div style={{ position: "absolute", top: -10, right: -10, background: "var(--c-accent)", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, zIndex: 2 }}>★</div>
                  )}
                  <div style={{ width: 136, height: 136, borderRadius: "8px 8px 0 0", overflow: "hidden", background: "var(--c-border)" }}>
                    <PhotoThumb subdomain={subdomain} token={token} empId={empId} photoId={photo.id} />
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.label || "Photo"}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {!photo.is_profile_icon && (
                        <button className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, padding: 0 }}
                          onClick={async () => {
                            try {
                              await portalEmployeeApi.updatePhoto(subdomain, token, empId, photo.id, { is_profile_icon: true });
                              loadExtra(); load();
                            } catch {}
                          }}>Set Icon</button>
                      )}
                      <button className="t-muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: 0 }}
                        onClick={async () => {
                          if (!confirm("Delete this photo?")) return;
                          try {
                            await portalEmployeeApi.deletePhoto(subdomain, token, empId, photo.id);
                            loadExtra(); load();
                          } catch {}
                        }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Modals */}
      {showEdu && <EduModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} onClose={() => setShowEdu(false)} onSaved={() => { setShowEdu(false); loadExtra(); }} />}
      {showPrev && <PrevEmpModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} onClose={() => setShowPrev(false)} onSaved={() => { setShowPrev(false); loadExtra(); }} />}
      {showFamily && <FamilyModal subdomain={subdomain} token={token} empId={empId} editRow={editRow} familyRelationships={options.family_relationships} onClose={() => setShowFamily(false)} onSaved={() => { setShowFamily(false); loadExtra(); }} />}
    </EmployeeLayout>
  );
}

function PhotoThumb({ subdomain, token, empId, photoId }) {
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => {
    let url = portalEmployeeApi.downloadPhotoUrl(subdomain, empId, photoId);
    import("axios").then(({ default: axios }) => {
      axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" })
        .then(r => setSrc(URL.createObjectURL(r.data)))
        .catch(() => {});
    });
  }, [subdomain, token, empId, photoId]);
  if (!src) return <div style={{ width: "100%", height: "100%", background: "var(--c-surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📷</div>;
  return <img src={src} alt="Employee photo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
}
