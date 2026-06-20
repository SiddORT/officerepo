import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function dateStr(d) {
  return d.toISOString().split("T")[0];
}

export default function LeaveCalendar() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [events, setEvents] = useState({ leaves: [], holidays: [] });
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    portalLeaveApi.metaOptions(subdomain, token)
      .then(r => setLeaveTypes((r.data?.data || r.data)?.leave_types || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    setLoading(true);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    portalLeaveApi.calendarEvents(subdomain, token, {
      start: dateStr(firstDay), end: dateStr(lastDay),
    })
      .then(r => setEvents(r.data?.data || r.data || { leaves: [], holidays: [] }))
      .catch(() => setEvents({ leaves: [], holidays: [] }))
      .finally(() => setLoading(false));
  }, [subdomain, token, month, year]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  // Build lookup maps
  const leaveByDate = {};
  (events.leaves || []).forEach(l => {
    const start = new Date(l.start_date + "T00:00:00");
    const end = new Date(l.end_date + "T00:00:00");
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getMonth() === month && cur.getFullYear() === year) {
        const d = cur.getDate();
        if (!leaveByDate[d]) leaveByDate[d] = [];
        leaveByDate[d].push(l);
      }
      cur.setDate(cur.getDate() + 1);
    }
  });

  const holidayByDate = {};
  (events.holidays || []).forEach(h => {
    const hDate = new Date(h.holiday_date + "T00:00:00");
    if (hDate.getMonth() === month && hDate.getFullYear() === year) {
      const d = hDate.getDate();
      if (!holidayByDate[d]) holidayByDate[d] = [];
      holidayByDate[d].push(h);
    }
  });

  const selectedDayLeaves = selectedDay ? (leaveByDate[selectedDay] || []) : [];
  const selectedDayHolidays = selectedDay ? (holidayByDate[selectedDay] || []) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Calendar</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Team leaves and holidays overview</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center border hover:opacity-70"
            style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>‹</button>
          <span className="font-semibold min-w-[130px] text-center" style={{ color: "var(--c-heading)" }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth}
            className="w-9 h-9 rounded-xl flex items-center justify-center border hover:opacity-70"
            style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>›</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {/* Day headers */}
          <div className="grid grid-cols-7" style={{ background: "var(--c-surface)" }}>
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold"
                style={{ color: "var(--c-muted)", borderBottom: "1px solid var(--c-border)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} style={{ borderRight: "1px solid var(--c-border)", borderBottom: "1px solid var(--c-border)", minHeight: 80 }} />;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayLeaves = leaveByDate[day] || [];
              const dayHols = holidayByDate[day] || [];
              const isSelected = day === selectedDay;
              const isSunday = new Date(year, month, day).getDay() === 0;
              const isSat = new Date(year, month, day).getDay() === 6;

              return (
                <div key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="p-1.5 cursor-pointer transition-colors"
                  style={{
                    borderRight: "1px solid var(--c-border)",
                    borderBottom: "1px solid var(--c-border)",
                    minHeight: 80,
                    background: isSelected ? "var(--c-accent)18"
                      : dayHols.length ? "#FEF9C322"
                      : (isSunday || isSat) ? "var(--c-bg)"
                      : "transparent",
                  }}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isToday ? "text-white" : ""}`}
                    style={{
                      background: isToday ? "var(--c-accent)" : "transparent",
                      color: isToday ? "white"
                        : isSunday ? "#EF4444"
                        : isSat ? "#F97316"
                        : "var(--c-text)",
                    }}>
                    {day}
                  </div>
                  {dayHols.slice(0, 1).map(h => (
                    <div key={h.id}
                      className="text-xs px-1 py-0.5 rounded mb-0.5 truncate"
                      style={{ background: "#FEF9C3", color: "#92400E", fontSize: "0.65rem" }}>
                      🎉 {h.holiday_name}
                    </div>
                  ))}
                  {dayLeaves.slice(0, 2).map(l => {
                    const lt = leaveTypes.find(t => t.id === l.leave_type_id);
                    return (
                      <div key={l.id}
                        className="text-xs px-1 py-0.5 rounded mb-0.5 truncate text-white"
                        style={{ background: lt?.color_code || "#6B7280", fontSize: "0.65rem" }}>
                        {l.employee_name?.split(" ")[0]}
                      </div>
                    );
                  })}
                  {dayLeaves.length > 2 && (
                    <div className="text-xs" style={{ color: "var(--c-muted)", fontSize: "0.65rem" }}>
                      +{dayLeaves.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected day panel */}
      {selectedDay && (selectedDayLeaves.length > 0 || selectedDayHolidays.length > 0) && (
        <div className="rounded-xl p-5 space-y-3"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--c-heading)" }}>
            {selectedDay} {MONTHS[month]}, {year}
          </h2>
          {selectedDayHolidays.map(h => (
            <div key={h.id} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "#FEF9C322", border: "1px solid #FDE68A" }}>
              <span className="text-xl">🎉</span>
              <div>
                <div className="font-medium" style={{ color: "#92400E" }}>{h.holiday_name}</div>
                <div className="text-xs" style={{ color: "#B45309" }}>{h.holiday_type}</div>
              </div>
            </div>
          ))}
          {selectedDayLeaves.map(l => {
            const lt = leaveTypes.find(t => t.id === l.leave_type_id);
            return (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: (lt?.color_code || "#6B7280") + "18", border: `1px solid ${lt?.color_code || "#6B7280"}44` }}>
                <span className="text-xl">🏠</span>
                <div className="flex-1">
                  <div className="font-medium" style={{ color: "var(--c-text)" }}>{l.employee_name}</div>
                  <div className="text-xs" style={{ color: "var(--c-muted)" }}>
                    {l.leave_type_name} · {l.start_date} → {l.end_date} · {l.leave_days}d
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs" style={{ color: "var(--c-muted)" }}>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ background: "#FDE68A" }} />
          <span>Holiday</span>
        </div>
        {leaveTypes.slice(0, 5).map(lt => (
          <div key={lt.id} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: lt.color_code }} />
            <span>{lt.leave_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
