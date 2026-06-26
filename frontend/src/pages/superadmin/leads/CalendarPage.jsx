import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { leadsApi } from "../../../services/apiClient";

const EVENT_COLORS = {
  demo: "#8b5cf6",
  followup: "#f59e0b",
  activity: "#00aeec",
};

const EVENT_LABELS = {
  demo: "Demo",
  followup: "Follow-up",
  activity: "Next Action",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    days.push(day);
  }
  return days;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const pad = (n) => String(n).padStart(2, "0");

// Field name on the PATCH payload + apiClient method for each event type.
const RESCHEDULE_CONFIG = {
  demo: { field: "demo_date", call: (api, leadId, id, data) => api.updateDemo(leadId, id, data) },
  followup: { field: "followup_date", call: (api, leadId, id, data) => api.updateFollowup(leadId, id, data) },
  activity: { field: "next_action_date", call: (api, leadId, id, data) => api.updateActivity(leadId, id, data) },
};

// Build a naive (no timezone) ISO string for `targetDay`, preserving the
// original time-of-day from `originalDate`. The backend stores naive UTC, so we
// must not let toISOString() shift values by the local offset.
function rescheduledIso(originalDate, targetDay) {
  let timePart = "09:00:00";
  if (typeof originalDate === "string" && originalDate.includes("T")) {
    const raw = originalDate.split("T")[1];
    timePart = raw.replace("Z", "").split("+")[0].split("-")[0] || timePart;
  }
  const datePart = `${targetDay.getFullYear()}-${pad(targetDay.getMonth() + 1)}-${pad(targetDay.getDate())}`;
  return `${datePart}T${timePart}`;
}

function dayKey(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragEvent, setDragEvent] = useState(null);
  const [dragOverKey, setDragOverKey] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const grid = useMemo(() => buildGrid(month), [month]);
  const today = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const start = grid[0];
    const end = new Date(grid[grid.length - 1]);
    end.setDate(end.getDate() + 1);
    try {
      const res = await leadsApi.calendar({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setEvents((res.data?.data ?? res.data) || []);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load calendar.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [grid]);

  useEffect(() => { load(); }, [load]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      (map[key] = map[key] || []).push(ev);
    });
    return map;
  }, [events]);

  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const goPrev = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNext = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => setMonth(startOfMonth(new Date()));

  const handleDrop = useCallback(async (targetDay) => {
    const ev = dragEvent;
    setDragOverKey(null);
    setDragEvent(null);
    if (!ev) return;

    const cfg = RESCHEDULE_CONFIG[ev.type];
    if (!cfg) return;

    // No-op if dropped on the same day it already sits on.
    const current = ev.date ? new Date(ev.date) : null;
    if (current && !Number.isNaN(current.getTime()) && sameDay(current, targetDay)) return;

    const newIso = rescheduledIso(ev.date, targetDay);
    const prevEvents = events;

    // Optimistic update.
    setEvents((list) =>
      list.map((e) => (e.type === ev.type && e.id === ev.id ? { ...e, date: newIso } : e)),
    );
    setError("");
    setSavingId(`${ev.type}-${ev.id}`);

    try {
      await cfg.call(leadsApi, ev.lead_id, ev.id, { [cfg.field]: newIso });
    } catch (e) {
      setEvents(prevEvents); // rollback
      setError(e.response?.data?.detail || "Failed to reschedule. Please try again.");
    } finally {
      setSavingId(null);
    }
  }, [dragEvent, events]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            <h1 className="text-2xl font-bold t-heading">Calendar</h1>
          </div>
          <p className="text-sm t-muted ml-3">Scheduled demos, follow-ups, and next actions across all leads. Drag an item to another day to reschedule it.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn-secondary text-sm">Today</button>
          <button onClick={goPrev} className="topbar-btn" title="Previous month">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold t-heading w-40 text-center">{monthLabel}</span>
          <button onClick={goNext} className="topbar-btn" title="Next month">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(EVENT_LABELS).map(([type, label]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs t-muted">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[type] }} />
            {label}
          </span>
        ))}
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-xs font-semibold t-muted" style={{ borderBottom: "1px solid var(--c-border)" }}>
              {w}
            </div>
          ))}
          {grid.map((day) => {
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayEvents = eventsByDay[key] || [];
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = sameDay(day, today);
            const isDropTarget = dragEvent && dragOverKey === key;
            return (
              <div
                key={key}
                onDragOver={(e) => {
                  if (!dragEvent) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverKey !== key) setDragOverKey(key);
                }}
                onDragLeave={() => {
                  if (dragOverKey === key) setDragOverKey(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(day);
                }}
                className="min-h-[104px] p-1.5 flex flex-col gap-1 transition-colors"
                style={{
                  borderBottom: "1px solid var(--c-border)",
                  borderRight: "1px solid var(--c-border)",
                  background: isDropTarget
                    ? "rgba(0,174,236,0.12)"
                    : inMonth ? "transparent" : "var(--c-surface2)",
                  outline: isDropTarget ? "2px dashed #00aeec" : "none",
                  outlineOffset: "-2px",
                  opacity: inMonth ? 1 : 0.6,
                }}
              >
                <span
                  className="text-xs font-medium self-end w-6 h-6 flex items-center justify-center rounded-full"
                  style={isToday
                    ? { background: "linear-gradient(135deg,#00aeec,#ff7a1a)", color: "#fff" }
                    : { color: "var(--c-text2)" }}
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const evKey = `${ev.type}-${ev.id}`;
                    const isSaving = savingId === evKey;
                    const isDragging = dragEvent && `${dragEvent.type}-${dragEvent.id}` === evKey;
                    return (
                      <button
                        key={evKey}
                        draggable={!isSaving}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          setDragEvent(ev);
                        }}
                        onDragEnd={() => {
                          setDragEvent(null);
                          setDragOverKey(null);
                        }}
                        onClick={() => navigate(`/superadmin/leads/${ev.lead_id}`)}
                        title={`${EVENT_LABELS[ev.type]} · ${ev.lead_name} — ${ev.title} (drag to reschedule)`}
                        className="text-[10px] leading-tight px-1.5 py-1 rounded text-left truncate cursor-grab active:cursor-grabbing"
                        style={{
                          backgroundColor: `${EVENT_COLORS[ev.type] || "#64748b"}1f`,
                          color: EVENT_COLORS[ev.type] || "#64748b",
                          border: `1px solid ${EVENT_COLORS[ev.type] || "#64748b"}40`,
                          opacity: isDragging ? 0.4 : isSaving ? 0.6 : 1,
                        }}
                      >
                        <span className="font-semibold">{ev.lead_name}</span>
                        <span className="block truncate opacity-80">{ev.title}</span>
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] t-muted px-1.5">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && <p className="text-sm t-muted">Loading…</p>}
    </div>
  );
}
