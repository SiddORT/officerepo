import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  "Present":    "bg-green-500/15 text-green-400",
  "Late":       "bg-yellow-500/15 text-yellow-400",
  "Absent":     "bg-red-500/15 text-red-400",
  "Half Day":   "bg-orange-500/15 text-orange-400",
  "On Leave":   "bg-blue-500/15 text-blue-400",
  "Holiday":    "bg-purple-500/15 text-purple-400",
  "Week Off":   "bg-slate-500/15 text-slate-400",
  "Early Exit": "bg-amber-500/15 text-amber-400",
};

function StatusBadge({ status }) {
  const cls = STATUS_COLORS[status] || "bg-gray-500/15 text-gray-400";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status || "—"}</span>;
}

const STATUSES = ["", "Present", "Absent", "Late", "Half Day", "Early Exit", "On Leave", "Holiday", "Week Off"];

export default function AttendanceList() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();

  const [records, setRecords]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");

  const PAGE_SIZE = 30;

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: PAGE_SIZE, search, status };
    if (fromDate) params.from_date = fromDate;
    if (toDate)   params.to_date   = toDate;
    portalAttendanceApi.listRecords(subdomain, token, params)
      .then(r => { setRecords(r.data?.data?.items || []); setTotal(r.data?.data?.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, status, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const base = `/portal/${subdomain}/hrms/attendance`;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold t-heading">Attendance Records</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(`${base}/check-in`)} className="btn-primary text-sm px-4 py-2">
            Check-In / Out
          </button>
          <button onClick={() => navigate(`${base}/records/new`)} className="btn-secondary text-sm px-4 py-2">
            Manual Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search employee…" className="input flex-1 min-w-[180px]" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input">
          {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input" />
        <input type="date" value={toDate}   onChange={e => { setToDate(e.target.value); setPage(1); }}   className="input" />
        <button onClick={() => { setSearch(""); setStatus(""); setFromDate(""); setToDate(""); setPage(1); }}
          className="btn-secondary text-sm px-3 py-2">Clear</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted">Loading records…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center t-muted">No attendance records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Date","Employee","Shift","Check-In","Check-Out","Hours","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left t-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} onClick={() => navigate(`${base}/records/${r.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                    <td className="px-4 py-3 t-heading font-medium">{r.attendance_date}</td>
                    <td className="px-4 py-3">
                      <p className="t-heading font-medium">{r.employee_name || "—"}</p>
                      <p className="t-muted text-xs">{r.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 t-muted">{r.shift_name || "—"}</td>
                    <td className="px-4 py-3 t-muted">
                      {r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 t-muted">
                      {r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 t-muted">{r.productive_hours != null ? `${r.productive_hours}h` : "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm t-muted">
          <span>{total} records</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">←</button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
