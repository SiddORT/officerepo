import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR = {
  "Applied": "#06b6d4", "Screening": "#8b5cf6", "Shortlisted": "#8b5cf6",
  "Interview Scheduled": "#f59e0b", "Technical Round": "#f59e0b", "HR Round": "#f59e0b",
  "Offer Sent": "#10b981", "Offer": "#10b981", "Selected": "#22c55e",
  "Joined": "#22c55e", "Rejected": "#ef4444", "Not Selected": "#ef4444",
  "On Hold": "#f59e0b", "Withdrawn": "#64748b",
  "Open": "#22c55e", "Closed": "#64748b", "Filled": "#06b6d4",
  "Draft": "#64748b", "Submitted": "#f59e0b", "Approved": "#22c55e",
};
const sc = s => STATUS_COLOR[s] || "#64748b";

const PIPELINE_STAGES = [
  { key: "Applied",    label: "Applied",    status: "Applied",              color: "#06b6d4" },
  { key: "Screening",  label: "Screening",  status: "Shortlisted",          color: "#8b5cf6" },
  { key: "Interview",  label: "Interview",  status: "Interview Scheduled",  color: "#f59e0b" },
  { key: "Offer",      label: "Offer",      status: "Offer Sent",           color: "#10b981" },
  { key: "Joined",     label: "Joined",     status: "Joined",               color: "#22c55e" },
];

const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── sub-components ───────────────────────────────────────────────────────────
function Avatar({ name = "?", size = 32 }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const palette = ["#06b6d4","#8b5cf6","#f59e0b","#10b981","#ef4444","#6366f1","#ec4899"];
  const bg = palette[(initials.charCodeAt(0) || 0) % palette.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.37, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "-0.5px" }}>
      {initials}
    </div>
  );
}

function StatusPill({ status }) {
  const color = sc(status);
  return (
    <span style={{ background: color + "1a", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {status || "—"}
    </span>
  );
}

function KpiCard({ icon, value, label, trend }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: "18px 20px", boxShadow: h ? "var(--c-shadow-lg)" : "var(--c-shadow)", borderColor: h ? "rgba(0,174,236,0.25)" : "var(--c-border)", transform: h ? "translateY(-2px)" : "translateY(0)", transition: "all 200ms ease", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--c-text)", lineHeight: 1 }}>{value ?? <span style={{ color: "var(--c-muted)", fontSize: 20 }}>—</span>}</div>
      <div style={{ fontSize: 12, color: "var(--c-muted)", fontWeight: 500 }}>{label}</div>
      {trend && <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

function PipelineStage({ stage, count }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 70, transform: h ? "scale(1.08)" : "scale(1)", transition: "transform 200ms ease", cursor: "default", padding: "4px 0" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: stage.color, lineHeight: 1 }}>{count}</div>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: stage.color, boxShadow: `0 0 10px ${stage.color}70` }} />
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.04em" }}>{stage.label}</div>
    </div>
  );
}

function PipelineConnector() {
  return <div style={{ flex: 1, height: 2, background: "var(--c-border)", minWidth: 20, alignSelf: "center", marginBottom: 26 }} />;
}

function OpeningRow({ opening, onView }) {
  const [h, setH] = useState(false);
  return (
    <tr onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? "var(--c-hover)" : "transparent", transition: "background 150ms", cursor: "pointer" }}
      onClick={onView}>
      <td style={{ paddingLeft: 20 }}>
        <div style={{ fontWeight: 600, color: "var(--c-text)", fontSize: 13 }}>{opening.job_title || "—"}</div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{opening.opening_number}</div>
      </td>
      <td>
        {opening.department_name
          ? <span style={{ background: "var(--c-accent-dim)", color: "var(--c-accent)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{opening.department_name}</span>
          : <span style={{ color: "var(--c-muted)", fontSize: 12 }}>—</span>}
      </td>
      <td style={{ fontWeight: 700, color: "var(--c-text)", fontSize: 14, textAlign: "center" }}>{opening.number_of_vacancies}</td>
      <td><StatusPill status={opening.status} /></td>
      <td style={{ paddingRight: 16 }}>
        <button onClick={e => { e.stopPropagation(); onView(); }} className="btn-secondary" style={{ fontSize: 11, padding: "3px 10px" }}>View</button>
      </td>
    </tr>
  );
}

function ActivityItem({ candidate, isLast, onClick }) {
  const [h, setH] = useState(false);
  const color = sc(candidate.status);
  const name = candidate.full_name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: isLast ? "none" : "1px solid var(--c-border)", cursor: "pointer", transition: "opacity 150ms", opacity: h ? 1 : 0.85, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}60`, marginTop: 2 }} />
        {!isLast && <div style={{ width: 1, flex: 1, background: "var(--c-border)", marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidate.applied_position || "No position linked"}</div>
        <div style={{ marginTop: 4 }}><StatusPill status={candidate.status} /></div>
      </div>
    </div>
  );
}

function CandidateRow({ candidate, onClick }) {
  const [h, setH] = useState(false);
  const name = candidate.full_name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  return (
    <tr onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? "var(--c-hover)" : "transparent", transition: "background 150ms", cursor: "pointer" }}>
      <td style={{ paddingLeft: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={name} size={30} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>{name}</div>
            <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{candidate.email}</div>
          </div>
        </div>
      </td>
      <td><span style={{ fontSize: 12, color: "var(--c-text2)" }}>{candidate.applied_position || "—"}</span></td>
      <td><span style={{ fontSize: 12, color: "var(--c-muted)" }}>{candidate.source || "—"}</span></td>
      <td><span style={{ fontSize: 12, color: "var(--c-muted)" }}>{fmt(candidate.created_at)}</span></td>
      <td style={{ paddingRight: 16 }}><StatusPill status={candidate.status} /></td>
    </tr>
  );
}

function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "36px 20px", gap: 10 }}>
      <div style={{ fontSize: 38, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--c-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function SectionCard({ title, action, onAction, children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--c-shadow)" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
        {action && <button onClick={onAction} className="btn-secondary" style={{ fontSize: 11, padding: "4px 10px" }}>{action}</button>}
      </div>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function RecruitmentDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const go = path => navigate(`/portal/${subdomain}/recruitment/${path}`);

  const [stats, setStats]             = useState(null);
  const [openings, setOpenings]       = useState([]);
  const [recent, setRecent]           = useState([]);
  const [pipeline, setPipeline]       = useState({});
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      portalRecruitmentApi.dashboard(subdomain, token),
      portalRecruitmentApi.listOpenings(subdomain, token, { page_size: 6, status: "Open" }),
      portalRecruitmentApi.listCandidates(subdomain, token, { page_size: 6 }),
      ...PIPELINE_STAGES.map(s =>
        portalRecruitmentApi.listCandidates(subdomain, token, { page_size: 1, status: s.status })
      ),
    ])
      .then(([dashR, openR, candR, ...pipeR]) => {
        setStats(dashR.data?.data || {});
        setOpenings(openR.data?.data?.items || []);
        setRecent(candR.data?.data?.items || []);
        const pm = {};
        PIPELINE_STAGES.forEach((s, i) => { pm[s.key] = pipeR[i]?.data?.data?.total || 0; });
        setPipeline(pm);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ color: "var(--c-muted)", fontSize: 13 }}>Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text)" }}>Recruitment</div>
          <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>
            Manage your complete hiring lifecycle — from requisition to onboarding.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => go("requisitions/new")} className="btn-secondary" style={{ fontSize: 13 }}>+ New Requisition</button>
          <button onClick={() => go("openings/new")} className="btn-primary" style={{ fontSize: 13 }}>+ New Job Opening</button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
        <KpiCard icon="🗂️" value={stats?.open_positions}       label="Open Positions" />
        <KpiCard icon="👤" value={stats?.total_candidates}     label="Applications" />
        <KpiCard icon="📅" value={stats?.interviews_scheduled} label="Interviews Today" />
        <KpiCard icon="📨" value={stats?.offers_sent}          label="Offers Pending" />
        <KpiCard icon="📆" value={stats?.positions_filled}     label="Positions Filled" />
        <KpiCard icon="✅" value={pipeline.Joined ?? 0}        label="Joined" />
      </div>

      {/* ── Hiring Pipeline ── */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: "20px 28px", boxShadow: "var(--c-shadow)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 18 }}>Hiring Pipeline</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {PIPELINE_STAGES.map((stage, i) => (
            <React.Fragment key={stage.key}>
              <PipelineStage stage={stage} count={pipeline[stage.key] ?? 0} />
              {i < PIPELINE_STAGES.length - 1 && <PipelineConnector />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Main Grid: Openings + Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>

        {/* Open Job Openings */}
        <SectionCard title="Open Job Openings" action="View All →" onAction={() => go("openings")}>
          {openings.length === 0 ? (
            <EmptyState icon="🗂️" title="No Open Positions" desc="Create a job opening to start tracking applicants." />
          ) : (
            <table className="portal-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>Position</th>
                  <th>Department</th>
                  <th style={{ textAlign: "center" }}>Vacancies</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {openings.map(o => (
                  <OpeningRow key={o.id} opening={o} onView={() => go("openings")} />
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Pipeline Activity */}
        <SectionCard title="Pipeline Activity" action="All Candidates →" onAction={() => go("candidates")}>
          <div style={{ padding: "8px 16px 12px" }}>
            {recent.length === 0 ? (
              <EmptyState icon="📋" title="No Activity Yet" desc="Candidates will appear here as they move through the pipeline." />
            ) : (
              recent.map((c, i) => (
                <ActivityItem
                  key={c.id}
                  candidate={c}
                  isLast={i === recent.length - 1}
                  onClick={() => go(`candidates/${c.id}`)}
                />
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* ── Recent Applications ── */}
      <SectionCard title="Recent Applications" action="View All →" onAction={() => go("candidates")}>
        {recent.length === 0 ? (
          <EmptyState icon="👤" title="No Candidates Yet" desc="Start by creating a Job Opening or adding candidates manually." />
        ) : (
          <table className="portal-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Candidate</th>
                <th>Applied For</th>
                <th>Source</th>
                <th>Applied Date</th>
                <th style={{ paddingRight: 16 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <CandidateRow key={c.id} candidate={c} onClick={() => go(`candidates/${c.id}`)} />
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

    </div>
  );
}
