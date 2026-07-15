import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_COLOR = {
  "Scheduled":   "#00aeec",
  "Rescheduled": "#8b5cf6",
  "Completed":   "#22c55e",
  "Cancelled":   "#6b7280",
  "No Show":     "#f59e0b",
};

const MODE_ONLINE = ["Online", "Virtual", "Video Call", "Zoom", "Teams", "Google Meet"];

function sc(status) { return STATUS_COLOR[status] || "#64748b"; }
function isOnline(mode) { return mode && MODE_ONLINE.some(m => mode.toLowerCase().includes(m.toLowerCase())); }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h % 12) || 12).toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d - new Date(TODAY + "T00:00:00")) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff <= 6) return d.toLocaleDateString("en-IN", { weekday: "long" });
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function relTime(isoStr) {
  if (!isoStr) return "";
  const diff = Math.floor((Date.now() - new Date(isoStr + (isoStr.endsWith("Z") ? "" : "Z")).getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, color, trend, onClick, index }) {
  const [hovered, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--c-surface)",
        border: `1px solid ${hovered ? color + "50" : "var(--c-border)"}`,
        borderTop: `3px solid ${color}`,
        borderRadius: 12,
        padding: "16px 18px 18px",
        cursor: onClick ? "pointer" : "default",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered ? `0 8px 24px ${color}22, 0 2px 8px rgba(0,0,0,.08)` : "var(--c-shadow)",
        transition: "all 210ms ease",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: 0,
        animation: "ivFadeUp 300ms ease forwards",
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {icon}
        </div>
        {trend && (
          <span style={{ fontSize: 10, fontWeight: 700, color, background: color + "15", borderRadius: 20, padding: "2px 7px" }}>
            {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-1px" }}>
        {value ?? <span style={{ color: "var(--c-muted)", fontSize: 22 }}>—</span>}
      </div>
      <div style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function ModeBadge({ mode }) {
  const online = isOnline(mode);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px",
      background: online ? "#00aeec18" : "#f59e0b18",
      color: online ? "#00aeec" : "#f59e0b",
      border: `1px solid ${online ? "#00aeec30" : "#f59e0b30"}`,
    }}>
      {online ? "Online" : (mode || "Offline")}
    </span>
  );
}

function StatusBadge({ status }) {
  const c = sc(status);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px",
      background: c + "18", color: c, border: `1px solid ${c}30`,
    }}>
      {status}
    </span>
  );
}

function SectionHeader({ title, action, onAction, accentColor = "var(--c-accent)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: accentColor }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
      </div>
      {action && (
        <button onClick={onAction} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: accentColor, fontWeight: 600, padding: 0 }}>
          {action}
        </button>
      )}
    </div>
  );
}

function Card({ children, style, onClick, hoverColor }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "var(--c-surface)",
        border: `1px solid ${h && hoverColor ? hoverColor + "40" : "var(--c-border)"}`,
        borderRadius: 10,
        transition: "all 210ms ease",
        transform: h && onClick ? "translateY(-2px)" : "translateY(0)",
        boxShadow: h ? (hoverColor ? `0 6px 18px ${hoverColor}18` : "var(--c-shadow-lg)") : "var(--c-shadow)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Today's interview timeline card ──────────────────────────────────────────
function TodayCard({ iv, index, onClick }) {
  const [h, setH] = useState(false);
  const color = sc(iv.status);
  const roundLabel = iv.round_type || iv.round_name || `Round ${iv.round_number || 1}`;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        gap: 0,
        opacity: 0,
        animation: "ivFadeUp 300ms ease forwards",
        animationDelay: `${index * 70 + 200}ms`,
      }}
    >
      {/* Time spine */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 64, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color, textAlign: "center", lineHeight: 1.2 }}>
          {fmtTime(iv.start_time) || "TBD"}
        </div>
        {iv.end_time && (
          <div style={{ fontSize: 10, color: "var(--c-muted)", textAlign: "center", marginTop: 2 }}>
            –{fmtTime(iv.end_time)}
          </div>
        )}
        <div style={{ width: 2, flex: 1, background: `linear-gradient(180deg, ${color}60 0%, var(--c-border) 100%)`, marginTop: 8, borderRadius: 1 }} />
      </div>

      {/* Card body */}
      <div style={{
        flex: 1,
        marginLeft: 10,
        marginBottom: 12,
        background: h ? color + "06" : "var(--c-surface2)",
        border: `1px solid ${h ? color + "40" : "var(--c-border)"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: "10px 14px",
        cursor: "pointer",
        transition: "all 210ms ease",
        boxShadow: h ? `0 4px 14px ${color}18` : "var(--c-shadow)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {iv.candidate_name || "—"}
          </div>
          <StatusBadge status={iv.status} />
        </div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginBottom: 6 }}>
          {roundLabel}
          {iv.opening_title ? ` · ${iv.opening_title}` : ""}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <ModeBadge mode={iv.mode} />
          {iv.location && !isOnline(iv.mode) && (
            <span style={{ fontSize: 10, color: "var(--c-muted)" }}>📍 {iv.location}</span>
          )}
          {iv.pipeline_name && (
            <span style={{ fontSize: 10, color: "var(--c-muted)", opacity: 0.7 }}>🔀 {iv.pipeline_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Upcoming mini card ────────────────────────────────────────────────────────
function UpcomingCard({ iv, index, onClick }) {
  const [h, setH] = useState(false);
  const color = sc(iv.status);
  const roundLabel = iv.round_type || iv.round_name || `Round ${iv.round_number || 1}`;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        background: h ? "var(--c-surface2)" : "var(--c-surface)",
        border: `1px solid ${h ? color + "40" : "var(--c-border)"}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "all 200ms ease",
        transform: h ? "translateY(-2px)" : "translateY(0)",
        boxShadow: h ? `0 4px 14px ${color}14` : "var(--c-shadow)",
        opacity: 0,
        animation: "ivFadeUp 300ms ease forwards",
        animationDelay: `${index * 60 + 250}ms`,
      }}
    >
      {/* Date block */}
      <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color, lineHeight: 1 }}>
          {fmtDate(iv.interview_date)}
        </div>
        {iv.start_time && (
          <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 3 }}>{fmtTime(iv.start_time)}</div>
        )}
      </div>

      <div style={{ width: 1, height: 32, background: "var(--c-border)" }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "var(--c-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {iv.candidate_name || "—"}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {roundLabel}{iv.pipeline_name ? ` · ${iv.pipeline_name}` : ""}
        </div>
      </div>

      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <ModeBadge mode={iv.mode} />
        <StatusBadge status={iv.status} />
      </div>
    </div>
  );
}

// ── Quick Action button ───────────────────────────────────────────────────────
function QuickAction({ icon, label, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "9px 12px",
        background: h ? "var(--c-accent-dim)" : "var(--c-surface2)",
        border: `1px solid ${h ? "var(--c-accent)" : "var(--c-border)"}`,
        borderRadius: 8, cursor: "pointer",
        transition: "all 200ms ease",
        transform: h ? "scale(1.01)" : "scale(1)",
      }}
    >
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: h ? "var(--c-accent)" : "var(--c-text)", transition: "color 200ms" }}>
        {label}
      </span>
    </button>
  );
}

// ── Activity item ─────────────────────────────────────────────────────────────
const ACTION_META = {
  scheduled:   { icon: "📅", label: "Interview Scheduled",   color: "#00aeec" },
  rescheduled: { icon: "🔄", label: "Interview Rescheduled", color: "#8b5cf6" },
  completed:   { icon: "✅", label: "Interview Completed",   color: "#22c55e" },
  cancelled:   { icon: "❌", label: "Interview Cancelled",   color: "#6b7280" },
  no_show:     { icon: "🚫", label: "No Show",               color: "#f59e0b" },
  feedback:    { icon: "💬", label: "Feedback Submitted",    color: "#06b6d4" },
  selected:    { icon: "🎉", label: "Candidate Selected",    color: "#22c55e" },
  rejected:    { icon: "⛔", label: "Candidate Rejected",    color: "#ef4444" },
};

function getAction(iv) {
  if (iv.status === "Completed") return ACTION_META.completed;
  if (iv.status === "Cancelled") return ACTION_META.cancelled;
  if (iv.status === "No Show")   return ACTION_META.no_show;
  if (iv.status === "Rescheduled") return ACTION_META.rescheduled;
  return ACTION_META.scheduled;
}

function ActivityItem({ iv, index }) {
  const [h, setH] = useState(false);
  const meta = getAction(iv);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", gap: 10, padding: "8px 0",
        borderBottom: "1px solid var(--c-border)",
        opacity: 0,
        animation: "ivFadeUp 300ms ease forwards",
        animationDelay: `${index * 80}ms`,
        transition: "background 200ms",
        background: h ? meta.color + "05" : "transparent",
        borderRadius: h ? 6 : 0,
        paddingLeft: h ? 4 : 0,
      }}
    >
      <div style={{ fontSize: 16, flexShrink: 0, marginTop: 1, transition: "transform 200ms", transform: h ? "scale(1.18)" : "scale(1)" }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{meta.label}</div>
        <div style={{ fontSize: 11, color: "var(--c-text)", fontWeight: 600, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {iv.candidate_name || "—"}
        </div>
        {iv.round_type && (
          <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 1 }}>{iv.round_type}</div>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div style={{ fontSize: 10, color: "var(--c-muted)" }}>{relTime(iv.updated_at || iv.created_at)}</div>
        <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2, opacity: 0.6 }}>{fmtDate(iv.interview_date)}</div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon = "📅", title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 10 }}>
      <div style={{ fontSize: 40, opacity: 0.2, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", textAlign: "center" }}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "var(--c-muted)", textAlign: "center", maxWidth: 240, lineHeight: 1.6 }}>{subtitle}</div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InterviewDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate   = useNavigate();
  const base       = `/portal/${subdomain}/hrms/interviews`;
  const go         = path => navigate(`${base}${path}`);

  const [stats,    setStats]   = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [recent,   setRecent]  = useState([]);
  const [loading,  setLoading] = useState(true);

  useEffect(() => {
    portalInterviewApi.dashboard(subdomain, token)
      .then(r => {
        const d = r.data?.data || {};
        setStats(d);
        const all = d.upcoming || [];
        setUpcoming(all);
        // build a recent-activity feed from all + completed/cancelled from list call
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch recent 8 for activity feed (any status, sorted by updated)
    portalInterviewApi.list(subdomain, token, { page_size: 8, sort: "-updated_at" })
      .then(r => setRecent(r.data?.data?.items || []))
      .catch(() => {});
  }, [subdomain, token]);

  const todayIvs    = upcoming.filter(iv => iv.interview_date === TODAY);
  const futureIvs   = upcoming.filter(iv => iv.interview_date > TODAY);
  const todayCount  = todayIvs.length;

  const KPI_DEFS = [
    { icon: "📅", label: "Today's Interviews",  value: todayCount,          color: "#00aeec", trend: todayCount > 0 ? `${todayCount} Today` : null,   path: "/list?status=Scheduled" },
    { icon: "🗓️", label: "Upcoming",            value: (stats.scheduled ?? 0) + (stats.rescheduled ?? 0), color: "#6366f1", path: "/list?status=Scheduled" },
    { icon: "✅", label: "Completed",           value: stats.completed    ?? 0, color: "#22c55e", path: "/list?status=Completed" },
    { icon: "🔄", label: "Rescheduled",         value: stats.rescheduled  ?? 0, color: "#8b5cf6", path: "/list?status=Rescheduled" },
    { icon: "🚫", label: "Cancelled",           value: stats.cancelled    ?? 0, color: "#6b7280", path: "/list?status=Cancelled" },
    { icon: "🔀", label: "Pipelines",           value: stats.pipeline_count ?? 0, color: "#f59e0b", path: "/pipelines" },
  ];

  return (
    <>
      <style>{`
        @keyframes ivFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 12,
          opacity: 0, animation: "ivFadeUp 300ms ease forwards",
        }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text)", letterSpacing: "-0.3px" }}>
              Interview Management
            </div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>
              Manage interview schedules, rounds and hiring decisions.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={() => go("/calendar")} className="btn-secondary" style={{ fontSize: 13 }}>
              📆 Calendar
            </button>
            <button onClick={() => go("/schedule/new")} className="btn-primary" style={{ fontSize: 13 }}>
              + Schedule Interview
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {KPI_DEFS.map((kpi, i) => (
              <KpiCard
                key={kpi.label}
                index={i}
                icon={kpi.icon}
                label={kpi.label}
                value={kpi.value}
                color={kpi.color}
                trend={kpi.trend}
                onClick={kpi.path ? () => go(kpi.path) : undefined}
              />
            ))}
          </div>
        )}

        {/* ── Two-column main layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 296px", gap: 16, alignItems: "start" }}>

          {/* ════ LEFT COLUMN ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Today's Schedule */}
            <Card style={{ padding: 20 }}>
              <SectionHeader
                title="Today's Schedule"
                accentColor="#00aeec"
                action={todayIvs.length > 0 ? "View All →" : null}
                onAction={() => go("/list")}
              />
              {loading ? (
                <div style={{ color: "var(--c-muted)", fontSize: 12, padding: "20px 0" }}>Loading…</div>
              ) : todayIvs.length === 0 ? (
                <EmptyState
                  icon="📅"
                  title="No Interviews Scheduled Today"
                  subtitle="Schedule your first interview to begin tracking candidates."
                />
              ) : (
                <div style={{ paddingTop: 8 }}>
                  {todayIvs.map((iv, i) => (
                    <TodayCard key={iv.id} iv={iv} index={i} onClick={() => go(`/${iv.id}`)} />
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Interviews */}
            <Card style={{ padding: 20 }}>
              <SectionHeader
                title="Upcoming Interviews"
                accentColor="#6366f1"
                action={futureIvs.length > 0 ? "View All →" : null}
                onAction={() => go("/list")}
              />
              {loading ? (
                <div style={{ color: "var(--c-muted)", fontSize: 12, padding: "20px 0" }}>Loading…</div>
              ) : futureIvs.length === 0 ? (
                <EmptyState icon="🗓️" title="No Upcoming Interviews" subtitle="All clear — schedule new interviews to see them here." />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {futureIvs.slice(0, 5).map((iv, i) => (
                    <UpcomingCard key={iv.id} iv={iv} index={i} onClick={() => go(`/${iv.id}`)} />
                  ))}
                  {futureIvs.length > 5 && (
                    <button
                      onClick={() => go("/list")}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--c-accent)", fontWeight: 600, textAlign: "right", padding: "4px 0" }}
                    >
                      +{futureIvs.length - 5} more →
                    </button>
                  )}
                </div>
              )}
            </Card>

          </div>

          {/* ════ RIGHT COLUMN ════ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Stats at a glance */}
            <Card style={{ padding: 16 }}>
              <SectionHeader title="Overview" accentColor="#22c55e" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {[
                  { label: "Total Interviews", value: stats.total       ?? 0, color: "var(--c-muted)" },
                  { label: "Scheduled",         value: stats.scheduled   ?? 0, color: "#00aeec" },
                  { label: "Completed",         value: stats.completed   ?? 0, color: "#22c55e" },
                  { label: "No Show",           value: stats.no_show     ?? 0, color: "#f59e0b" },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "9px 0",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--c-border)" : "none",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => go("/list")}
                style={{
                  marginTop: 12, width: "100%", padding: "8px 0",
                  background: "var(--c-surface2)", border: "1px solid var(--c-border)",
                  borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600,
                  color: "var(--c-accent)", transition: "all 200ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--c-accent-dim)"; e.currentTarget.style.borderColor = "var(--c-accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--c-surface2)"; e.currentTarget.style.borderColor = "var(--c-border)"; }}
              >
                View All Interviews →
              </button>
            </Card>

            {/* Interview Activity Timeline */}
            <Card style={{ padding: 16 }}>
              <SectionHeader
                title="Recent Activity"
                accentColor="#8b5cf6"
                action={recent.length > 0 ? "All →" : null}
                onAction={() => go("/list")}
              />
              {recent.length === 0 ? (
                <EmptyState icon="📋" title="No Activity Yet" subtitle="Activities appear as interviews are scheduled and progressed." />
              ) : (
                <div>
                  {recent.slice(0, 6).map((iv, i) => (
                    <ActivityItem key={iv.id} iv={iv} index={i} />
                  ))}
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </>
  );
}
