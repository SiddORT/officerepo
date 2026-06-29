import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";

const DOC_TYPES = [
  "Certificate of Incorporation", "GST Certificate", "PAN Copy", "TAN Certificate",
  "MSME Certificate", "Trade License", "Shop & Establishment License", "Other",
];
const COMPANY_TYPES = ["Private Limited", "Public Limited", "LLP", "Partnership", "Proprietorship", "NGO", "Other"];
const STATUSES = ["Draft", "Active", "Inactive", "Suspended", "Closed"];

const isValidEmail = v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const isValidUrl   = v => !v || /^https?:\/\/.+/.test(v.trim());
const isValidPhone = v => !v || /^[+\d\s\-().]{7,20}$/.test(v.trim());
const isValidPAN   = v => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.trim().toUpperCase());
const isValidGST   = v => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v.trim().toUpperCase());
const trimStr      = v => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v;

const API_EMPTY = {
  company_code: "", company_name: "", legal_name: "", display_name: "",
  registration_number: "", tax_number: "", website: "",
  email: "", phone: "",
  address_line_1: "", address_line_2: "", city: "", state: "", country: "", postal_code: "",
};

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

const TAB_FIELDS = {
  general:    ["company_code", "company_name", "legal_name", "display_name", "company_type", "industry", "sub_industry", "date_of_incorporation", "company_description", "status"],
  compliance: ["registration_number", "cin_number", "pan_number", "tan_number", "msme_number", "tax_number", "gst_registration_date", "tax_identification_number"],
  contact:    ["primary_contact_person", "phone", "email", "website", "support_email", "hr_email", "accounts_email", "address_line_1", "address_line_2", "city", "state", "country", "postal_code", "off_address_line_1", "off_address_line_2", "off_city", "off_state", "off_country", "off_postal_code"],
  branding:   [],
};

const TABS = [
  { id: "general",    label: "General",          icon: "🏢" },
  { id: "compliance", label: "Compliance",        icon: "📋" },
  { id: "contact",    label: "Contact & Address", icon: "📞" },
  { id: "branding",   label: "Branding & Docs",   icon: "🎨" },
];

// ── Field renderer — called as a FUNCTION {field({...})}, NOT as <field /> ──
// (Keeping it as a component causes React to remount on every re-render,
//  losing input focus after each keystroke.)
function field({ k, label, placeholder, type = "text", mono, full, required, note, as, rows, options,
                 form, extra, fieldErrors, set, setX }) {
  const isForm = k in API_EMPTY;
  const value  = isForm ? form[k] : extra[k];
  const setter = isForm ? set : setX;
  const errMsg = fieldErrors[k];
  const El     = as === "textarea" ? "textarea" : as === "select" ? "select" : "input";
  return (
    <div key={k} style={full ? { gridColumn: "1 / -1" } : {}}>
      {label && (
        <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>{label}</label>
      )}
      {El === "textarea" ? (
        <textarea value={value} rows={rows || 3}
          onChange={e => setter(k, e.target.value)} placeholder={placeholder}
          className="input-field"
          style={{ resize: "vertical", lineHeight: 1.5, ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
      ) : El === "select" ? (
        <select value={value} onChange={e => setter(k, e.target.value)}
          className="input-field"
          style={{ cursor: "pointer", ...(errMsg ? { borderColor: "#f87171" } : {}) }}>
          <option value="">{placeholder || "Select…"}</option>
          {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value}
          onChange={e => setter(k, mono ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder} className="input-field"
          style={{ ...(mono ? { fontFamily: "monospace" } : {}), ...(errMsg ? { borderColor: "#f87171" } : {}) }} />
      )}
      {errMsg && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{errMsg}</div>}
      {note && !errMsg && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>{note}</div>}
    </div>
  );
}

export default function CompanyForm({ editMode }) {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate  = useNavigate();
  const logoInputRef = useRef(null);

  const [tab,  setTab]  = useState("general");
  const [form, setForm] = useState(API_EMPTY);
  const [extra, setExtra] = useState(EXTRA_EMPTY);
  const [docs,  setDocs]  = useState([]);
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDoc,    setNewDoc]    = useState(EMPTY_DOC);
  const [logoPreview, setLogoPreview] = useState(null);

  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error,  setError]    = useState("");
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

  const set  = (k, v) => setForm(f  => ({ ...f, [k]: v }));
  const setX = (k, v) => setExtra(f => ({ ...f, [k]: v }));

  // Shared props passed to every field() call
  const fp = { form, extra, fieldErrors, set, setX };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Logo must be JPG, PNG, or WEBP."); return;
    }
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!form.company_code.trim()) errs.company_code = "Required";
    if (!form.company_name.trim()) errs.company_name = "Required";
    if (!form.legal_name.trim())   errs.legal_name   = "Required";
    if (form.email            && !isValidEmail(form.email))            errs.email            = "Invalid email";
    if (extra.support_email   && !isValidEmail(extra.support_email))   errs.support_email    = "Invalid email";
    if (extra.hr_email        && !isValidEmail(extra.hr_email))        errs.hr_email         = "Invalid email";
    if (extra.accounts_email  && !isValidEmail(extra.accounts_email))  errs.accounts_email   = "Invalid email";
    if (form.phone            && !isValidPhone(form.phone))            errs.phone            = "Invalid phone";
    if (form.website          && !isValidUrl(form.website))            errs.website          = "Must start with https://";
    if (extra.pan_number      && !isValidPAN(extra.pan_number))        errs.pan_number       = "Invalid PAN (e.g. ABCDE1234F)";
    if (form.tax_number       && !isValidGST(form.tax_number))         errs.tax_number       = "Invalid GST number";
    return errs;
  };

  const tabHasError = (tabId) => (TAB_FIELDS[tabId] || []).some(k => fieldErrors[k]);

  const handleSubmit = async () => {
    setError("");
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError("Please fix the highlighted fields before saving.");
      const firstErrTab = TABS.find(t => (TAB_FIELDS[t.id] || []).some(k => errs[k]));
      if (firstErrTab) setTab(firstErrTab.id);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? null : trimStr(v)])
    );
    payload.company_code = (payload.company_code || "").toUpperCase();
    try {
      if (editMode) await portalOrgApi.updateCompany(subdomain, token, companyId, payload);
      else          await portalOrgApi.createCompany(subdomain, token, payload);
      navigate(`/portal/${subdomain}/org/companies`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  // Document helpers
  const setDocField  = (k, v) => setNewDoc(d => ({ ...d, [k]: v }));
  const handleDocFile = (e) => {
    const file = e.target.files?.[0];
    if (file) setNewDoc(d => ({ ...d, file, fileName: file.name }));
  };
  const addDoc    = () => {
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
        <PageHeader
          title={editMode ? "Edit Company" : "Add Company"}
          subtitle={editMode ? "Update company details" : "Register a new legal entity"}
          actions={<button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>}
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* ── Tab bar ── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c-border)", marginBottom: 20, overflowX: "auto" }}>
          {TABS.map(t => {
            const active  = tab === t.id;
            const hasErr  = tabHasError(t.id);
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 20px", fontSize: 13, fontWeight: active ? 600 : 400,
                background: "none", border: "none", cursor: "pointer",
                color: active ? "var(--c-accent)" : hasErr ? "#f87171" : "var(--c-muted)",
                borderBottom: active ? "2px solid var(--c-accent)" : "2px solid transparent",
                marginBottom: -1, whiteSpace: "nowrap", transition: "color 0.15s",
              }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {hasErr && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* ══ TAB: General ══ */}
        {tab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">🏢 General Information</div>
              <div className="portal-form-row">
                {field({ ...fp, k: "company_code",  label: "Company Code",            required: true, placeholder: "ACME",                 mono: true, note: "Auto-uppercased unique short code" })}
                {field({ ...fp, k: "company_name",  label: "Company Name",            required: true, placeholder: "Acme Pvt Ltd" })}
                {field({ ...fp, k: "legal_name",    label: "Legal / Registered Name", required: true, placeholder: "Acme Private Limited" })}
                {field({ ...fp, k: "display_name",  label: "Display Name",            placeholder: "Acme", note: "Short name shown in the portal" })}
                {field({ ...fp, k: "company_type",  label: "Company Type",            placeholder: "Select type", as: "select", options: COMPANY_TYPES })}
                {field({ ...fp, k: "industry",      label: "Industry",                placeholder: "e.g. Information Technology" })}
                {field({ ...fp, k: "sub_industry",  label: "Sub-Industry",            placeholder: "e.g. SaaS" })}
                {field({ ...fp, k: "date_of_incorporation", label: "Date of Incorporation", type: "date" })}
              </div>
              {field({ ...fp, k: "company_description", label: "Company Description", placeholder: "Brief overview of what the company does…", as: "textarea", rows: 3, full: true })}
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">🔖 Status</div>
              <div style={{ maxWidth: 260 }}>
                {field({ ...fp, k: "status", label: "Status", as: "select", options: STATUSES, placeholder: "Select status" })}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: Compliance ══ */}
        {tab === "compliance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">📋 Registration & Compliance</div>
              <div className="portal-form-row">
                {field({ ...fp, k: "registration_number", label: "Registration Number", placeholder: "CIN / Reg. No." })}
                {field({ ...fp, k: "cin_number",          label: "CIN Number",          placeholder: "U12345MH2020PTC123456", mono: true })}
                {field({ ...fp, k: "pan_number",          label: "PAN Number",          placeholder: "ABCDE1234F",            mono: true })}
                {field({ ...fp, k: "tan_number",          label: "TAN Number",          placeholder: "MUMO12345A",            mono: true })}
              </div>
              <div style={{ paddingTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                <button type="button"
                  onClick={() => setX("msme_registered", !extra.msme_registered)}
                  className={extra.msme_registered ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 12px", height: "auto" }}>
                  {extra.msme_registered ? "✔ MSME Registered" : "Not MSME Registered"}
                </button>
              </div>
              {extra.msme_registered && (
                <div style={{ maxWidth: 320, paddingTop: 4 }}>
                  {field({ ...fp, k: "msme_number", label: "MSME Number", placeholder: "UDYAM-XX-00-0000000", mono: true })}
                </div>
              )}
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">🧾 Tax Information</div>
              <div style={{ marginBottom: 12 }}>
                <button type="button"
                  onClick={() => setX("gst_registered", !extra.gst_registered)}
                  className={extra.gst_registered ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 12px", height: "auto" }}>
                  {extra.gst_registered ? "✔ GST Registered" : "Not GST Registered"}
                </button>
              </div>
              {extra.gst_registered && (
                <div className="portal-form-row" style={{ marginBottom: 12 }}>
                  {field({ ...fp, k: "tax_number",            label: "GST Number",            placeholder: "22AAAAA0000A1Z5",  mono: true })}
                  {field({ ...fp, k: "gst_registration_date", label: "GST Registration Date", type: "date" })}
                </div>
              )}
              <div style={{ maxWidth: 320 }}>
                {field({ ...fp, k: "tax_identification_number", label: "Tax Identification Number (TIN)", placeholder: "TIN number", mono: true })}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: Contact & Address ══ */}
        {tab === "contact" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">📞 Contact Information</div>
              <div className="portal-form-row">
                {field({ ...fp, k: "primary_contact_person", label: "Primary Contact Person", placeholder: "Full name" })}
                {field({ ...fp, k: "phone",         label: "Phone",         placeholder: "+91 98765 43210" })}
                {field({ ...fp, k: "email",         label: "Primary Email", placeholder: "contact@acme.com", type: "email" })}
                {field({ ...fp, k: "website",       label: "Website",       placeholder: "https://acme.com", note: "Include https://" })}
                {field({ ...fp, k: "support_email", label: "Support Email", placeholder: "support@acme.com", type: "email" })}
                {field({ ...fp, k: "hr_email",      label: "HR Email",      placeholder: "hr@acme.com",      type: "email" })}
                {field({ ...fp, k: "accounts_email", label: "Accounts Email", placeholder: "accounts@acme.com", type: "email" })}
              </div>
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">📍 Registered Address</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {field({ ...fp, k: "address_line_1", label: "Address Line 1", placeholder: "Street / Plot / Building", full: true })}
                {field({ ...fp, k: "address_line_2", label: "Address Line 2", placeholder: "Area / Landmark / Floor",  full: true })}
                <div className="portal-form-row">
                  {field({ ...fp, k: "city",        label: "City",        placeholder: "Mumbai" })}
                  {field({ ...fp, k: "state",       label: "State",       placeholder: "Maharashtra" })}
                  {field({ ...fp, k: "country",     label: "Country",     placeholder: "India" })}
                  {field({ ...fp, k: "postal_code", label: "Postal Code", placeholder: "400001" })}
                </div>
              </div>
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">🏬 Office Address</div>
              <div style={{ marginBottom: extra.office_same ? 0 : 12 }}>
                <button type="button"
                  onClick={() => setX("office_same", !extra.office_same)}
                  className={extra.office_same ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 12px", height: "auto" }}>
                  {extra.office_same ? "✔ Same as Registered" : "Different Address"}
                </button>
              </div>
              {!extra.office_same && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                  <div className="portal-form-row">
                    {field({ ...fp, k: "off_address_line_1", label: "Address Line 1", placeholder: "Street / Plot / Building" })}
                    {field({ ...fp, k: "off_address_line_2", label: "Address Line 2", placeholder: "Area / Landmark / Floor" })}
                  </div>
                  <div className="portal-form-row">
                    {field({ ...fp, k: "off_city",        label: "City",        placeholder: "Mumbai" })}
                    {field({ ...fp, k: "off_state",       label: "State",       placeholder: "Maharashtra" })}
                    {field({ ...fp, k: "off_country",     label: "Country",     placeholder: "India" })}
                    {field({ ...fp, k: "off_postal_code", label: "Postal Code", placeholder: "400001" })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: Branding & Docs ══ */}
        {tab === "branding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">🎨 Company Logo</div>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: 100, height: 100, borderRadius: 10,
                    border: "2px dashed var(--c-border)", background: "var(--c-bg)",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", overflow: "hidden", flexShrink: 0,
                  }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    : <span style={{ fontSize: 28, opacity: 0.3 }}>🖼</span>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>Upload Logo</div>
                  <div style={{ fontSize: 12, color: "var(--c-muted)", marginBottom: 10, lineHeight: 1.6 }}>
                    JPG, PNG or WEBP · Recommended 400×400 px · Max 2 MB
                  </div>
                  <input ref={logoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp"
                    style={{ display: "none" }} onChange={handleLogoChange} />
                  <button type="button" onClick={() => logoInputRef.current?.click()} className="btn-primary">
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </button>
                  {logoPreview && (
                    <button type="button"
                      onClick={() => { setLogoPreview(null); logoInputRef.current.value = ""; }}
                      className="btn-secondary"
                      style={{ marginLeft: 8, color: "#f87171", borderColor: "rgba(239,68,68,0.3)" }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">📁 Company Documents</div>

              {docs.length > 0 && (
                <div className="portal-table-wrap" style={{ marginBottom: 12 }}>
                  <table className="portal-table">
                    <thead>
                      <tr>
                        {["Type", "Doc. Number", "Issue Date", "Expiry Date", "File", ""].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{d.doc_type}</td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }} className="t-muted">{d.doc_number || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.issue_date || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.expiry_date || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">
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
                      <input type="date" value={newDoc.issue_date} onChange={e => setDocField("issue_date", e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="portal-form-label">Expiry Date</label>
                      <input type="date" value={newDoc.expiry_date} onChange={e => setDocField("expiry_date", e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <div>
                    <label className="portal-form-label">Attachment</label>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <button type="button" onClick={() => document.getElementById("doc-file-input").click()}
                        className="btn-secondary" style={{ padding: "6px 12px" }}>
                        {newDoc.fileName ? "Change File" : "Choose File"}
                      </button>
                      <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{newDoc.fileName || "No file chosen"}</span>
                      <input id="doc-file-input" type="file" style={{ display: "none" }} onChange={handleDocFile} />
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
          </div>
        )}

        {/* ── Actions (always visible) ── */}
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
