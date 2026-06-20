import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const STATUS_COLOR = {
  Scheduled: "#3b82f6", Rescheduled: "#8b5cf6", Completed: "#10b981",
  Cancelled: "#6b7280", "No Show": "#f59e0b",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function InterviewCalendar() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [view, setView]   = useState("month"); // month | week
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedDay, setSelectedDay]   = useState(null);

  const loadEvents = useCallback(() => {
    let start, end;
    if (view === "month") {
      start = isoDate(year, month, 1);
      const lastDay = new Date(year, month + 1, 0).getDate();
      end = isoDate(year, month, lastDay);
    } else {
      // Week view — get current week
      const d = new Date(year, month, 1);
      start = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
      d.setDate(d.getDate() + 6);
      end = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    }
    setLoading(true);
    portalInterviewApi.calendarEvents(subdomain, token, start, end)
      .then(r => setEvents(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token, year, month, view]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsForDay = (d) => {
    if (!d) return [];
    const key = isoDate(year, month, d);
    return events.filter(e => e.interview_date === key && (!filterStatus || e.status === filterStatus));
  };

  const allFiltered = filterStatus ? events.filter(e => e.status === filterStatus) : events;
  const dayEvents   = selectedDay ? eventsForDay(selectedDay) : [];

  return (
    <div>
      <PageHeader
        title="Interview Calendar"
        subtitle="View all scheduled interviews by date."
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "Calendar" },
        ]}
        actions={
          <button onClick={() => navigate(`${base}/schedule/new`)} className="btn-primary">+ Schedule Interview</button>
        }
      />

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--c-border)", color: "var(--c-fg)", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>‹</button>
          <div style={{ fontWeight: 700, fontSize: 18, minWidth: 180, textAlign: "center" }} className="t-heading">
            {MONTHS[month]} {year}
          </div>
          <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--c-border)", color: "var(--c-fg)", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            style={{ background: "none", border: "1px solid var(--c-border)", color: "var(--c-muted)", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
            Today
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field" style={{ width: "auto", minWidth: 140 }}>
            <option value="">All Statuses</option>
            {["Scheduled","Rescheduled","Completed","Cancelled","No Show"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(STATUS_COLOR).map(([st, color]) => (
          <div key={st} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
            <span className="t-muted">{st}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="t-muted" style={{ padding: 40, textAlign: "center" }}>Loading…</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--c-border)" }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {d}
              </div>
            ))}
          </div>
          {/* Weeks */}
          {Array.from({ length: cells.length / 7 }, (_, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: wi < cells.length / 7 - 1 ? "1px solid var(--c-border)" : "none" }}>
              {cells.slice(wi * 7, wi * 7 + 7).map((d, di) => {
                const isToday = d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
                const dayEvs  = eventsForDay(d);
                const isSelected = selectedDay === d;
                return (
                  <div key={di}
                    onClick={() => d && setSelectedDay(isSelected ? null : d)}
                    style={{
                      minHeight: 80, padding: 8, cursor: d ? "pointer" : "default",
                      borderRight: di < 6 ? "1px solid var(--c-border)" : "none",
                      background: isSelected ? "rgba(99,102,241,0.08)" : d ? "transparent" : "rgba(0,0,0,0.03)",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (d) e.currentTarget.style.background = isSelected ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={e => { if (d) e.currentTarget.style.background = isSelected ? "rgba(99,102,241,0.08)" : "transparent"; }}>
                    {d && (
                      <>
                        <div style={{
                          fontSize: 13, fontWeight: isToday ? 700 : 400,
                          color: isToday ? "#fff" : d ? "var(--c-fg)" : "var(--c-muted)",
                          background: isToday ? "var(--c-accent)" : "transparent",
                          width: isToday ? 26 : "auto", height: isToday ? 26 : "auto",
                          borderRadius: isToday ? "50%" : 0,
                          display: "flex", alignItems: "center", justifyContent: isToday ? "center" : "flex-start",
                          marginBottom: 4,
                        }}>
                          {d}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {dayEvs.slice(0, 3).map(ev => (
                            <div key={ev.id}
                              onClick={e => { e.stopPropagation(); navigate(`${base}/${ev.id}`); }}
                              style={{
                                background: `${STATUS_COLOR[ev.status] || "#6b7280"}20`,
                                borderLeft: `3px solid ${STATUS_COLOR[ev.status] || "#6b7280"}`,
                                borderRadius: "0 4px 4px 0",
                                padding: "2px 5px",
                                fontSize: 10, fontWeight: 600,
                                color: STATUS_COLOR[ev.status] || "#6b7280",
                                cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                              title={`${ev.candidate_name} — ${ev.round_type || ev.round_name || `R${ev.round_number}`} (${ev.start_time || ""})`}>
                              {ev.start_time ? `${ev.start_time} ` : ""}{ev.candidate_name?.split(" ")[0] || "Interview"}
                            </div>
                          ))}
                          {dayEvs.length > 3 && (
                            <div style={{ fontSize: 10, color: "var(--c-muted)", paddingLeft: 5 }}>+{dayEvs.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && dayEvents.length > 0 && (
        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }} className="t-heading">
            {MONTHS[month]} {selectedDay}, {year} — {dayEvents.length} interview{dayEvents.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dayEvents.map(ev => (
              <div key={ev.id} onClick={() => navigate(`${base}/${ev.id}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8, padding: "12px 16px", cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--c-accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.candidate_name || "—"}</div>
                  <div className="t-muted" style={{ fontSize: 12 }}>
                    {ev.round_type || ev.round_name || `Round ${ev.round_number}`}
                    {ev.start_time ? ` · ${ev.start_time}${ev.end_time ? ` – ${ev.end_time}` : ""}` : ""}
                    {ev.mode ? ` · ${ev.mode}` : ""}
                  </div>
                </div>
                <span style={{
                  background: `${STATUS_COLOR[ev.status] || "#6b7280"}20`,
                  color: STATUS_COLOR[ev.status] || "#6b7280",
                  padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${STATUS_COLOR[ev.status] || "#6b7280"}40`,
                }}>{ev.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div style={{ marginTop: 20, display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span className="t-muted" style={{ fontSize: 13 }}>
          {allFiltered.length} interview{allFiltered.length !== 1 ? "s" : ""} this month
        </span>
        {allFiltered.filter(e => ["Scheduled","Rescheduled"].includes(e.status)).length > 0 && (
          <span style={{ color: "#3b82f6", fontSize: 13 }}>
            {allFiltered.filter(e => ["Scheduled","Rescheduled"].includes(e.status)).length} upcoming
          </span>
        )}
      </div>
    </div>
  );
}
