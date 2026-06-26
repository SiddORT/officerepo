import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";

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
        {label && <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>{label}</label>}
        {El === "textarea" ? (
          <textarea value={value} rows={rows || 3} onChange={e => setter(k, e.target.value)} placeholder={placeholder}
            className="input-field"
            style={{ resize: "vertical", lineHeight: 1.5, ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
        ) : El === "select" ? (
          <select value={value} onChange={e => setter(k, e.target.value)}
            className="input-field"
            style={{ cursor: "pointer", ...(errMsg ? { borderColor: "#f87171" } : {}) }}>
            <option value="">{placeholder || "Select…"}</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={e => setter(k, mono ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={placeholder}
            className="input-field"
            style={{ ...(mono ? { fontFamily: "monospace" } : {}), ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
        )}
        {errMsg && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{errMsg}</div>}
        {note && !errMsg && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>{note}</div>}
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
        <PageHeader
          title={editMode ? "Edit Company" : "Add Company"}
          subtitle={editMode ? "Update company details" : "Register a new legal entity"}
          actions={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              ← Back
            </button>
          }
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* ── S1: General Information ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">🏢 General Information — Core identity of the company</div>
          <div className="portal-form-row">
            <F k="company_code" label="Company Code" required placeholder="ACME" mono note="Auto-uppercased unique short code" />
            <F k="company_name" label="Company Name" required placeholder="Acme Pvt Ltd" />
            <F k="legal_name" label="Legal / Registered Name" required placeholder="Acme Private Limited" />
            <F k="display_name" label="Display Name" placeholder="Acme" note="Short name shown in the portal" />
            <F k="company_type" label="Company Type" placeholder="Select type" as="select" options={COMPANY_TYPES} />
            <F k="industry" label="Industry" placeholder="e.g. Information Technology" />
            <F k="sub_industry" label="Sub-Industry" placeholder="e.g. SaaS" />
            <F k="date_of_incorporation" label="Date of Incorporation" type="date" />
          </div>
          <F k="company_description" label="Company Description" placeholder="Brief overview of what the company does…" as="textarea" rows={3} full />
        </div>

        {/* ── S9: Status (top position for quick access) ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">🔖 Status — Lifecycle status of this company record</div>
          <div style={{ maxWidth: 260 }}>
            <F k="status" label="Status" as="select" options={STATUSES} placeholder="Select status" />
          </div>
        </div>

        {/* ── S2: Registration & Compliance ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">📋 Registration & Compliance — Company registration and compliance identifiers</div>
          <div className="portal-form-row">
            <F k="registration_number" label="Registration Number" placeholder="CIN / Reg. No." />
            <F k="cin_number" label="CIN Number" placeholder="U12345MH2020PTC123456" mono />
            <F k="pan_number" label="PAN Number" placeholder="ABCDE1234F" mono />
            <F k="tan_number" label="TAN Number" placeholder="MUMO12345A" mono />
          </div>
          <div style={{ paddingTop: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" onClick={() => setX("msme_registered", !extra.msme_registered)}
                className={extra.msme_registered ? "btn-primary" : "btn-secondary"}
                style={{ padding: "4px 12px", height: "auto" }}>
                {extra.msme_registered ? "MSME Registered" : "Not MSME Registered"}
              </button>
            </div>
          </div>
          {extra.msme_registered && (
            <div style={{ maxWidth: 320, paddingTop: 4 }}>
              <F k="msme_number" label="MSME Number" placeholder="UDYAM-XX-00-0000000" mono />
            </div>
          )}
        </div>

        {/* ── S3: Tax Information ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">🧾 Tax Information — GST and other tax registrations</div>
          <div>
            <button type="button" onClick={() => setX("gst_registered", !extra.gst_registered)}
              className={extra.gst_registered ? "btn-primary" : "btn-secondary"}
              style={{ padding: "4px 12px", height: "auto" }}>
              {extra.gst_registered ? "GST Registered" : "Not GST Registered"}
            </button>
          </div>
          {extra.gst_registered && (
            <div className="portal-form-row">
              <F k="tax_number" label="GST Number" placeholder="22AAAAA0000A1Z5" mono />
              <F k="gst_registration_date" label="GST Registration Date" type="date" />
            </div>
          )}
          <div style={{ maxWidth: 320 }}>
            <F k="tax_identification_number" label="Tax Identification Number (TIN)" placeholder="TIN number" mono />
          </div>
        </div>

        {/* ── S4: Contact Information ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">📞 Contact Information — Primary and department-specific contacts</div>
          <div className="portal-form-row">
            <F k="primary_contact_person" label="Primary Contact Person" placeholder="Full name" />
            <F k="phone" label="Phone" placeholder="+91 98765 43210" />
            <F k="email" label="Primary Email" placeholder="contact@acme.com" type="email" />
            <F k="website" label="Website" placeholder="https://acme.com" note="Include https://" />
            <F k="support_email" label="Support Email" placeholder="support@acme.com" type="email" />
            <F k="hr_email" label="HR Email" placeholder="hr@acme.com" type="email" />
            <F k="accounts_email" label="Accounts Email" placeholder="accounts@acme.com" type="email" />
          </div>
        </div>

        {/* ── S5: Registered Address ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">📍 Registered Address — Official registered address as per government records</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <F k="address_line_1" label="Address Line 1" placeholder="Street / Plot / Building" full />
            <F k="address_line_2" label="Address Line 2" placeholder="Area / Landmark / Floor" full />
            <div className="portal-form-row">
              <F k="city" label="City" placeholder="Mumbai" />
              <F k="state" label="State" placeholder="Maharashtra" />
              <F k="country" label="Country" placeholder="India" />
              <F k="postal_code" label="Postal Code" placeholder="400001" />
            </div>
          </div>
        </div>

        {/* ── S6: Office Address ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">🏬 Office Address — Primary operating / work location</div>
          <div>
            <button type="button" onClick={() => setX("office_same", !extra.office_same)}
              className={extra.office_same ? "btn-primary" : "btn-secondary"}
              style={{ padding: "4px 12px", height: "auto" }}>
              {extra.office_same ? "Same as Registered" : "Different Address"}
            </button>
          </div>
          {!extra.office_same && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="portal-form-row">
                <F k="off_address_line_1" label="Address Line 1" placeholder="Street / Plot / Building" />
                <F k="off_address_line_2" label="Address Line 2" placeholder="Area / Landmark / Floor" />
              </div>
              <div className="portal-form-row">
                <F k="off_city" label="City" placeholder="Mumbai" />
                <F k="off_state" label="State" placeholder="Maharashtra" />
                <F k="off_country" label="Country" placeholder="India" />
                <F k="off_postal_code" label="Postal Code" placeholder="400001" />
              </div>
            </div>
          )}
        </div>

        {/* ── S7: Branding ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">🎨 Branding — Company logo and visual identity</div>
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
              <button type="button" onClick={() => logoInputRef.current?.click()} className="btn-primary">
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(null); logoInputRef.current.value = ""; }}
                  className="btn-secondary" style={{ marginLeft: 8, color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── S8: Company Documents ── */}
        <div className="portal-form-card" style={{ marginBottom: 16 }}>
          <div className="portal-form-title">📁 Company Documents — Registration certificates, licenses, and compliance documents</div>
          {/* Documents table */}
          {docs.length > 0 && (
            <div className="portal-table-wrap" style={{ marginBottom: 4 }}>
              <table className="portal-table">
                <thead>
                  <tr>
                    {["Type", "Doc. Number", "Issue Date", "Expiry Date", "File", ""].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d, i) => (
                    <tr key={d.id}>
                      <td style={{ fontSize: 12, color: "var(--c-text)", fontWeight: 500 }}>{d.doc_type}</td>
                      <td style={{ fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{d.doc_number || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{d.issue_date || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{d.expiry_date || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--c-muted)" }}>
                        {d.fileName
                          ? <span className="t-accent">📎 {d.fileName.length > 20 ? d.fileName.slice(0, 20) + "…" : d.fileName}</span>
                          : "—"}
                      </td>
                      <td>
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
              <div className="portal-form-row">
                <div>
                  <label className="portal-form-label portal-form-label-req">Document Type</label>
                  <select value={newDoc.doc_type} onChange={e => setDocField("doc_type", e.target.value)}
                    className="input-field" style={{ cursor: "pointer" }}>
                    <option value="">Select type…</option>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="portal-form-label">Document Number</label>
                  <input value={newDoc.doc_number} onChange={e => setDocField("doc_number", e.target.value)}
                    placeholder="Reg. No / ID" className="input-field" style={{ fontFamily: "monospace" }} />
                </div>
              </div>
              <div className="portal-form-row">
                <div>
                  <label className="portal-form-label">Issue Date</label>
                  <input type="date" value={newDoc.issue_date} onChange={e => setDocField("issue_date", e.target.value)}
                    className="input-field" />
                </div>
                <div>
                  <label className="portal-form-label">Expiry Date</label>
                  <input type="date" value={newDoc.expiry_date} onChange={e => setDocField("expiry_date", e.target.value)}
                    className="input-field" />
                </div>
              </div>
              <div>
                <label className="portal-form-label">Attachment</label>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button type="button" onClick={() => document.getElementById("doc-file").click()}
                    className="btn-secondary" style={{ padding: "6px 12px" }}>
                    {newDoc.fileName ? "Change File" : "Choose File"}
                  </button>
                  <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{newDoc.fileName || "No file chosen"}</span>
                  <input id="doc-file" type="file" style={{ display: "none" }} onChange={handleDocFile} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={addDoc} className="btn-primary" style={{ padding: "6px 16px" }}>Add Document</button>
                <button type="button" onClick={() => setAddingDoc(false)} className="btn-secondary" style={{ padding: "6px 16px" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingDoc(true)}
              className="btn-secondary" style={{ width: "fit-content", padding: "7px 14px" }}>
              + Add Document
            </button>
          )}
        </div>

        {/* ── Form Actions ── */}
        <div style={{ display: "flex", gap: 12, marginTop: 24, paddingBottom: 40 }}>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ padding: "10px 30px" }}>
            {saving ? "Saving…" : editMode ? "Update Company" : "Register Company"}
          </button>
          <button onClick={() => navigate(-1)} disabled={saving} className="btn-secondary" style={{ padding: "10px 30px" }}>
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
