import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import Badge from "../shared/Badge";

export default function InterviewDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalInterviewApi.dashboard(subdomain, token)
      .then(r => setStats(r.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const go = path => () => navigate(`/portal/${subdomain}/hrms/interviews/${path}`);

  const SECTIONS = [
    { label: "Schedule Interview", desc: "Book a new interview round.", path: "new",      icon: "📅" },
    { label: "All Interviews",     desc: "View and manage all rounds.", path: "",          icon: "🗓️" },
  ];

  return (
    <div>
      <PageHeader title="Interview Management" subtitle="Schedule, track, and record results for all interview rounds." />

      {loading ? (
        <div className="t-muted" style={{ padding: 32 }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Total"      value={stats?.total}     color="var(--c-muted)"   onClick={go("")} />
          <StatCard label="Scheduled"  value={stats?.scheduled} color="var(--c-accent)"  onClick={go("?status=Scheduled")} />
          <StatCard label="Completed"  value={stats?.completed} color="#22c55e"          onClick={go("?status=Completed")} />
          <StatCard label="Cancelled"  value={stats?.cancelled} color="#ef4444"          onClick={go("?status=Cancelled")} />
          <StatCard label="No Show"    value={stats?.no_show}   color="#f59e0b"          onClick={go("?status=No+Show")} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        {SECTIONS.map(item => (
          <div key={item.path} onClick={() => navigate(`/portal/${subdomain}/hrms/interviews${item.path ? `/${item.path}` : ""}`)}
            className="card" style={{ cursor: "pointer", padding: 20, transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; e.currentTarget.style.boxShadow = "var(--c-shadow-lg)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.boxShadow = "var(--c-shadow)"; }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }} className="t-heading">{item.label}</div>
            <div style={{ fontSize: 12 }} className="t-muted">{item.desc}</div>
          </div>
        ))}
      </div>

      {stats?.upcoming?.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Upcoming Interviews
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stats.upcoming.map(r => (
              <div key={r.id} onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${r.id}`)}
                className="card" style={{ cursor: "pointer", padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; }}>
                <div style={{ minWidth: 90, textAlign: "center" }}>
                  <div className="t-accent" style={{ fontSize: 13, fontWeight: 700 }}>{r.interview_date}</div>
                  {r.interview_time && <div className="t-muted" style={{ fontSize: 11 }}>{r.interview_time}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{r.candidate_name || "—"}</div>
                  <div className="t-muted" style={{ fontSize: 11 }}>{r.round_type || r.round_name || `Round ${r.round_number}`} · {r.mode || "—"}</div>
                </div>
                <div><Badge status={r.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
