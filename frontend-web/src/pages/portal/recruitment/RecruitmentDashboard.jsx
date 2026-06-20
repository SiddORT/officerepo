import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const Stat = ({ label, value, color = "var(--c-accent)", onClick }) => (
  <div onClick={onClick} style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "18px 20px", cursor: onClick ? "pointer" : "default", transition: "border-color 0.15s" }}
    onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = color)}
    onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "var(--c-border)")}>
    <div style={{ fontSize: 26, fontWeight: 800, color }}>{value ?? "—"}</div>
    <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4 }}>{label}</div>
  </div>
);

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

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Recruitment</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>Track job openings, candidates, and hiring pipeline.</p>
      </div>

      {loading ? (
        <div style={{ color: "var(--c-muted)", padding: 32 }}>Loading…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
          <Stat label="Open Positions"       value={stats?.open_positions}       color="var(--c-accent)" onClick={go("openings?status=Open")} />
          <Stat label="Total Candidates"     value={stats?.total_candidates}     color="#818cf8" onClick={go("candidates")} />
          <Stat label="Interviews Scheduled" value={stats?.interviews_scheduled} color="#f59e0b" onClick={go("candidates?status=Interview+Scheduled")} />
          <Stat label="Offers Sent"          value={stats?.offers_sent}          color="#10b981" onClick={go("offers")} />
          <Stat label="Positions Filled"     value={stats?.positions_filled}     color="#22c55e" onClick={go("openings?status=Filled")} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {[
          { label: "Job Requisitions", desc: "Create and approve hiring requests.", path: "requisitions", icon: "📋" },
          { label: "Job Openings",     desc: "Manage active job postings.",         path: "openings",     icon: "🗂️" },
          { label: "Candidates",       desc: "Track applicants through the pipeline.", path: "candidates", icon: "👤" },
          { label: "Offers",           desc: "Create and manage job offers.",       path: "offers",       icon: "📨" },
        ].map(item => (
          <div key={item.path} onClick={() => navigate(`/portal/${subdomain}/recruitment/${item.path}`)}
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "18px 20px", cursor: "pointer", transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--c-accent)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--c-border)"}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)" }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
