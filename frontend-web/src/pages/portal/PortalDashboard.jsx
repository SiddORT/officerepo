import React from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";

const MODULES = [
  {
    key: "user_management",
    name: "User Management",
    icon: "👤",
    desc: "Users, roles, sessions & audit logs",
    soon: false,
    path: "user-management/users",
    accent: "#00aeec",
  },
  { name: "HR & People",  icon: "👥", desc: "Employees, attendance, leave management", soon: true },
  { name: "Finance",      icon: "💰", desc: "Invoices, expenses, payroll", soon: true },
  { name: "Projects",     icon: "📋", desc: "Tasks, milestones, timelines", soon: true },
  { name: "Documents",    icon: "📄", desc: "File storage, shared folders", soon: true },
  { name: "Helpdesk",     icon: "🎧", desc: "Tickets, support queues", soon: true },
  { name: "Inventory",    icon: "📦", desc: "Stock, assets, procurement", soon: true },
];

const STATS = [
  { label: "Team Members", value: "—", icon: "👤" },
  { label: "Open Tasks",   value: "—", icon: "✅" },
  { label: "Documents",    value: "—", icon: "📁" },
  { label: "This Month",   value: "—", icon: "📅" },
];

export default function PortalDashboard() {
  const { subdomain } = useParams();
  const { user } = usePortalAuth();
  const workspaceName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome */}
      <div className="rounded-2xl p-6" style={{
        background: "linear-gradient(135deg, rgba(0,174,236,0.08) 0%, rgba(255,122,26,0.06) 100%)",
        border: "1px solid rgba(0,174,236,0.15)",
      }}>
        <div className="flex items-center gap-3 mb-1">
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #00aeec, #ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>
              Welcome, {user?.name?.split(" ")[0]}
            </h1>
            <p className="text-xs" style={{ color: "var(--c-muted)" }}>
              {workspaceName} Workspace · Office Repo
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--c-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Modules */}
      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--c-heading)" }}>Workspace Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((mod) =>
            mod.soon ? (
              <div key={mod.name}
                className="rounded-xl p-4 flex items-start gap-3 cursor-not-allowed"
                style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", opacity: 0.65 }}>
                <span className="text-2xl">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>{mod.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(100,116,139,0.15)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      Coming soon
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--c-muted)" }}>{mod.desc}</p>
                </div>
              </div>
            ) : (
              <Link key={mod.key} to={`/portal/${subdomain}/${mod.path}`}
                className="rounded-xl p-4 flex items-start gap-3 transition-all group"
                style={{
                  background: "var(--c-surface)",
                  border: `1px solid rgba(0,174,236,0.25)`,
                  textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(0,174,236,0.06)",
                }}>
                <span className="text-2xl group-hover:scale-110 transition-transform">{mod.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--c-accent)" }}>{mod.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "rgba(0,174,236,0.1)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)" }}>
                      Active
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--c-muted)" }}>{mod.desc}</p>
                </div>
                <svg className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  style={{ color: "var(--c-accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Dev notice */}
      {!import.meta.env.VITE_BASE_DOMAIN && (
        <div className="rounded-xl px-4 py-3 text-xs" style={{
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
          color: "var(--c-muted)",
        }}>
          <span style={{ color: "#818cf8" }} className="font-medium">Dev mode</span> — running at{" "}
          <code className="font-mono">{window.location.origin}/portal/{subdomain}</code>.{" "}
          Set <code className="font-mono">VITE_BASE_DOMAIN=officerepo.com</code> in production for real subdomain routing.
        </div>
      )}
    </div>
  );
}
