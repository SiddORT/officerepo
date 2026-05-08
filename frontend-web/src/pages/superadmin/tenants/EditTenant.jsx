import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import PhoneInput from "../../../components/ui/PhoneInput";
import Toggle from "../../../components/ui/Toggle";

const TIMEZONE_OPTIONS = [
  { value: "UTC",                  label: "UTC" },
  { value: "Asia/Kolkata",         label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai",           label: "Asia/Dubai (GST)" },
  { value: "America/New_York",     label: "America/New_York (EST)" },
  { value: "America/Los_Angeles",  label: "America/Los_Angeles (PST)" },
  { value: "Europe/London",        label: "Europe/London (GMT)" },
  { value: "Europe/Paris",         label: "Europe/Paris (CET)" },
];

const PLAN_OPTIONS = [
  { value: "Starter",    label: "Starter" },
  { value: "Growth",     label: "Growth" },
  { value: "Enterprise", label: "Enterprise" },
];

const MODULE_LIST = [
  { key: "employee", label: "Employee", desc: "Employee directory & profiles",   icon: "👤" },
  { key: "hrms",     label: "HRMS",     desc: "HR management system",            icon: "🏢" },
  { key: "assets",   label: "Assets",   desc: "Asset tracking & management",     icon: "📦" },
  { key: "billing",  label: "Billing",  desc: "Invoicing & payments",            icon: "💳" },
  { key: "workflow", label: "Workflow", desc: "Approval workflows & automation", icon: "⚡" },
  { key: "reports",  label: "Reports",  desc: "Analytics & reporting",           icon: "📊" },
];

const SECTIONS = [
  { label: "Basic Info",    desc: "Name, email, contact",      icon: "🏢" },
  { label: "Domain",        desc: "Subdomain & custom domain", icon: "🌐" },
  { label: "Database",      desc: "DB connection details",     icon: "🗄️" },
  { label: "Subscription",  desc: "Plan & limits",             icon: "💳" },
  { label: "Modules",       desc: "Feature access",            icon: "⚡" },
];

export default function EditTenant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);    // which section is saving
  const [savedSection, setSavedSection] = useState(null);
  const [errors, setErrors] = useState({});
  const [sectionErrors, setSectionErrors] = useState({});
  const [activeSection, setActiveSection] = useState(0);
  const [tenantName, setTenantName] = useState("");

  const [form, setForm] = useState({
    // Basic info
    tenant_name: "", tenant_code: "",
    company_email: "", contact_dial: "+91", contact_number: "",
    company_website: "", timezone: "UTC", region: "",
    // Domain
    subdomain: "", custom_domain: "",
    // Database
    db_name: "", db_host: "", db_port: "5432", db_username: "", db_password: "",
    // Subscription
    plan_name: "Starter", trial_start: "", trial_end: "",
    user_limit: "25", storage_limit: "1024",
    // Modules
    modules: { employee: false, hrms: false, assets: false, billing: false, workflow: false, reports: false },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await tenantMgmtApi.getById(id);
        const t = res.data?.data ?? res.data;
        setTenantName(t.tenant_name || "");

        // Parse phone number into dial code + number
        let dialCode = "+91", number = "";
        if (t.contact_number) {
          const match = t.contact_number.match(/^(\+\d{1,4})\s?(.*)/);
          if (match) { dialCode = match[1]; number = match[2].trim(); }
          else { number = t.contact_number; }
        }

        // Modules map
        const modulesMap = { employee: false, hrms: false, assets: false, billing: false, workflow: false, reports: false };
        (t.modules || []).forEach((m) => { if (m.module in modulesMap) modulesMap[m.module] = m.is_enabled; });

        const domain = t.domains?.[0] || {};
        const db = t.db_connection || {};
        const sub = t.subscription || {};

        setForm({
          tenant_name: t.tenant_name || "",
          tenant_code: t.tenant_code || "",
          company_email: t.company_email || "",
          contact_dial: dialCode,
          contact_number: number,
          company_website: t.company_website || "",
          timezone: t.timezone || "UTC",
          region: t.region || "",
          subdomain: domain.subdomain || "",
          custom_domain: domain.custom_domain || "",
          db_name: db.db_name || "",
          db_host: db.db_host || "",
          db_port: String(db.db_port || 5432),
          db_username: db.db_username || "",
          db_password: "",
          plan_name: sub.plan_name || "Starter",
          trial_start: sub.trial_start ? sub.trial_start.split("T")[0] : "",
          trial_end:   sub.trial_end   ? sub.trial_end.split("T")[0]   : "",
          user_limit: String(sub.user_limit || 25),
          storage_limit: String(sub.storage_limit || 1024),
          modules: modulesMap,
        });
      } catch (e) {
        setSectionErrors({ global: e.response?.data?.detail || "Failed to load tenant." });
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

  const flashSaved = (key) => {
    setSavedSection(key);
    setTimeout(() => setSavedSection(null), 2500);
  };

  const validateSection = (sectionIdx) => {
    const errs = {};
    if (sectionIdx === 0) {
      if (!form.tenant_name.trim()) errs.tenant_name = "Tenant name is required.";
      if (!form.company_email.trim()) errs.company_email = "Company email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.company_email)) errs.company_email = "Enter a valid email.";
      if (form.contact_number && !/^[0-9\s\-().]{5,18}$/.test(form.contact_number))
        errs.contact_number = "Enter a valid phone number.";
      if (form.company_website && !/^(https?:\/\/)?([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}/.test(form.company_website))
        errs.company_website = "Enter a valid URL.";
    }
    if (sectionIdx === 1) {
      if (form.subdomain && !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?$/.test(form.subdomain))
        errs.subdomain = "Must be lowercase letters, digits, or hyphens.";
    }
    if (sectionIdx === 2) {
      const hasAny = form.db_name || form.db_host || form.db_username || form.db_password;
      if (hasAny) {
        if (!form.db_name.trim()) errs.db_name = "DB name required.";
        if (!form.db_host.trim()) errs.db_host = "DB host required.";
        if (!form.db_username.trim()) errs.db_username = "DB username required.";
        const port = Number(form.db_port);
        if (!port || port < 1 || port > 65535) errs.db_port = "Enter a valid port (1–65535).";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveSection = async (sectionIdx) => {
    if (!validateSection(sectionIdx)) return;
    const key = SECTIONS[sectionIdx].label;
    setSaving(key);
    setSectionErrors((p) => { const n = { ...p }; delete n[key]; return n; });

    try {
      const contactFull = form.contact_number ? `${form.contact_dial} ${form.contact_number.trim()}` : null;

      if (sectionIdx === 0) {
        await tenantMgmtApi.update(id, {
          tenant_name: form.tenant_name.trim(),
          company_email: form.company_email.trim().toLowerCase(),
          contact_number: contactFull,
          company_website: form.company_website || null,
          timezone: form.timezone,
          region: form.region || null,
        });
        setTenantName(form.tenant_name.trim());
      } else if (sectionIdx === 1) {
        if (form.subdomain) {
          await tenantMgmtApi.saveDomainStep(id, {
            subdomain: form.subdomain.trim(),
            custom_domain: form.custom_domain || null,
          });
        }
      } else if (sectionIdx === 2) {
        await tenantMgmtApi.saveDatabaseStep(id, {
          db_name: form.db_name || null,
          db_host: form.db_host || null,
          db_port: Number(form.db_port) || 5432,
          db_username: form.db_username || null,
          db_password: form.db_password || null,
        });
      } else if (sectionIdx === 3) {
        await tenantMgmtApi.saveSubscriptionStep(id, {
          plan_name: form.plan_name,
          trial_start: form.trial_start || null,
          trial_end:   form.trial_end   || null,
          user_limit: Number(form.user_limit) || 25,
          storage_limit: Number(form.storage_limit) || 1024,
        });
      } else if (sectionIdx === 4) {
        await tenantMgmtApi.saveModulesStep(id, form.modules);
      }

      flashSaved(key);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setSectionErrors((p) => ({ ...p, [key]: typeof detail === "string" ? detail : "Save failed." }));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="flex items-center gap-2 t-muted text-sm">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading tenant...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">

      {/* ── Left panel — section nav ─────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 240,
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          padding: "28px 20px",
        }}
      >
        <button
          onClick={() => navigate(`/superadmin/tenants/${id}`)}
          className="flex items-center gap-2 mb-6 text-xs t-muted rounded-lg px-2 py-1 transition-all w-fit"
          style={{ opacity: 0.75 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0.75"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          View Tenant
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="inline-block w-0.5 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #8b5cf6)" }} />
            <h1 className="text-base font-bold t-heading leading-snug">Edit Tenant</h1>
          </div>
          <p className="text-xs t-muted ml-2">Save each section independently.</p>
          {tenantName && (
            <p
              className="text-xs font-medium mt-1.5 ml-2 truncate"
              style={{ color: "var(--c-accent)" }}
            >
              {tenantName}
            </p>
          )}
        </div>

        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s, i) => {
            const isActive = activeSection === i;
            const isSaved  = savedSection === s.label;
            return (
              <button
                key={s.label}
                onClick={() => setActiveSection(i)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all w-full"
                style={{
                  background: isActive ? "rgba(0,174,236,0.10)" : "transparent",
                  border: isActive ? "1px solid rgba(0,174,236,0.22)" : "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(0,174,236,0.05)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <span className="text-base flex-shrink-0">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium leading-tight"
                    style={isActive
                      ? { background: "linear-gradient(135deg,#00aeec,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }
                      : { color: "var(--c-text2)" }}
                  >
                    {s.label}
                  </p>
                  <p className="text-[10px] t-muted truncate">{s.desc}</p>
                </div>
                {isSaved && (
                  <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: "#10b981" }}>✓</span>
                )}
                {sectionErrors[s.label] && (
                  <span className="text-[10px] flex-shrink-0" style={{ color: "#ef4444" }}>!</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Right panel — section form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <div className="flex-1 p-8">

          {/* Global error */}
          {sectionErrors.global && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm text-red-400"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {sectionErrors.global}
            </div>
          )}

          {/* Section heading */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <span
                className="inline-block w-0.5 h-5 rounded-full"
                style={{ background: "linear-gradient(to bottom, #00aeec, #8b5cf6)" }}
              />
              <span className="text-xl">{SECTIONS[activeSection].icon}</span>
              <h2 className="text-xl font-bold t-heading">{SECTIONS[activeSection].label}</h2>
              {savedSection === SECTIONS[activeSection].label && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.22)" }}
                >
                  ✓ Saved
                </span>
              )}
            </div>
            <p className="text-sm t-muted ml-8">{SECTIONS[activeSection].desc}</p>
          </div>

          {/* Section error */}
          {sectionErrors[SECTIONS[activeSection].label] && (
            <div className="mb-5 rounded-lg px-4 py-3 text-sm text-red-400"
              style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {sectionErrors[SECTIONS[activeSection].label]}
            </div>
          )}

          {/* Form card */}
          <div
            className="rounded-xl"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
              overflow: "hidden",
            }}
          >
            <div style={{ height: 3, background: "linear-gradient(90deg, #00aeec, #8b5cf6)" }} />
            <div className="p-6">
              {activeSection === 0 && (
                <SectionBasicInfo form={form} set={set} errors={errors} />
              )}
              {activeSection === 1 && (
                <SectionDomain form={form} set={set} errors={errors} />
              )}
              {activeSection === 2 && (
                <SectionDatabase form={form} set={set} errors={errors} />
              )}
              {activeSection === 3 && (
                <SectionSubscription form={form} set={set} />
              )}
              {activeSection === 4 && (
                <SectionModules form={form} set={set} />
              )}
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div
          className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--c-border)", background: "var(--c-surface)" }}
        >
          <button
            onClick={() => navigate(`/superadmin/tenants/${id}`)}
            className="btn-secondary"
          >
            ← Back to View
          </button>

          <div className="flex items-center gap-3">
            {activeSection > 0 && (
              <button
                onClick={() => setActiveSection((s) => s - 1)}
                className="btn-secondary text-sm"
                disabled={!!saving}
              >
                ← Prev
              </button>
            )}
            <button
              onClick={() => saveSection(activeSection)}
              disabled={!!saving}
              className="btn-primary min-w-[160px] flex items-center justify-center gap-2"
            >
              {saving === SECTIONS[activeSection].label ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${SECTIONS[activeSection].label}`
              )}
            </button>
            {activeSection < SECTIONS.length - 1 && (
              <button
                onClick={() => setActiveSection((s) => s + 1)}
                className="btn-secondary text-sm"
                disabled={!!saving}
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Section form components ──────────────────────────────────────────────── */

function SectionBasicInfo({ form, set, errors }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Input label="Tenant Name" required value={form.tenant_name} error={errors.tenant_name}
        placeholder="Acme Corporation"
        onChange={(e) => set("tenant_name", e.target.value)} />
      <Input label="Tenant Code" value={form.tenant_code} disabled
        hint="Tenant code cannot be changed."
        onChange={() => {}} />
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

function SectionDomain({ form, set, errors }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <Input label="Subdomain" value={form.subdomain} error={errors.subdomain}
        placeholder="acme" hint="e.g. acme → acme.officerepo.io"
        onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
      <Input label="Custom Domain" value={form.custom_domain}
        placeholder="app.acmecorp.com" hint="Optional. Point CNAME to our servers."
        onChange={(e) => set("custom_domain", e.target.value)} />
    </div>
  );
}

function SectionDatabase({ form, set, errors }) {
  return (
    <div className="space-y-1">
      <p className="text-xs t-muted mb-4">Leave password blank to keep the existing one.</p>
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
            placeholder="Leave blank to keep existing" hint="Encrypted before storage."
            onChange={(e) => set("db_password", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

function SectionSubscription({ form, set }) {
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

function SectionModules({ form, set }) {
  return (
    <div>
      <p className="text-xs t-muted mb-4">
        Enable or disable modules for this tenant.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODULE_LIST.map((m) => {
          const isOn = !!form.modules[m.key];
          return (
            <div
              key={m.key}
              className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{
                backgroundColor: isOn ? "rgba(0,174,236,0.06)" : "var(--c-surface2)",
                border: isOn ? "1px solid rgba(0,174,236,0.25)" : "1px solid var(--c-border)",
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
                checked={isOn}
                onChange={(v) => set("modules", { ...form.modules, [m.key]: v })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
