// @refresh reset
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_START   = 7;          // 07:00
const HOUR_END     = 21;         // 21:00
const HOUR_HEIGHT  = 64;         // px per hour
const MIN_H        = 28;         // px min event height
const DAY_LABELS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS    = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const VIEWS        = ["Week", "Day", "Month", "Agenda"];
const PREF_KEY     = "iv_cal_pref";
const FILTER_KEY   = "iv_cal_saved_filters";

// ── Status colour map ─────────────────────────────────────────────────────────
const S_COLOR = {
  Scheduled:          { bg: "#3b82f6", text: "#fff", light: "#3b82f620" },
  Rescheduled:        { bg: "#8b5cf6", text: "#fff", light: "#8b5cf620" },
  Completed:          { bg: "#10b981", text: "#fff", light: "#10b98120" },
  "Pending Feedback": { bg: "#f59e0b", text: "#fff", light: "#f59e0b20" },
  Cancelled:          { bg: "#ef4444", text: "#fff", light: "#ef444420" },
  "No Show":          { bg: "#f97316", text: "#fff", light: "#f9731620" },
  Selected:           { bg: "#059669", text: "#fff", light: "#05966920" },
  Rejected:           { bg: "#6b7280", text: "#fff", light: "#6b728020" },
};

function displayStatus(ev) {
  if (ev.status === "Completed") {
    if (ev.result === "Selected")  return "Selected";
    if (ev.result === "Rejected")  return "Rejected";
    if (ev.result === "Pending")   return "Pending Feedback";
  }
  return ev.status;
}

function evColor(ev) {
  return S_COLOR[displayStatus(ev)] || { bg: "#6b7280", text: "#fff", light: "#6b728020" };
}

// ── Date helpers ──────────────────────────────────────────────────────────────
const pad  = n => String(n).padStart(2, "0");
const isoD = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function startOfWeek(d) {
  const r = new Date(d);
  r.setDate(d.getDate() - d.getDay());
  return r;
}
function addDays(d, n) { const r = new Date(d); r.setDate(d.getDate() + n); return r; }
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isoFromDate(d) { return isoD(d.getFullYear(), d.getMonth(), d.getDate()); }

function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTop(mins) {
  return ((mins - HOUR_START * 60) / 60) * HOUR_HEIGHT;
}
function durationToHeight(mins) {
  return Math.max(MIN_H, (mins / 60) * HOUR_HEIGHT);
}

// ── Overlap layout for week/day columns ───────────────────────────────────────
function layoutColumn(events) {
  // Sort by start time, assign columns for overlapping events
  const sorted = [...events].sort((a, b) => {
    const sa = a._startMin ?? 0, sb = b._startMin ?? 0;
    return sa - sb;
  });
  const cols = []; // each col is array of end-times
  const result = sorted.map(ev => {
    const s = ev._startMin ?? 0;
    const e = ev._endMin   ?? s + (ev.duration_minutes || 45);
    let col = cols.findIndex(end => end <= s);
    if (col === -1) { cols.push(e); col = cols.length - 1; }
    else cols[col] = e;
    return { ...ev, _col: col, _colCount: 0 };
  });
  const total = cols.length || 1;
  return result.map(ev => ({ ...ev, _colCount: total }));
}

// ── Saved-filters helpers ─────────────────────────────────────────────────────
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch { return {}; }
}
function saveSavedFilters(obj) {
  localStorage.setItem(FILTER_KEY, JSON.stringify(obj));
}

// ── Empty filters ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = {
  status: [], round_type: [], mode: [], candidate_id: [], opening_id: [], interviewer: "",
};

// ── EventChip (tiny chip for month/week) ─────────────────────────────────────
function EventChip({ ev, onClick, style = {} }) {
  const c = evColor(ev);
  const label = displayStatus(ev);
  const panelNames = (ev.panel || []).map(p => p.employee_name).join(", ");
  return (
    <div onClick={e => { e.stopPropagation(); onClick(ev); }}
      title={`${ev.candidate_name} · ${ev.round_type || ev.round_name || `R${ev.round_number}`} · ${ev.start_time || ""}${panelNames ? ` · ${panelNames}` : ""}`}
      style={{
        background: c.bg, color: c.text, borderRadius: 4,
        padding: "2px 6px", fontSize: 11, fontWeight: 600,
        cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        lineHeight: 1.5, ...style,
      }}>
      {ev.start_time ? `${ev.start_time} ` : ""}{ev.candidate_name?.split(" ")[0] || "Interview"}
    </div>
  );
}

// ── Event card (full — used in week/day positioned view) ──────────────────────
function EventCard({ ev, style, onClick }) {
  const c = evColor(ev);
  const label = displayStatus(ev);
  const panelNames = (ev.panel || []).map(p => p.employee_name).join(", ");
  return (
    <div onClick={e => { e.stopPropagation(); onClick(ev); }}
      style={{
        position: "absolute",
        left: `calc(${(ev._col / ev._colCount) * 100}% + 2px)`,
        width: `calc(${(1 / ev._colCount) * 100}% - 4px)`,
        background: c.bg,
        borderRadius: 6,
        padding: "4px 6px",
        cursor: "pointer",
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
        zIndex: 2,
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.1)"; e.currentTarget.style.zIndex = 10; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ""; e.currentTarget.style.zIndex = 2; }}>
      <div style={{ color: c.text, fontSize: 11, fontWeight: 700, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.candidate_name}
      </div>
      {(style.height || MIN_H) > 36 && (
        <div style={{ color: `${c.text}cc`, fontSize: 10, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ""}{ev.round_type ? ` · ${ev.round_type}` : ""}
        </div>
      )}
      {(style.height || MIN_H) > 56 && panelNames && (
        <div style={{ color: `${c.text}99`, fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          👤 {panelNames}
        </div>
      )}
    </div>
  );
}

// ── Event popover (shown when event clicked) ──────────────────────────────────
function EventPopover({ ev, onClose, onView, anchorRef }) {
  const c = evColor(ev);
  const label = displayStatus(ev);
  const panelNames = (ev.panel || []).map(p => `${p.employee_name}${p.role !== "Panel Member" ? ` (${p.role})` : ""}`).join(", ");
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: "fixed", zIndex: 999,
      background: "var(--c-surface, #1e2433)", border: "1px solid var(--c-border, rgba(255,255,255,0.12))",
      borderRadius: 12, padding: 16, minWidth: 280, maxWidth: 340,
      boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
      top: anchorRef?.current ? Math.min(anchorRef.current.getBoundingClientRect().top, window.innerHeight - 380) : "50%",
      left: anchorRef?.current ? Math.min(anchorRef.current.getBoundingClientRect().right + 8, window.innerWidth - 360) : "50%",
      transform: anchorRef?.current ? "none" : "translate(-50%,-50%)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{label}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--c-muted,#64748b)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
      </div>
      {/* Candidate */}
      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--c-heading,#f1f5f9)", marginBottom: 4 }}>{ev.candidate_name || "—"}</div>
      {ev.opening_title && <div style={{ fontSize: 12, color: "var(--c-muted,#64748b)", marginBottom: 8 }}>📋 {ev.opening_title}</div>}
      {/* Details grid */}
      {[
        ["📅", "Date",        ev.interview_date],
        ["🕐", "Time",        ev.start_time ? `${ev.start_time}${ev.end_time ? ` – ${ev.end_time}` : ""}${ev.timezone ? ` (${ev.timezone})` : ""}` : null],
        ["🔄", "Round",       `Round ${ev.round_number}${ev.round_type ? ` — ${ev.round_type}` : ""}${ev.round_name ? ` (${ev.round_name})` : ""}`],
        ["🎙️","Mode",         ev.mode],
        ["📍", "Location",    ev.location],
        ["👥", "Interviewers",panelNames || null],
        ["🔢", "Interview #", ev.interview_number],
      ].map(([icon, label, val]) => val ? (
        <div key={label} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
          <span style={{ fontSize: 12, width: 16 }}>{icon}</span>
          <div>
            <span style={{ fontSize: 10, color: "var(--c-muted,#64748b)", display: "block" }}>{label}</span>
            <span style={{ fontSize: 12, color: "var(--c-fg,#e2e8f0)" }}>{val}</span>
          </div>
        </div>
      ) : null)}
      {ev.meeting_url && (
        <a href={ev.meeting_url} target="_blank" rel="noreferrer"
          style={{ display: "block", fontSize: 12, color: "var(--c-accent,#6366f1)", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          🔗 {ev.meeting_url}
        </a>
      )}
      <button onClick={() => onView(ev)}
        style={{ width: "100%", marginTop: 10, background: "var(--c-accent,#6366f1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
        View Full Details →
      </button>
    </div>
  );
}

// ── MultiSelect chip input ────────────────────────────────────────────────────
function MultiSelect({ label, options, value, onChange, getId, getLabel, searchable }) {
  const [open, setOpen] = useState(false);
  const [q,    setQ   ] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);
  const filtered = options.filter(o => !q || getLabel(o).toLowerCase().includes(q.toLowerCase()));
  const toggle = id => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  return (
    <div ref={ref} style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted,#64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {value.map(id => {
            const opt = options.find(o => getId(o) === id);
            return opt ? (
              <span key={id} style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                onClick={() => toggle(id)}>
                {getLabel(opt)} ×
              </span>
            ) : null;
          })}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <button onClick={() => setOpen(v => !v)}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--c-muted,#64748b)", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, textAlign: "left" }}>
          {value.length ? `${value.length} selected` : `Filter by ${label}…`}
        </button>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--c-surface,#1e2433)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 8, zIndex: 50, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
            {searchable && (
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search…" className="input-field"
                style={{ marginBottom: 6, fontSize: 12, padding: "4px 8px" }} />
            )}
            {filtered.length === 0 ? <div style={{ color: "var(--c-muted,#64748b)", fontSize: 12, padding: 4 }}>No options</div>
              : filtered.map(o => {
                const id = getId(o);
                const sel = value.includes(id);
                return (
                  <label key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", cursor: "pointer", borderRadius: 6, background: sel ? "rgba(99,102,241,0.15)" : "transparent" }}>
                    <input type="checkbox" checked={sel} onChange={() => toggle(id)} style={{ accentColor: "#6366f1" }} />
                    <span style={{ fontSize: 12, color: sel ? "#a5b4fc" : "var(--c-fg,#e2e8f0)" }}>{getLabel(o)}</span>
                  </label>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────
function FilterPanel({ filters, onChange, filterOptions, metaOptions, collapsed, onCollapse }) {
  const [savedFilters, setSavedFilters] = useState(loadSaved);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const statuses = ["Scheduled","Rescheduled","Completed","Pending Feedback","Cancelled","No Show","Selected","Rejected"];

  const set = (k, v) => onChange({ ...filters, [k]: v });
  const activeCount = [
    filters.status.length, filters.round_type.length, filters.mode.length,
    filters.candidate_id.length, filters.opening_id.length, filters.interviewer ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const applyPreset = name => {
    const f = savedFilters[name];
    if (f) onChange({ ...EMPTY_FILTERS, ...f });
  };
  const savePreset = () => {
    if (!saveName.trim()) return;
    const updated = { ...savedFilters, [saveName.trim()]: { ...filters } };
    setSavedFilters(updated); saveSavedFilters(updated);
    setSaveName(""); setShowSave(false);
  };
  const deletePreset = name => {
    const { [name]: _, ...rest } = savedFilters;
    setSavedFilters(rest); saveSavedFilters(rest);
  };

  if (collapsed) return (
    <div style={{ width: 40, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 4 }}>
      <button onClick={onCollapse}
        style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc", width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 16, position: "relative" }}>
        ⚙
        {activeCount > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "#6366f1", color: "#fff", fontSize: 9, fontWeight: 700, width: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );

  const s = (color) => ({
    width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block", marginRight: 5, flexShrink: 0,
  });

  return (
    <div style={{ width: 240, flexShrink: 0, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 14px", overflowY: "auto", maxHeight: "calc(100vh - 200px)", position: "sticky", top: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--c-heading,#f1f5f9)" }}>
          Filters {activeCount > 0 && <span style={{ background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 4 }}>{activeCount}</span>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {activeCount > 0 && (
            <button onClick={() => onChange(EMPTY_FILTERS)}
              style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
              Clear
            </button>
          )}
          <button onClick={onCollapse}
            style={{ background: "none", border: "none", color: "var(--c-muted,#64748b)", cursor: "pointer", fontSize: 16 }}>
            ‹
          </button>
        </div>
      </div>

      {/* Saved filters */}
      {(Object.keys(savedFilters).length > 0 || showSave) && (
        <div style={{ marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted,#64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Saved Filters</div>
          {Object.keys(savedFilters).map(name => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <button onClick={() => applyPreset(name)}
                style={{ background: "none", border: "none", color: "#a5b4fc", cursor: "pointer", fontSize: 12, padding: "2px 0", textAlign: "left" }}>
                ★ {name}
              </button>
              <button onClick={() => deletePreset(name)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted,#64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Status</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {statuses.map(st => {
            const c = S_COLOR[st] || { bg: "#6b7280" };
            const active = filters.status.includes(st);
            return (
              <label key={st} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", padding: "3px 6px", borderRadius: 6, background: active ? `${c.bg}18` : "transparent" }}>
                <input type="checkbox" checked={active} onChange={() => set("status", active ? filters.status.filter(s => s !== st) : [...filters.status, st])} style={{ accentColor: c.bg }} />
                <span style={s(c.bg)} />
                <span style={{ fontSize: 12, color: active ? c.bg : "var(--c-fg,#e2e8f0)" }}>{st}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Round Type */}
      <MultiSelect
        label="Round Type"
        options={(filterOptions.round_types || []).concat(metaOptions.round_types || []).filter((v, i, a) => a.indexOf(v) === i)}
        value={filters.round_type}
        onChange={v => set("round_type", v)}
        getId={o => o} getLabel={o => o}
        searchable
      />

      {/* Mode */}
      <MultiSelect
        label="Interview Mode"
        options={(filterOptions.modes || []).concat(metaOptions.interview_modes || []).filter((v, i, a) => a.indexOf(v) === i)}
        value={filters.mode}
        onChange={v => set("mode", v)}
        getId={o => o} getLabel={o => o}
      />

      {/* Interviewer — most important filter */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted,#64748b)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
          Interviewer <span style={{ color: "#6366f1" }}>★</span>
        </div>
        <MultiSelect
          label="Interviewer"
          options={filterOptions.interviewers || []}
          value={filters.interviewer ? [filters.interviewer] : []}
          onChange={v => set("interviewer", v[v.length - 1] || "")}
          getId={o => o} getLabel={o => o}
          searchable
        />
        {filters.interviewer && (
          <div style={{ fontSize: 11, color: "#a5b4fc", marginTop: 4 }}>
            Showing: <strong>{filters.interviewer}</strong>
            <button onClick={() => set("interviewer", "")} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 11, marginLeft: 4 }}>×</button>
          </div>
        )}
      </div>

      {/* Candidate */}
      <MultiSelect
        label="Candidate"
        options={filterOptions.candidates || []}
        value={filters.candidate_id}
        onChange={v => set("candidate_id", v)}
        getId={o => o.id} getLabel={o => o.name}
        searchable
      />

      {/* Job Opening */}
      <MultiSelect
        label="Job Opening"
        options={filterOptions.openings || []}
        value={filters.opening_id}
        onChange={v => set("opening_id", v)}
        getId={o => o.id} getLabel={o => o.title}
        searchable
      />

      {/* Save filters */}
      <div style={{ marginTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
        {showSave ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input value={saveName} onChange={e => setSaveName(e.target.value)}
              placeholder="Filter name…" className="input-field" style={{ flex: 1, fontSize: 12, padding: "5px 8px" }}
              onKeyDown={e => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") setShowSave(false); }}
              autoFocus />
            <button onClick={savePreset} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Save</button>
          </div>
        ) : (
          <button onClick={() => setShowSave(true)}
            style={{ background: "none", border: "1px solid rgba(99,102,241,0.3)", color: "#a5b4fc", padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, width: "100%" }}>
            ★ Save Current Filters
          </button>
        )}
      </div>
    </div>
  );
}

// ── Week / Day View ───────────────────────────────────────────────────────────
function WeekDayView({ days, events, onEventClick, mode }) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalH = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop  = minutesToTop(nowMins);

  // Group + layout events by day
  const byDay = useMemo(() => {
    const map = {};
    for (const d of days) {
      const key = isoFromDate(d);
      const dayEvs = events
        .filter(e => e.interview_date === key)
        .map(e => {
          const sm = timeToMinutes(e.start_time);
          const em = timeToMinutes(e.end_time) || (sm ? sm + (e.duration_minutes || 45) : null);
          return { ...e, _startMin: sm, _endMin: em };
        });
      map[key] = layoutColumn(dayEvs);
    }
    return map;
  }, [days, events]);

  return (
    <div style={{ display: "flex", flex: 1, overflowX: "auto" }}>
      {/* Time gutter */}
      <div style={{ width: 48, flexShrink: 0 }}>
        <div style={{ height: 40 }} /> {/* header spacer */}
        <div style={{ position: "relative", height: totalH }}>
          {hours.map(h => (
            <div key={h} style={{ position: "absolute", top: (h - HOUR_START) * HOUR_HEIGHT - 8, right: 6, fontSize: 10, color: "var(--c-muted,#64748b)", whiteSpace: "nowrap" }}>
              {h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div style={{ display: "flex", flex: 1, minWidth: mode === "day" ? 300 : days.length * 100 }}>
        {days.map((d, di) => {
          const key = isoFromDate(d);
          const isToday = sameDay(d, now);
          const dayEvs = byDay[key] || [];
          return (
            <div key={key} style={{ flex: 1, borderLeft: "1px solid rgba(255,255,255,0.06)", minWidth: 0 }}>
              {/* Day header */}
              <div style={{ height: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "4px 0" }}>
                <div style={{ fontSize: 10, color: isToday ? "#6366f1" : "var(--c-muted,#64748b)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.06em" }}>
                  {DAY_LABELS[d.getDay()]}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 700,
                  color: isToday ? "#fff" : "var(--c-fg,#e2e8f0)",
                  background: isToday ? "#6366f1" : "transparent",
                  width: isToday ? 28 : "auto", height: isToday ? 28 : "auto",
                  borderRadius: isToday ? "50%" : 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {d.getDate()}
                </div>
              </div>

              {/* Time grid */}
              <div style={{ position: "relative", height: totalH, overflow: "hidden" }}>
                {/* Hour lines */}
                {hours.map(h => (
                  <div key={h} style={{ position: "absolute", top: (h - HOUR_START) * HOUR_HEIGHT, left: 0, right: 0, borderTop: `1px solid rgba(255,255,255,${h % 2 === 0 ? "0.05" : "0.02"})` }} />
                ))}
                {/* Now line */}
                {isToday && nowMins >= HOUR_START * 60 && nowMins <= HOUR_END * 60 && (
                  <div style={{ position: "absolute", top: nowTop, left: 0, right: 0, height: 2, background: "#ef4444", zIndex: 5 }}>
                    <div style={{ position: "absolute", left: -4, top: -4, width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
                  </div>
                )}
                {/* Events */}
                {dayEvs.map(ev => {
                  const sm = ev._startMin ?? (HOUR_START * 60);
                  const em = ev._endMin ?? sm + (ev.duration_minutes || 45);
                  const clampedTop = Math.max(0, minutesToTop(sm));
                  const h = Math.max(MIN_H, durationToHeight(em - sm));
                  return (
                    <EventCard key={ev.id} ev={ev}
                      style={{ top: clampedTop, height: h }}
                      onClick={onEventClick}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ year, month, events, onEventClick, onDayClick }) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const evsByDay = useMemo(() => {
    const map = {};
    for (const ev of events) {
      map[ev.interview_date] = map[ev.interview_date] || [];
      map[ev.interview_date].push(ev);
    }
    return map;
  }, [events]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Day header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ padding: "8px 4px", fontSize: 11, fontWeight: 700, color: "var(--c-muted,#64748b)", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>
        ))}
      </div>
      {/* Weeks */}
      {Array.from({ length: cells.length / 7 }, (_, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, borderBottom: wi < cells.length / 7 - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
          {cells.slice(wi * 7, wi * 7 + 7).map((d, di) => {
            const isToday = d && year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
            const key = d ? isoD(year, month, d) : null;
            const dayEvs = key ? (evsByDay[key] || []) : [];
            return (
              <div key={di}
                onClick={() => d && onDayClick(d)}
                style={{
                  minHeight: 96, padding: "6px 4px 4px", borderRight: di < 6 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  background: d ? "transparent" : "rgba(0,0,0,0.04)",
                  cursor: d ? "pointer" : "default",
                }}>
                {d && (
                  <>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 3 }}>
                      <span style={{
                        fontSize: 12, fontWeight: isToday ? 700 : 400,
                        color: isToday ? "#fff" : "var(--c-fg,#e2e8f0)",
                        background: isToday ? "#6366f1" : "transparent",
                        width: 22, height: 22, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{d}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayEvs.slice(0, 3).map(ev => (
                        <EventChip key={ev.id} ev={ev} onClick={onEventClick} />
                      ))}
                      {dayEvs.length > 3 && (
                        <div style={{ fontSize: 10, color: "var(--c-muted,#64748b)", paddingLeft: 4 }}>
                          +{dayEvs.length - 3} more
                        </div>
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
  );
}

// ── Agenda View ───────────────────────────────────────────────────────────────
function AgendaView({ events, onEventClick, rangeLabel }) {
  const grouped = useMemo(() => {
    const map = {};
    for (const ev of events) {
      map[ev.interview_date] = map[ev.interview_date] || [];
      map[ev.interview_date].push(ev);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (grouped.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--c-muted,#64748b)", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 40 }}>📭</div>
        <div style={{ fontSize: 14 }}>No interviews in this period</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 2px" }}>
      {grouped.map(([date, evs]) => {
        const d = new Date(date + "T00:00:00");
        const today = new Date();
        const isToday = sameDay(d, today);
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            {/* Day header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{
                background: isToday ? "#6366f1" : "rgba(255,255,255,0.06)",
                color: isToday ? "#fff" : "var(--c-fg,#e2e8f0)",
                padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                {FULL_DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}{isToday ? " — Today" : ""}
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ fontSize: 11, color: "var(--c-muted,#64748b)" }}>{evs.length} interview{evs.length > 1 ? "s" : ""}</div>
            </div>
            {/* Events */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {evs.map(ev => {
                const c = evColor(ev);
                const dStat = displayStatus(ev);
                const panelNames = (ev.panel || []).map(p => p.employee_name).join(", ");
                return (
                  <div key={ev.id} onClick={() => onEventClick(ev)}
                    style={{ display: "flex", gap: 0, cursor: "pointer", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = c.bg + "60"; e.currentTarget.style.background = c.light; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
                    {/* Color strip */}
                    <div style={{ width: 4, background: c.bg, flexShrink: 0 }} />
                    <div style={{ padding: "12px 14px", flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--c-heading,#f1f5f9)" }}>{ev.candidate_name || "—"}</div>
                          {ev.opening_title && <div style={{ fontSize: 12, color: "var(--c-muted,#64748b)", marginTop: 2 }}>📋 {ev.opening_title}</div>}
                        </div>
                        <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{dStat}</span>
                      </div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                        {ev.start_time && (
                          <span style={{ fontSize: 12, color: "var(--c-fg,#e2e8f0)" }}>
                            🕐 {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ""}
                          </span>
                        )}
                        {(ev.round_type || ev.round_name) && (
                          <span style={{ fontSize: 12, color: "var(--c-muted,#64748b)" }}>
                            🔄 Round {ev.round_number}{ev.round_type ? ` — ${ev.round_type}` : ""}
                          </span>
                        )}
                        {ev.mode && <span style={{ fontSize: 12, color: "var(--c-muted,#64748b)" }}>📡 {ev.mode}</span>}
                        {panelNames && <span style={{ fontSize: 12, color: "var(--c-muted,#64748b)" }}>👤 {panelNames}</span>}
                        {ev.interview_number && <span style={{ fontSize: 11, color: "var(--c-muted,#64748b)", fontFamily: "monospace" }}>{ev.interview_number}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
export default function InterviewCalendar() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  // Restore preferences
  const [prefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; }
  });
  const savePrefs = (update) => {
    const cur = (() => { try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; } })();
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...cur, ...update }));
  };

  const [view, setViewRaw] = useState(prefs.view || "Week");
  const setView = v => { setViewRaw(v); savePrefs({ view: v }); };

  const today = new Date();
  const [cursor, setCursor] = useState(today);   // "anchor" date for current view
  const [events, setEvents]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [filterOptions, setFilterOptions] = useState({});
  const [metaOptions, setMetaOptions]   = useState({});
  const [filters, setFilters]           = useState(EMPTY_FILTERS);
  const [filterCollapsed, setFilterCollapsed] = useState(prefs.filterCollapsed ?? false);
  const [popover, setPopover]           = useState(null); // { ev, ref }
  const popoverAnchor                   = useRef(null);

  // Compute visible date range from cursor + view
  const { days, rangeStart, rangeEnd } = useMemo(() => {
    if (view === "Day") {
      return { days: [cursor], rangeStart: isoFromDate(cursor), rangeEnd: isoFromDate(cursor) };
    }
    if (view === "Month") {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const last = new Date(y, m + 1, 0).getDate();
      return { days: [], rangeStart: isoD(y, m, 1), rangeEnd: isoD(y, m, last) };
    }
    if (view === "Agenda") {
      const end = addDays(cursor, 30);
      return { days: [], rangeStart: isoFromDate(cursor), rangeEnd: isoFromDate(end) };
    }
    // Week
    const start = startOfWeek(cursor);
    const ds = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return { days: ds, rangeStart: isoFromDate(ds[0]), rangeEnd: isoFromDate(ds[6]) };
  }, [view, cursor]);

  // Title for header
  const rangeLabel = useMemo(() => {
    if (view === "Day") return `${FULL_DAYS[cursor.getDay()]}, ${MONTHS[cursor.getMonth()]} ${cursor.getDate()}, ${cursor.getFullYear()}`;
    if (view === "Month") return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "Agenda") return `${MONTHS[cursor.getMonth()]} ${cursor.getDate()} – next 30 days`;
    const s = days[0], e = days[6];
    if (!s || !e) return "";
    if (s.getMonth() === e.getMonth()) return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${e.getDate()}, ${s.getFullYear()}`;
    return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  }, [view, cursor, days]);

  // Navigate prev/next
  const nav = useCallback((dir) => {
    setCursor(prev => {
      if (view === "Day")    return addDays(prev, dir);
      if (view === "Week")   return addDays(prev, dir * 7);
      if (view === "Agenda") return addDays(prev, dir * 14);
      // Month
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, [view]);

  // Load filter options once
  useEffect(() => {
    portalInterviewApi.calendarFilterOptions(subdomain, token)
      .then(r => setFilterOptions(r.data?.data || {})).catch(() => {});
    portalInterviewApi.metaOptions(subdomain, token)
      .then(r => setMetaOptions(r.data?.data || {})).catch(() => {});
  }, [subdomain, token]);

  // Load events whenever range or filters change
  const loadEvents = useCallback(() => {
    if (!rangeStart || !rangeEnd) return;
    setLoading(true);
    // Build filter params for backend
    // Note: "Pending Feedback" and "Selected"/"Rejected" are computed on frontend;
    // we pass the underlying DB statuses
    const backendStatuses = filters.status.length ? filters.status.map(s => {
      if (s === "Pending Feedback" || s === "Selected" || s === "Rejected") return "Completed";
      return s;
    }).filter((v, i, a) => a.indexOf(v) === i) : undefined;

    const params = {};
    if (backendStatuses?.length)     params.status       = backendStatuses;
    if (filters.round_type.length)   params.round_type   = filters.round_type;
    if (filters.mode.length)         params.mode         = filters.mode;
    if (filters.candidate_id.length) params.candidate_id = filters.candidate_id;
    if (filters.opening_id.length)   params.opening_id   = filters.opening_id;
    if (filters.interviewer)         params.interviewer  = filters.interviewer;

    portalInterviewApi.calendarEvents(subdomain, token, rangeStart, rangeEnd, params)
      .then(r => {
        let evs = r.data?.data || [];
        // Frontend-side filter for computed statuses
        if (filters.status.length) {
          const hasPF = filters.status.includes("Pending Feedback");
          const hasSel = filters.status.includes("Selected");
          const hasRej = filters.status.includes("Rejected");
          const hasComp = filters.status.includes("Completed");
          // If only computed sub-statuses of Completed are requested:
          if ((hasPF || hasSel || hasRej) && !hasComp) {
            evs = evs.filter(ev => {
              if (ev.status !== "Completed") return filters.status.includes(ev.status);
              const ds = displayStatus(ev);
              return filters.status.includes(ds);
            });
          }
        }
        setEvents(evs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token, rangeStart, rangeEnd, filters]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleEventClick = useCallback((ev) => {
    setPopover({ ev });
  }, []);

  const handleDayClick = useCallback((d) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    setView("Day");
  }, [cursor]);

  const toggleFilter = () => {
    const next = !filterCollapsed;
    setFilterCollapsed(next);
    savePrefs({ filterCollapsed: next });
  };

  // Event count summary
  const statusCounts = useMemo(() => {
    const counts = {};
    for (const ev of events) {
      const ds = displayStatus(ev);
      counts[ds] = (counts[ds] || 0) + 1;
    }
    return counts;
  }, [events]);

  const activeFilters = [
    filters.status.length, filters.round_type.length, filters.mode.length,
    filters.candidate_id.length, filters.opening_id.length, filters.interviewer ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "calc(100vh - 120px)", minHeight: 600 }}>
      {/* ── TOP BAR ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--c-heading,#f1f5f9)", margin: 0 }}>Interview Calendar</h1>
          <p style={{ color: "var(--c-muted,#64748b)", fontSize: 12, margin: "2px 0 0" }}>
            {events.length} interview{events.length !== 1 ? "s" : ""} · {rangeLabel}
            {activeFilters > 0 && <span style={{ color: "#6366f1", marginLeft: 6 }}>({activeFilters} filter{activeFilters > 1 ? "s" : ""} active)</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* View switcher */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden" }}>
            {VIEWS.map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{
                  background: view === v ? "#6366f1" : "transparent",
                  color: view === v ? "#fff" : "var(--c-muted,#64748b)",
                  border: "none", padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  borderRight: v !== "Agenda" ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}>
                {v}
              </button>
            ))}
          </div>
          {/* Nav */}
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => nav(-1)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--c-fg,#e2e8f0)", padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>‹</button>
            <button onClick={() => setCursor(today)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--c-muted,#64748b)", padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Today</button>
            <button onClick={() => nav(1)}  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--c-fg,#e2e8f0)", padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 14 }}>›</button>
          </div>
          <button onClick={() => navigate(`${base}/schedule/new`)} className="btn-primary" style={{ padding: "7px 16px", fontSize: 12 }}>+ Schedule</button>
        </div>
      </div>

      {/* ── STATUS LEGEND STRIP ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.entries(S_COLOR).map(([st, c]) => (
          <button key={st}
            onClick={() => {
              const active = filters.status.includes(st);
              setFilters(f => ({ ...f, status: active ? f.status.filter(s => s !== st) : [...f.status, st] }));
            }}
            style={{
              display: "flex", alignItems: "center", gap: 5, background: filters.status.includes(st) ? `${c.bg}25` : "rgba(255,255,255,0.03)",
              border: `1px solid ${filters.status.includes(st) ? c.bg + "60" : "rgba(255,255,255,0.07)"}`,
              borderRadius: 20, padding: "3px 10px 3px 6px", cursor: "pointer", fontSize: 11, fontWeight: 600,
              color: filters.status.includes(st) ? c.bg : "var(--c-muted,#64748b)",
            }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c.bg, flexShrink: 0 }} />
            {st}
            {statusCounts[st] ? <span style={{ color: c.bg, fontWeight: 700, marginLeft: 2 }}>{statusCounts[st]}</span> : null}
          </button>
        ))}
      </div>

      {/* ── BODY: filter panel + calendar ── */}
      <div style={{ display: "flex", gap: 12, flex: 1, overflow: "hidden" }}>
        {/* Filter panel */}
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          filterOptions={filterOptions}
          metaOptions={metaOptions}
          collapsed={filterCollapsed}
          onCollapse={toggleFilter}
        />

        {/* Calendar area */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, overflow: "hidden", position: "relative",
        }}>
          {loading && (
            <div style={{ position: "absolute", top: 10, right: 14, fontSize: 11, color: "var(--c-muted,#64748b)" }}>
              Loading…
            </div>
          )}

          {view === "Week" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <WeekDayView days={days} events={events} onEventClick={handleEventClick} mode="week" />
            </div>
          )}
          {view === "Day" && (
            <div style={{ flex: 1, overflowY: "auto" }}>
              <WeekDayView days={days} events={events} onEventClick={handleEventClick} mode="day" />
            </div>
          )}
          {view === "Month" && (
            <MonthView
              year={cursor.getFullYear()}
              month={cursor.getMonth()}
              events={events}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === "Agenda" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <AgendaView events={events} onEventClick={handleEventClick} rangeLabel={rangeLabel} />
            </div>
          )}
        </div>
      </div>

      {/* ── EVENT POPOVER ── */}
      {popover && (
        <EventPopover
          ev={popover.ev}
          onClose={() => setPopover(null)}
          onView={ev => { setPopover(null); navigate(`${base}/${ev.id}`); }}
          anchorRef={popoverAnchor}
        />
      )}
    </div>
  );
}
