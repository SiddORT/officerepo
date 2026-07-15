import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import PhoneInput from "../../../components/ui/PhoneInput";
import usePincodeLookup from "../../../hooks/usePincodeLookup";

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
const isValidCIN   = v => !v || /^[LUlu][0-9]{5}[A-Za-z]{2}[0-9]{4}[A-Za-z]{3}[0-9]{6}$/.test(v.trim().toUpperCase());
const isValidTAN   = v => !v || /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v.trim().toUpperCase());
const isValidMSME  = v => !v || /^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$/.test(v.trim().toUpperCase());
const trimStr      = v => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v;

const SKIP_WORDS = new Set(["pvt", "private", "ltd", "limited", "llp", "public", "inc", "corp", "co", "and", "the", "&"]);
function generateCode(name) {
  if (!name.trim()) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  const significant = words.filter(w => !SKIP_WORDS.has(w.toLowerCase()));
  const src = significant.length ? significant : words;
  if (src.length === 1) return src[0].slice(0, 6).toUpperCase();
  return src.map(w => w[0].toUpperCase()).join("").slice(0, 6);
}

const API_EMPTY = {
  company_code: "", company_name: "", legal_name: "", display_name: "",
  registration_number: "", tax_number: "", website: "",
  email: "", phone: "", phone_country_code: "+91",
  address_line_1: "", address_line_2: "", postal_code: "", city: "", district: "", state: "", country: "",
  industry: "",
};

const EXTRA_EMPTY = {
  company_type: "",
  date_of_incorporation: "", company_description: "",
  cin_number: "", pan_number: "", tan_number: "",
  msme_registered: false, msme_number: "",
  gst_registered: false, gst_registration_date: "", tax_identification_number: "",
  primary_contact_person: "", support_email: "", hr_email: "", accounts_email: "",
  office_same: false,
  off_address_line_1: "", off_address_line_2: "", off_postal_code: "", off_city: "", off_district: "", off_state: "", off_country: "",
  status: "Active",
};

const EMPTY_DOC = { doc_type: "", doc_number: "", issue_date: "", expiry_date: "", remarks: "", file: null, fileName: "", filePreview: null, fileIsImage: false };

const TAB_FIELDS = {
  general:    ["company_code", "company_name", "legal_name", "display_name", "company_type", "industry", "date_of_incorporation", "company_description", "status"],
  compliance: ["registration_number", "cin_number", "pan_number", "tan_number", "msme_number", "tax_number", "gst_registration_date", "tax_identification_number"],
  contact:    ["primary_contact_person", "phone", "phone_country_code", "email", "website", "support_email", "hr_email", "accounts_email", "address_line_1", "address_line_2", "postal_code", "city", "district", "state", "country", "off_address_line_1", "off_address_line_2", "off_postal_code", "off_city", "off_district", "off_state", "off_country"],
  branding:   [],
};

const TABS = [
  { id: "general",    label: "General",          icon: "🏢" },
  { id: "compliance", label: "Compliance",        icon: "📋" },
  { id: "contact",    label: "Contact & Address", icon: "📞" },
  { id: "branding",   label: "Branding & Docs",   icon: "🎨" },
];

function field({ k, label, placeholder, type = "text", mono, full, required, note, as, rows, options,
                 form, extra, fieldErrors, set, setX, onChangeOverride, suffix, onBlur }) {
  const isForm = k in API_EMPTY;
  const value  = isForm ? form[k] : extra[k];
  const setter = isForm ? set : setX;
  const errMsg = fieldErrors[k];
  const El     = as === "textarea" ? "textarea" : as === "select" ? "select" : "input";
  const handleChange = onChangeOverride || (e => setter(k, mono ? e.target.value.toUpperCase() : e.target.value));
  return (
    <div key={k} style={full ? { gridColumn: "1 / -1" } : {}}>
      {label && (
        <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>{label}</label>
      )}
      <div style={suffix ? { position: "relative" } : undefined}>
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
            onChange={handleChange}
            onBlur={onBlur}
            placeholder={placeholder} className="input-field"
            style={{
              ...(mono ? { fontFamily: "monospace" } : {}),
              ...(errMsg ? { borderColor: "#f87171" } : {}),
              ...(suffix ? { paddingRight: 90 } : {}),
            }} />
        )}
        {suffix && (
          <span style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: 11, color: "var(--c-muted)", pointerEvents: "none", userSelect: "none",
          }}>{suffix}</span>
        )}
      </div>
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
  const [codeTouched, setCodeTouched] = useState(!!editMode);

  // Document state:
  //   existingDocs      — persisted docs loaded from backend (edit mode)
  //   removedExistingIds — ids of existing docs the user removed (to delete on save)
  //   pendingDocs        — new docs added in this session (to upload on save)
  const [existingDocs, setExistingDocs] = useState([]);
  const [removedExistingIds, setRemovedExistingIds] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);

  const [addingDoc, setAddingDoc] = useState(false);
  const [newDoc,    setNewDoc]    = useState(EMPTY_DOC);
  const [logoPreview, setLogoPreview] = useState(null);

  // When a new company is created but doc uploads partially fail, we store the
  // created id here so subsequent retries upload against that record instead of
  // creating a duplicate.
  const [savedCompanyId, setSavedCompanyId] = useState(null);

  const [industries, setIndustries] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error,  setError]    = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    portalOrgApi.getIndustries(subdomain, token)
      .then(r => setIndustries(r.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!editMode || !companyId) return;
    setLoading(true);
    Promise.all([
      portalOrgApi.getCompany(subdomain, token, companyId),
      portalOrgApi.listCompanyDocs(subdomain, token, companyId).catch(() => ({ data: { data: [] } })),
    ]).then(([cr, dr]) => {
      const d = cr.data.data;
      setForm(Object.fromEntries(Object.keys(API_EMPTY).map(k => [k, d[k] ?? (k === "phone_country_code" ? "+91" : "")])));
      setExtra(ex => Object.fromEntries(Object.keys(EXTRA_EMPTY).map(k => {
        if (d[k] === undefined || d[k] === null) return [k, EXTRA_EMPTY[k]];
        if (typeof EXTRA_EMPTY[k] === "boolean") return [k, !!d[k]];
        return [k, String(d[k])];
      })));
      setExistingDocs(dr.data?.data || []);
    })
      .catch(() => setError("Failed to load company."))
      .finally(() => setLoading(false));
  }, [editMode, companyId, subdomain, token]);

  const set  = (k, v) => setForm(f  => ({ ...f, [k]: v }));
  const setX = (k, v) => setExtra(f => ({ ...f, [k]: v }));
  const { lookup } = usePincodeLookup();

  useEffect(() => {
    if (codeTouched) return;
    set("company_code", generateCode(form.company_name));
  }, [form.company_name]); // eslint-disable-line react-hooks/exhaustive-deps

  const industryNames = industries.map(i => i.name);

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
    if (extra.cin_number      && !isValidCIN(extra.cin_number))        errs.cin_number       = "Invalid CIN (e.g. U12345MH2020PTC123456)";
    if (extra.tan_number      && !isValidTAN(extra.tan_number))        errs.tan_number       = "Invalid TAN (e.g. MUMO12345A)";
    if (extra.msme_registered && extra.msme_number && !isValidMSME(extra.msme_number)) errs.msme_number = "Invalid MSME (e.g. UDYAM-XX-00-0000000)";
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
    Object.entries(extra).forEach(([k, v]) => {
      if (typeof v === "boolean") { payload[k] = v; return; }
      payload[k] = v === "" ? null : trimStr(v);
    });
    if (payload.pan_number) payload.pan_number = payload.pan_number.toUpperCase();
    try {
      // savedCompanyId is set when a previous attempt created the company but
      // some doc uploads failed — reuse that id so we don't create a duplicate.
      let savedId = savedCompanyId || companyId;
      if (!savedId) {
        // First attempt in create mode: create the company record
        const res = await portalOrgApi.createCompany(subdomain, token, payload);
        savedId = res.data?.data?.id;
      } else if (editMode) {
        // Normal edit save (or retry in edit mode)
        await portalOrgApi.updateCompany(subdomain, token, companyId, payload);
      }
      // (Retry in create mode: company already exists, skip create/update above)

      if (savedId) {
        // Delete removed existing documents
        await Promise.allSettled(
          removedExistingIds.map(id => portalOrgApi.deleteCompanyDoc(subdomain, token, savedId, id))
        );

        // Upload all pending new documents concurrently; collect results to detect partial failures
        if (pendingDocs.length > 0) {
          const uploadResults = await Promise.allSettled(
            pendingDocs.map(doc => {
              const fd = new FormData();
              fd.append("doc_type", doc.doc_type || "Other");
              if (doc.doc_number) fd.append("doc_number", doc.doc_number);
              if (doc.issue_date) fd.append("issue_date", doc.issue_date);
              if (doc.expiry_date) fd.append("expiry_date", doc.expiry_date);
              if (doc.remarks) fd.append("remarks", doc.remarks);
              if (doc.file) fd.append("file", doc.file);
              return portalOrgApi.uploadCompanyDoc(subdomain, token, savedId, fd);
            })
          );

          const failed = uploadResults
            .map((r, i) => r.status === "rejected" ? pendingDocs[i] : null)
            .filter(Boolean);

          if (failed.length > 0) {
            const names = failed.map(d => d.fileName || d.doc_type || "document").join(", ");
            const word  = failed.length === 1 ? "document" : "documents";
            setError(
              `Company saved, but ${failed.length} ${word} failed to upload: ${names}. ` +
              `Please remove the failed ${word} and try uploading again.`
            );
            // Keep only the failed docs in pendingDocs so the user can retry them
            setPendingDocs(failed);
            // Remember the created id so a retry doesn't create a duplicate company
            if (!editMode) setSavedCompanyId(savedId);
            // Reload existing docs to reflect what was actually persisted
            portalOrgApi.listCompanyDocs(subdomain, token, savedId)
              .then(r => setExistingDocs(r.data?.data || []))
              .catch(() => {});
            return;
          }
        }
      }

      navigate(`/portal/${subdomain}/org/companies`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  // Document helpers — new/pending docs
  const setDocField  = (k, v) => setNewDoc(d => ({ ...d, [k]: v }));
  const handleDocFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = ev => setNewDoc(d => ({ ...d, file, fileName: file.name, filePreview: ev.target.result, fileIsImage: true }));
      reader.readAsDataURL(file);
    } else {
      setNewDoc(d => ({ ...d, file, fileName: file.name, filePreview: null, fileIsImage: false }));
    }
  };
  const addDoc = () => {
    if (!newDoc.doc_type) return;
    setPendingDocs(d => [...d, { ...newDoc, _pendingId: Date.now() }]);
    setNewDoc(EMPTY_DOC);
    setAddingDoc(false);
  };
  const removePendingDoc = (pid) => setPendingDocs(d => d.filter(x => x._pendingId !== pid));
  const removeExistingDoc = (id) => setRemovedExistingIds(ids => [...ids, id]);

  const docFileExt = (name) => (name || "").split(".").pop()?.toUpperCase().slice(0, 4) || "FILE";

  const handleDownload = async (doc) => {
    try {
      const res = await portalOrgApi.downloadCompanyDoc(subdomain, token, companyId, doc.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed.");
    }
  };

  const visibleExistingDocs = existingDocs.filter(d => !removedExistingIds.includes(d.id));

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
                {field({ ...fp, k: "company_code", label: "Company Code", required: true, placeholder: "ACME", mono: true,
                  note: codeTouched ? "Manually set · uppercase only" : "Auto-generated from company name · editable",
                  suffix: codeTouched ? null : "auto",
                  onChangeOverride: e => { setCodeTouched(true); set("company_code", e.target.value.toUpperCase()); },
                })}
                {field({ ...fp, k: "company_name",  label: "Company Name",            required: true, placeholder: "Acme Pvt Ltd" })}
                {field({ ...fp, k: "legal_name",    label: "Legal / Registered Name", required: true, placeholder: "Acme Private Limited" })}
                {field({ ...fp, k: "display_name",  label: "Display Name",            placeholder: "Acme", note: "Short name shown in the portal" })}
                {field({ ...fp, k: "company_type",  label: "Company Type",            placeholder: "Select type", as: "select", options: COMPANY_TYPES })}
                {field({ ...fp, k: "industry", label: "Industry", as: "select", placeholder: "Select industry…", options: industryNames })}
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
                <div>
                  <PhoneInput
                    label="Phone"
                    dialCode={form.phone_country_code || "+91"}
                    onDialCodeChange={v => set("phone_country_code", v)}
                    number={form.phone}
                    onNumberChange={v => set("phone", v)}
                    error={fieldErrors.phone}
                  />
                </div>
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
                <div className="portal-form-row">
                  {field({ ...fp, k: "postal_code", label: "Postal Code", placeholder: "400001",
                    onChangeOverride: async (e) => {
                      const raw = e.target.value;
                      set("postal_code", raw);
                      const code = raw.trim();
                      if (code.length < 5) return;
                      const cc = form.country || "IN";
                      const result = await lookup(code, cc);
                      if (!result) return;
                      setForm(f => ({ ...f,
                        city:     result.city     || f.city,
                        district: result.district || f.district,
                        state:    result.state    || f.state,
                        country:  result.country  || f.country,
                      }));
                    },
                  })}
                </div>
                {field({ ...fp, k: "address_line_1", label: "Address Line 1", placeholder: "Street / Plot / Building", full: true })}
                {field({ ...fp, k: "address_line_2", label: "Address Line 2", placeholder: "Area / Landmark / Floor",  full: true })}
                <div className="portal-form-row">
                  {field({ ...fp, k: "city",     label: "City",     placeholder: "Mumbai" })}
                  {field({ ...fp, k: "district",  label: "District", placeholder: "Mumbai Suburban" })}
                  {field({ ...fp, k: "state",    label: "State",    placeholder: "Maharashtra" })}
                  {field({ ...fp, k: "country",  label: "Country",  placeholder: "India" })}
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
                    {field({ ...fp, k: "off_postal_code", label: "Postal Code", placeholder: "400001",
                      onChangeOverride: async (e) => {
                        const raw = e.target.value;
                        setX("off_postal_code", raw);
                        const code = raw.trim();
                        if (code.length < 5) return;
                        const cc = extra.off_country || "IN";
                        const result = await lookup(code, cc);
                        if (!result) return;
                        setExtra(ex => ({ ...ex,
                          off_city:     result.city     || ex.off_city,
                          off_district: result.district || ex.off_district,
                          off_state:    result.state    || ex.off_state,
                          off_country:  result.country  || ex.off_country,
                        }));
                      },
                    })}
                  </div>
                  <div className="portal-form-row">
                    {field({ ...fp, k: "off_address_line_1", label: "Address Line 1", placeholder: "Street / Plot / Building" })}
                    {field({ ...fp, k: "off_address_line_2", label: "Address Line 2", placeholder: "Area / Landmark / Floor" })}
                  </div>
                  <div className="portal-form-row">
                    {field({ ...fp, k: "off_city",      label: "City",     placeholder: "Mumbai" })}
                    {field({ ...fp, k: "off_district",  label: "District", placeholder: "Mumbai Suburban" })}
                    {field({ ...fp, k: "off_state",     label: "State",    placeholder: "Maharashtra" })}
                    {field({ ...fp, k: "off_country",   label: "Country",  placeholder: "India" })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: Branding & Docs ══ */}
        {tab === "branding" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
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

            <div className="portal-form-card" style={{ width: "100%" }}>
              <div className="portal-form-title">📁 Company Documents</div>

              {(visibleExistingDocs.length > 0 || pendingDocs.length > 0) && (
                <div className="portal-table-wrap" style={{ marginBottom: 12 }}>
                  <table className="portal-table">
                    <thead>
                      <tr>
                        {["Type", "Doc. Number", "Issue Date", "Expiry Date", "File", ""].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Persisted (existing) documents */}
                      {visibleExistingDocs.map(d => (
                        <tr key={d.id}>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{d.doc_type}</td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }} className="t-muted">{d.doc_number || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.issue_date ? String(d.issue_date).slice(0, 10) : "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.expiry_date ? String(d.expiry_date).slice(0, 10) : "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">
                            {d.has_file
                              ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownload(d)}
                                  style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>
                                  📎 {d.file_name ? (d.file_name.length > 20 ? d.file_name.slice(0, 20) + "…" : d.file_name) : "Download"}
                                </button>
                              )
                              : "—"}
                          </td>
                          <td>
                            <button onClick={() => removeExistingDoc(d.id)}
                              style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {/* Pending (not yet saved) documents */}
                      {pendingDocs.map(d => (
                        <tr key={d._pendingId}>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>
                            {d.doc_type}
                            <span style={{ marginLeft: 6, fontSize: 10, color: "var(--c-muted)", fontStyle: "italic" }}>unsaved</span>
                          </td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }} className="t-muted">{d.doc_number || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.issue_date || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.expiry_date || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">
                            {d.fileName
                              ? <span className="t-accent">📎 {d.fileName.length > 20 ? d.fileName.slice(0, 20) + "…" : d.fileName}</span>
                              : "—"}
                          </td>
                          <td>
                            <button onClick={() => removePendingDoc(d._pendingId)}
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
                <div style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, padding: 16, display: "grid", gap: 12, width: "100%" }}>
                  {/* Row 1 — all text/date fields */}
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
                    <div>
                      <label className="portal-form-label">Issue Date</label>
                      <input type="date" value={newDoc.issue_date} onChange={e => setDocField("issue_date", e.target.value)} className="input-field" />
                    </div>
                    <div>
                      <label className="portal-form-label">Expiry Date</label>
                      <input type="date" value={newDoc.expiry_date} onChange={e => setDocField("expiry_date", e.target.value)} className="input-field" />
                    </div>
                  </div>

                  {/* Row 2 — attachment + preview */}
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: "1 1 220px", minWidth: 220 }}>
                      <label className="portal-form-label">Attachment</label>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button type="button" onClick={() => document.getElementById("doc-file-input").click()}
                          className="btn-secondary" style={{ padding: "6px 12px" }}>
                          {newDoc.fileName ? "Change File" : "Choose File"}
                        </button>
                        <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{newDoc.fileName || "No file chosen"}</span>
                        <input id="doc-file-input" type="file" style={{ display: "none" }} onChange={handleDocFile} />
                      </div>
                      {newDoc.fileName && (
                        <button type="button"
                          onClick={() => { setNewDoc(d => ({ ...d, file: null, fileName: "", filePreview: null, fileIsImage: false })); document.getElementById("doc-file-input").value = ""; }}
                          style={{ fontSize: 11, color: "#f87171", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 6 }}>
                          ✕ Remove file
                        </button>
                      )}
                    </div>

                    {newDoc.fileName && (
                      <div>
                        <label className="portal-form-label">Preview</label>
                        <div style={{
                          width: 120, height: 90, borderRadius: 8, overflow: "hidden",
                          border: "1px solid var(--c-border)", background: "var(--c-surface, #0d1424)",
                          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4,
                        }}>
                          {newDoc.fileIsImage
                            ? <img src={newDoc.filePreview} alt="Document preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : (
                              <>
                                <span style={{ fontSize: 22 }}>📄</span>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--c-muted)", letterSpacing: 0.5 }}>
                                  {docFileExt(newDoc.fileName)}
                                </span>
                              </>
                            )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={newDoc.fileName}>
                          {newDoc.fileName}
                        </div>
                      </div>
                    )}
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
