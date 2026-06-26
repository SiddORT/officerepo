import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import Badge from "../shared/Badge";

const STATUS_COLOR = {
  "Preboarding":           "#6366f1",
  "Onboarding In Progress":"var(--c-accent)",
  "Ready For Activation":  "#f59e0b",
  "Completed":             "#22c55e",
  "On Hold":               "#6b7280",
  "Cancelled":             "#ef4444",
  "Deferred":              "#9ca3af",
};

export default function OnboardingDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate   = useNavigate();
  const base       = `/portal/${subdomain}/hrms/onboarding`;

  const [data, setData]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalOnboardingApi.dashboard(subdomain, token)
      .then(r => setData(r.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const go = path => navigate(`${base}${path}`);

  const QUICK = [
    { label: "All Onboardings",   icon: "📋", path: "/list",         desc: "View and manage all onboarding records" },
    { label: "Start Onboarding",  icon: "▶️",  path: "/start",        desc: "Kick off onboarding for a new hire" },
    { label: "Templates",         icon: "📄", path: "/templates",    desc: "Create and manage reusable onboarding templates" },
  ];

  const recent = data.recent || [];

  return (
    <div>
      <PageHeader
        title="Employee Onboarding"
        subtitle="Manage new hire onboarding from preboarding to activation."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => go("/templates")}  className="btn-secondary">📄 Templates</button>
            <button onClick={() => go("/start")}      className="btn-primary">+ Start Onboarding</button>
          </div>
        }
      />

      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Active Onboardings"    value={data.active_onboarding    ?? 0} color="var(--c-accent)"  onClick={() => go("/list")} />
          <StatCard label="Ready for Activation"  value={data.ready_for_activation ?? 0} color="#f59e0b"          onClick={() => go("/list?status=Ready+For+Activation")} />
          <StatCard label="Overdue Tasks"         value={data.overdue_tasks        ?? 0} color="#ef4444"          onClick={() => go("/list")} />
          <StatCard label="Pending Accounts"      value={data.pending_accounts     ?? 0} color="#8b5cf6"          onClick={() => go("/list")} />
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {QUICK.map(q => (
          <div key={q.path} onClick={() => go(q.path)} className="card"
            style={{ cursor: "pointer", padding: 20 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; e.currentTarget.style.boxShadow = "var(--c-shadow-lg)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)";  e.currentTarget.style.boxShadow = "var(--c-shadow)"; }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>{q.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }} className="t-heading">{q.label}</div>
            <div style={{ fontSize: 12 }} className="t-muted">{q.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent onboardings */}
      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Recent Onboardings
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map(ob => (
              <div key={ob.id} onClick={() => go(`/${ob.id}`)} className="card"
                style={{ cursor: "pointer", padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ob.employee_name || "—"}</div>
                  <div className="t-muted" style={{ fontSize: 11 }}>
                    {ob.onboarding_number} · {ob.designation_name || ob.employee_category || ""}
                    {ob.joining_date ? ` · Joining: ${ob.joining_date}` : ""}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 80 }}>
                  <span style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 12,
                    fontSize: 11, fontWeight: 600, background: (STATUS_COLOR[ob.status] || "#6b7280") + "22",
                    color: STATUS_COLOR[ob.status] || "#6b7280",
                  }}>{ob.status}</span>
                  <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>{ob.progress_percent}%</div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button onClick={() => go("/list")} className="t-accent"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                View all onboardings →
              </button>
            </div>
          </div>
        </>
      )}

      {!loading && recent.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }} className="t-heading">No onboarding records yet</div>
          <div className="t-muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Start by creating an onboarding workflow template, then kick off the first onboarding.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={() => go("/templates")} className="btn-secondary">📄 Create Template</button>
            <button onClick={() => go("/start")}     className="btn-primary">▶️ Start Onboarding</button>
          </div>
        </div>
      )}
    </div>
  );
}
