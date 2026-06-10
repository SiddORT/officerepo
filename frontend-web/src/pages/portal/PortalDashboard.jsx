import React from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";

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
