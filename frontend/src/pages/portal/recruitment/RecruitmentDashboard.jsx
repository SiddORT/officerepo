import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";

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
  { key: "Applied",   label: "Applied",   status: "Applied",             color: "#06b6d4" },
  { key: "Screening", label: "Screening", status: "Shortlisted",         color: "#8b5cf6" },
  { key: "Interview", label: "Interview", status: "Interview Scheduled", color: "#f59e0b" },
  { key: "Offer",     label: "Offer",     status: "Offer Sent",          color: "#10b981" },
  { key: "Joined",    label: "Joined",    status: "Joined",              color: "#22c55e" },
];

const KPI_DEFS = [
  { icon: "🗂️", label: "Open Positions",    key: "open_positions",       color: "#00aeec" },
  { icon: "👤", label: "Applications",       key: "total_candidates",     color: "#8b5cf6" },
  { icon: "📅", label: "Interviews Today",   key: "interviews_scheduled", color: "#f59e0b" },
  { icon: "📨", label: "Offers Pending",     key: "offers_sent",          color: "#10b981" },
  { icon: "📆", label: "Positions Filled",   key: "positions_filled",     color: "#22c55e" },
  { icon: "✅", label: "Joined",             key: "_joined",              color: "#6366f1" },
];

const fmt = iso => iso
  ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

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
    <span style={{ background: color + "18", color, border: `1px solid ${color}35`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      {status || "—"}
    </span>
  );
}

function KpiCard({ icon, value, label, color }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: "16px 18px 18px",
        boxShadow: h
          ? `0 8px 24px ${color}22, 0 2px 8px rgba(0,0,0,0.08)`
          : "var(--c-shadow)",
        transform: h ? "translateY(-3px)" : "translateY(0)",
        transition: "all 220ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        cursor: "default",
      }}
    >
      {/* Icon badge */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
        {icon}
      </div>
      {/* Value */}
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-1px" }}>
        {value ?? <span style={{ color: "var(--c-muted)", fontSize: 22 }}>—</span>}
      </div>
      {/* Label */}
      <div style={{ fontSize: 12, color: "var(--c-muted)", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function PipelineStage({ stage, count }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        minWidth: 80,
        padding: "14px 12px",
        borderRadius: 12,
        background: h ? stage.color + "18" : stage.color + "0d",
        border: `1px solid ${stage.color}${h ? "50" : "28"}`,
        transform: h ? "scale(1.06)" : "scale(1)",
        transition: "all 200ms ease",
        cursor: "default",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 900, color: stage.color, lineHeight: 1, letterSpacing: "-1px" }}>
        {count}
      </div>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: stage.color, textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.85 }}>
        {stage.label}
      </div>
    </div>
  );
}

function PipelineConnector({ color1, color2 }) {
  return (
    <div style={{ flex: 1, height: 2, minWidth: 16, alignSelf: "center", marginBottom: 0, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, ${color1}50, ${color2}50)`, borderRadius: 2 }} />
    </div>
  );
}

function OpeningRow({ opening, onView }) {
  const [h, setH] = useState(false);
  return (
    <tr
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ background: h ? "var(--c-hover)" : "transparent", transition: "background 150ms", cursor: "pointer" }}
      onClick={onView}
    >
      <td style={{ paddingLeft: 20 }}>
        <div style={{ fontWeight: 600, color: "var(--c-text)", fontSize: 13 }}>{opening.job_title || "—"}</div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{opening.opening_number}</div>
      </td>
      <td>
        {opening.department_name
          ? <span style={{ background: "var(--c-accent-dim)", color: "var(--c-accent)", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{opening.department_name}</span>
          : <span style={{ color: "var(--c-muted)", fontSize: 12 }}>—</span>}
      </td>
      <td style={{ fontWeight: 700, color: "var(--c-text)", fontSize: 14, textAlign: "center" }}>
        {opening.number_of_vacancies}
      </td>
      <td><StatusPill status={opening.status} /></td>
      <td style={{ paddingRight: 16 }}>
        <button
          onClick={e => { e.stopPropagation(); onView(); }}
          className="btn-secondary"
          style={{ fontSize: 11, padding: "3px 10px" }}
        >
          View
        </button>
      </td>
    </tr>
  );
}

function ActivityItem({ candidate, isLast, onClick }) {
  const [h, setH] = useState(false);
  const color = sc(candidate.status);
  const name = candidate.full_name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 8px",
        marginBottom: isLast ? 0 : 2,
        borderRadius: 8,
        background: h ? color + "0d" : "transparent",
        cursor: "pointer",
        transition: "background 150ms",
        position: "relative",
      }}
    >
      {/* Timeline line + dot */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: 14, flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0, border: `2px solid ${color}40`, marginTop: 2 }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: color + "30", marginTop: 4, borderRadius: 1 }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {candidate.applied_position || "No position linked"}
        </div>
        <div style={{ marginTop: 5 }}><StatusPill status={candidate.status} /></div>
      </div>
    </div>
  );
}

function CandidateRow({ candidate, onClick }) {
  const [h, setH] = useState(false);
  const name = candidate.full_name || `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim();
  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ background: h ? "var(--c-hover)" : "transparent", transition: "background 150ms", cursor: "pointer" }}
    >
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 10 }}>
      <div style={{ fontSize: 40, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
      <div style={{ fontSize: 12, color: "var(--c-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function SectionCard({ title, action, onAction, children, accentColor }) {
  return (
    <div style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "var(--c-shadow)",
    }}>
      <div style={{
        padding: "13px 20px",
        borderBottom: "1px solid var(--c-border)",
        background: "var(--c-surface2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {accentColor && (
            <div style={{ width: 3, height: 16, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
        </div>
        {action && (
          <button onClick={onAction} className="btn-secondary" style={{ fontSize: 11, padding: "3px 10px" }}>
            {action}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function RecruitmentDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const go = path => navigate(`/portal/${subdomain}/recruitment/${path}`);

  const [stats, setStats]       = useState(null);
  const [openings, setOpenings] = useState([]);
  const [recent, setRecent]     = useState([]);
  const [pipeline, setPipeline] = useState({});
  const [loading, setLoading]   = useState(true);

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

  const kpiValues = {
    open_positions:       stats?.open_positions ?? 0,
    total_candidates:     stats?.total_candidates ?? 0,
    interviews_scheduled: stats?.interviews_scheduled ?? 0,
    offers_sent:          stats?.offers_sent ?? 0,
    positions_filled:     stats?.positions_filled ?? 0,
    _joined:              pipeline.Joined ?? 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text)", letterSpacing: "-0.3px" }}>Recruitment</div>
          <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>
            Manage your complete hiring lifecycle — from requisition to onboarding.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={() => go("requisitions/new")} className="btn-secondary" style={{ fontSize: 13 }}>
            + New Requisition
          </button>
          <button onClick={() => go("openings/new")} className="btn-primary" style={{ fontSize: 13 }}>
            + New Job Opening
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 12 }}>
        {KPI_DEFS.map(kpi => (
          <KpiCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpiValues[kpi.key]}
            color={kpi.color}
          />
        ))}
      </div>

      {/* ── Hiring Pipeline ── */}
      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 12,
        padding: "18px 24px 22px",
        boxShadow: "var(--c-shadow)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>Hiring Pipeline</div>
          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Active candidates by stage</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {PIPELINE_STAGES.map((stage, i) => (
            <React.Fragment key={stage.key}>
              <PipelineStage stage={stage} count={pipeline[stage.key] ?? 0} />
              {i < PIPELINE_STAGES.length - 1 && (
                <PipelineConnector
                  color1={PIPELINE_STAGES[i].color}
                  color2={PIPELINE_STAGES[i + 1].color}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── Main Grid: Openings + Activity ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 296px", gap: 14, alignItems: "start" }}>

        {/* Open Job Openings */}
        <SectionCard
          title="Open Job Openings"
          action="View All →"
          onAction={() => go("openings")}
          accentColor="#00aeec"
        >
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
        <SectionCard
          title="Pipeline Activity"
          action="All →"
          onAction={() => go("candidates")}
          accentColor="#8b5cf6"
        >
          <div style={{ padding: "8px 10px 10px" }}>
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
      <SectionCard
        title="Recent Applications"
        action="View All →"
        onAction={() => go("candidates")}
        accentColor="#10b981"
      >
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
