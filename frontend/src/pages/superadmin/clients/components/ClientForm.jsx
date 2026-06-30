import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import CountryCodeSelect from "../../../../components/ui/CountryCodeSelect";
import { clientsApi } from "../../../../services/apiClient";
import { toOptions } from "../constants";
import usePincodeLookup from "../../../../hooks/usePincodeLookup";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const COUNTRY_CODE_RE = /^\+?[0-9]{1,4}$/;

const EMPTY = {
  company_name: "",
  legal_name: "",
  industry: "",
  website: "",
  company_size: "",
  postal_code: "",
  country: "",
  state: "",
  city: "",
  district: "",
  timezone: "",
  status: "",
};

const EMPTY_CONTACT = {
  first_name: "",
  last_name: "",
  designation: "",
  email: "",
  country_code: "",
  phone: "",
};

export default function ClientForm({ initial, isEdit = false, submitLabel = "Save Client", onSubmit }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const { lookup } = usePincodeLookup();
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [errors, setErrors] = useState({});
  const [cErrors, setCErrors] = useState({});
  const [options, setOptions] = useState({ statuses: [] });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    clientsApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initial) {
      setForm({
        ...EMPTY,
        ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, initial[k] == null ? "" : initial[k]])),
      });
    }
  }, [initial]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const setContactField = (key, value) => {
    setContact((c) => ({ ...c, [key]: value }));
    if (cErrors[key]) setCErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    const company = form.company_name.trim();
    if (!company) e.company_name = "Company name is required.";
    else if (company.length < 2) e.company_name = "Must be at least 2 characters.";
    else if (company.length > 150) e.company_name = "Must be under 150 characters.";

    if (form.website.trim() && !URL_RE.test(form.website.trim())) e.website = "Must start with http:// or https://";

    const ce = {};
    if (!isEdit) {
      const fn = contact.first_name.trim();
      const hasAny = fn || contact.last_name.trim() || contact.email.trim() || contact.phone.trim();
      if (hasAny) {
        if (!fn) ce.first_name = "First name is required for the primary contact.";
        else if (fn.length < 2) ce.first_name = "Must be at least 2 characters.";
        if (contact.email.trim() && !EMAIL_RE.test(contact.email.trim())) ce.email = "Enter a valid email address.";
        if (contact.country_code.trim() && !COUNTRY_CODE_RE.test(contact.country_code.trim().replace(/\s/g, "")))
          ce.country_code = "Use a dialing code like +1 or +44.";
      }
    }
    setErrors(e);
    setCErrors(ce);
    return Object.keys(e).length === 0 && Object.keys(ce).length === 0;
  };

  const buildPayload = () => {
    const trim = (v) => (typeof v === "string" ? v.trim() : v);
    const payload = { company_name: trim(form.company_name) };
    const optionalText = ["legal_name", "industry", "website", "company_size", "postal_code", "country", "state", "city", "district", "timezone"];
    optionalText.forEach((k) => {
      const v = trim(form[k]);
      if (v) payload[k] = v;
    });
    // Status is only settable on create; on edit it changes via the dedicated
    // /status endpoint (the "Change Status" control on the details page).
    if (!isEdit && form.status) payload.status = form.status;

    if (!isEdit) {
      const fn = trim(contact.first_name);
      if (fn) {
        const row = { first_name: fn, contact_type: "Primary", is_primary: true };
        const ln = trim(contact.last_name);
        const des = trim(contact.designation);
        const email = trim(contact.email);
        const cc = trim(contact.country_code);
        const phone = trim(contact.phone);
        if (ln) row.last_name = ln;
        if (des) row.designation = des;
        if (email) row.email = email;
        if (cc) row.country_code = cc;
        if (phone) row.phone = phone;
        payload.contacts = [row];
      }
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(buildPayload());
    } catch (err) {
      setServerError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
      {serverError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {serverError}
        </div>
      )}

      <Section title="Organization">
        <Input label="Company Name" required value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} error={errors.company_name} placeholder="Acme Corp" maxLength={150} />
        <Input label="Legal Name" value={form.legal_name} onChange={(e) => setField("legal_name", e.target.value)} placeholder="Acme Corporation Pvt Ltd" maxLength={200} />
        <Input label="Industry" value={form.industry} onChange={(e) => setField("industry", e.target.value)} placeholder="SaaS / Manufacturing" maxLength={120} />
        <Input label="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} error={errors.website} placeholder="https://acme.com" maxLength={255} />
        <Input label="Company Size" value={form.company_size} onChange={(e) => setField("company_size", e.target.value)} placeholder="e.g. 250 or 100-500" maxLength={50} />
        {!isEdit && (
          <Select label="Status" value={form.status} onChange={(e) => setField("status", e.target.value)} options={toOptions(options.statuses)} placeholder="Prospective (default)" />
        )}
      </Section>

      <Section title="Location">
        <Input label="Postal Code" value={form.postal_code} placeholder="400001" maxLength={20}
          onChange={async (e) => {
            const raw = e.target.value;
            setField("postal_code", raw);
            const code = raw.trim();
            if (code.length < 5) return;
            const cc = form.country || "IN";
            const result = await lookup(code, cc);
            if (!result) return;
            setForm(f => ({
              ...f,
              city:     f.city     || result.city,
              district: f.district || result.district,
              state:    f.state    || result.state,
              country:  f.country  || result.country,
            }));
          }}
        />
        <Input label="City" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="San Francisco" maxLength={100} />
        <Input label="District" value={form.district} onChange={(e) => setField("district", e.target.value)} placeholder="District / County" maxLength={50} />
        <Input label="State" value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="California" maxLength={100} />
        <Input label="Country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="United States" maxLength={100} />
        <Input label="Timezone" value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} placeholder="America/Los_Angeles" maxLength={60} />
      </Section>

      {!isEdit && (
        <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-block w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            <h3 className="text-sm font-semibold t-heading">Primary Contact</h3>
            <span className="text-xs t-muted">(optional)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" value={contact.first_name} onChange={(e) => setContactField("first_name", e.target.value)} error={cErrors.first_name} placeholder="Jane" maxLength={120} />
            <Input label="Last Name" value={contact.last_name} onChange={(e) => setContactField("last_name", e.target.value)} placeholder="Doe" maxLength={120} />
            <Input label="Designation" value={contact.designation} onChange={(e) => setContactField("designation", e.target.value)} placeholder="VP of Operations" maxLength={120} />
            <Input label="Email" type="email" value={contact.email} onChange={(e) => setContactField("email", e.target.value)} error={cErrors.email} placeholder="jane@acme.com" />
            <div className="grid grid-cols-3 gap-3">
              <CountryCodeSelect value={contact.country_code} onChange={(v) => setContactField("country_code", v)} error={cErrors.country_code} />
              <div className="col-span-2">
                <Input label="Phone" value={contact.phone} onChange={(e) => setContactField("phone", e.target.value)} placeholder="555 000 0000" maxLength={30} />
              </div>
            </div>
          </div>
          <p className="text-xs t-muted mt-3">You can add more contacts after the client is created.</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 max-w-5xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
        <h3 className="text-sm font-semibold t-heading">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
