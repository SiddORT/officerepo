import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";

const TABS = ["Overview", "Modules", "Database", "Subscription", "Branding", "Activity Logs"];

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
    try {
      await tenantMgmtApi.suspend(id);
      fetchTenant();
    } catch (e) { alert(e.response?.data?.detail || "Failed."); }
    finally { setActionLoading(false); }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await tenantMgmtApi.activate(id);
      fetchTenant();
    } catch (e) { alert(e.response?.data?.detail || "Failed."); }
    finally { setActionLoading(false); }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onBack={() => navigate("/superadmin/tenants")} />;
  if (!tenant) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/superadmin/tenants")} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white">{tenant.tenant_name}</h1>
              <Badge status={tenant.status} />
            </div>
            <code className="text-xs text-gray-500">{tenant.tenant_code}</code>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate(`/superadmin/tenants/${id}/edit`)} className="btn-secondary">
            Edit
          </button>
          {tenant.status === "suspended" ? (
            <button onClick={handleActivate} disabled={actionLoading} className="btn-primary">
              Activate
            </button>
          ) : (
            <button onClick={handleSuspend} disabled={actionLoading} className="btn-danger">
              Suspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex gap-0 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={[
                "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === i
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-300",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      <div>
        {tab === 0 && <OverviewTab tenant={tenant} />}
        {tab === 1 && <ModulesTab modules={tenant.modules} tenantId={id} onRefresh={fetchTenant} />}
        {tab === 2 && <DatabaseTab db={tenant.db_connection} />}
        {tab === 3 && <SubscriptionTab sub={tenant.subscription} />}
        {tab === 4 && <BrandingTab branding={tenant.branding} />}
        {tab === 5 && <ActivityTab logs={tenant.activity_logs} />}
      </div>
    </div>
  );
}

/* ── Tab panels ──────────────────────────────────────────────────────────────── */

function OverviewTab({ tenant }) {
  const fields = [
    { label: "Tenant Name", value: tenant.tenant_name },
    { label: "Tenant Code", value: <code className="text-xs bg-gray-800 px-1.5 py-0.5 rounded">{tenant.tenant_code}</code> },
    { label: "Company Email", value: tenant.company_email },
    { label: "Contact Number", value: tenant.contact_number },
    { label: "Company Website", value: tenant.company_website ? (
      <a href={tenant.company_website} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
        {tenant.company_website}
      </a>) : null },
    { label: "Timezone", value: tenant.timezone },
    { label: "Region", value: tenant.region },
    { label: "Status", value: <Badge status={tenant.status} /> },
    { label: "Created", value: tenant.created_at ? new Date(tenant.created_at).toLocaleString() : "—" },
  ];

  const domain = tenant.domains?.[0];

  return (
    <div className="space-y-6">
      <Card title="Company Details">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-gray-500 mb-0.5">{f.label}</dt>
              <dd className="text-sm text-gray-200">{f.value || <span className="text-gray-600">—</span>}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {domain && (
        <Card title="Domain">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Subdomain" value={domain.subdomain} />
            <InfoRow label="Custom Domain" value={domain.custom_domain} />
          </dl>
        </Card>
      )}
    </div>
  );
}

function ModulesTab({ modules, tenantId, onRefresh }) {
  const moduleList = [
    { key: "employee", label: "Employee", desc: "Employee directory & profiles" },
    { key: "hrms", label: "HRMS", desc: "HR management system" },
    { key: "assets", label: "Assets", desc: "Asset tracking & management" },
    { key: "billing", label: "Billing", desc: "Invoicing & payments" },
    { key: "workflow", label: "Workflow", desc: "Approval workflows & automation" },
    { key: "reports", label: "Reports", desc: "Analytics & reporting" },
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
    } catch { setLocalModules((prev) => ({ ...prev, [key]: !val })); }
    finally { setSaving(null); }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {moduleList.map((m) => (
        <div key={m.key} className="flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-700/40">
          <div>
            <p className="text-sm font-medium text-gray-200">{m.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
          </div>
          <Toggle
            checked={!!localModules[m.key]}
            onChange={(v) => toggleModule(m.key, v)}
            disabled={saving === m.key}
          />
        </div>
      ))}
    </div>
  );
}

function DatabaseTab({ db }) {
  if (!db) return <Empty message="No database configured yet." />;
  return (
    <Card title="Database Connection">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow label="Database Name" value={db.db_name} />
        <InfoRow label="Host" value={db.db_host} />
        <InfoRow label="Port" value={db.db_port} />
        <InfoRow label="Username" value={db.db_username} />
        <InfoRow label="Password" value="••••••••" />
        <InfoRow label="Status" value={<Badge status={db.db_status || "unknown"} label={db.db_status || "Unknown"} />} />
        <InfoRow label="Active" value={db.is_active ? "Yes" : "No"} />
        <InfoRow label="Configured" value={db.created_at ? new Date(db.created_at).toLocaleString() : "—"} />
      </dl>
    </Card>
  );
}

function SubscriptionTab({ sub }) {
  if (!sub) return <Empty message="No subscription assigned yet." />;
  return (
    <Card title="Subscription">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoRow label="Plan" value={sub.plan_name} />
        <InfoRow label="Status" value={<Badge status={sub.status} />} />
        <InfoRow label="User Limit" value={sub.user_limit ? `${sub.user_limit} users` : "—"} />
        <InfoRow label="Storage Limit" value={sub.storage_limit ? `${sub.storage_limit} MB` : "—"} />
        <InfoRow label="Trial Start" value={sub.trial_start ? new Date(sub.trial_start).toLocaleDateString() : "—"} />
        <InfoRow label="Trial End" value={sub.trial_end ? new Date(sub.trial_end).toLocaleDateString() : "—"} />
        <InfoRow label="Created" value={sub.created_at ? new Date(sub.created_at).toLocaleString() : "—"} />
      </dl>
    </Card>
  );
}

function BrandingTab({ branding }) {
  if (!branding) return <Empty message="No branding configured." />;
  return (
    <Card title="Branding">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg border border-gray-700" style={{ backgroundColor: branding.primary_color || "#6366f1" }} />
          <div>
            <p className="text-xs text-gray-500">Primary Color</p>
            <p className="text-sm text-gray-200 font-mono">{branding.primary_color || "—"}</p>
          </div>
        </div>
        <InfoRow label="Theme Mode" value={branding.theme_mode || "—"} />
        <InfoRow label="Logo" value={branding.logo_path || <span className="text-gray-600">Not uploaded</span>} />
        <InfoRow label="Favicon" value={branding.favicon_path || <span className="text-gray-600">Not uploaded</span>} />
      </div>
    </Card>
  );
}

function ActivityTab({ logs }) {
  if (!logs?.length) return <Empty message="No activity recorded yet." />;
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-200">{log.action}</span>
              {log.performed_by && (
                <span className="text-xs text-gray-500">by {log.performed_by}</span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Reusable inner components ───────────────────────────────────────────────── */

function Card({ title, children }) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/40 rounded-xl p-5">
      {title && <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-200">{value || <span className="text-gray-600">—</span>}</dd>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="py-12 text-center text-gray-600 text-sm">{message}</div>
  );
}

function LoadingState() {
  return (
    <div className="p-6 flex items-center justify-center">
      <div className="flex items-center gap-2 text-gray-500">
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
    <div className="p-6 text-center space-y-3">
      <p className="text-red-400">{message}</p>
      <button onClick={onBack} className="btn-secondary">← Back to list</button>
    </div>
  );
}
