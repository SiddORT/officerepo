/**
 * ActivityTimeline — reusable chronological activity feed.
 *
 * Props:
 *   items[]        — array of activity objects (see ACTION_META for shape)
 *   loading        — bool
 *   onViewAll      — optional callback for "View All Activities" link
 *   emptyTitle     — override empty-state title
 *   emptySubtitle  — override empty-state subtitle
 *   title          — section header title (default "Recruitment Timeline")
 *   accentColor    — left-bar accent (default "#6366f1")
 *
 * Each item shape:
 *   { id, action, actor, candidate_name, applied_position, department_name,
 *     old_value, new_value, notes, created_at }
 */
import React, { useState } from "react";

// ── Action catalogue ──────────────────────────────────────────────────────────
const ACTION_META = {
  created:              { icon: "👤", label: "Candidate Applied",       color: "#06b6d4" },
  status_changed:       { icon: "🔄", label: "Status Updated",          color: "#8b5cf6" },
  shortlisted:          { icon: "⭐", label: "Resume Shortlisted",       color: "#8b5cf6" },
  rejected:             { icon: "❌", label: "Candidate Rejected",       color: "#ef4444" },
  interview_scheduled:  { icon: "📅", label: "Interview Scheduled",      color: "#f59e0b" },
  interview_completed:  { icon: "✅", label: "Interview Completed",      color: "#22c55e" },
  offer_created:        { icon: "📨", label: "Offer Generated",          color: "#10b981" },
  offer_sent:           { icon: "📤", label: "Offer Sent",               color: "#10b981" },
  offer_accepted:       { icon: "🎉", label: "Offer Accepted",           color: "#22c55e" },
  offer_rejected:       { icon: "🚫", label: "Offer Declined",           color: "#ef4444" },
  withdrawn:            { icon: "↩️",  label: "Candidate Withdrawn",     color: "#64748b" },
  joined:               { icon: "🏢", label: "Candidate Joined",         color: "#22c55e" },
  requisition_created:  { icon: "📋", label: "Requisition Created",      color: "#00aeec" },
  requisition_approved: { icon: "✔️", label: "Requisition Approved",     color: "#22c55e" },
  opening_published:    { icon: "📢", label: "Job Opening Published",    color: "#00aeec" },
  document_uploaded:    { icon: "📎", label: "Document Uploaded",        color: "#6366f1" },
  note_added:           { icon: "📝", label: "Note Added",               color: "#94a3b8" },
};

function getActionMeta(action, newValue) {
  if (ACTION_META[action]) return ACTION_META[action];
  if (action === "status_changed" && newValue) {
    const lv = newValue.toLowerCase();
    if (lv.includes("shortlist"))  return ACTION_META.shortlisted;
    if (lv.includes("reject"))     return ACTION_META.rejected;
    if (lv.includes("interview"))  return ACTION_META.interview_scheduled;
    if (lv.includes("offer"))      return ACTION_META.offer_sent;
    if (lv.includes("join"))       return ACTION_META.joined;
    if (lv.includes("withdrawn"))  return ACTION_META.withdrawn;
  }
  return { icon: "🔵", label: action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()), color: "#64748b" };
}

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(isoStr) {
  if (!isoStr) return "";
  const now  = Date.now();
  const then = new Date(isoStr + (isoStr.endsWith("Z") ? "" : "Z")).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff <  60)  return "just now";
  if (diff <  3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff <  86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff <  172800) return "Yesterday";
  if (diff <  604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(isoStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function absTime(isoStr) {
  if (!isoStr) return "";
  return new Date(isoStr + (isoStr.endsWith("Z") ? "" : "Z"))
    .toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Individual timeline card ──────────────────────────────────────────────────
function TimelineCard({ item, index, isLast }) {
  const [hovered, setHovered] = useState(false);
  const meta = getActionMeta(item.action, item.new_value);

  const subtitle = item.action === "status_changed" && item.old_value && item.new_value
    ? `${item.old_value} → ${item.new_value}`
    : item.notes || null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 0,
        opacity: 0,
        animation: `tlFadeIn 320ms ease forwards`,
        animationDelay: `${index * 55}ms`,
      }}
    >
      {/* Spine column */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
        {/* Dot */}
        <div style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: meta.color,
          border: `2px solid ${meta.color}50`,
          flexShrink: 0,
          marginTop: 14,
          transition: "transform 220ms ease, box-shadow 220ms ease",
          transform: hovered ? "scale(1.35)" : "scale(1)",
          boxShadow: hovered ? `0 0 0 4px ${meta.color}25` : "none",
        }} />
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: 2,
            flex: 1,
            minHeight: 16,
            background: `linear-gradient(180deg, ${meta.color}40 0%, var(--c-border) 100%)`,
            borderRadius: 1,
            marginTop: 4,
          }} />
        )}
      </div>

      {/* Card */}
      <div style={{
        flex: 1,
        marginLeft: 12,
        marginBottom: isLast ? 0 : 10,
        background: hovered ? `${meta.color}08` : "var(--c-surface)",
        border: `1px solid ${hovered ? meta.color + "35" : "var(--c-border)"}`,
        borderLeft: `3px solid ${hovered ? meta.color : meta.color + "60"}`,
        borderRadius: 10,
        padding: "10px 14px 10px 12px",
        cursor: "default",
        transition: "background 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
        boxShadow: hovered ? `0 4px 16px ${meta.color}18` : "var(--c-shadow)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Indicator bar that animates on hover */}
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: meta.color,
          borderRadius: "10px 0 0 10px",
          transform: hovered ? "scaleY(1)" : "scaleY(0.4)",
          transformOrigin: "center",
          transition: "transform 220ms ease",
        }} />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          {/* Left content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Icon + action label */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{
                fontSize: 14,
                transition: "transform 220ms ease",
                display: "inline-block",
                transform: hovered ? "scale(1.18) rotate(-4deg)" : "scale(1) rotate(0deg)",
              }}>
                {meta.icon}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
            </div>

            {/* Candidate name */}
            {item.candidate_name && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.candidate_name}
              </div>
            )}

            {/* Position + department */}
            {(item.applied_position || item.department_name) && (
              <div style={{ fontSize: 11, color: "var(--c-muted)", marginBottom: subtitle ? 4 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[item.applied_position, item.department_name].filter(Boolean).join(" · ")}
              </div>
            )}

            {/* Status transition / notes */}
            {subtitle && (
              <div style={{ fontSize: 11, color: "var(--c-muted)", fontStyle: "italic", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {subtitle}
              </div>
            )}

            {/* Actor */}
            {item.actor && (
              <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 5 }}>
                by <span style={{ fontWeight: 600, color: "var(--c-text2)" }}>{item.actor}</span>
              </div>
            )}
          </div>

          {/* Right: times */}
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)" }}>{relativeTime(item.created_at)}</div>
            <div style={{ fontSize: 10, color: "var(--c-muted)", marginTop: 2, opacity: 0.7 }}>{absTime(item.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyTimeline({ title, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: 12 }}>
      <div style={{ fontSize: 52, opacity: 0.18, lineHeight: 1 }}>📋</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-text)", textAlign: "center" }}>
        {title || "No Recruitment Activity Yet"}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-muted)", textAlign: "center", maxWidth: 280, lineHeight: 1.65 }}>
        {subtitle || "Activities will automatically appear here as your hiring process begins."}
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard({ index }) {
  return (
    <div style={{ display: "flex", gap: 0, opacity: 0, animation: `tlFadeIn 300ms ease forwards`, animationDelay: `${index * 40}ms` }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--c-border)", marginTop: 14 }} />
        {index < 2 && <div style={{ width: 2, height: 52, background: "var(--c-border)", marginTop: 4 }} />}
      </div>
      <div style={{ flex: 1, marginLeft: 12, marginBottom: 10, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderLeft: "3px solid var(--c-border)", borderRadius: 10, padding: "10px 14px 10px 12px", height: 72 }}>
        <div style={{ width: "40%", height: 10, borderRadius: 4, background: "var(--c-border)", marginBottom: 8 }} />
        <div style={{ width: "65%", height: 12, borderRadius: 4, background: "var(--c-border)", marginBottom: 6 }} />
        <div style={{ width: "50%", height: 10, borderRadius: 4, background: "var(--c-border)" }} />
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ActivityTimeline({
  items = [],
  loading = false,
  onViewAll,
  emptyTitle,
  emptySubtitle,
  title = "Recruitment Timeline",
  accentColor = "#6366f1",
}) {
  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes tlFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "var(--c-shadow)",
      }}>
        {/* Header */}
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
            <div style={{ width: 3, height: 16, borderRadius: 2, background: accentColor, flexShrink: 0 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>{title}</div>
            {!loading && items.length > 0 && (
              <span style={{ fontSize: 11, color: "var(--c-muted)", marginLeft: 4 }}>
                Latest {items.length} activit{items.length === 1 ? "y" : "ies"}
              </span>
            )}
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: accentColor, fontWeight: 600, padding: "2px 0", transition: "opacity 180ms" }}
              onMouseEnter={e => e.target.style.opacity = "0.7"}
              onMouseLeave={e => e.target.style.opacity = "1"}
            >
              View All Activities →
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "16px 16px 16px 14px" }}>
          {loading ? (
            [0, 1, 2].map(i => <SkeletonCard key={i} index={i} />)
          ) : items.length === 0 ? (
            <EmptyTimeline title={emptyTitle} subtitle={emptySubtitle} />
          ) : (
            items.map((item, i) => (
              <TimelineCard key={item.id} item={item} index={i} isLast={i === items.length - 1} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
