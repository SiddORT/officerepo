import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";

export default function RecruitmentDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalRecruitmentApi.dashboard(subdomain, token)
      .then(r => setStats(r.data?.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const go = path => () => navigate(`/portal/${subdomain}/recruitment/${path}`);

  const MODULES = [
    { label: "Job Requisitions", desc: "Create and approve hiring requests.", path: "requisitions", icon: "📋" },
    { label: "Job Openings",     desc: "Manage active job postings.",        path: "openings",     icon: "🗂️" },
    { label: "Candidates",       desc: "Track applicants through pipeline.", path: "candidates",   icon: "👤" },
    { label: "Offers",           desc: "Create and manage job offers.",      path: "offers",       icon: "📨" },
  ];

  return (
    <div>
      <PageHeader title="Recruitment" subtitle="Track job openings, candidates, and hiring pipeline." />

      {loading ? (
        <div className="t-muted" style={{ padding: 32 }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Open Positions"       value={stats?.open_positions}       color="var(--c-accent)"   onClick={go("openings")} />
          <StatCard label="Total Candidates"     value={stats?.total_candidates}     color="#818cf8"           onClick={go("candidates")} />
          <StatCard label="Interviews Scheduled" value={stats?.interviews_scheduled} color="#f59e0b"           onClick={go("candidates")} />
          <StatCard label="Offers Sent"          value={stats?.offers_sent}          color="#10b981"           onClick={go("offers")} />
          <StatCard label="Positions Filled"     value={stats?.positions_filled}     color="#22c55e"           onClick={go("openings")} />
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Quick Access</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {MODULES.map(item => (
          <div key={item.path} onClick={() => navigate(`/portal/${subdomain}/recruitment/${item.path}`)}
            className="card" style={{ cursor: "pointer", padding: 20, transition: "border-color 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c-accent)"; e.currentTarget.style.boxShadow = "var(--c-shadow-lg)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.boxShadow = "var(--c-shadow)"; }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }} className="t-heading">{item.label}</div>
            <div style={{ fontSize: 12 }} className="t-muted">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
