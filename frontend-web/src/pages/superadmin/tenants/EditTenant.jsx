import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
];

export default function EditTenant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    tenant_name: "",
    company_email: "",
    contact_number: "",
    company_website: "",
    timezone: "UTC",
    region: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await tenantMgmtApi.getById(id);
        const t = res.data?.data ?? res.data;
        setForm({
          tenant_name: t.tenant_name || "",
          company_email: t.company_email || "",
          contact_number: t.contact_number || "",
          company_website: t.company_website || "",
          timezone: t.timezone || "UTC",
          region: t.region || "",
        });
      } catch (e) {
        setGlobalError(e.response?.data?.detail || "Failed to load tenant.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.tenant_name.trim()) errs.tenant_name = "Tenant name is required.";
    if (!form.company_email.trim()) errs.company_email = "Company email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email)) errs.company_email = "Enter a valid email.";
    if (form.contact_number && !/^\+?[0-9\s\-().]{7,20}$/.test(form.contact_number))
      errs.contact_number = "Enter a valid phone number.";
    if (form.company_website && !/^(https?:\/\/)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}/.test(form.company_website))
      errs.company_website = "Enter a valid URL.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError("");
    setSuccess(false);
    try {
      await tenantMgmtApi.update(id, {
        tenant_name: form.tenant_name.trim(),
        company_email: form.company_email.trim().toLowerCase(),
        contact_number: form.contact_number || null,
        company_website: form.company_website || null,
        timezone: form.timezone,
        region: form.region || null,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/superadmin/tenants/${id}`), 1000);
    } catch (e) {
      const d = e.response?.data?.detail;
      setGlobalError(typeof d === "string" ? d : "Failed to update tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-gray-500 gap-2">
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/superadmin/tenants/${id}`)} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Edit Tenant</h1>
          <p className="text-sm text-gray-500">Update basic tenant information.</p>
        </div>
      </div>

      {/* Alerts */}
      {globalError && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {globalError}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-4 py-3 text-sm text-emerald-400">
          Tenant updated successfully! Redirecting...
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>🏢</span> Company Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tenant Name" required
              value={form.tenant_name} error={errors.tenant_name}
              placeholder="Acme Corporation"
              onChange={(e) => set("tenant_name", e.target.value)}
            />
            <Input
              label="Company Email" required type="email"
              value={form.company_email} error={errors.company_email}
              placeholder="admin@acmecorp.com"
              onChange={(e) => set("company_email", e.target.value)}
            />
            <Input
              label="Contact Number" type="tel"
              value={form.contact_number} error={errors.contact_number}
              placeholder="+1 555 000 0000"
              onChange={(e) => set("contact_number", e.target.value)}
            />
            <Input
              label="Company Website" type="url"
              value={form.company_website} error={errors.company_website}
              placeholder="https://acmecorp.com"
              onChange={(e) => set("company_website", e.target.value)}
            />
            <Select
              label="Timezone"
              value={form.timezone}
              options={TIMEZONE_OPTIONS}
              onChange={(e) => set("timezone", e.target.value)}
            />
            <Input
              label="Region"
              value={form.region}
              placeholder="e.g. APAC, EMEA, US"
              onChange={(e) => set("region", e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(`/superadmin/tenants/${id}`)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary min-w-[140px]"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
