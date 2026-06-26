import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft:         "bg-slate-100 text-slate-600",
  Submitted:     "bg-amber-100 text-amber-700",
  "Under Review":"bg-purple-100 text-purple-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Withdrawn:     "bg-gray-100 text-gray-600",
};

export default function ResignationList() {
  const { subdomain } = useParams();
  const [sp] = useSearchParams();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]       = useState(sp.get("status") || "");
  const [sepType, setSepType]     = useState("");
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 20;

  const load = () => {
    setLoading(true);
    portalExitApi.listResignations(subdomain, {
      status: status || undefined,
      separation_type: sepType || undefined,
      page, page_size: PAGE_SIZE,
    }).then(r => { setItems(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [status, sepType]);
  useEffect(() => { load(); }, [subdomain, status, sepType, page]);

  const sepTypes = ["","Resignation","Termination","Retirement","Contract Completion","Layoff","End Of Internship","Absconding","Deceased"];
  const statuses = ["","Draft","Submitted","Under Review","Approved","Rejected","Withdrawn"];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Resignation Requests</h1>
        <Link to={`/portal/${subdomain}/hrms/exit/resignations/new`}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
          value={status} onChange={e => setStatus(e.target.value)}>
          {statuses.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
          value={sepType} onChange={e => setSepType(e.target.value)}>
          {sepTypes.map(s => <option key={s} value={s}>{s || "All Types"}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center text-gray-400 py-12">Loading…</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Number</th>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Resign Date</th>
                <th className="text-left px-4 py-3">Last Working Day</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{r.resignation_number}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.employee_id}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.separation_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.resignation_date}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.approved_last_working_day || r.requested_last_working_day}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/portal/${subdomain}/hrms/exit/resignations/${r.id}`}
                      className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No resignation requests found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex justify-center gap-2 mt-2">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Prev</button>
          <span className="text-sm text-gray-500 py-1">{page} / {Math.ceil(total / PAGE_SIZE)}</span>
          <button disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
