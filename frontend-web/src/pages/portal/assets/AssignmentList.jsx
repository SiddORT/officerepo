import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalNavContext";
import { portalAssetApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Active:      "bg-blue-100 text-blue-700",
  Returned:    "bg-emerald-100 text-emerald-700",
  Transferred: "bg-purple-100 text-purple-700",
  Lost:        "bg-red-100 text-red-700",
  Damaged:     "bg-amber-100 text-amber-700",
};
const ASSIGNEE_ICONS = { Employee:"👤", Department:"🏢", Branch:"🏬", Company:"🏭" };

export default function AssignmentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetApi.listAssignments(subdomain, token, {
      page, page_size: 20, search, status: filterStatus,
      assignee_type: filterType, overdue_only: overdueOnly,
    })
      .then(r => { setItems(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus, filterType, overdueOnly]);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Asset Assignments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total assignments</p>
        </div>
        <Link to={`/portal/${subdomain}/assets/assignments/new`}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + Assign Asset
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white w-56"
          placeholder="Search…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {["Active","Returned","Transferred","Lost","Damaged"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
          <option value="">All Assignees</option>
          {["Employee","Department","Branch","Company"].map(t => <option key={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={e => setOverdueOnly(e.target.checked)} />
          Overdue Only
        </label>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Assignment #</th>
              <th className="text-left px-4 py-3">Asset</th>
              <th className="text-left px-4 py-3">Assignee</th>
              <th className="text-left px-4 py-3">Assigned</th>
              <th className="text-left px-4 py-3">Expected Return</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Ack</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No assignments found.</td></tr>
            ) : items.map(a => {
              const isOverdue = a.status === "Active" && a.expected_return_date && a.expected_return_date < today;
              return (
                <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.assignment_number || "—"}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{a.asset?.asset_name || "—"}</p>
                    <p className="text-xs text-gray-400">{a.asset?.asset_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span title={a.assignee_type}>{ASSIGNEE_ICONS[a.assignee_type] || "👤"}</span>
                      <span className="text-gray-700 dark:text-gray-300">{a.assignee_name || a.employee_name || "—"}</span>
                    </div>
                    <p className="text-xs text-gray-400 ml-5">{a.assignee_type}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.assigned_date || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={isOverdue ? "text-red-500 font-medium" : "text-gray-600 dark:text-gray-300"}>
                      {a.expected_return_date || "—"}
                      {isOverdue && " ⚠️"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {a.is_acknowledged
                      ? <span className="text-xs text-emerald-600">✓ Ack'd</span>
                      : <span className="text-xs text-amber-500">Pending</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/portal/${subdomain}/assets/assignments/${a.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex gap-2 justify-center text-sm">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span className="px-3 py-1 text-gray-500">Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
