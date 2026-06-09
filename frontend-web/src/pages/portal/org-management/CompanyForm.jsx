import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

const FIELDS_BASIC = [
  { name: "company_code", label: "Company Code *", placeholder: "e.g. ACME", upper: true },
  { name: "company_name", label: "Company Name *", placeholder: "Acme Pvt Ltd" },
  { name: "legal_name", label: "Legal / Registered Name", placeholder: "Acme Private Limited" },
  { name: "display_name", label: "Display Name", placeholder: "Acme" },
];
const FIELDS_IDENTITY = [
  { name: "registration_number", label: "Registration Number", placeholder: "CIN / Registration No." },
  { name: "tax_number", label: "Tax Number (GST / VAT)", placeholder: "GST / Tax No." },
  { name: "website", label: "Website", placeholder: "https://acme.com" },
];
const FIELDS_CONTACT = [
  { name: "email", label: "Email", placeholder: "contact@acme.com" },
  { name: "phone", label: "Phone", placeholder: "+91 98765 43210" },
];
const FIELDS_ADDRESS = [
  { name: "address_line_1", label: "Address Line 1", placeholder: "Street / Plot" },
  { name: "address_line_2", label: "Address Line 2", placeholder: "Area / Landmark" },
  { name: "city", label: "City", placeholder: "Mumbai" },
  { name: "state", label: "State / Province", placeholder: "Maharashtra" },
  { name: "country", label: "Country", placeholder: "India" },
  { name: "postal_code", label: "Postal Code", placeholder: "400001" },
];

const EMPTY = {
  company_code: "", company_name: "", legal_name: "", display_name: "",
  registration_number: "", tax_number: "", website: "",
  email: "", phone: "",
  address_line_1: "", address_line_2: "", city: "", state: "", country: "", postal_code: "",
  logo_url: "",
};

export default function CompanyForm({ editMode }) {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editMode || !companyId) return;
    setLoading(true);
    portalOrgApi.getCompany(subdomain, token, companyId)
      .then(r => {
        const d = r.data.data;
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])) });
      })
      .catch(() => setError("Failed to load company."))
      .finally(() => setLoading(false));
  }, [editMode, companyId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    const payload = { ...form };
    // Remove blank optionals
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    if (!payload.company_code) { setError("Company Code is required."); setSaving(false); return; }
    if (!payload.company_name) { setError("Company Name is required."); setSaving(false); return; }
    if (payload.company_code) payload.company_code = payload.company_code.toUpperCase();
    try {
      if (editMode) {
        await portalOrgApi.updateCompany(subdomain, token, companyId, payload);
      } else {
        await portalOrgApi.createCompany(subdomain, token, payload);
      }
      navigate(`/portal/${subdomain}/org/companies`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Save failed.");
    } finally { setSaving(false); }
  };

  const InputRow = ({ fields }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--c-muted)" }}>{f.label}</label>
          <input
            value={form[f.name] || ""}
            onChange={e => set(f.name, f.upper ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={f.placeholder}
            className="w-full text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          />
        </div>
      ))}
    </div>
  );

  const Section = ({ title, children }) => (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <h3 className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>{title}</h3>
      {children}
    </div>
  );

  if (loading) return <OrgLayout title={editMode ? "Edit Company" : "Add Company"}><div className="py-20 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Company" : "Add Company"}>
      <form onSubmit={submit} className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>{editMode ? "Edit Company" : "Add Company"}</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{editMode ? "Update company details" : "Register a new legal entity"}</p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="text-sm" style={{ color: "var(--c-muted)" }}>← Back</button>
        </div>

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>{error}</div>}

        <Section title="Basic Information"><InputRow fields={FIELDS_BASIC} /></Section>
        <Section title="Legal Identity"><InputRow fields={FIELDS_IDENTITY} /></Section>
        <Section title="Contact"><InputRow fields={FIELDS_CONTACT} /></Section>
        <Section title="Address"><InputRow fields={FIELDS_ADDRESS} /></Section>

        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: saving ? "var(--c-muted)" : "var(--c-primary)" }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Company"}
          </button>
          <button type="button" onClick={() => navigate(-1)}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--c-surface-alt)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            Cancel
          </button>
        </div>
      </form>
    </OrgLayout>
  );
}
