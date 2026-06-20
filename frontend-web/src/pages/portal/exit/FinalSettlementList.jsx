import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600",
  Calculated: "bg-amber-100 text-amber-700",
  Approved:   "bg-blue-100 text-blue-700",
  Paid:       "bg-emerald-100 text-emerald-700",
};

export default function FinalSettlementList() {
  const { subdomain } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // List all resignations, then surface those that have settlements
    portalExitApi.listResignations(subdomain, { page: 1, page_size: 50 })
      .then(r => {
        const all = r.data.items || [];
        const approved = all.filter(res => res.status === "Approved");
        setItems(approved);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Final Settlements</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approved resignations awaiting settlement processing</p>
      </div>

      {loading ? <div className="text-center text-gray-400 py-12">Loading…</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="text-left px-4 py-3">Resignation #</th>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">Type</th>
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
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.approved_last_working_day || r.requested_last_working_day}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/portal/${subdomain}/hrms/exit/resignations/${r.id}`}
                      className="text-blue-600 hover:underline text-xs">View Settlement</Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No approved resignations with pending settlement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
