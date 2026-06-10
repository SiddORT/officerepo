// @refresh reset
import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";

// ── Design tokens ──────────────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box", outline: "none",
};
const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</label>
);
const Val = ({ children }) => (
  <div style={{ fontSize: 13, color: children ? "var(--c-text)" : "var(--c-muted)", paddingTop: 1 }}>{children || "—"}</div>
);
const Card = ({ children, style = {} }) => (
  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden", ...style }}>{children}</div>
);
const CardHeader = ({ icon, title }) => (
  <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", alignItems: "center", gap: 10 }}>
    <span style={{ fontSize: 15 }}>{icon}</span>
    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{title}</span>
  </div>
);
const Grid2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>{children}</div>
);
const Grid3 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>{children}</div>
);
const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
    <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
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
        style={{ ...inp, width: 100, borderRadius: "6px 0 0 6px", borderRight: "none", flexShrink: 0, fontSize: 12, paddingLeft: 6, paddingRight: 2 }}>
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input value={number || ""} onChange={e => onNumberChange(e.target.value)}
        placeholder={placeholder || "9876543210"}
        style={{ ...inp, borderRadius: "0 6px 6px 0", flex: 1 }} />
    </div>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" onClick={() => onChange(!value)}
        style={{ width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, background: value ? "var(--c-accent)" : "var(--c-border)", flexShrink: 0 }}>
        <span style={{ display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff", transform: value ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s" }} />
      </button>
      <span style={{ fontSize: 13, color: "var(--c-text)" }}>{label}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    Active: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
    Draft:  { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" },
    "On Leave": { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
    Probation: { bg: "rgba(96,165,250,0.12)", color: "#60a5fa" },
    "Notice Period": { bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
    Resigned: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    Terminated: { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
  };
  const s = colors[status] || { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" };
  return <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color }}>{status}</span>;
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

// ── Modal Overlay ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 14, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: "var(--c-text)", fontSize: 14 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

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
    <Modal title={editRow ? "Edit Education" : "Add Education"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div><Label>Qualification</Label><input value={form.qualification || ""} onChange={e => set("qualification", e.target.value)} style={inp} placeholder="Bachelor's / Master's / PhD" /></div>
          <div><Label>Degree</Label><input value={form.degree || ""} onChange={e => set("degree", e.target.value)} style={inp} placeholder="B.Tech / MBA / M.Sc" /></div>
        </Grid2>
        <div><Label>Specialization</Label><input value={form.specialization || ""} onChange={e => set("specialization", e.target.value)} style={inp} placeholder="Computer Science / Finance" /></div>
        <Grid2>
          <div><Label>Institution</Label><input value={form.institution_name || ""} onChange={e => set("institution_name", e.target.value)} style={inp} placeholder="IIT Bombay" /></div>
          <div><Label>University</Label><input value={form.university || ""} onChange={e => set("university", e.target.value)} style={inp} placeholder="University of Mumbai" /></div>
        </Grid2>
        <Grid3>
          <div><Label>Start Year</Label><input type="number" min="1970" max="2030" value={form.start_year || ""} onChange={e => set("start_year", e.target.value)} style={inp} placeholder="2018" /></div>
          <div><Label>End Year</Label><input type="number" min="1970" max="2030" value={form.end_year || ""} onChange={e => set("end_year", e.target.value)} style={inp} placeholder="2022" /></div>
          <div><Label>Country</Label><input value={form.country || ""} onChange={e => set("country", e.target.value)} style={inp} placeholder="India" /></div>
        </Grid3>
        <Grid2>
          <div><Label>Percentage (%)</Label><input type="number" step="0.01" value={form.percentage || ""} onChange={e => set("percentage", e.target.value)} style={inp} placeholder="78.5" /></div>
          <div><Label>CGPA</Label><input type="number" step="0.01" value={form.cgpa || ""} onChange={e => set("cgpa", e.target.value)} style={inp} placeholder="8.2" /></div>
        </Grid2>
        <div><Label>Remarks</Label><input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} style={inp} placeholder="Distinction / Honours / etc." /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" id="edu-completed" checked={form.is_completed} onChange={e => set("is_completed", e.target.checked)} />
          <label htmlFor="edu-completed" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>Completed</label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
    <Modal title={editRow ? "Edit Employment History" : "Add Employment History"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div><Label>Company Name</Label><input value={form.company_name || ""} onChange={e => set("company_name", e.target.value)} style={inp} placeholder="Infosys Ltd." /></div>
          <div><Label>Designation</Label><input value={form.designation || ""} onChange={e => set("designation", e.target.value)} style={inp} placeholder="Senior Developer" /></div>
        </Grid2>
        <Grid2>
          <div><Label>Department</Label><input value={form.department || ""} onChange={e => set("department", e.target.value)} style={inp} placeholder="Engineering" /></div>
          <div><Label>Employment Type</Label><input value={form.employment_type || ""} onChange={e => set("employment_type", e.target.value)} style={inp} placeholder="Full Time" /></div>
        </Grid2>
        <Grid3>
          <div><Label>Start Date</Label><input type="date" value={form.start_date || ""} onChange={e => set("start_date", e.target.value)} style={inp} /></div>
          <div><Label>End Date</Label><input type="date" value={form.end_date || ""} onChange={e => set("end_date", e.target.value)} style={inp} /></div>
          <div><Label>Last CTC (₹)</Label><input type="number" value={form.last_salary || ""} onChange={e => set("last_salary", e.target.value)} style={inp} placeholder="800000" /></div>
        </Grid3>
        <Grid2>
          <div><Label>Reporting Manager</Label><input value={form.reporting_manager_name || ""} onChange={e => set("reporting_manager_name", e.target.value)} style={inp} placeholder="Suresh Gupta" /></div>
          <div><Label>Manager Contact</Label><input value={form.reporting_manager_contact || ""} onChange={e => set("reporting_manager_contact", e.target.value)} style={inp} placeholder="+91 9876543210" /></div>
        </Grid2>
        <div><Label>Reason for Leaving</Label><input value={form.reason_for_leaving || ""} onChange={e => set("reason_for_leaving", e.target.value)} style={inp} placeholder="Better opportunity" /></div>
        <div><Label>Remarks</Label><input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} style={inp} /></div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
    <Modal title={editRow ? "Edit Family Member" : "Add Family Member"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div>
            <Label>Name *</Label>
            <input value={form.member_name} onChange={e => set("member_name", e.target.value)} style={inp} placeholder="Sunita Sharma" />
          </div>
          <div>
            <Label>Relationship</Label>
            <select value={form.relationship || ""} onChange={e => set("relationship", e.target.value)} style={inp}>
              <option value="">Select…</option>
              {(familyRelationships || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </Grid2>
        <Grid3>
          <div>
            <Label>Date of Birth</Label>
            <input type="date" value={form.date_of_birth || ""} onChange={e => set("date_of_birth", e.target.value)} max={todayStr} style={inp} />
          </div>
          <div>
            <Label>Gender</Label>
            <select value={form.gender || ""} onChange={e => set("gender", e.target.value)} style={inp}>
              <option value="">Select…</option>
              {["Male", "Female", "Other"].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <Label>Occupation</Label>
            <input value={form.occupation || ""} onChange={e => set("occupation", e.target.value)} style={inp} placeholder="Teacher / Student" />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="is-dep" checked={form.is_dependent} onChange={e => set("is_dependent", e.target.checked)} />
            <label htmlFor="is-dep" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>Is Dependent</label>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" id="is-nom" checked={form.is_nominee} onChange={e => set("is_nominee", e.target.checked)} />
            <label htmlFor="is-nom" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>Insurance Nominee</label>
          </div>
        </div>
        {form.is_nominee && (
          <div style={{ maxWidth: 220 }}>
            <Label>Nomination % </Label>
            <input type="number" min="0" max="100" value={form.nomination_percentage || ""} onChange={e => set("nomination_percentage", e.target.value)} style={inp} placeholder="100" />
          </div>
        )}
        <div>
          <Label>Remarks</Label>
          <input value={form.remarks || ""} onChange={e => set("remarks", e.target.value)} style={inp} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
    <Modal title={editRow ? "Edit Emergency Contact" : "Add Emergency Contact"} onClose={onClose}>
      {err && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        <Grid2>
          <div>
            <Label>Contact Name *</Label>
            <input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} style={inp} placeholder="Sunita Sharma" />
          </div>
          <div>
            <Label>Relationship</Label>
            <select value={form.relationship || ""} onChange={e => set("relationship", e.target.value)} style={inp}>
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
          <input value={form.address || ""} onChange={e => set("address", e.target.value)} style={inp} placeholder="Full address" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const emptyBankForm = () => ({
  account_holder_name: "", bank_name: "", branch_name: "", account_number: "", account_type: "",
  ifsc_code: "", swift_code: "", upi_id: "",
  salary_credit_date: "", salary_cycle: "",
  pf_account_number: "", pf_uan_number: "", esi_number: "",
  gratuity_applicable: false, tds_applicable: false, tds_percentage: "", pan_linked_to_account: false,
});

export default function EmployeeDetails() {
  const { subdomain, empId } = useParams();
  const { token } = usePortalAuth();

  const [tab, setTab] = useState("overview");
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [education, setEducation]     = useState([]);
  const [history, setHistory]         = useState([]);
  const [historyMeta, setHistoryMeta] = useState({});
  const [family, setFamily]           = useState([]);
  const [contacts, setContacts]       = useState([]);
  const [bankDetails, setBankDetails] = useState(null);
  const [govIds, setGovIds]           = useState(null);
  const [activities, setActivities]   = useState([]);
  const [options, setOptions]         = useState({});

  const [eduModal, setEduModal]         = useState(null);
  const [prevModal, setPrevModal]       = useState(null);
  const [familyModal, setFamilyModal]   = useState(null);
  const [contactModal, setContactModal] = useState(null);

  const [toast, setToast]         = useState(null);
  const [bankForm, setBankForm]   = useState(null);
  const [govForm, setGovForm]     = useState(null);
  const [bankSaving, setBankSaving] = useState(false);
  const [govSaving, setGovSaving]   = useState(false);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const loadEmp = useCallback(async () => {
    try {
      const r = await portalEmployeeApi.get(subdomain, token, empId);
      setEmp(r.data.data);
    } catch { setError("Employee not found."); }
    finally { setLoading(false); }
  }, [subdomain, token, empId]);

  useEffect(() => {
    loadEmp();
    portalEmployeeApi.options(subdomain, token).then(r => setOptions(r.data.data || {})).catch(() => {});
  }, [loadEmp, subdomain, token]);

  const loadTabData = useCallback(async () => {
    if (!emp) return;
    if (tab === "education") {
      portalEmployeeApi.listEducation(subdomain, token, empId).then(r => setEducation(r.data.data || [])).catch(() => {});
    } else if (tab === "experience") {
      portalEmployeeApi.listHistory(subdomain, token, empId).then(r => {
        const d = r.data.data || {};
        setHistory(d.records || []);
        setHistoryMeta(d.experience_summary || {});
      }).catch(() => {});
    } else if (tab === "family") {
      portalEmployeeApi.listFamilyMembers(subdomain, token, empId).then(r => setFamily(r.data.data || [])).catch(() => {});
    } else if (tab === "contacts") {
      portalEmployeeApi.listContacts(subdomain, token, empId).then(r => setContacts(r.data.data || [])).catch(() => {});
    } else if (tab === "bank") {
      portalEmployeeApi.getBankDetails(subdomain, token, empId).then(r => {
        const d = r.data.data;
        setBankDetails(d);
        setBankForm(d ? {
          account_holder_name: d.account_holder_name || "", bank_name: d.bank_name || "",
          branch_name: d.branch_name || "", account_number: d.account_number || "",
          account_type: d.account_type || "", ifsc_code: d.ifsc_code || "",
          swift_code: d.swift_code || "", upi_id: d.upi_id || "",
          salary_credit_date: d.salary_credit_date || "", salary_cycle: d.salary_cycle || "",
          pf_account_number: d.pf_account_number || "", pf_uan_number: d.pf_uan_number || "",
          esi_number: d.esi_number || "",
          gratuity_applicable: d.gratuity_applicable || false,
          tds_applicable: d.tds_applicable || false,
          tds_percentage: d.tds_percentage || "", pan_linked_to_account: d.pan_linked_to_account || false,
        } : emptyBankForm());
      }).catch(() => {});
      portalEmployeeApi.getGovIds(subdomain, token, empId).then(r => {
        const d = r.data.data;
        setGovIds(d);
        setGovForm(d ? { pan_number: d.pan_number || "", aadhar_number: d.aadhar_number || "", passport_number: d.passport_number || "", driving_license_number: d.driving_license_number || "", voter_id_number: d.voter_id_number || "" } : { pan_number: "", aadhar_number: "", passport_number: "", driving_license_number: "", voter_id_number: "" });
      }).catch(() => {});
    } else if (tab === "activity") {
      portalEmployeeApi.listActivities(subdomain, token, empId).then(r => setActivities(r.data.data || [])).catch(() => {});
    }
  }, [tab, emp, subdomain, token, empId]);

  useEffect(() => { loadTabData(); }, [loadTabData]);

  const handleDelete = async (type, id) => {
    if (!window.confirm("Remove this record?")) return;
    try {
      if (type === "edu") {
        await portalEmployeeApi.deleteEducation(subdomain, token, empId, id);
        setEducation(e => e.filter(r => r.id !== id));
        showToast("Education record removed.");
      } else if (type === "hist") {
        await portalEmployeeApi.deleteHistory(subdomain, token, empId, id);
        setHistory(e => e.filter(r => r.id !== id));
        showToast("Employment history removed.");
      } else if (type === "family") {
        await portalEmployeeApi.deleteFamilyMember(subdomain, token, empId, id);
        setFamily(e => e.filter(r => r.id !== id));
        showToast("Family member removed.");
      } else if (type === "contact") {
        await portalEmployeeApi.deleteContact(subdomain, token, empId, id);
        setContacts(e => e.filter(r => r.id !== id));
        showToast("Emergency contact removed.");
      }
    } catch (e) { showToast(e?.response?.data?.detail || "Delete failed.", false); }
  };

  const handleSaveBank = async () => {
    setBankSaving(true);
    try {
      const payload = { ...bankForm };
      Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
      payload.gratuity_applicable = bankForm.gratuity_applicable;
      payload.tds_applicable = bankForm.tds_applicable;
      payload.pan_linked_to_account = bankForm.pan_linked_to_account;
      await portalEmployeeApi.upsertBankDetails(subdomain, token, empId, payload);
      portalEmployeeApi.getBankDetails(subdomain, token, empId).then(r => setBankDetails(r.data.data)).catch(() => {});
      showToast("Bank details saved.");
    } catch (e) { showToast(e?.response?.data?.detail || "Save failed.", false); }
    finally { setBankSaving(false); }
  };

  const handleSaveGov = async () => {
    setGovSaving(true);
    try {
      await portalEmployeeApi.upsertGovIds(subdomain, token, empId, govForm);
      portalEmployeeApi.getGovIds(subdomain, token, empId).then(r => setGovIds(r.data.data)).catch(() => {});
      showToast("Government IDs saved.");
    } catch (e) { showToast(e?.response?.data?.detail || "Save failed.", false); }
    finally { setGovSaving(false); }
  };

  const handleToggle = async () => {
    try {
      if (emp.is_active) {
        await portalEmployeeApi.deactivate(subdomain, token, empId);
        showToast("Employee deactivated.");
      } else {
        await portalEmployeeApi.activate(subdomain, token, empId);
        showToast("Employee activated.");
      }
      loadEmp();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
  };

  if (loading) return <EmployeeLayout><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div></EmployeeLayout>;
  if (error || !emp) return <EmployeeLayout><div style={{ padding: 40, textAlign: "center", color: "#f87171", fontSize: 13 }}>{error || "Employee not found."}</div></EmployeeLayout>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const relationships       = options.relationships || [];
  const familyRelationships = options.family_relationships || [];
  const accountTypes        = options.account_types || [];
  const salaryCycles        = options.salary_cycles || [];
  const bSet = (k, v) => setBankForm(f => ({ ...f, [k]: v }));

  return (
    <EmployeeLayout title={emp.full_name}>
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: toast.ok ? "#4ade80" : "#f87171", border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>{toast.msg}</div>
      )}

      {/* Modals */}
      {eduModal !== null && (
        <EduModal subdomain={subdomain} token={token} empId={empId}
          editRow={eduModal === "new" ? null : eduModal}
          onClose={() => setEduModal(null)}
          onSaved={() => { setEduModal(null); portalEmployeeApi.listEducation(subdomain, token, empId).then(r => setEducation(r.data.data || [])); showToast("Education saved."); }} />
      )}
      {prevModal !== null && (
        <PrevEmpModal subdomain={subdomain} token={token} empId={empId}
          editRow={prevModal === "new" ? null : prevModal}
          onClose={() => setPrevModal(null)}
          onSaved={() => { setPrevModal(null); portalEmployeeApi.listHistory(subdomain, token, empId).then(r => { setHistory(r.data.data?.records || []); setHistoryMeta(r.data.data?.experience_summary || {}); }); showToast("Employment history saved."); }} />
      )}
      {familyModal !== null && (
        <FamilyModal subdomain={subdomain} token={token} empId={empId}
          editRow={familyModal === "new" ? null : familyModal}
          familyRelationships={familyRelationships}
          onClose={() => setFamilyModal(null)}
          onSaved={() => { setFamilyModal(null); portalEmployeeApi.listFamilyMembers(subdomain, token, empId).then(r => setFamily(r.data.data || [])); showToast("Family member saved."); }} />
      )}
      {contactModal !== null && (
        <ContactModal subdomain={subdomain} token={token} empId={empId}
          editRow={contactModal === "new" ? null : contactModal}
          relationships={relationships}
          onClose={() => setContactModal(null)}
          onSaved={() => { setContactModal(null); portalEmployeeApi.listContacts(subdomain, token, empId).then(r => setContacts(r.data.data || [])); showToast("Contact saved."); }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <Avatar name={emp.full_name} size={60} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-heading)" }}>{emp.full_name}</h1>
            <StatusBadge status={emp.employment_status} />
            {!emp.is_active && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "rgba(239,68,68,0.12)", color: "#f87171", fontWeight: 600 }}>Inactive</span>}
          </div>
          <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 4 }}>
            <span style={{ fontFamily: "monospace", color: "var(--c-accent)", marginRight: 12 }}>{emp.employee_code}</span>
            {emp.official_email}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link to={`/portal/${subdomain}/employees/${empId}/edit`}>
            <button style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text)", fontSize: 13 }}>Edit</button>
          </Link>
          <button onClick={handleToggle} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: emp.is_active ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)", color: emp.is_active ? "#f87171" : "#4ade80", fontSize: 13, fontWeight: 600 }}>
            {emp.is_active ? "Deactivate" : "Activate"}
          </button>
          <Link to={`/portal/${subdomain}/employees`}>
            <button style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text2)", fontSize: 13 }}>← Back</button>
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, overflowX: "auto", borderBottom: "1px solid var(--c-border)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "9px 14px", border: "none", cursor: "pointer", background: "transparent",
              color: tab === t.id ? "var(--c-accent)" : "var(--c-text2)",
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              borderBottom: tab === t.id ? "2px solid var(--c-accent)" : "2px solid transparent",
              whiteSpace: "nowrap", transition: "color 0.15s", flexShrink: 0,
            }}>
            <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <CardHeader icon="🪪" title="Personal Information" />
            <div style={{ padding: 20 }}>
              <Grid3>
                <div><Label>Gender</Label><Val>{emp.gender}</Val></div>
                <div><Label>Date of Birth</Label><Val>{fmt(emp.date_of_birth)}</Val></div>
                <div><Label>Marital Status</Label><Val>{emp.marital_status}</Val></div>
                <div><Label>Blood Group</Label><Val>{emp.blood_group}</Val></div>
                <div><Label>Nationality</Label><Val>{emp.nationality}</Val></div>
              </Grid3>
            </div>
          </Card>
          <Card>
            <CardHeader icon="📧" title="Contact" />
            <div style={{ padding: 20 }}>
              <Grid2>
                <div><Label>Official Email</Label><Val>{emp.official_email}</Val></div>
                <div><Label>Personal Email</Label><Val>{emp.personal_email}</Val></div>
                <div>
                  <Label>Mobile</Label>
                  <Val>{emp.mobile_number ? `${emp.mobile_country_code || ""} ${emp.mobile_number}`.trim() : null}</Val>
                </div>
                <div>
                  <Label>Alternate Mobile</Label>
                  <Val>{emp.alternate_mobile ? `${emp.alternate_mobile_country_code || ""} ${emp.alternate_mobile}`.trim() : null}</Val>
                </div>
                <div><Label>Landline</Label><Val>{emp.landline_number}</Val></div>
              </Grid2>
            </div>
          </Card>
          <Card>
            <CardHeader icon="🏠" title="Address" />
            <div style={{ padding: 20 }}>
              <Grid2>
                <div>
                  <Label>Current Address</Label>
                  <Val>{[emp.current_address_line_1, emp.current_address_line_2, emp.current_city, emp.current_state, emp.current_country, emp.current_postal_code].filter(Boolean).join(", ")}</Val>
                </div>
                <div>
                  <Label>Permanent Address</Label>
                  <Val>{emp.permanent_same_as_current ? "Same as current" : [emp.permanent_address_line_1, emp.permanent_address_line_2, emp.permanent_city, emp.permanent_state, emp.permanent_country, emp.permanent_postal_code].filter(Boolean).join(", ")}</Val>
                </div>
              </Grid2>
            </div>
          </Card>
          {(emp.resume_url || emp.resume_filename) && (
            <Card>
              <CardHeader icon="📎" title="Resume" />
              <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 24 }}>📄</div>
                <div>
                  <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 600 }}>{emp.resume_filename || "Resume"}</div>
                  {emp.resume_url && <a href={emp.resume_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--c-accent)" }}>Open →</a>}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Employment ────────────────────────────────────────────────────── */}
      {tab === "employment" && (
        <Card>
          <CardHeader icon="💼" title="Employment Details" />
          <div style={{ padding: 20 }}>
            <Grid3>
              <div><Label>Category</Label><Val>{emp.employee_category}</Val></div>
              <div><Label>Type</Label><Val>{emp.employment_type}</Val></div>
              <div><Label>Status</Label><Val>{emp.employment_status}</Val></div>
              <div><Label>Joining Date</Label><Val>{fmt(emp.joining_date)}</Val></div>
              <div><Label>Confirmation Date</Label><Val>{fmt(emp.confirmation_date)}</Val></div>
              <div><Label>Relieving Date</Label><Val>{fmt(emp.relieving_date)}</Val></div>
            </Grid3>
          </div>
        </Card>
      )}

      {/* ── Education ─────────────────────────────────────────────────────── */}
      {tab === "education" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setEduModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Education</button>
          </div>
          {education.length === 0 ? (
            <Card><div style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div><div style={{ fontSize: 13, color: "var(--c-muted)" }}>No education records added yet.</div></div></Card>
          ) : education.map(e => (
            <Card key={e.id}>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{e.degree || e.qualification || "Degree"} {e.specialization ? `— ${e.specialization}` : ""}</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{e.institution_name || e.university || ""} {e.end_year ? `· ${e.end_year}` : ""}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEduModal(e)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text2)" }}>Edit</button>
                    <button onClick={() => handleDelete("edu", e.id)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", background: "transparent", color: "#f87171" }}>Remove</button>
                  </div>
                </div>
                <Grid3>
                  {e.percentage && <div><Label>Percentage</Label><Val>{e.percentage}%</Val></div>}
                  {e.cgpa && <div><Label>CGPA</Label><Val>{e.cgpa}</Val></div>}
                  <div><Label>Completed</Label><Val>{e.is_completed ? "Yes" : "In Progress"}</Val></div>
                  {e.country && <div><Label>Country</Label><Val>{e.country}</Val></div>}
                </Grid3>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Experience ────────────────────────────────────────────────────── */}
      {tab === "experience" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {historyMeta.total_years > 0 && (
              <span style={{ fontSize: 13, color: "var(--c-muted)" }}>Total experience: <strong style={{ color: "var(--c-text)" }}>{historyMeta.total_years} yrs</strong></span>
            )}
            <button onClick={() => setPrevModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}>+ Add History</button>
          </div>
          {history.length === 0 ? (
            <Card><div style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div><div style={{ fontSize: 13, color: "var(--c-muted)" }}>No employment history. Click "Add History" to add one.</div></div></Card>
          ) : history.map(h => (
            <Card key={h.id}>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{h.designation || "Role"} — {h.company_name || "Company"}</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>
                      {[h.start_date && fmt(h.start_date), h.end_date && fmt(h.end_date)].filter(Boolean).join(" → ")}
                      {h.duration_years ? ` (${h.duration_years} yrs)` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPrevModal(h)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text2)" }}>Edit</button>
                    <button onClick={() => handleDelete("hist", h.id)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", background: "transparent", color: "#f87171" }}>Remove</button>
                  </div>
                </div>
                <Grid3>
                  <div><Label>Department</Label><Val>{h.department}</Val></div>
                  <div><Label>Type</Label><Val>{h.employment_type}</Val></div>
                  <div><Label>Last CTC</Label><Val>{h.last_salary ? `₹${Number(h.last_salary).toLocaleString("en-IN")}` : null}</Val></div>
                  {h.reporting_manager_name && <div><Label>Reporting Manager</Label><Val>{h.reporting_manager_name}</Val></div>}
                  {h.reason_for_leaving && <div><Label>Reason for Leaving</Label><Val>{h.reason_for_leaving}</Val></div>}
                </Grid3>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Family ────────────────────────────────────────────────────────── */}
      {tab === "family" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setFamilyModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Member</button>
          </div>
          {family.length === 0 ? (
            <Card><div style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 8 }}>👨‍👩‍👧</div><div style={{ fontSize: 13, color: "var(--c-muted)" }}>No family members added yet.</div></div></Card>
          ) : family.map(m => (
            <Card key={m.id}>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{m.member_name}</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>
                      {[m.relationship, m.gender].filter(Boolean).join(" · ")}
                      {m.is_nominee && <span style={{ marginLeft: 8, fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>Nominee {m.nomination_percentage ? `${m.nomination_percentage}%` : ""}</span>}
                      {m.is_dependent && <span style={{ marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "rgba(96,165,250,0.12)", color: "#60a5fa" }}>Dependent</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setFamilyModal(m)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text2)" }}>Edit</button>
                    <button onClick={() => handleDelete("family", m.id)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", background: "transparent", color: "#f87171" }}>Remove</button>
                  </div>
                </div>
                <Grid3>
                  {m.date_of_birth && <div><Label>Date of Birth</Label><Val>{fmt(m.date_of_birth)}</Val></div>}
                  {m.occupation && <div><Label>Occupation</Label><Val>{m.occupation}</Val></div>}
                  {m.phone && <div><Label>Phone</Label><Val>{`${m.phone_country_code || ""} ${m.phone}`.trim()}</Val></div>}
                </Grid3>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Emergency Contacts ────────────────────────────────────────────── */}
      {tab === "contacts" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={() => setContactModal("new")} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Contact</button>
          </div>
          {contacts.length === 0 ? (
            <Card><div style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 8 }}>🆘</div><div style={{ fontSize: 13, color: "var(--c-muted)" }}>No emergency contacts added yet.</div></div></Card>
          ) : contacts.map(c => (
            <Card key={c.id}>
              <div style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{c.contact_name}</div>
                    <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>
                      {[c.relationship, `${c.mobile_country_code || ""} ${c.mobile_number}`.trim()].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setContactModal(c)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "transparent", color: "var(--c-text2)" }}>Edit</button>
                    <button onClick={() => handleDelete("contact", c.id)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", background: "transparent", color: "#f87171" }}>Remove</button>
                  </div>
                </div>
                {c.alternate_number && <div style={{ marginTop: 8 }}><Label>Alternate</Label><Val>{`${c.alternate_country_code || ""} ${c.alternate_number}`.trim()}</Val></div>}
                {c.address && <div style={{ marginTop: 8 }}><Label>Address</Label><Val>{c.address}</Val></div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Bank & IDs ────────────────────────────────────────────────────── */}
      {tab === "bank" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card>
            <CardHeader icon="🏦" title="Bank Account" />
            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              {bankForm && (
                <>
                  <Grid2>
                    <div><Label>Account Holder Name</Label><input value={bankForm.account_holder_name || ""} onChange={e => bSet("account_holder_name", e.target.value)} style={inp} placeholder="Rajan Kumar Sharma" /></div>
                    <div><Label>Account Type</Label>
                      <select value={bankForm.account_type || ""} onChange={e => bSet("account_type", e.target.value)} style={inp}>
                        <option value="">Select…</option>
                        {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </Grid2>
                  <Grid2>
                    <div><Label>Bank Name</Label><input value={bankForm.bank_name || ""} onChange={e => bSet("bank_name", e.target.value)} style={inp} placeholder="HDFC Bank" /></div>
                    <div><Label>Branch Name</Label><input value={bankForm.branch_name || ""} onChange={e => bSet("branch_name", e.target.value)} style={inp} placeholder="Andheri West" /></div>
                  </Grid2>
                  <div><Label>Account Number</Label><input value={bankForm.account_number || ""} onChange={e => bSet("account_number", e.target.value)} style={inp} placeholder="XXXXXXXXXXXXXXXX" /></div>
                  <Grid3>
                    <div><Label>IFSC Code</Label><input value={bankForm.ifsc_code || ""} onChange={e => bSet("ifsc_code", e.target.value.toUpperCase())} style={inp} placeholder="HDFC0001234" /></div>
                    <div><Label>SWIFT Code</Label><input value={bankForm.swift_code || ""} onChange={e => bSet("swift_code", e.target.value.toUpperCase())} style={inp} placeholder="HDFCINBBXXX" /></div>
                    <div><Label>UPI ID</Label><input value={bankForm.upi_id || ""} onChange={e => bSet("upi_id", e.target.value)} style={inp} placeholder="rajan@okhdfc" /></div>
                  </Grid3>

                  <Divider label="Salary" />
                  <Grid3>
                    <div>
                      <Label>Salary Cycle</Label>
                      <select value={bankForm.salary_cycle || ""} onChange={e => bSet("salary_cycle", e.target.value)} style={inp}>
                        <option value="">Select…</option>
                        {salaryCycles.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Credit Date (Day of Month)</Label>
                      <input type="number" min={1} max={31} value={bankForm.salary_credit_date || ""} onChange={e => bSet("salary_credit_date", e.target.value)} style={inp} placeholder="1–31" />
                    </div>
                  </Grid3>

                  <Divider label="PF / ESI / Gratuity" />
                  <Grid3>
                    <div><Label>PF Account Number</Label><input value={bankForm.pf_account_number || ""} onChange={e => bSet("pf_account_number", e.target.value)} style={inp} placeholder="MH/BOM/..." /></div>
                    <div><Label>PF UAN Number</Label><input value={bankForm.pf_uan_number || ""} onChange={e => bSet("pf_uan_number", e.target.value)} style={inp} placeholder="100XXXXXXXXX" /></div>
                    <div><Label>ESI Number</Label><input value={bankForm.esi_number || ""} onChange={e => bSet("esi_number", e.target.value)} style={inp} placeholder="31-XX-..." /></div>
                  </Grid3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="gratuity-chk" checked={bankForm.gratuity_applicable || false} onChange={e => bSet("gratuity_applicable", e.target.checked)} />
                    <label htmlFor="gratuity-chk" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>Gratuity Applicable</label>
                  </div>

                  <Divider label="TDS" />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="tds-chk" checked={bankForm.tds_applicable || false} onChange={e => bSet("tds_applicable", e.target.checked)} />
                    <label htmlFor="tds-chk" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>TDS Applicable</label>
                  </div>
                  {bankForm.tds_applicable && (
                    <Grid2>
                      <div>
                        <Label>TDS Percentage (%)</Label>
                        <input type="number" step="0.01" min="0" max="100" value={bankForm.tds_percentage || ""} onChange={e => bSet("tds_percentage", e.target.value)} style={inp} placeholder="10.00" />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 20 }}>
                        <input type="checkbox" id="pan-link-chk" checked={bankForm.pan_linked_to_account || false} onChange={e => bSet("pan_linked_to_account", e.target.checked)} />
                        <label htmlFor="pan-link-chk" style={{ fontSize: 13, color: "var(--c-text)", cursor: "pointer" }}>PAN Linked to Account</label>
                      </div>
                    </Grid2>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                    <button onClick={handleSaveBank} disabled={bankSaving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: bankSaving ? "var(--c-border)" : "var(--c-accent)", color: bankSaving ? "var(--c-muted)" : "#fff", fontSize: 13, fontWeight: 600 }}>
                      {bankSaving ? "Saving…" : "Save Bank Details"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader icon="🪪" title="Government IDs" />
            <div style={{ padding: 20, display: "grid", gap: 14 }}>
              <div style={{ fontSize: 11, color: "var(--c-muted)", background: "var(--c-surface2)", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--c-border)" }}>
                ⚠️ Saved IDs are masked for security. Enter new values to update.
              </div>
              {govForm && (
                <>
                  <Grid3>
                    <div><Label>PAN Number</Label><input value={govForm.pan_number || ""} onChange={e => setGovForm(f => ({ ...f, pan_number: e.target.value.toUpperCase() }))} style={inp} placeholder="ABCDE1234F" maxLength={10} /></div>
                    <div><Label>Aadhaar Number</Label><input value={govForm.aadhar_number || ""} onChange={e => setGovForm(f => ({ ...f, aadhar_number: e.target.value }))} style={inp} placeholder="XXXX XXXX XXXX" maxLength={14} /></div>
                    <div><Label>Passport Number</Label><input value={govForm.passport_number || ""} onChange={e => setGovForm(f => ({ ...f, passport_number: e.target.value.toUpperCase() }))} style={inp} placeholder="A1234567" /></div>
                  </Grid3>
                  <Grid2>
                    <div><Label>Driving License</Label><input value={govForm.driving_license_number || ""} onChange={e => setGovForm(f => ({ ...f, driving_license_number: e.target.value.toUpperCase() }))} style={inp} placeholder="MH0120220001234" /></div>
                    <div><Label>Voter ID</Label><input value={govForm.voter_id_number || ""} onChange={e => setGovForm(f => ({ ...f, voter_id_number: e.target.value.toUpperCase() }))} style={inp} placeholder="ABC1234567" /></div>
                  </Grid2>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={handleSaveGov} disabled={govSaving} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: govSaving ? "var(--c-border)" : "var(--c-accent)", color: govSaving ? "var(--c-muted)" : "#fff", fontSize: 13, fontWeight: 600 }}>
                      {govSaving ? "Saving…" : "Save Government IDs"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ── Activity ──────────────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div style={{ display: "grid", gap: 10 }}>
          {activities.length === 0 ? (
            <Card><div style={{ padding: 40, textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📋</div><div style={{ fontSize: 13, color: "var(--c-muted)" }}>No activity recorded yet.</div></div></Card>
          ) : activities.map(a => (
            <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-accent)", marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 500 }}>{a.action.replace(/_/g, " ")}</div>
                {a.notes && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{a.notes}</div>}
                <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>{new Date(a.created_at).toLocaleString("en-IN")}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </EmployeeLayout>
  );
}
