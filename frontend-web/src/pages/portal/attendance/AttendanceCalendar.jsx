import React, { useEffect, useState } from "react";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi, portalEmployeeApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  "Present":  { bg: "bg-green-500/20",  text: "text-green-400",  dot: "bg-green-500"  },
  "Late":     { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-500" },
  "Absent":   { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-500"    },
  "Half Day": { bg: "bg-orange-500/20", text: "text-orange-400", dot: "bg-orange-500" },
  "On Leave": { bg: "bg-blue-500/20",   text: "text-blue-400",   dot: "bg-blue-500"   },
  "Holiday":  { bg: "bg-purple-500/20", text: "text-purple-400", dot: "bg-purple-500" },
  "Week Off": { bg: "bg-slate-500/20",  text: "text-slate-400",  dot: "bg-slate-500"  },
};

const LOC_BADGE = {
  "Office":         { bg: "bg-blue-500/25",   text: "text-blue-300",   label: "OFC" },
  "Work From Home": { bg: "bg-green-500/25",  text: "text-green-300",  label: "WFH" },
  "Client Site":    { bg: "bg-purple-500/25", text: "text-purple-300", label: "CS"  },
  "Remote":         { bg: "bg-orange-500/25", text: "text-orange-300", label: "RMT" },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AttendanceCalendar() {
  const { subdomain, token } = usePortalAuth();
  const now   = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [employees, setEmployees]     = useState([]);
  const [empSearch, setEmpSearch]     = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [calData, setCalData]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [hovered, setHovered]         = useState(null);

  useEffect(() => {
    if (empSearch.length < 2) { setEmployees([]); return; }
    const t = setTimeout(() => {
      portalEmployeeApi.listEmployees(subdomain, token, { search: empSearch, page_size: 10 })
        .then(r => setEmployees(r.data?.data?.items || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [empSearch, subdomain, token]);

  useEffect(() => {
    if (!selectedEmp) return;
    setLoading(true);
    portalAttendanceApi.calendar(subdomain, token, selectedEmp.id, year, month)
      .then(r => setCalData(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedEmp, year, month, subdomain, token]);

  const selectEmp = emp => { setSelectedEmp(emp); setEmpSearch(emp.full_name || ""); setEmployees([]); };

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });

  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset   = (firstDay + 6) % 7;
  const cells    = Array(offset).fill(null).concat(calData);
  while (cells.length % 7 !== 0) cells.push(null);

  const summary = calData.reduce((acc, d) => {
    if (d?.status) acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const wfhCount = calData.filter(d => d?.location_type === "Work From Home").length;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-bold t-heading">Attendance Calendar</h1>

      {/* Employee selector */}
      <div className="card p-4">
        <div className="relative max-w-sm">
          <label className="block text-sm t-muted mb-1">Select Employee</label>
          <input className="input w-full" value={empSearch}
            onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }}
            placeholder="Search by name or code…" />
          {employees.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 card border border-white/10 shadow-xl max-h-48 overflow-y-auto">
              {employees.map(e => (
                <button key={e.id} onClick={() => selectEmp(e)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors">
                  <span className="t-heading font-medium">{e.full_name}</span>
                  <span className="t-muted text-xs ml-2">{e.employee_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedEmp && (
        <>
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="btn-secondary px-3 py-1.5 text-sm">←</button>
            <h2 className="text-lg font-semibold t-heading">{monthName} {year}</h2>
            <button onClick={nextMonth} className="btn-secondary px-3 py-1.5 text-sm">→</button>
          </div>

          {/* Summary badges */}
          {!loading && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary).map(([s, c]) => {
                const col = STATUS_COLORS[s];
                return col ? (
                  <span key={s} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${col.bg} ${col.text}`}>
                    <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                    {s}: {c}
                  </span>
                ) : null;
              })}
              {wfhCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                  🏠 WFH: {wfhCount} day{wfhCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {/* Calendar grid */}
          {loading ? (
            <div className="p-8 text-center t-muted">Loading calendar…</div>
          ) : (
            <div className="card p-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-medium t-muted py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell, i) => {
                  if (!cell) return <div key={i} />;
                  const dayNum  = new Date(cell.attendance_date).getDate();
                  const col     = STATUS_COLORS[cell.status];
                  const locBadge = cell.location_type ? LOC_BADGE[cell.location_type] : null;
                  const isToday  = cell.attendance_date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={i}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered(null)}
                      className={`relative rounded-lg p-1.5 min-h-[64px] flex flex-col items-center justify-start cursor-default transition-all
                        ${col ? col.bg : "bg-white/5"} ${isToday ? "ring-1 ring-cyan-500" : ""}`}>
                      <span className={`text-sm font-semibold ${isToday ? "text-cyan-400" : "t-heading"}`}>{dayNum}</span>
                      {cell.status && (
                        <span className={`text-[9px] font-medium mt-0.5 ${col?.text || "t-muted"}`}>
                          {cell.status === "Present" ? "P" : cell.status === "Absent" ? "A" : cell.status.split(" ").map(w => w[0]).join("")}
                        </span>
                      )}
                      {/* Location badge */}
                      {locBadge && (
                        <span className={`text-[8px] font-bold mt-0.5 px-1 py-0.5 rounded ${locBadge.bg} ${locBadge.text}`}>
                          {locBadge.label}
                        </span>
                      )}
                      {cell.productive_hours != null && (
                        <span className="text-[8px] t-muted mt-0.5">{cell.productive_hours}h</span>
                      )}
                      {/* Tooltip */}
                      {hovered === i && cell.status && (
                        <div className="absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-white/10 rounded-lg p-2.5 text-[11px] whitespace-nowrap shadow-xl min-w-[130px]">
                          <p className="t-heading font-semibold">{cell.status}</p>
                          {cell.location_type && (
                            <p className="t-muted mt-0.5">📍 {cell.location_type}</p>
                          )}
                          {cell.shift_name && (
                            <p className="t-muted">Shift: {cell.shift_name}</p>
                          )}
                          {cell.check_in_time && (
                            <p className="t-muted">In: {new Date(cell.check_in_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
                          )}
                          {cell.check_out_time && (
                            <p className="t-muted">Out: {new Date(cell.check_out_time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</p>
                          )}
                          {cell.productive_hours != null && (
                            <p className="t-muted">Hours: {cell.productive_hours}h</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="card p-4">
            <p className="text-xs font-semibold t-muted uppercase tracking-wide mb-2">Location Legend</p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(LOC_BADGE).map(([loc, style]) => (
                <span key={loc} className={`inline-flex items-center gap-1.5 text-xs ${style.text}`}>
                  <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${style.bg} ${style.text}`}>{style.label}</span>
                  {loc}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      {!selectedEmp && (
        <div className="card p-10 text-center t-muted">
          Search and select an employee above to view their attendance calendar.
        </div>
      )}
    </div>
  );
}
