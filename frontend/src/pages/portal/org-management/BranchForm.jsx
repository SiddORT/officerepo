import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Country, State, City } from "country-state-city";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import PhoneInput from "../../../components/ui/PhoneInput";
import usePincodeLookup from "../../../hooks/usePincodeLookup";

function ensureOption(names, current) {
  if (!current) return names;
  return names.some(n => n.toLowerCase() === current.trim().toLowerCase()) ? names : [current, ...names];
}

function genBranchCode(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  const head = words[0].slice(0, 3).toUpperCase();
  const tail = words.slice(1).map(w => w[0].toUpperCase()).join("");
  return `${head}-${tail}`;
}

const BRANCH_TYPES = ["Head Office", "Corporate Office", "Regional Office", "Branch Office", "Warehouse", "Project Site"];
const MAX_EMAILS = 5;
const MAX_PHONES = 5;

const TABS = [
  { id: "general", label: "General",     icon: "🏢" },
  { id: "address", label: "Address",     icon: "📍" },
  { id: "contact", label: "Contact",     icon: "📞" },
  { id: "gst",     label: "GST & Docs",  icon: "🧾" },
];

const TAB_FIELDS = {
  general: ["company_id", "branch_name", "branch_code", "branch_type"],
  address: ["postal_code", "address_line1", "address_line2", "city", "district", "state", "country"],
  contact: ["branch_manager", "landline"],
  gst:     ["gstin", "gst_registration_date", "gst_jurisdiction", "state_code"],
};

export default function BranchForm({ editMode }) {
  const { subdomain, branchId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState("general");

  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    company_id: "", branch_code: "", branch_name: "", branch_type: "",
    postal_code: "", address_line1: "", address_line2: "",
    city: "", district: "", state: "", country: "",
    description: "",
    branch_manager: "", branch_manager_id: "",
    landline: "",
    gst_registered: false, gstin: "", gst_registration_date: "",
    gst_jurisdiction: "", state_code: "",
  });
  const [autoCode, setAutoCode] = useState(!editMode);
  const [emails, setEmails] = useState([""]);
  const [phones, setPhones] = useState([{ number: "", country_code: "+91" }]);

  const [loading, setLoading]       = useState(editMode);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Employee picker state
  const [empSearch, setEmpSearch]   = useState("");
  const [empOptions, setEmpOptions] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empOpen, setEmpOpen]       = useState(false);
  const empDebounceRef = useRef(null);
  const empPickerRef   = useRef(null);

  // GST certificate state
  const [gstFile, setGstFile]               = useState(null);
  const [gstExistingName, setGstExistingName] = useState("");
  const [gstUploading, setGstUploading]     = useState(false);
  const [gstUploadError, setGstUploadError] = useState("");
  const [gstUploadOk, setGstUploadOk]       = useState(false);

  const { lookup } = usePincodeLookup();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load companies
  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  // Load existing branch in edit mode
  useEffect(() => {
    if (!editMode) return;
    setLoading(true);
    portalOrgApi.getBranch(subdomain, token, branchId)
      .then(r => {
        const b = r.data.data || {};
        const addEmails = Array.isArray(b.additional_emails) ? b.additional_emails : [];
        const addPhones = Array.isArray(b.additional_phones) ? b.additional_phones : [];
        setForm({
          company_id:           b.company_id           || "",
          branch_code:          b.branch_code          || "",
          branch_name:          b.branch_name          || "",
          branch_type:          b.branch_type          || "",
          postal_code:          b.postal_code          || "",
          address_line1:        b.address_line_1       || "",
          address_line2:        b.address_line_2       || "",
          city:                 b.city                 || "",
          district:             b.district             || "",
          state:                b.state                || "",
          country:              b.country              || "",
          description:          b.description          || "",
          branch_manager:       b.branch_manager       || "",
          branch_manager_id:    b.branch_manager_id    || "",
          landline:             b.landline             || "",
          gst_registered:       b.gst_registered       || false,
          gstin:                b.gstin                || "",
          gst_registration_date: b.gst_registration_date ? String(b.gst_registration_date).slice(0, 10) : "",
          gst_jurisdiction:     b.gst_jurisdiction     || "",
          state_code:           b.state_code           || "",
        });
        setAutoCode(false);
        setEmails(b.email ? [b.email, ...addEmails] : addEmails.length ? addEmails : [""]);
        setPhones(
          b.phone
            ? [{ number: b.phone, country_code: b.phone_country_code || "+91" }, ...addPhones]
            : addPhones.length ? addPhones : [{ number: "", country_code: "+91" }]
        );
        setGstExistingName(b.gst_certificate_name || "");
        if (b.branch_manager_id && b.branch_manager) {
          setEmpSearch(b.branch_manager);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [editMode, subdomain, token, branchId]);

  // Employee search with debounce
  const searchEmployees = useCallback((q) => {
    if (empDebounceRef.current) clearTimeout(empDebounceRef.current);
    empDebounceRef.current = setTimeout(async () => {
      if (!q.trim()) { setEmpOptions([]); return; }
      setEmpLoading(true);
      try {
        const r = await portalOrgApi.listActiveEmployees(subdomain, token, { search: q, page_size: 50 });
        setEmpOptions(r.data.data || []);
      } catch { setEmpOptions([]); }
      finally { setEmpLoading(false); }
    }, 300);
  }, [subdomain, token]);

  // Close employee dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (empPickerRef.current && !empPickerRef.current.contains(e.target)) {
        setEmpOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Country → State → City cascade
  const countries = useMemo(() => Country.getAllCountries(), []);
  const countryObj = useMemo(
    () => countries.find(c => c.name.toLowerCase() === (form.country || "").trim().toLowerCase()),
    [countries, form.country]
  );
  const states = useMemo(
    () => (countryObj ? State.getStatesOfCountry(countryObj.isoCode) : []),
    [countryObj]
  );
  const stateObj = useMemo(
    () => states.find(s => s.name.toLowerCase() === (form.state || "").trim().toLowerCase()),
    [states, form.state]
  );
  const cities = useMemo(
    () => (countryObj && stateObj ? City.getCitiesOfState(countryObj.isoCode, stateObj.isoCode) : []),
    [countryObj, stateObj]
  );
  const countryOptions = useMemo(() => ensureOption(countries.map(c => c.name), form.country), [countries, form.country]);
  const stateOptions   = useMemo(() => ensureOption(states.map(s => s.name), form.state), [states, form.state]);
  const cityOptions    = useMemo(() => ensureOption(cities.map(c => c.name), form.city), [cities, form.city]);

  const handleCountryChange = (e) => setForm(f => ({ ...f, country: e.target.value, state: "", city: "" }));
  const handleStateChange   = (e) => setForm(f => ({ ...f, state: e.target.value, city: "" }));

  const handlePincodeChange = async (e) => {
    const raw = e.target.value;
    set("postal_code", raw);
    const code = raw.trim();
    if (code.length < 5) return;
    const cc = form.country || "IN";
    const result = await lookup(code, cc);
    if (!result) return;
    setForm(f => ({
      ...f,
      city:     result.city     || f.city,
      district: result.district || f.district,
      state:    result.state    || f.state,
      country:  result.country  || f.country,
    }));
  };

  // Multi-email helpers
  const addEmail    = () => { if (emails.length < MAX_EMAILS) setEmails(e => [...e, ""]); };
  const removeEmail = (i) => setEmails(e => e.filter((_, idx) => idx !== i));
  const updateEmail = (i, v) => setEmails(e => e.map((x, idx) => idx === i ? v : x));

  // Multi-phone helpers
  const addPhone    = () => { if (phones.length < MAX_PHONES) setPhones(p => [...p, { number: "", country_code: "+91" }]); };
  const removePhone = (i) => setPhones(p => p.filter((_, idx) => idx !== i));
  const updatePhone = (i, field, v) => setPhones(p => p.map((x, idx) => idx === i ? { ...x, [field]: v } : x));

  const validate = () => {
    const errs = {};
    if (!form.branch_name.trim()) errs.branch_name = "Required";
    if (!form.company_id)         errs.company_id  = "Required";
    if (form.gst_registered && form.gstin) {
      const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!GSTIN_RE.test(form.gstin.trim().toUpperCase())) {
        errs.gstin = "Invalid GSTIN (e.g. 22AAAAA0000A1Z5)";
      }
    }
    return errs;
  };

  const tabHasError = (tabId) => (TAB_FIELDS[tabId] || []).some(k => fieldErrors[k]);

  const handleSave = async () => {
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
    try {
      const primaryEmail = emails[0]?.trim() || null;
      const additionalEmails = emails.slice(1).map(e => e.trim()).filter(Boolean);
      const primaryPhone = phones[0]?.number?.trim() || null;
      const primaryCountryCode = phones[0]?.country_code || "+91";
      const additionalPhones = phones.slice(1)
        .filter(p => p.number?.trim())
        .map(p => ({ number: p.number.trim(), country_code: p.country_code || "+91" }));

      const payload = {
        company_id:          form.company_id,
        branch_code:         form.branch_code || undefined,
        branch_name:         form.branch_name,
        branch_type:         form.branch_type || null,
        email:               primaryEmail,
        phone:               primaryPhone,
        phone_country_code:  primaryPhone ? primaryCountryCode : null,
        additional_emails:   additionalEmails.length ? additionalEmails : [],
        additional_phones:   additionalPhones.length ? additionalPhones : [],
        branch_manager:      form.branch_manager_id ? (form.branch_manager || null) : null,
        branch_manager_id:   form.branch_manager_id || null,
        landline:            form.landline || null,
        address_line_1:      form.address_line1 || null,
        address_line_2:      form.address_line2 || null,
        city:                form.city || null,
        district:            form.district || null,
        state:               form.state || null,
        country:             form.country || null,
        postal_code:         form.postal_code || null,
        description:         form.description || null,
        gst_registered:      !!form.gst_registered,
        gstin:               form.gstin ? form.gstin.trim().toUpperCase() : null,
        gst_registration_date: form.gst_registration_date || null,
        gst_jurisdiction:    form.gst_jurisdiction || null,
        state_code:          form.state_code || null,
      };

      let savedId = branchId;
      if (editMode) {
        await portalOrgApi.updateBranch(subdomain, token, branchId, payload);
      } else {
        const r = await portalOrgApi.createBranch(subdomain, token, payload);
        savedId = r.data.data?.id;
      }

      if (gstFile instanceof File && savedId) {
        setGstUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", gstFile);
          await portalOrgApi.uploadBranchGstCert(subdomain, token, savedId, fd);
          setGstUploadOk(true);
        } catch {
          setGstUploadError("Branch saved, but GST certificate upload failed. You can upload it again from the branch details.");
        } finally {
          setGstUploading(false);
        }
      }

      navigate(`/portal/${subdomain}/org/branches`);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <OrgLayout title={editMode ? "Edit Branch" : "Add Branch"}>
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      </OrgLayout>
    );
  }

  return (
    <OrgLayout title={editMode ? "Edit Branch" : "Add Branch"}>
      <div>
        <PageHeader
          title={editMode ? "Edit Branch" : "Add Branch"}
          subtitle={editMode ? "Update branch details" : "Create a new branch"}
          breadcrumbs={[
            { label: "Branches", path: `/portal/${subdomain}/org/branches` },
            { label: editMode ? "Edit" : "New Branch" },
          ]}
          actions={<button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>}
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}
        {gstUploadError && (
          <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#fbbf24" }}>
            {gstUploadError}
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
              <div className="portal-form-title">🏢 Branch Information</div>

              {/* Company */}
              <div style={{ marginBottom: 14 }}>
                <label className="portal-form-label portal-form-label-req">Company</label>
                <select
                  value={form.company_id}
                  onChange={e => { set("company_id", e.target.value); setFieldErrors(fe => ({ ...fe, company_id: undefined })); }}
                  className="input-field"
                  style={fieldErrors.company_id ? { borderColor: "#f87171" } : {}}
                >
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
                {fieldErrors.company_id && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{fieldErrors.company_id}</div>}
              </div>

              <div className="portal-form-row">
                {/* Branch Name */}
                <div>
                  <label className="portal-form-label portal-form-label-req">Branch Name</label>
                  <input
                    value={form.branch_name}
                    onChange={e => {
                      const name = e.target.value;
                      setForm(f => ({
                        ...f,
                        branch_name: name,
                        branch_code: autoCode ? genBranchCode(name) : f.branch_code,
                      }));
                      setFieldErrors(fe => ({ ...fe, branch_name: undefined }));
                    }}
                    className="input-field"
                    placeholder="Mumbai Head Office"
                    style={fieldErrors.branch_name ? { borderColor: "#f87171" } : {}}
                  />
                  {fieldErrors.branch_name && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{fieldErrors.branch_name}</div>}
                </div>

                {/* Branch Code */}
                <div>
                  <label className="portal-form-label">
                    Branch Code
                    {autoCode && !editMode && (
                      <span style={{ fontSize: 10, color: "var(--c-accent)", marginLeft: 6, fontWeight: 400 }}>auto</span>
                    )}
                  </label>
                  <input
                    value={form.branch_code}
                    onChange={e => {
                      const v = e.target.value.toUpperCase();
                      setAutoCode(!v);
                      set("branch_code", v);
                    }}
                    className="input-field"
                    placeholder="MUM-HO"
                    style={{ fontFamily: "monospace", textTransform: "uppercase" }}
                  />
                </div>

                {/* Branch Type */}
                <div>
                  <label className="portal-form-label">Branch Type</label>
                  <select value={form.branch_type} onChange={e => set("branch_type", e.target.value)} className="input-field">
                    <option value="">Select type…</option>
                    {BRANCH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">📝 Notes</div>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                className="input-field"
                style={{ height: 80, resize: "vertical" }}
                placeholder="Optional notes about this branch…"
              />
            </div>
          </div>
        )}

        {/* ══ TAB: Address ══ */}
        {tab === "address" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">📍 Branch Address</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="portal-form-label">Postal Code</label>
                  <input
                    value={form.postal_code}
                    onChange={handlePincodeChange}
                    className="input-field"
                    placeholder="400001"
                    style={{ maxWidth: 200 }}
                  />
                  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3 }}>Enter postal code to auto-fill city, state and country</div>
                </div>

                <div>
                  <label className="portal-form-label">Address Line 1</label>
                  <input value={form.address_line1} onChange={e => set("address_line1", e.target.value)} className="input-field" placeholder="Street / Plot / Building" />
                </div>
                <div>
                  <label className="portal-form-label">Address Line 2</label>
                  <input value={form.address_line2} onChange={e => set("address_line2", e.target.value)} className="input-field" placeholder="Floor / Tower / Area" />
                </div>

                <div className="portal-form-row">
                  <div>
                    <label className="portal-form-label">Country</label>
                    <select value={form.country} onChange={handleCountryChange} className="input-field">
                      <option value="">Select country…</option>
                      {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label">State</label>
                    <select value={form.state} onChange={handleStateChange} className="input-field" disabled={!countryObj}>
                      <option value="">{countryObj ? "Select state…" : "Select country first"}</option>
                      {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label">City</label>
                    <select value={form.city} onChange={e => set("city", e.target.value)} className="input-field" disabled={!stateObj}>
                      <option value="">{stateObj ? "Select city…" : "Select state first"}</option>
                      {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="portal-form-label">District</label>
                    <input value={form.district} onChange={e => set("district", e.target.value)} className="input-field" placeholder="Mumbai Suburban" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: Contact ══ */}
        {tab === "contact" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">👤 Branch Manager</div>

              <div ref={empPickerRef} style={{ position: "relative" }}>
                {form.branch_manager_id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--c-bg-subtle, rgba(0,0,0,0.04))", border: "1px solid var(--c-border)", borderRadius: 6 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{form.branch_manager}</span>
                    <span style={{ fontSize: 11, color: "var(--c-accent)", whiteSpace: "nowrap" }}>✓ Linked</span>
                    <button
                      type="button"
                      onClick={() => { set("branch_manager_id", ""); set("branch_manager", ""); setEmpSearch(""); setEmpOptions([]); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 13, lineHeight: 1, padding: "0 2px" }}
                      title="Remove link"
                    >×</button>
                  </div>
                ) : (
                  <>
                    <input
                      value={empSearch}
                      onChange={e => {
                        const v = e.target.value;
                        setEmpSearch(v);
                        setEmpOpen(true);
                        searchEmployees(v);
                      }}
                      onFocus={() => { setEmpOpen(true); if (empSearch) searchEmployees(empSearch); }}
                      className="input-field"
                      placeholder="Search employee name or code…"
                      autoComplete="off"
                    />
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3 }}>
                      Select an employee from the list to link a branch manager.
                    </div>
                  </>
                )}
                {!form.branch_manager_id && empOpen && (empLoading || empOptions.length > 0) && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: 6, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxHeight: 200, overflowY: "auto" }}>
                    {empLoading && <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-muted)" }}>Searching…</div>}
                    {!empLoading && empOptions.map(emp => (
                      <div
                        key={emp.id}
                        onMouseDown={() => {
                          const name = emp.full_name || `${emp.first_name} ${emp.last_name}`.trim();
                          set("branch_manager", name);
                          set("branch_manager_id", emp.id);
                          setEmpSearch(name);
                          setEmpOpen(false);
                          setEmpOptions([]);
                        }}
                        style={{ padding: "8px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--c-border)" }}
                        className="emp-picker-option"
                      >
                        <span style={{ fontWeight: 600 }}>{emp.full_name || `${emp.first_name} ${emp.last_name}`.trim()}</span>
                        <span style={{ marginLeft: 8, color: "var(--c-muted)", fontSize: 11 }}>{emp.employee_code}</span>
                      </div>
                    ))}
                    {!empLoading && empOptions.length === 0 && (
                      <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-muted)" }}>No employees found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">📞 Contact Details</div>

              {/* Multiple Emails */}
              <div style={{ marginBottom: 16 }}>
                <label className="portal-form-label">Email{emails.length > 1 ? "s" : ""}</label>
                {emails.map((em, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < emails.length - 1 ? 6 : 0 }}>
                    <input
                      type="email"
                      value={em}
                      onChange={e => updateEmail(i, e.target.value)}
                      className="input-field"
                      placeholder={i === 0 ? "mumbai@acmetech.in" : "Additional email…"}
                      style={{ flex: 1 }}
                    />
                    {i > 0 && (
                      <button type="button" onClick={() => removeEmail(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 16, padding: "0 4px", lineHeight: 1, flexShrink: 0 }}
                        title="Remove">×</button>
                    )}
                  </div>
                ))}
                {emails.length < MAX_EMAILS && (
                  <button type="button" onClick={addEmail}
                    style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "var(--c-accent)", fontSize: 12, padding: 0 }}>
                    + Add email
                  </button>
                )}
              </div>

              {/* Multiple Phones */}
              <div style={{ marginBottom: 16 }}>
                <label className="portal-form-label">Mobile{phones.length > 1 ? "s" : ""}</label>
                {phones.map((ph, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: i < phones.length - 1 ? 6 : 0 }}>
                    <div style={{ flex: 1 }}>
                      <PhoneInput
                        dialCode={ph.country_code}
                        onDialCodeChange={v => updatePhone(i, "country_code", v)}
                        number={ph.number}
                        onNumberChange={v => updatePhone(i, "number", v)}
                      />
                    </div>
                    {i > 0 && (
                      <button type="button" onClick={() => removePhone(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 16, padding: "0 4px", lineHeight: 1, flexShrink: 0, marginBottom: 4 }}
                        title="Remove">×</button>
                    )}
                  </div>
                ))}
                {phones.length < MAX_PHONES && (
                  <button type="button" onClick={addPhone}
                    style={{ marginTop: 6, background: "none", border: "none", cursor: "pointer", color: "var(--c-accent)", fontSize: 12, padding: 0 }}>
                    + Add mobile
                  </button>
                )}
              </div>

              {/* Landline */}
              <div>
                <label className="portal-form-label">Landline</label>
                <input
                  value={form.landline}
                  onChange={e => set("landline", e.target.value)}
                  className="input-field"
                  placeholder="02212345678"
                  style={{ maxWidth: 280 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: GST & Docs ══ */}
        {tab === "gst" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="portal-form-card">
              <div className="portal-form-title">🧾 GST Registration</div>

              <div style={{ marginBottom: 14 }}>
                <button type="button"
                  onClick={() => set("gst_registered", !form.gst_registered)}
                  className={form.gst_registered ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 12px", height: "auto" }}>
                  {form.gst_registered ? "✔ GST Registered" : "Not GST Registered"}
                </button>
              </div>

              {form.gst_registered && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="portal-form-row">
                    <div>
                      <label className="portal-form-label">GSTIN</label>
                      <input
                        value={form.gstin}
                        onChange={e => { set("gstin", e.target.value.toUpperCase()); setFieldErrors(fe => ({ ...fe, gstin: undefined })); }}
                        className="input-field"
                        placeholder="22AAAAA0000A1Z5"
                        maxLength={15}
                        style={{ textTransform: "uppercase", fontFamily: "monospace", ...(fieldErrors.gstin ? { borderColor: "#f87171" } : {}) }}
                      />
                      {fieldErrors.gstin && <div style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{fieldErrors.gstin}</div>}
                    </div>
                    <div>
                      <label className="portal-form-label">GST Registration Date</label>
                      <input type="date" value={form.gst_registration_date} onChange={e => set("gst_registration_date", e.target.value)} className="input-field" />
                    </div>
                  </div>
                  <div className="portal-form-row">
                    <div>
                      <label className="portal-form-label">GST Jurisdiction</label>
                      <input value={form.gst_jurisdiction} onChange={e => set("gst_jurisdiction", e.target.value)} className="input-field" placeholder="e.g. Pune-I" />
                    </div>
                    <div>
                      <label className="portal-form-label">State Code</label>
                      <input value={form.state_code} onChange={e => set("state_code", e.target.value)} className="input-field" placeholder="e.g. 27" maxLength={3} style={{ maxWidth: 120 }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="portal-form-card">
              <div className="portal-form-title">📎 GST Certificate</div>

              {!form.gst_registered && (
                <div style={{ fontSize: 13, color: "var(--c-muted)" }}>Enable GST registration above to upload a certificate.</div>
              )}

              {form.gst_registered && (
                <>
                  {gstExistingName && !gstFile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)" }}>
                      <span style={{ fontSize: 12, color: "var(--c-text)" }}>📎 {gstExistingName}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const r = await portalOrgApi.downloadBranchGstCert(subdomain, token, branchId);
                            const url = window.URL.createObjectURL(new Blob([r.data]));
                            const a = document.createElement("a"); a.href = url; a.download = gstExistingName; a.click();
                            window.URL.revokeObjectURL(url);
                          } catch {}
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-accent)", fontSize: 12 }}>
                        Download
                      </button>
                      <button type="button" onClick={() => setGstFile("replace")}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 12 }}>
                        Replace
                      </button>
                    </div>
                  )}
                  {(!gstExistingName || gstFile) && (
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          if (f.size > 5 * 1024 * 1024) { setGstUploadError("File must be under 5 MB."); return; }
                          setGstUploadError("");
                          setGstFile(f);
                        }}
                        className="input-field"
                        style={{ fontSize: 13 }}
                      />
                      <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>PDF, JPG or PNG · max 5 MB</div>
                      {gstFile && gstFile !== "replace" && (
                        <div style={{ fontSize: 12, color: "var(--c-accent)", marginTop: 4 }}>📎 {gstFile.name} — will upload after save</div>
                      )}
                    </div>
                  )}
                  {gstUploading && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 6 }}>Uploading certificate…</div>}
                  {gstUploadOk  && <div style={{ fontSize: 12, color: "#10b981", marginTop: 6 }}>Certificate uploaded successfully.</div>}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Save / Cancel ── */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving || gstUploading} className="btn-primary" style={{ minWidth: 120 }}>
            {saving ? "Saving…" : editMode ? "Update Branch" : "Create Branch"}
          </button>
          <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </OrgLayout>
  );
}
