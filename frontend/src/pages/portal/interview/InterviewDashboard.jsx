import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import Badge from "../shared/Badge";

export default function InterviewDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [stats, setStats] = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalInterviewApi.dashboard(subdomain, token)
      .then(r => {
        const d = r.data?.data || {};
        setStats(d);
        setUpcoming(d.upcoming || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const go = path => navigate(`${base}${path}`);

  const QUICK = [
    { label: "All Interviews",      icon: "📋", path: "/list",         desc: "View and filter every scheduled interview" },
    { label: "Interview Pipelines", icon: "🔀", path: "/pipelines",    desc: "Manage reusable interview workflow templates" },
    { label: "Calendar View",       icon: "📆", path: "/calendar",     desc: "Day / week / month calendar of interviews" },
    { label: "Schedule Interview",  icon: "➕", path: "/schedule/new", desc: "Book a new interview round for a candidate" },
  ];

  return (
    <div>
      <PageHeader
        title="Interview Management"
        subtitle="Manage interview pipelines, scheduling, panels and evaluations."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => go("/pipelines")} className="btn-secondary">🔀 Pipelines</button>
            <button onClick={() => go("/calendar")}  className="btn-secondary">📆 Calendar</button>
            <button onClick={() => go("/schedule/new")} className="btn-primary">+ Schedule Interview</button>
          </div>
        }
      />

      {/* Stats */}
      {!loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Total"       value={stats.total        ?? 0} color="var(--c-muted)"    onClick={() => go("/list")} />
          <StatCard label="Scheduled"   value={stats.scheduled    ?? 0} color="var(--c-accent)"   onClick={() => go("/list?status=Scheduled")} />
          <StatCard label="Rescheduled" value={stats.rescheduled  ?? 0} color="#8b5cf6"           onClick={() => go("/list?status=Rescheduled")} />
          <StatCard label="Completed"   value={stats.completed    ?? 0} color="#22c55e"           onClick={() => go("/list?status=Completed")} />
          <StatCard label="Cancelled"   value={stats.cancelled    ?? 0} color="#6b7280"           onClick={() => go("/list?status=Cancelled")} />
          <StatCard label="No Show"     value={stats.no_show      ?? 0} color="#f59e0b"           onClick={() => go("/list?status=No+Show")} />
          <StatCard label="Pipelines"   value={stats.pipeline_count ?? 0} color="#06b6d4"         onClick={() => go("/pipelines")} />
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

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
            Upcoming Interviews
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.map(iv => (
              <div key={iv.id} onClick={() => go(`/${iv.id}`)} className="card"
                style={{ cursor: "pointer", padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; }}>
                <div style={{ minWidth: 110, textAlign: "center" }}>
                  <div className="t-accent" style={{ fontSize: 13, fontWeight: 700 }}>{iv.interview_date}</div>
                  {iv.start_time && <div className="t-muted" style={{ fontSize: 11 }}>{iv.start_time}{iv.end_time ? ` – ${iv.end_time}` : ""}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{iv.candidate_name || "—"}</div>
                  <div className="t-muted" style={{ fontSize: 11 }}>
                    {iv.round_type || iv.round_name || `Round ${iv.round_number}`}
                    {iv.mode ? ` · ${iv.mode}` : ""}
                    {iv.pipeline_name ? ` · ${iv.pipeline_name}` : ""}
                  </div>
                </div>
                <Badge status={iv.status} />
              </div>
            ))}
            <div style={{ textAlign: "right", marginTop: 4 }}>
              <button onClick={() => go("/list")} className="t-accent"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                View all interviews →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
