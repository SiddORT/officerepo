import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

// ─── Design tokens ────────────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box",
  outline: "none",
};
const Label = ({ children, required }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
  </label>
);
const Grid2 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>{children}</div>
);
const Hint = ({ children }) => (
  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>{children}</div>
);

// ─── Section card with icon + title ──────────────────────────────────────────
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

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button type="button" onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", padding: 2,
          background: value ? "var(--c-accent)" : "var(--c-border)",
          transition: "background 0.2s", flexShrink: 0, position: "relative",
        }}>
        <span style={{
          display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff",
          transform: value ? "translateX(18px)" : "translateX(0)", transition: "transform 0.2s",
        }} />
      </button>
      <span style={{ fontSize: 13, color: "var(--c-text)" }}>{label}</span>
    </div>
  );
}

// ─── Document types ───────────────────────────────────────────────────────────
const DOC_TYPES = [
  "Certificate of Incorporation", "GST Certificate", "PAN Copy", "TAN Certificate",
  "MSME Certificate", "Trade License", "Shop & Establishment License", "Other",
];

const COMPANY_TYPES = [
  "Private Limited", "Public Limited", "LLP", "Partnership",
  "Proprietorship", "NGO", "Other",
];

const STATUSES = ["Draft", "Active", "Inactive", "Suspended", "Closed"];

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidEmail = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidUrl   = v => !v || /^https?:\/\/.+/.test(v.trim());
const isValidPhone = v => !v || /^[+\d\s\-().]{7,20}$/.test(v.trim());
const isValidPAN   = v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
const isValidGST   = v => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim().toUpperCase());
const trim         = v  => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v;

// ─── API fields (sent to backend) ────────────────────────────────────────────
const API_EMPTY = {
  company_code: "", company_name: "", legal_name: "", display_name: "",
  registration_number: "", tax_number: "", website: "",
  email: "", phone: "",
  address_line_1: "", address_line_2: "", city: "", state: "", country: "", postal_code: "",
};

// ─── Extra UI-only fields (not sent to API yet) ───────────────────────────────
const EXTRA_EMPTY = {
  company_type: "", industry: "", sub_industry: "",
  date_of_incorporation: "", company_description: "",
  cin_number: "", pan_number: "", tan_number: "",
  msme_registered: false, msme_number: "",
  gst_registered: false, gst_registration_date: "", tax_identification_number: "",
  primary_contact_person: "", support_email: "", hr_email: "", accounts_email: "",
  office_same: false,
  off_address_line_1: "", off_address_line_2: "", off_city: "", off_state: "", off_country: "", off_postal_code: "",
  status: "Active",
};

const EMPTY_DOC = { doc_type: "", doc_number: "", issue_date: "", expiry_date: "", remarks: "", file: null, fileName: "" };

// ─── Main component ───────────────────────────────────────────────────────────
export default function CompanyForm({ editMode }) {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const logoInputRef = useRef(null);

  const [form, setForm]   = useState(API_EMPTY);
  const [extra, setExtra] = useState(EXTRA_EMPTY);
  const [docs, setDocs]   = useState([]);
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState(EMPTY_DOC);
  const [logoPreview, setLogoPreview] = useState(null);

  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error, setError]     = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!editMode || !companyId) return;
    setLoading(true);
    portalOrgApi.getCompany(subdomain, token, companyId)
      .then(r => {
        const d = r.data.data;
        setForm(Object.fromEntries(Object.keys(API_EMPTY).map(k => [k, d[k] ?? ""])));
        setExtra(ex => ({ ...ex, status: d.status || "Active" }));
      })
      .catch(() => setError("Failed to load company."))
      .finally(() => setLoading(false));
  }, [editMode, companyId, subdomain, token]);

  const set  = (k, v) => setForm(f  => ({ ...f,  [k]: v }));
  const setX = (k, v) => setExtra(f => ({ ...f,  [k]: v }));

  // logo upload
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { setError("Logo must be JPG, PNG, or WEBP."); return; }
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // validate
  const validate = () => {
    const errs = {};
    if (!form.company_code.trim()) errs.company_code = "Required";
    if (!form.company_name.trim()) errs.company_name = "Required";
    if (!form.legal_name.trim()) errs.legal_name = "Required";
    if (form.email && !isValidEmail(form.email)) errs.email = "Invalid email";
    if (extra.support_email && !isValidEmail(extra.support_email)) errs.support_email = "Invalid email";
    if (extra.hr_email && !isValidEmail(extra.hr_email)) errs.hr_email = "Invalid email";
    if (extra.accounts_email && !isValidEmail(extra.accounts_email)) errs.accounts_email = "Invalid email";
    if (form.phone && !isValidPhone(form.phone)) errs.phone = "Invalid phone";
    if (form.website && !isValidUrl(form.website)) errs.website = "Must start with https://";
    if (extra.pan_number && !isValidPAN(extra.pan_number)) errs.pan_number = "Invalid PAN (e.g. ABCDE1234F)";
    if (form.tax_number && !isValidGST(form.tax_number)) errs.tax_number = "Invalid GST number";
    return errs;
  };

  const handleSubmit = async () => {
    setError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError("Please fix the highlighted fields before saving.");
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : trim(v)])
    );
    payload.company_code = (payload.company_code || "").toUpperCase();
    try {
      if (editMode) await portalOrgApi.updateCompany(subdomain, token, companyId, payload);
      else await portalOrgApi.createCompany(subdomain, token, payload);
      navigate(`/portal/${subdomain}/org/companies`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const F = ({ k, label, placeholder, type = "text", mono, full, required, note, as, rows, options }) => {
    const isForm  = k in API_EMPTY;
    const value   = isForm ? form[k] : extra[k];
    const setter  = isForm ? set : setX;
    const errMsg  = fieldErrors[k];
    const El      = as === "textarea" ? "textarea" : as === "select" ? "select" : "input";
    return (
      <div style={full ? { gridColumn: "1 / -1" } : {}}>
        {label && <Label required={required}>{label}</Label>}
        {El === "textarea" ? (
          <textarea value={value} rows={rows || 3} onChange={e => setter(k, e.target.value)} placeholder={placeholder}
            style={{ ...inp, resize: "vertical", lineHeight: 1.5, ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
        ) : El === "select" ? (
          <select value={value} onChange={e => setter(k, e.target.value)}
            style={{ ...inp, cursor: "pointer", ...(errMsg ? { borderColor: "#f87171" } : {}) }}>
            <option value="">{placeholder || "Select…"}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={e => setter(k, mono ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={placeholder}
            style={{ ...inp, ...(mono ? { fontFamily: "monospace" } : {}), ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
        )}
        {errMsg && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{errMsg}</div>}
        {note && !errMsg && <Hint>{note}</Hint>}
      </div>
    );
  };

  // document helpers
  const setDocField = (k, v) => setNewDoc(d => ({ ...d, [k]: v }));
  const handleDocFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setNewDoc(d => ({ ...d, file, fileName: file.name }));
  };
  const addDoc = () => {
    if (!newDoc.doc_type) return;
    setDocs(d => [...d, { ...newDoc, id: Date.now() }]);
    setNewDoc(EMPTY_DOC);
    setAddingDoc(false);
  };
  const removeDoc = (id) => setDocs(d => d.filter(x => x.id !== id));

  if (loading) return (
    <OrgLayout title="Company">
      <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
    </OrgLayout>
  );

  return (
    <OrgLayout title={editMode ? "Edit Company" : "Add Company"}>
      <div>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
              {editMode ? "Edit Company" : "Add Company"}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
              {editMode ? "Update company details" : "Register a new legal entity"}
            </p>
          </div>
          <button onClick={() => navigate(-1)}
            style={{ fontSize: 12, color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer" }}>
            ← Back
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* ── S1: General Information ── */}
        <Section icon="🏢" title="General Information" subtitle="Core identity of the company">
          <Grid2>
            <F k="company_code" label="Company Code" required placeholder="ACME" mono note="Auto-uppercased unique short code" />
            <F k="company_name" label="Company Name" required placeholder="Acme Pvt Ltd" />
            <F k="legal_name" label="Legal / Registered Name" required placeholder="Acme Private Limited" />
            <F k="display_name" label="Display Name" placeholder="Acme" note="Short name shown in the portal" />
            <F k="company_type" label="Company Type" placeholder="Select type" as="select" options={COMPANY_TYPES} />
            <F k="industry" label="Industry" placeholder="e.g. Information Technology" />
            <F k="sub_industry" label="Sub-Industry" placeholder="e.g. SaaS" />
            <F k="date_of_incorporation" label="Date of Incorporation" type="date" />
          </Grid2>
          <F k="company_description" label="Company Description" placeholder="Brief overview of what the company does…" as="textarea" rows={3} full />
        </Section>

        {/* ── S9: Status (top position for quick access) ── */}
        <Section icon="🔖" title="Status" subtitle="Lifecycle status of this company record">
          <div style={{ maxWidth: 260 }}>
            <F k="status" label="Status" as="select" options={STATUSES} placeholder="Select status" />
          </div>
        </Section>

        {/* ── S2: Registration & Compliance ── */}
        <Section icon="📋" title="Registration & Compliance" subtitle="Company registration and compliance identifiers">
          <Grid2>
            <F k="registration_number" label="Registration Number" placeholder="CIN / Reg. No." />
            <F k="cin_number" label="CIN Number" placeholder="U12345MH2020PTC123456" mono />
            <F k="pan_number" label="PAN Number" placeholder="ABCDE1234F" mono />
            <F k="tan_number" label="TAN Number" placeholder="MUMO12345A" mono />
          </Grid2>
          <div style={{ paddingTop: 6 }}>
            <Toggle value={extra.msme_registered} onChange={v => setX("msme_registered", v)} label="MSME Registered" />
          </div>
          {extra.msme_registered && (
            <div style={{ maxWidth: 320, paddingTop: 4 }}>
              <F k="msme_number" label="MSME Number" placeholder="UDYAM-XX-00-0000000" mono />
            </div>
          )}
        </Section>

        {/* ── S3: Tax Information ── */}
        <Section icon="🧾" title="Tax Information" subtitle="GST and other tax registrations">
          <div>
            <Toggle value={extra.gst_registered} onChange={v => setX("gst_registered", v)} label="GST Registered" />
          </div>
          {extra.gst_registered && (
            <Grid2>
              <F k="tax_number" label="GST Number" placeholder="22AAAAA0000A1Z5" mono />
              <F k="gst_registration_date" label="GST Registration Date" type="date" />
            </Grid2>
          )}
          <div style={{ maxWidth: 320 }}>
            <F k="tax_identification_number" label="Tax Identification Number (TIN)" placeholder="TIN number" mono />
          </div>
        </Section>

        {/* ── S4: Contact Information ── */}
        <Section icon="📞" title="Contact Information" subtitle="Primary and department-specific contacts">
          <Grid2>
            <F k="primary_contact_person" label="Primary Contact Person" placeholder="Full name" />
            <F k="phone" label="Phone" placeholder="+91 98765 43210" />
            <F k="email" label="Primary Email" placeholder="contact@acme.com" type="email" />
            <F k="website" label="Website" placeholder="https://acme.com" note="Include https://" />
            <F k="support_email" label="Support Email" placeholder="support@acme.com" type="email" />
            <F k="hr_email" label="HR Email" placeholder="hr@acme.com" type="email" />
            <F k="accounts_email" label="Accounts Email" placeholder="accounts@acme.com" type="email" />
          </Grid2>
        </Section>

        {/* ── S5: Registered Address ── */}
        <Section icon="📍" title="Registered Address" subtitle="Official registered address as per government records">
          <div style={{ display: "grid", gap: 14 }}>
            <F k="address_line_1" label="Address Line 1" placeholder="Street / Plot / Building" full />
            <F k="address_line_2" label="Address Line 2" placeholder="Area / Landmark / Floor" full />
            <Grid2>
              <F k="city" label="City" placeholder="Mumbai" />
              <F k="state" label="State" placeholder="Maharashtra" />
              <F k="country" label="Country" placeholder="India" />
              <F k="postal_code" label="Postal Code" placeholder="400001" />
            </Grid2>
          </div>
        </Section>

        {/* ── S6: Office Address ── */}
        <Section icon="🏬" title="Office Address" subtitle="Primary operating / work location">
          <div>
            <Toggle value={extra.office_same} onChange={v => setX("office_same", v)} label="Same as Registered Address" />
          </div>
          {!extra.office_same && (
            <div style={{ display: "grid", gap: 14 }}>
              <Grid2>
                <F k="off_address_line_1" label="Address Line 1" placeholder="Street / Plot / Building" />
                <F k="off_address_line_2" label="Address Line 2" placeholder="Area / Landmark / Floor" />
              </Grid2>
              <Grid2>
                <F k="off_city" label="City" placeholder="Mumbai" />
                <F k="off_state" label="State" placeholder="Maharashtra" />
                <F k="off_country" label="Country" placeholder="India" />
                <F k="off_postal_code" label="Postal Code" placeholder="400001" />
              </Grid2>
            </div>
          )}
        </Section>

        {/* ── S7: Branding ── */}
        <Section icon="🎨" title="Branding" subtitle="Company logo and visual identity">
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Preview */}
            <div
              onClick={() => logoInputRef.current?.click()}
              style={{
                width: 100, height: 100, borderRadius: 10, border: "2px dashed var(--c-border)",
                background: "var(--c-bg)", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", overflow: "hidden", flexShrink: 0,
              }}>
              {logoPreview
                ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <span style={{ fontSize: 28, opacity: 0.3 }}>🖼</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>Company Logo</div>
              <div style={{ fontSize: 12, color: "var(--c-muted)", marginBottom: 10, lineHeight: 1.6 }}>
                Upload a JPG, PNG, or WEBP image.<br />Recommended: 400×400 px, max 2 MB.
              </div>
              <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={handleLogoChange} />
              <button type="button" onClick={() => logoInputRef.current?.click()}
                style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(null); logoInputRef.current.value = ""; }}
                  style={{ marginLeft: 8, padding: "7px 14px", borderRadius: 6, fontSize: 12, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </Section>

        {/* ── S8: Company Documents ── */}
        <Section icon="📁" title="Company Documents" subtitle="Registration certificates, licenses, and compliance documents">
          {/* Documents table */}
          {docs.length > 0 && (
            <div style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden", marginBottom: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                    {["Type", "Doc. Number", "Issue Date", "Expiry Date", "File", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d, i) => (
                    <tr key={d.id} style={{ borderBottom: i < docs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-text)", fontWeight: 500 }}>{d.doc_type}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{d.doc_number || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-muted)" }}>{d.issue_date || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-muted)" }}>{d.expiry_date || "—"}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--c-muted)" }}>
                        {d.fileName
                          ? <span style={{ color: "var(--c-accent)" }}>📎 {d.fileName.length > 20 ? d.fileName.slice(0, 20) + "…" : d.fileName}</span>
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => removeDoc(d.id)}
                          style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add document form */}
          {addingDoc ? (
            <div style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, padding: 16, display: "grid", gap: 12 }}>
              <Grid2>
                <div>
                  <Label required>Document Type</Label>
                  <select value={newDoc.doc_type} onChange={e => setDocField("doc_type", e.target.value)}
                    style={{ ...inp, cursor: "pointer" }}>
                    <option value="">Select type…</option>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Document Number</Label>
                  <input value={newDoc.doc_number} onChange={e => setDocField("doc_number", e.target.value)}
                    placeholder="e.g. U12345MH2020" style={{ ...inp, fontFamily: "monospace" }} />
                </div>
                <div>
                  <Label>Issue Date</Label>
                  <input type="date" value={newDoc.issue_date} onChange={e => setDocField("issue_date", e.target.value)} style={inp} />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <input type="date" value={newDoc.expiry_date} onChange={e => setDocField("expiry_date", e.target.value)} style={inp} />
                </div>
              </Grid2>
              <div>
                <Label>Remarks</Label>
                <input value={newDoc.remarks} onChange={e => setDocField("remarks", e.target.value)}
                  placeholder="Optional notes about this document…" style={inp} />
              </div>
              <div>
                <Label>File</Label>
                <input type="file" onChange={handleDocFile}
                  style={{ fontSize: 12, color: "var(--c-text)", cursor: "pointer" }} />
              </div>
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button onClick={addDoc} disabled={!newDoc.doc_type}
                  style={{ padding: "7px 16px", borderRadius: 6, fontWeight: 600, fontSize: 12, background: newDoc.doc_type ? "var(--c-accent)" : "var(--c-muted)", color: "#fff", border: "none", cursor: newDoc.doc_type ? "pointer" : "not-allowed" }}>
                  Add Document
                </button>
                <button onClick={() => { setAddingDoc(false); setNewDoc(EMPTY_DOC); }}
                  style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingDoc(true)}
              style={{ padding: "8px 16px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "transparent", color: "var(--c-accent)", border: "1px solid var(--c-accent)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              + Add Document
            </button>
          )}
        </Section>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: 10, paddingBottom: 32 }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "10px 26px", borderRadius: 8, fontWeight: 700, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Company"}
          </button>
          <button onClick={() => navigate(-1)}
            style={{ padding: "10px 20px", borderRadius: 8, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: "var(--c-text)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
