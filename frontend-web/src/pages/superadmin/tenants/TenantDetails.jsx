import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";

const TABS = [
  { label: "Overview",      icon: "🏢" },
  { label: "Modules",       icon: "⚡" },
  { label: "Database",      icon: "🗄️" },
  { label: "Subscription",  icon: "💳" },
  { label: "Branding",      icon: "🎨" },
  { label: "Activity",      icon: "📋" },
];

export default function TenantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      const res = await tenantMgmtApi.getById(id);
      setTenant(res.data?.data ?? res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load tenant.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenant(); }, [id]);

  const handleSuspend = async () => {
    if (!window.confirm("Suspend this tenant? They will lose access to all modules.")) return;
    setActionLoading(true);
    try { await tenantMgmtApi.suspend(id); fetchTenant(); }
    catch (e) { alert(e.response?.data?.detail || "Failed."); }
    finally { setActionLoading(false); }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try { await tenantMgmtApi.activate(id); fetchTenant(); }
    catch (e) { alert(e.response?.data?.detail || "Failed."); }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onBack={() => navigate("/superadmin/tenants")} />;
  if (!tenant) return null;

  const pct = tenant.profile_completion ?? 0;
  const isComplete = pct === 100;

  return (
    <div className="p-6 space-y-5">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/superadmin/tenants")}
            className="topbar-btn flex-shrink-0"
            title="Back to Tenant List"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-0.5">
              <span
                className="inline-block w-0.5 h-5 rounded-full flex-shrink-0"
                style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }}
              />
              <h1 className="text-2xl font-bold t-heading">{tenant.tenant_name}</h1>
              <Badge status={tenant.status} />
            </div>
            <div className="flex items-center gap-3 ml-2.5">
              <code
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ backgroundColor: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}
              >
                {tenant.tenant_code}
              </code>
              {tenant.domains?.[0]?.subdomain && (
                <span className="text-xs t-muted">{tenant.domains[0].subdomain}.officerepo.io</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate(`/superadmin/tenants/${id}/edit`)} className="btn-secondary">
            Edit Tenant
          </button>
          {tenant.status === "suspended" ? (
            <button onClick={handleActivate} disabled={actionLoading} className="btn-primary">
              {actionLoading ? "Activating..." : "Activate"}
            </button>
          ) : (
            <button onClick={handleSuspend} disabled={actionLoading} className="btn-danger">
              {actionLoading ? "Suspending..." : "Suspend"}
            </button>
          )}
        </div>
      </div>

      {/* ── Profile completion strip ─────────────────────────────────── */}
      <div
        className="rounded-xl px-5 py-4 flex flex-wrap items-center gap-5"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
      >
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold t-muted uppercase tracking-wide">Profile Completion</span>
            <span
              className="text-sm font-bold"
              style={{ color: isComplete ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }}
            >
              {pct}% — {isComplete ? "Complete" : "Incomplete"}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--c-surface2)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isComplete
                  ? "#10b981"
                  : pct >= 60
                  ? "linear-gradient(90deg, #f59e0b, #fb923c)"
                  : "linear-gradient(90deg, #00aeec, #ff7a1a)",
              }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {tenant.completion_breakdown && Object.entries(tenant.completion_breakdown).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${v ? "bg-emerald-400" : "bg-red-400/60"}`} />
              <span className="text-xs t-muted capitalize">{k.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
      >
        {/* Tab bar */}
        <div style={{ borderBottom: "1px solid var(--c-border)" }}>
          <nav className="flex overflow-x-auto">
            {TABS.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setTab(i)}
                className="relative px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5"
                style={
                  tab === i
                    ? { color: "var(--c-accent)" }
                    : { color: "var(--c-muted)" }
                }
                onMouseEnter={(e) => { if (tab !== i) e.currentTarget.style.color = "var(--c-text2)"; }}
                onMouseLeave={(e) => { if (tab !== i) e.currentTarget.style.color = "var(--c-muted)"; }}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
                {/* Active gradient underline */}
                {tab === i && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                    style={{ background: "linear-gradient(90deg, #00aeec, #ff7a1a)" }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {tab === 0 && <OverviewTab tenant={tenant} />}
          {tab === 1 && <ModulesTab modules={tenant.modules} tenantId={id} onRefresh={fetchTenant} />}
          {tab === 2 && <DatabaseTab db={tenant.db_connection} />}
          {tab === 3 && <SubscriptionTab sub={tenant.subscription} />}
          {tab === 4 && <BrandingTab branding={tenant.branding} />}
          {tab === 5 && <ActivityTab logs={tenant.activity_logs} />}
        </div>
      </div>
    </div>
  );
}

/* ── Tab panels ───────────────────────────────────────────────────────────── */

function OverviewTab({ tenant }) {
  const domain = tenant.domains?.[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Company Details */}
        <SectionCard title="Company Details" icon="🏢">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Tenant Name"     value={tenant.tenant_name} />
            <InfoRow label="Tenant Code"     value={
              <code className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ backgroundColor: "var(--c-surface)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>
                {tenant.tenant_code}
              </code>
            } />
            <InfoRow label="Company Email"   value={tenant.company_email} />
            <InfoRow label="Contact Number"  value={tenant.contact_number} />
            <InfoRow label="Company Website" value={
              tenant.company_website
                ? <a href={tenant.company_website} target="_blank" rel="noopener noreferrer"
                    className="hover:underline" style={{ color: "var(--c-accent)" }}>
                    {tenant.company_website}
                  </a>
                : null
            } />
            <InfoRow label="Timezone"  value={tenant.timezone} />
            <InfoRow label="Region"    value={tenant.region} />
            <InfoRow label="Created"   value={tenant.created_at ? new Date(tenant.created_at).toLocaleString() : null} />
          </div>
        </SectionCard>

        {/* Domain & Subscription summary */}
        <div className="space-y-4">
          {domain ? (
            <SectionCard title="Domain" icon="🌐">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Subdomain"     value={domain.subdomain ? `${domain.subdomain}.officerepo.io` : null} />
                <InfoRow label="Custom Domain" value={domain.custom_domain} />
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Domain" icon="🌐">
              <Placeholder message="No domain configured." />
            </SectionCard>
          )}

          {tenant.subscription ? (
            <SectionCard title="Subscription" icon="💳">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Plan"        value={tenant.subscription.plan_name} />
                <InfoRow label="Status"      value={<Badge status={tenant.subscription.status} />} />
                <InfoRow label="User Limit"  value={tenant.subscription.user_limit ? `${tenant.subscription.user_limit} users` : null} />
                <InfoRow label="Storage"     value={tenant.subscription.storage_limit ? `${tenant.subscription.storage_limit} MB` : null} />
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Subscription" icon="💳">
              <Placeholder message="No subscription assigned." />
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function ModulesTab({ modules, tenantId, onRefresh }) {
  const moduleList = [
    { key: "employee", label: "Employee", desc: "Employee directory & profiles",   icon: "👤" },
    { key: "hrms",     label: "HRMS",     desc: "HR management system",            icon: "🏢" },
    { key: "assets",   label: "Assets",   desc: "Asset tracking & management",     icon: "📦" },
    { key: "billing",  label: "Billing",  desc: "Invoicing & payments",            icon: "💳" },
    { key: "workflow", label: "Workflow", desc: "Approval workflows & automation", icon: "⚡" },
    { key: "reports",  label: "Reports",  desc: "Analytics & reporting",           icon: "📊" },
  ];

  const [localModules, setLocalModules] = useState(() => {
    const map = {};
    (modules || []).forEach((m) => { map[m.module] = m.is_enabled; });
    return map;
  });
  const [saving, setSaving] = useState(null);

  const toggleModule = async (key, val) => {
    setLocalModules((prev) => ({ ...prev, [key]: val }));
    setSaving(key);
    try {
      await tenantMgmtApi.toggleModule(tenantId, key, val);
    } catch {
      setLocalModules((prev) => ({ ...prev, [key]: !val }));
    } finally {
      setSaving(null);
    }
  };

  const enabledCount = Object.values(localModules).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <p className="text-xs t-muted">
        {enabledCount} of {moduleList.length} modules enabled. Toggle to grant or revoke tenant access.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {moduleList.map((m) => {
          const isOn = !!localModules[m.key];
          return (
            <div
              key={m.key}
              className="flex items-center justify-between p-4 rounded-xl transition-all"
              style={{
                backgroundColor: isOn ? "rgba(0,174,236,0.06)" : "var(--c-surface2)",
                border: isOn ? "1px solid rgba(0,174,236,0.22)" : "1px solid var(--c-border)",
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
                onChange={(v) => toggleModule(m.key, v)}
                disabled={saving === m.key}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DatabaseTab({ db }) {
  if (!db) return <Placeholder icon="🗄️" message="No database configured for this tenant." />;
  return (
    <SectionCard title="Database Connection" icon="🗄️">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow label="Database Name" value={db.db_name} />
        <InfoRow label="Host"          value={db.db_host} />
        <InfoRow label="Port"          value={db.db_port} />
        <InfoRow label="Username"      value={db.db_username} />
        <InfoRow label="Password"      value="••••••••" />
        <InfoRow label="Status"        value={<Badge status={db.db_status || "unknown"} label={db.db_status || "Unknown"} />} />
        <InfoRow label="Active"        value={db.is_active ? "Yes" : "No"} />
        <InfoRow label="Configured At" value={db.created_at ? new Date(db.created_at).toLocaleString() : null} />
      </div>
    </SectionCard>
  );
}

function SubscriptionTab({ sub }) {
  if (!sub) return <Placeholder icon="💳" message="No subscription assigned to this tenant." />;
  return (
    <SectionCard title="Subscription Details" icon="💳">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow label="Plan"          value={sub.plan_name} />
        <InfoRow label="Status"        value={<Badge status={sub.status} />} />
        <InfoRow label="User Limit"    value={sub.user_limit    ? `${sub.user_limit} users`      : null} />
        <InfoRow label="Storage Limit" value={sub.storage_limit ? `${sub.storage_limit} MB`      : null} />
        <InfoRow label="Trial Start"   value={sub.trial_start   ? new Date(sub.trial_start).toLocaleDateString() : null} />
        <InfoRow label="Trial End"     value={sub.trial_end     ? new Date(sub.trial_end).toLocaleDateString()   : null} />
        <InfoRow label="Created"       value={sub.created_at    ? new Date(sub.created_at).toLocaleString()      : null} />
      </div>
    </SectionCard>
  );
}

function BrandingTab({ branding }) {
  if (!branding) return <Placeholder icon="🎨" message="No branding configured." />;
  return (
    <SectionCard title="Branding & Theme" icon="🎨">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs t-muted mb-1.5">Primary Color</p>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg border"
              style={{ backgroundColor: branding.primary_color || "#00aeec", borderColor: "var(--c-border)" }}
            />
            <span className="text-sm font-mono t-body">{branding.primary_color || "—"}</span>
          </div>
        </div>
        <InfoRow label="Theme Mode" value={branding.theme_mode || null} />
        <InfoRow label="Logo"    value={branding.logo_path    || null} />
        <InfoRow label="Favicon" value={branding.favicon_path || null} />
      </div>
    </SectionCard>
  );
}

function ActivityTab({ logs }) {
  if (!logs?.length) return <Placeholder icon="📋" message="No activity recorded yet." />;
  return (
    <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 rounded-lg"
          style={{ backgroundColor: "var(--c-surface2)", border: "1px solid var(--c-border)" }}
        >
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00aeec, #ff7a1a)" }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium t-heading">{log.action}</span>
              <span className="text-xs t-muted">{new Date(log.created_at).toLocaleString()}</span>
            </div>
            {log.performed_by && (
              <p className="text-xs t-muted mt-0.5">by {log.performed_by}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Shared inner components ───────────────────────────────────────────────── */

function SectionCard({ title, icon, children }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--c-surface2)",
        border: "1px solid var(--c-border)",
        position: "relative",
      }}
    >
      {/* Gradient top accent */}
      <div
        style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, #00aeec, #ff7a1a)",
        }}
      />
      <div className="p-5 pt-6">
        {title && (
          <h3 className="text-sm font-semibold t-heading flex items-center gap-2 mb-4">
            {icon && <span>{icon}</span>}
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs t-muted mb-0.5">{label}</dt>
      <dd className="text-sm t-body break-all">{value || <span className="t-muted">—</span>}</dd>
    </div>
  );
}

function Placeholder({ icon, message }) {
  return (
    <div className="py-14 flex flex-col items-center gap-3">
      {icon && <span className="text-4xl opacity-40">{icon}</span>}
      <p className="text-sm t-muted">{message}</p>
    </div>
  );
}

function LoadingState() {
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

function ErrorState({ message, onBack }) {
  return (
    <div className="p-12 text-center space-y-4">
      <p className="text-red-400 text-sm">{message}</p>
      <button onClick={onBack} className="btn-secondary">← Back to list</button>
    </div>
  );
}
