import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../../components/ui/Input";
import Select from "../../../../components/ui/Select";
import Textarea from "../../../../components/ui/Textarea";
import CountryCodeSelect from "../../../../components/ui/CountryCodeSelect";
import { leadsApi, rbacApi } from "../../../../services/apiClient";
import { toOptions, toInputDate } from "../constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+/i;
const COUNTRY_CODE_RE = /^\+?[0-9]{1,4}$/;

const EMPTY = {
  company_name: "",
  contact_name: "",
  email: "",
  country_code: "",
  phone: "",
  designation: "",
  website: "",
  industry: "",
  country: "",
  company_size: "",
  expected_user_count: "",
  lead_source: "",
  current_stage: "",
  expected_revenue: "",
  expected_go_live_date: "",
  interested_modules: "",
  lead_owner_id: "",
};

const EMPTY_SPOKESPERSON = { id: null, name: "", designation: "", email: "", country_code: "", phone: "" };

export default function LeadForm({ initial, submitLabel = "Save Lead", onSubmit }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [spokespersons, setSpokespersons] = useState([]);
  const [spErrors, setSpErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [options, setOptions] = useState({ sources: [], stages: [] });
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    leadsApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
    rbacApi.listUsers()
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setUsers(Array.isArray(list) ? list.filter(u => u.is_active || u.status === "Active") : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initial) {
      setForm({
        ...EMPTY,
        ...Object.fromEntries(
          Object.keys(EMPTY).map((k) => [
            k,
            initial[k] == null ? "" : k === "expected_go_live_date" ? toInputDate(initial[k]) : initial[k],
          ])
        ),
      });
      if (Array.isArray(initial.spokespersons)) {
        setSpokespersons(
          initial.spokespersons.map((s) => ({
            id: s.id,
            name: s.name || "",
            designation: s.designation || "",
            email: s.email || "",
            country_code: s.country_code || "",
            phone: s.phone || "",
          }))
        );
      }
    }
  }, [initial]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const addSpokesperson = () => setSpokespersons((rows) => [...rows, { ...EMPTY_SPOKESPERSON }]);
  const removeSpokesperson = (idx) => {
    setSpokespersons((rows) => rows.filter((_, i) => i !== idx));
    setSpErrors((e) => ({ ...e, [idx]: undefined }));
  };
  const setSpokespersonField = (idx, key, value) => {
    setSpokespersons((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    if (spErrors[idx]?.[key]) {
      setSpErrors((e) => ({ ...e, [idx]: { ...e[idx], [key]: undefined } }));
    }
  };

  const validate = () => {
    const e = {};
    const company = form.company_name.trim();
    const contact = form.contact_name.trim();
    if (!company) e.company_name = "Company name is required.";
    else if (company.length < 2) e.company_name = "Must be at least 2 characters.";
    else if (company.length > 200) e.company_name = "Must be under 200 characters.";

    if (!contact) e.contact_name = "Contact name is required.";
    else if (contact.length > 150) e.contact_name = "Must be under 150 characters.";

    if (!form.lead_source) e.lead_source = "Lead source is required.";

    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address.";
    if (form.country_code.trim() && !COUNTRY_CODE_RE.test(form.country_code.trim().replace(/\s/g, "")))
      e.country_code = "Use a dialing code like +1 or +44.";
    if (form.website.trim() && !URL_RE.test(form.website.trim())) e.website = "Must start with http:// or https://";
    if (form.expected_revenue !== "" && Number(form.expected_revenue) < 0) e.expected_revenue = "Cannot be negative.";
    if (form.expected_user_count !== "" && (!Number.isInteger(Number(form.expected_user_count)) || Number(form.expected_user_count) < 0))
      e.expected_user_count = "Must be a positive whole number.";

    const se = {};
    spokespersons.forEach((sp, idx) => {
      const rowErr = {};
      const name = sp.name.trim();
      if (!name) rowErr.name = "Name is required.";
      else if (name.length > 150) rowErr.name = "Must be under 150 characters.";
      if (sp.email.trim() && !EMAIL_RE.test(sp.email.trim())) rowErr.email = "Enter a valid email address.";
      if (sp.country_code.trim() && !COUNTRY_CODE_RE.test(sp.country_code.trim().replace(/\s/g, "")))
        rowErr.country_code = "Use a dialing code like +1 or +44.";
      if (Object.keys(rowErr).length) se[idx] = rowErr;
    });
    setSpErrors(se);

    setErrors(e);
    return Object.keys(e).length === 0 && Object.keys(se).length === 0;
  };

  const buildPayload = () => {
    const trim = (v) => (typeof v === "string" ? v.trim() : v);
    const payload = {
      company_name: trim(form.company_name),
      contact_name: trim(form.contact_name),
      lead_source: form.lead_source,
    };
    const optionalText = ["email", "country_code", "phone", "designation", "website", "industry", "country", "company_size", "interested_modules"];
    optionalText.forEach((k) => {
      const v = trim(form[k]);
      if (v) payload[k] = v;
    });
    if (form.current_stage) payload.current_stage = form.current_stage;
    if (form.expected_revenue !== "") payload.expected_revenue = Number(form.expected_revenue);
    if (form.expected_user_count !== "") payload.expected_user_count = Number(form.expected_user_count);
    if (form.expected_go_live_date) payload.expected_go_live_date = form.expected_go_live_date;
    payload.lead_owner_id = form.lead_owner_id ? Number(form.lead_owner_id) : null;

    payload.spokespersons = spokespersons.map((sp) => {
      const row = { name: trim(sp.name), is_primary: false };
      if (sp.id) row.id = sp.id;
      const designation = trim(sp.designation);
      const email = trim(sp.email);
      const country_code = trim(sp.country_code);
      const phone = trim(sp.phone);
      if (designation) row.designation = designation;
      if (email) row.email = email;
      if (country_code) row.country_code = country_code;
      if (phone) row.phone = phone;
      return row;
    });
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

      <Section title="Company & Contact">
        <Input label="Company Name" required value={form.company_name} onChange={(e) => setField("company_name", e.target.value)} error={errors.company_name} placeholder="Acme Corp" maxLength={200} />
        <Input label="Contact Name" required value={form.contact_name} onChange={(e) => setField("contact_name", e.target.value)} error={errors.contact_name} placeholder="Jane Doe" maxLength={150} />
        <Input label="Designation" value={form.designation} onChange={(e) => setField("designation", e.target.value)} placeholder="VP of Operations" maxLength={120} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} error={errors.email} placeholder="jane@acme.com" />
        <div className="grid grid-cols-3 gap-3">
          <CountryCodeSelect value={form.country_code} onChange={(v) => setField("country_code", v)} error={errors.country_code} />
          <div className="col-span-2">
            <Input label="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="555 000 0000" maxLength={30} />
          </div>
        </div>
        <Input label="Website" value={form.website} onChange={(e) => setField("website", e.target.value)} error={errors.website} placeholder="https://acme.com" />
      </Section>

      <Section title="Company Profile">
        <Input label="Industry" value={form.industry} onChange={(e) => setField("industry", e.target.value)} placeholder="SaaS / Manufacturing" maxLength={120} />
        <Input label="Country" value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="United States" maxLength={100} />
        <Input label="Company Size" value={form.company_size} onChange={(e) => setField("company_size", e.target.value)} placeholder="e.g. 250 or 100-500" maxLength={50} />
        <Input label="Expected User Count" type="number" min="0" value={form.expected_user_count} onChange={(e) => setField("expected_user_count", e.target.value)} error={errors.expected_user_count} placeholder="200" />
      </Section>

      <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold t-heading flex items-center gap-2">
            <span className="inline-block w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            Additional Spokespersons
          </h3>
          <button type="button" onClick={addSpokesperson} className="btn-secondary text-xs px-3 py-1.5">+ Add Spokesperson</button>
        </div>
        {spokespersons.length === 0 ? (
          <p className="text-xs t-muted">
            The contact above is the primary spokesperson. Add more people involved with this lead here.
          </p>
        ) : (
          <div className="space-y-4">
            {spokespersons.map((sp, idx) => (
              <div key={sp.id ?? idx} className="rounded-lg p-4" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium t-muted">Spokesperson {idx + 1}</span>
                  <button type="button" onClick={() => removeSpokesperson(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Name" required value={sp.name} onChange={(e) => setSpokespersonField(idx, "name", e.target.value)} error={spErrors[idx]?.name} placeholder="John Smith" maxLength={150} />
                  <Input label="Designation" value={sp.designation} onChange={(e) => setSpokespersonField(idx, "designation", e.target.value)} placeholder="CTO" maxLength={120} />
                  <Input label="Email" type="email" value={sp.email} onChange={(e) => setSpokespersonField(idx, "email", e.target.value)} error={spErrors[idx]?.email} placeholder="john@acme.com" />
                  <div className="grid grid-cols-3 gap-3">
                    <CountryCodeSelect value={sp.country_code} onChange={(v) => setSpokespersonField(idx, "country_code", v)} error={spErrors[idx]?.country_code} />
                    <div className="col-span-2">
                      <Input label="Phone" value={sp.phone} onChange={(e) => setSpokespersonField(idx, "phone", e.target.value)} placeholder="555 000 0000" maxLength={30} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Section title="Pipeline">
        <Select label="Lead Source" required value={form.lead_source} onChange={(e) => setField("lead_source", e.target.value)} options={toOptions(options.sources)} placeholder="Select source" error={errors.lead_source} />
        <Select label="Stage" value={form.current_stage} onChange={(e) => setField("current_stage", e.target.value)} options={toOptions(options.stages)} placeholder="New (default)" />
        <Select
          label="Assigned To"
          value={String(form.lead_owner_id || "")}
          onChange={(e) => setField("lead_owner_id", e.target.value)}
          options={[{ value: "", label: "Unassigned" }, ...users.map(u => ({ value: String(u.id), label: u.name || u.email }))]}
          placeholder="Unassigned"
        />
        <Input label="Expected Revenue (USD)" type="number" min="0" step="0.01" value={form.expected_revenue} onChange={(e) => setField("expected_revenue", e.target.value)} error={errors.expected_revenue} placeholder="120000" />
        <Input label="Expected Go-Live Date" type="date" value={form.expected_go_live_date} onChange={(e) => setField("expected_go_live_date", e.target.value)} />
        <Textarea label="Interested Modules" value={form.interested_modules} onChange={(e) => setField("interested_modules", e.target.value)} rows={2} placeholder="HR, Payroll, Attendance..." className="sm:col-span-2" />
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <h3 className="text-sm font-semibold t-heading mb-4 flex items-center gap-2">
        <span className="inline-block w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}
