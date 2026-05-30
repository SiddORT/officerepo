import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";
import PhoneInput from "../../../components/ui/PhoneInput";

const PLAN_OPTIONS = [
  { value: "Starter",    label: "Starter" },
  { value: "Growth",     label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC",                  label: "UTC" },
  { value: "Asia/Kolkata",         label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai",           label: "Asia/Dubai (GST)" },
  { value: "America/New_York",     label: "America/New_York (EST)" },
  { value: "America/Los_Angeles",  label: "America/Los_Angeles (PST)" },
  { value: "Europe/London",        label: "Europe/London (GMT)" },
  { value: "Europe/Paris",         label: "Europe/Paris (CET)" },
];

const DEFAULT_MODULES = {
  employee: false, hrms: false, assets: false,
  billing: false, workflow: false, reports: false,
};

const STEPS = [
  { label: "Basic Info",    desc: "Company name, email, contact" },
  { label: "Domain",        desc: "Subdomain & custom domain" },
  { label: "Database",      desc: "DB connection details" },
  { label: "Subscription",  desc: "Plan, limits & trial dates" },
  { label: "Modules",       desc: "Enable feature modules" },
];

// Saved indicator shown after each step save
function SavedBadge({ show }) {
  if (!show) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)" }}
    >
      ✓ Saved
    </span>
  );
}

export default function CreateTenant() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tenantId, setTenantId] = useState(null);   // set after step 0 save
  const [hoveredStep, setHoveredStep] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedStep, setSavedStep] = useState(null);  // which step just saved
  const [errors, setErrors] = useState({});
  const [stepError, setStepError] = useState("");

  const [form, setForm] = useState({
    tenant_name: "", tenant_code: "", company_email: "",
    contact_dial: "+91", contact_number: "", company_website: "",
    timezone: "UTC", region: "",
    subdomain: "", custom_domain: "",
    db_name: "", db_host: "", db_port: "5432", db_username: "", db_password: "",
    plan_name: "Starter", trial_start: "", trial_end: "",
    user_limit: "25", storage_limit: "1024",
    modules: { ...DEFAULT_MODULES },
  });

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const autoCode = (name) =>
    set("tenant_code", name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));

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
      if (form.contact_number && !/^[0-9\s\-().]{5,18}$/.test(form.contact_number))
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
        if (!form.db_name.trim())     errs.db_name     = "DB name is required if configuring database.";
        if (!form.db_host.trim())     errs.db_host     = "DB host is required.";
        if (!form.db_username.trim()) errs.db_username = "DB username is required.";
        if (!form.db_password.trim()) errs.db_password = "DB password is required.";
        const port = Number(form.db_port);
        if (!port || port < 1 || port > 65535) errs.db_port = "Enter a valid port (1–65535).";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const flashSaved = (s) => {
    setSavedStep(s);
    setTimeout(() => setSavedStep(null), 2500);
  };

  // Save the current step, then advance
  const saveAndNext = async () => {
    if (!validate()) return;
    setSaving(true);
    setStepError("");
    try {
      const contactFull = form.contact_number
        ? `${form.contact_dial} ${form.contact_number.trim()}`
        : null;

      if (step === 0) {
        const payload = {
          tenant_name: form.tenant_name.trim(),
          tenant_code: form.tenant_code.trim(),
          company_email: form.company_email.trim().toLowerCase(),
          contact_number: contactFull,
          company_website: form.company_website || null,
          timezone: form.timezone,
          region: form.region || null,
        };
        if (tenantId) {
          // Re-saving basic info for an existing draft
          await tenantMgmtApi.updateBasicInfo(tenantId, payload);
        } else {
          const res = await tenantMgmtApi.createDraft(payload);
          const id = res.data?.data?.id ?? res.data?.id;
          setTenantId(id);
        }
      } else if (step === 1) {
        await tenantMgmtApi.saveDomainStep(tenantId, {
          subdomain: form.subdomain.trim(),
          custom_domain: form.custom_domain || null,
        });
      } else if (step === 2) {
        await tenantMgmtApi.saveDatabaseStep(tenantId, {
          db_name: form.db_name || null,
          db_host: form.db_host || null,
          db_port: Number(form.db_port) || 5432,
          db_username: form.db_username || null,
          db_password: form.db_password || null,
        });
      } else if (step === 3) {
        await tenantMgmtApi.saveSubscriptionStep(tenantId, {
          plan_name: form.plan_name,
          trial_start: form.trial_start || null,
          trial_end: form.trial_end || null,
          user_limit: Number(form.user_limit) || 25,
          storage_limit: Number(form.storage_limit) || 1024,
        });
      } else if (step === 4) {
        await tenantMgmtApi.saveModulesStep(tenantId, form.modules);
        flashSaved(4);
        navigate("/superadmin/tenants");
        return;
      }

      flashSaved(step);
      setStep((s) => s + 1);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setStepError(typeof detail === "string" ? detail : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    setStepError("");
    setStep((s) => s - 1);
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="flex h-full min-h-0" style={{ height: "100%" }}>

      {/* ── Left panel — vertical stepper ────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 260,
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          padding: "32px 24px",
        }}
      >
        {/* Back + title */}
        <button
          onClick={() => navigate("/superadmin/tenants")}
          className="flex items-center gap-2 mb-6 text-xs t-muted layout-nav-idle rounded-lg px-2 py-1 transition-all w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tenants
        </button>

        <div className="mb-8">
          <h1 className="text-lg font-bold t-heading leading-snug">Create New Tenant</h1>
          <p className="text-xs t-muted mt-1">Each step is saved automatically.</p>
        </div>

        {/* Vertical step list */}
        <div className="flex flex-col gap-0 flex-1">
          {STEPS.map((s, i) => {
            const isActive    = i === step;
            const isCompleted = i < step;
            const isPending   = i > step;
            const isHovered   = hoveredStep === i;
            const isClickable = isCompleted;

            const circleStyle = (() => {
              const base = {
                transition: "all 0.2s ease",
                cursor: isClickable ? "pointer" : "default",
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, flexShrink: 0,
              };
              if (isCompleted && isHovered) return { ...base,
                background: "linear-gradient(135deg, #00aeec, #ff7a1a)", color: "#fff",
                transform: "scale(1.18)",
                boxShadow: "0 0 0 4px rgba(0,174,236,0.28), 0 4px 14px rgba(255,122,26,0.30)",
              };
              if (isActive && isHovered) return { ...base,
                background: "linear-gradient(135deg, #00c4ff, #ff9a4d)", color: "#fff",
                transform: "scale(1.10)",
                boxShadow: "0 0 0 5px rgba(0,174,236,0.30), 0 0 0 8px rgba(255,122,26,0.14)",
              };
              if (isPending && isHovered) return { ...base,
                background: "linear-gradient(135deg, rgba(0,174,236,0.18), rgba(255,122,26,0.15))",
                color: "#00aeec", border: "1px solid rgba(0,174,236,0.40)",
                transform: "scale(1.10)", boxShadow: "0 2px 10px rgba(0,174,236,0.18)",
              };
              if (isActive || isCompleted) return { ...base,
                background: "linear-gradient(135deg, #00aeec, #ff7a1a)", color: "#fff",
                boxShadow: isActive ? "0 0 0 3px rgba(0,174,236,0.22), 0 0 0 5px rgba(255,122,26,0.10)" : "none",
              };
              return { ...base,
                backgroundColor: "var(--c-surface2)", color: "var(--c-muted)",
                border: "1px solid var(--c-border)",
              };
            })();

            return (
              <div
                key={s.label}
                className="flex gap-3"
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                onClick={() => isClickable && setStep(i)}
              >
                <div className="flex flex-col items-center" style={{ minWidth: 28 }}>
                  <div style={circleStyle}>{isCompleted ? "✓" : i + 1}</div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1, flex: 1, minHeight: 28, margin: "4px 0",
                      transition: "background 0.3s ease",
                      background: isCompleted ? "linear-gradient(to bottom, #00aeec, #ff7a1a)" : "var(--c-border)",
                    }} />
                  )}
                </div>
                <div
                  className="pb-6"
                  style={{
                    cursor: isClickable ? "pointer" : "default",
                    transition: "background 0.18s ease",
                    borderRadius: 10, padding: "2px 6px 2px 0",
                    background: isHovered && isClickable ? "rgba(0,174,236,0.06)" : "transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-semibold"
                      style={{
                        transition: "all 0.18s ease",
                        ...(isActive
                          ? { background: "linear-gradient(135deg,#00aeec,#ff7a1a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                          : isHovered && isCompleted
                            ? { color: "#00aeec" }
                            : { color: isCompleted ? "var(--c-text)" : "var(--c-muted)" }),
                      }}
                    >
                      {s.label}
                    </p>
                    {savedStep === i && <SavedBadge show />}
                  </div>
                  <p className="text-xs mt-0.5" style={{
                    color: "var(--c-muted)",
                    opacity: isHovered ? 1 : isPending ? 0.55 : 0.8,
                    transition: "opacity 0.18s ease",
                  }}>
                    {s.desc}
                  </p>
                  {isCompleted && isHovered && (
                    <p className="text-[10px] mt-0.5" style={{ color: "#00aeec" }}>Click to edit ↩</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress foot */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs t-muted">Progress</span>
            <span className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
              {Math.round((step / (STEPS.length - 1)) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--c-surface2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(step / (STEPS.length - 1)) * 100}%`,
                background: "linear-gradient(90deg, #00aeec, #ff7a1a)",
              }}
            />
          </div>
          {tenantId && (
            <p className="text-[10px] t-muted mt-2">
              Tenant ID: <span className="font-mono" style={{ color: "var(--c-accent)" }}>#{tenantId}</span>
              {" · "}auto-saved
            </p>
          )}
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <div className="flex-1 p-8">

          {/* Step heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span
                className="inline-block w-0.5 h-5 rounded-full"
                style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }}
              />
              <h2 className="text-xl font-bold t-heading">{STEPS[step].label}</h2>
              {savedStep === step && <SavedBadge show />}
            </div>
            <p className="text-sm t-muted ml-2.5">{STEPS[step].desc}</p>
          </div>

          {/* Step error */}
          {stepError && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm text-red-400"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {stepError}
            </div>
          )}

          {/* Form card */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, #00aeec, #ff7a1a)",
            }} />
            {step === 0 && <StepBasicInfo    form={form} set={set} errors={errors} autoCode={autoCode} />}
            {step === 1 && <StepDomain       form={form} set={set} errors={errors} />}
            {step === 2 && <StepDatabase     form={form} set={set} errors={errors} />}
            {step === 3 && <StepSubscription form={form} set={set} />}
            {step === 4 && <StepModules      form={form} set={set} />}
          </div>
        </div>

        {/* Nav bar */}
        <div
          className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-surface)" }}
        >
          <button
            onClick={() => step === 0 ? navigate("/superadmin/tenants") : back()}
            className="btn-secondary"
            disabled={saving}
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs t-muted">Step {step + 1} of {STEPS.length}</span>
            <button
              onClick={saveAndNext}
              disabled={saving}
              className="btn-primary min-w-[150px] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span
                    className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  />
                  Saving...
                </>
              ) : isLastStep ? (
                "Finish & Save ✓"
              ) : (
                "Save & Next →"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step form components ──────────────────────────────────────────────────── */

function StepBasicInfo({ form, set, errors, autoCode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Input label="Tenant Name" required value={form.tenant_name} error={errors.tenant_name}
        placeholder="Acme Corporation"
        onChange={(e) => { set("tenant_name", e.target.value); autoCode(e.target.value); }} />
      <Input label="Tenant Code" required value={form.tenant_code} error={errors.tenant_code}
        placeholder="acme-corp" hint="Lowercase letters, digits, hyphens only."
        onChange={(e) => set("tenant_code", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
      <Input label="Company Email" required type="email" value={form.company_email} error={errors.company_email}
        placeholder="admin@acmecorp.com"
        onChange={(e) => set("company_email", e.target.value)} />
      <PhoneInput
        label="Contact Number"
        dialCode={form.contact_dial}
        onDialCodeChange={(v) => set("contact_dial", v)}
        number={form.contact_number}
        onNumberChange={(v) => set("contact_number", v)}
        error={errors.contact_number}
      />
      <Input label="Company Website" type="url" value={form.company_website} error={errors.company_website}
        placeholder="https://acmecorp.com"
        onChange={(e) => set("company_website", e.target.value)} />
      <Select label="Timezone" value={form.timezone} options={TIMEZONE_OPTIONS}
        onChange={(e) => set("timezone", e.target.value)} />
      <Input label="Region" value={form.region} placeholder="e.g. APAC, EMEA, US"
        onChange={(e) => set("region", e.target.value)} />
    </div>
  );
}

function StepDomain({ form, set, errors }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Input label="Subdomain" required value={form.subdomain} error={errors.subdomain}
        placeholder="acme" hint="e.g. acme → acme.officerepo.io"
        onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
      <Input label="Custom Domain" value={form.custom_domain}
        placeholder="app.acmecorp.com" hint="Optional. Point CNAME to our servers."
        onChange={(e) => set("custom_domain", e.target.value)} />
    </div>
  );
}

function StepDatabase({ form, set, errors }) {
  return (
    <div className="space-y-1">
      <p className="text-xs t-muted mb-4">Optional — leave blank to configure later.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Input label="Database Name" value={form.db_name} error={errors.db_name}
          placeholder="acme_db" onChange={(e) => set("db_name", e.target.value)} />
        <Input label="DB Host" value={form.db_host} error={errors.db_host}
          placeholder="db.acmecorp.com" onChange={(e) => set("db_host", e.target.value)} />
        <Input label="DB Port" type="number" value={form.db_port} error={errors.db_port}
          placeholder="5432" onChange={(e) => set("db_port", e.target.value)} />
        <Input label="DB Username" value={form.db_username} error={errors.db_username}
          placeholder="acme_user" onChange={(e) => set("db_username", e.target.value)} />
        <div className="sm:col-span-2">
          <Input label="DB Password" type="password" value={form.db_password} error={errors.db_password}
            placeholder="••••••••" hint="Encrypted before storage."
            onChange={(e) => set("db_password", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function StepSubscription({ form, set }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
  );
}

function StepModules({ form, set }) {
  const modules = [
    { key: "employee", label: "Employee", desc: "Employee directory & profiles",   icon: "👤" },
    { key: "hrms",     label: "HRMS",     desc: "HR management system",            icon: "🏢" },
    { key: "assets",   label: "Assets",   desc: "Asset tracking & management",     icon: "📦" },
    { key: "billing",  label: "Billing",  desc: "Invoicing & payments",            icon: "💳" },
    { key: "workflow", label: "Workflow", desc: "Approval workflows & automation", icon: "⚡" },
    { key: "reports",  label: "Reports",  desc: "Analytics & reporting",           icon: "📊" },
  ];
  return (
    <div>
      <p className="text-xs t-muted mb-4">Select which modules this tenant will have access to.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {modules.map((m) => (
          <div
            key={m.key}
            className="flex items-center justify-between p-4 rounded-xl transition-all"
            style={{
              backgroundColor: form.modules[m.key] ? "rgba(0,174,236,0.06)" : "var(--c-surface2)",
              border: form.modules[m.key] ? "1px solid rgba(0,174,236,0.25)" : "1px solid var(--c-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{m.icon}</span>
              <div>
                <p className="text-sm font-semibold t-heading">{m.label}</p>
                <p className="text-xs t-muted">{m.desc}</p>
              </div>
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
