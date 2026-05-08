import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";

const PLAN_OPTIONS = [
  { value: "Starter", label: "Starter" },
  { value: "Growth", label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
];

const DEFAULT_MODULES = {
  employee: false, hrms: false, assets: false,
  billing: false, workflow: false, reports: false,
};

const STEPS = ["Basic Info", "Domain", "Database", "Subscription", "Modules"];

export default function CreateTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");

  const [form, setForm] = useState({
    tenant_name: "", tenant_code: "", company_email: "",
    contact_number: "", company_website: "", timezone: "UTC", region: "",
    subdomain: "", custom_domain: "",
    db_name: "", db_host: "", db_port: "5432", db_username: "", db_password: "",
    plan_name: "Starter", trial_start: "", trial_end: "", user_limit: "25", storage_limit: "1024",
    modules: { ...DEFAULT_MODULES },
    primary_color: "#00aeec", theme_mode: "dark",
  });

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const autoCode = (name) => {
    set("tenant_code", name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  };

  const validate = () => {
    const errs = {};
    if (step === 0) {
      if (!form.tenant_name.trim()) errs.tenant_name = "Tenant name is required.";
      if (!form.tenant_code.trim()) errs.tenant_code = "Tenant code is required.";
      else if (!/^[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]$/.test(form.tenant_code))
        errs.tenant_code = "Must be 3–50 lowercase letters, digits, or hyphens.";
      if (!form.company_email.trim()) errs.company_email = "Company email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email))
        errs.company_email = "Enter a valid email.";
      if (form.contact_number && !/^\+?[0-9\s\-().]{7,20}$/.test(form.contact_number))
        errs.contact_number = "Enter a valid phone number.";
      if (form.company_website && !/^(https?:\/\/)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}/.test(form.company_website))
        errs.company_website = "Enter a valid URL.";
    }
    if (step === 1) {
      if (!form.subdomain.trim()) errs.subdomain = "Subdomain is required.";
      else if (!/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$/.test(form.subdomain))
        errs.subdomain = "Must be lowercase letters, digits, or hyphens.";
    }
    if (step === 2) {
      const hasAny = form.db_name || form.db_host || form.db_username || form.db_password;
      if (hasAny) {
        if (!form.db_name.trim()) errs.db_name = "DB name is required if configuring database.";
        if (!form.db_host.trim()) errs.db_host = "DB host is required.";
        if (!form.db_username.trim()) errs.db_username = "DB username is required.";
        if (!form.db_password.trim()) errs.db_password = "DB password is required.";
        const port = Number(form.db_port);
        if (!port || port < 1 || port > 65535) errs.db_port = "Enter a valid port (1–65535).";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => s + 1); };
  const back = () => setStep((s) => s - 1);

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setGlobalError("");
    try {
      const hasDb = form.db_name && form.db_host && form.db_username && form.db_password;
      await tenantMgmtApi.create({
        tenant_name: form.tenant_name.trim(),
        tenant_code: form.tenant_code.trim(),
        company_email: form.company_email.trim().toLowerCase(),
        contact_number: form.contact_number || null,
        company_website: form.company_website || null,
        timezone: form.timezone,
        region: form.region || null,
        domain: { subdomain: form.subdomain.trim(), custom_domain: form.custom_domain || null },
        db_config: hasDb ? {
          db_name: form.db_name.trim(), db_host: form.db_host.trim(),
          db_port: Number(form.db_port) || 5432,
          db_username: form.db_username.trim(), db_password: form.db_password,
        } : null,
        subscription: {
          plan_name: form.plan_name, trial_start: form.trial_start || null,
          trial_end: form.trial_end || null,
          user_limit: Number(form.user_limit) || 25,
          storage_limit: Number(form.storage_limit) || 1024,
        },
        modules: form.modules,
        branding: { primary_color: form.primary_color, theme_mode: form.theme_mode },
      });
      navigate("/superadmin/tenants");
    } catch (e) {
      const detail = e.response?.data?.detail;
      setGlobalError(typeof detail === "string" ? detail : "Failed to create tenant.");
      setStep(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/superadmin/tenants")} className="topbar-btn">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold t-heading">Create New Tenant</h1>
          <p className="text-sm t-muted">Fill in the details to onboard a new SaaS client.</p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} current={step} />

      {/* Global error */}
      {globalError && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {globalError}
        </div>
      )}

      {/* Form card */}
      <div className="card">
        {step === 0 && <StepBasicInfo form={form} set={set} errors={errors} autoCode={autoCode} />}
        {step === 1 && <StepDomain form={form} set={set} errors={errors} />}
        {step === 2 && <StepDatabase form={form} set={set} errors={errors} />}
        {step === 3 && <StepSubscription form={form} set={set} />}
        {step === 4 && <StepModules form={form} set={set} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => step === 0 ? navigate("/superadmin/tenants") : back()} className="btn-secondary">
          {step === 0 ? "Cancel" : "← Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="btn-primary">Next →</button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary min-w-[140px]">
            {submitting ? "Creating..." : "Create Tenant"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Step components ──────────────────────────────────────────────────── */

function StepBasicInfo({ form, set, errors, autoCode }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Basic Information" icon="🏢" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Tenant Name" required value={form.tenant_name} error={errors.tenant_name}
          placeholder="Acme Corporation"
          onChange={(e) => { set("tenant_name", e.target.value); autoCode(e.target.value); }} />
        <Input label="Tenant Code" required value={form.tenant_code} error={errors.tenant_code}
          placeholder="acme-corp" hint="Lowercase letters, digits, hyphens only."
          onChange={(e) => set("tenant_code", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        <Input label="Company Email" required type="email" value={form.company_email} error={errors.company_email}
          placeholder="admin@acmecorp.com"
          onChange={(e) => set("company_email", e.target.value)} />
        <Input label="Contact Number" type="tel" value={form.contact_number} error={errors.contact_number}
          placeholder="+1 555 000 0000"
          onChange={(e) => set("contact_number", e.target.value)} />
        <Input label="Company Website" type="url" value={form.company_website} error={errors.company_website}
          placeholder="https://acmecorp.com"
          onChange={(e) => set("company_website", e.target.value)} />
        <Select label="Timezone" value={form.timezone} options={TIMEZONE_OPTIONS}
          onChange={(e) => set("timezone", e.target.value)} />
        <Input label="Region" value={form.region} placeholder="e.g. APAC, EMEA, US"
          onChange={(e) => set("region", e.target.value)} />
      </div>
    </div>
  );
}

function StepDomain({ form, set, errors }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Domain Configuration" icon="🌐" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Subdomain" required value={form.subdomain} error={errors.subdomain}
          placeholder="acme" hint="e.g. acme → acme.officerepo.io"
          onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
        <Input label="Custom Domain" value={form.custom_domain}
          placeholder="app.acmecorp.com" hint="Optional. Point CNAME to our servers."
          onChange={(e) => set("custom_domain", e.target.value)} />
      </div>
    </div>
  );
}

function StepDatabase({ form, set, errors }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Database Configuration" icon="🗄️" />
      <p className="text-xs t-muted">Optional. Leave blank to configure later.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Database Name" value={form.db_name} error={errors.db_name}
          placeholder="acme_db" onChange={(e) => set("db_name", e.target.value)} />
        <Input label="DB Host" value={form.db_host} error={errors.db_host}
          placeholder="db.acmecorp.com" onChange={(e) => set("db_host", e.target.value)} />
        <Input label="DB Port" type="number" value={form.db_port} error={errors.db_port}
          placeholder="5432" onChange={(e) => set("db_port", e.target.value)} />
        <Input label="DB Username" value={form.db_username} error={errors.db_username}
          placeholder="acme_user" onChange={(e) => set("db_username", e.target.value)} />
        <Input label="DB Password" type="password" value={form.db_password} error={errors.db_password}
          placeholder="••••••••" hint="Encrypted before storage."
          className="sm:col-span-2"
          onChange={(e) => set("db_password", e.target.value)} />
      </div>
    </div>
  );
}

function StepSubscription({ form, set }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Subscription Assignment" icon="📋" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Plan" value={form.plan_name} options={PLAN_OPTIONS}
          onChange={(e) => set("plan_name", e.target.value)} />
        <Input label="User Limit" type="number" value={form.user_limit}
          onChange={(e) => set("user_limit", e.target.value)} />
        <Input label="Storage Limit (MB)" type="number" value={form.storage_limit}
          onChange={(e) => set("storage_limit", e.target.value)} />
        <div />
        <Input label="Trial Start" type="date" value={form.trial_start}
          onChange={(e) => set("trial_start", e.target.value)} />
        <Input label="Trial End" type="date" value={form.trial_end}
          onChange={(e) => set("trial_end", e.target.value)} />
      </div>
    </div>
  );
}

function StepModules({ form, set }) {
  const modules = [
    { key: "employee", label: "Employee", desc: "Employee directory & profiles" },
    { key: "hrms",     label: "HRMS",     desc: "HR management system" },
    { key: "assets",   label: "Assets",   desc: "Asset tracking & management" },
    { key: "billing",  label: "Billing",  desc: "Invoicing & payments" },
    { key: "workflow", label: "Workflow", desc: "Approval workflows & automation" },
    { key: "reports",  label: "Reports",  desc: "Analytics & reporting" },
  ];
  return (
    <div className="space-y-4">
      <SectionTitle title="Module Enablement" icon="🧩" />
      <p className="text-xs t-muted">Select which modules this tenant will have access to.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map((m) => (
          <div key={m.key} className="flex items-center justify-between p-3 rounded-lg"
            style={{ backgroundColor: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>
            <div>
              <p className="text-sm font-medium t-heading">{m.label}</p>
              <p className="text-xs t-muted">{m.desc}</p>
            </div>
            <Toggle
              checked={form.modules[m.key]}
              onChange={(v) => set("modules", { ...form.modules, [m.key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <h2 className="text-base font-semibold t-heading flex items-center gap-2">
      <span>{icon}</span>
      {title}
    </h2>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={
                i <= current
                  ? { backgroundColor: "var(--c-accent)", color: "#fff", boxShadow: i === current ? "0 0 0 3px var(--c-accent-dim)" : "none" }
                  : { backgroundColor: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }
              }
            >
              {i < current ? "✓" : i + 1}
            </div>
            <span className="text-xs mt-1 hidden sm:block" style={{ color: i === current ? "var(--c-accent)" : "var(--c-muted)" }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-px mx-1 mb-4 transition-colors"
              style={{ backgroundColor: i < current ? "var(--c-accent)" : "var(--c-border)" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
