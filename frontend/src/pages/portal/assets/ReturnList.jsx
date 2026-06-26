import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetReturnApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:       "bg-slate-100 text-slate-600",
  Submitted:   "bg-blue-100 text-blue-700",
  Approved:    "bg-emerald-100 text-emerald-700",
  Rejected:    "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Returned:    "bg-teal-100 text-teal-700",
  Closed:      "bg-gray-100 text-gray-500",
};

const CONDITION_COLORS = {
  Excellent: "text-emerald-600",
  Good:      "text-green-600",
  Fair:      "text-amber-600",
  Damaged:   "text-orange-600",
  Lost:      "text-red-600",
};

export default function ReturnList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [overdueOnly, setOverdueOnly]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    setLoading(true);
    portalAssetReturnApi.list(subdomain, token, {
      page, page_size: PAGE_SIZE,
      search: search || undefined,
      status: filterStatus || undefined,
      overdue_only: overdueOnly || undefined,
    })
      .then(r => { setItems(r.data.data?.items || []); setTotal(r.data.data?.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus, overdueOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    portalAssetReturnApi.dashboard(subdomain, token)
      .then(r => setDashboard(r.data.data))
      .catch(() => {});
  }, [subdomain, token]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AssetLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Asset Returns</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage returned assets</p>
          </div>
          <Link
            to={`/portal/${subdomain}/assets/returns/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Return
          </Link>
        </div>

        {/* Dashboard cards */}
        {dashboard && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Active",          value: dashboard.total_active,    color: "text-blue-600",    bg: "bg-blue-50" },
              { label: "Overdue",         value: dashboard.overdue,         color: "text-red-600",     bg: "bg-red-50" },
              { label: "Returned Today",  value: dashboard.returned_today,  color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Damaged",         value: dashboard.damaged_returns, color: "text-orange-600",  bg: "bg-orange-50" },
              { label: "Lost",            value: dashboard.lost_assets,     color: "text-rose-600",    bg: "bg-rose-50" },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-lg p-3 text-center`}>
                <div className={`text-2xl font-bold ${c.color}`}>{c.value ?? 0}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Search returns…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <select
            className="border border-gray-200 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            {["Draft","Submitted","Approved","Rejected","In Progress","Returned","Closed"].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={e => { setOverdueOnly(e.target.checked); setPage(1); }}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            Overdue only
          </label>

          {(search || filterStatus || overdueOnly) && (
            <button
              onClick={() => { setSearch(""); setFilterStatus(""); setOverdueOnly(false); setPage(1); }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="portal-table-wrap">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading returns…</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📦</div>
              <p className="text-gray-500 text-sm">No return requests found.</p>
              <Link to={`/portal/${subdomain}/assets/returns/new`} className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                Create the first return request
              </Link>
            </div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Asset</th>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Return Date</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono text-xs text-blue-700 font-semibold">{r.return_number}</span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-800 text-sm">{r.asset_name || "—"}</div>
                      {r.asset_number && <div className="text-xs text-gray-400">{r.asset_number}</div>}
                    </td>
                    <td>
                      <div className="text-sm text-gray-700">{r.employee_name || r.assignee_name || "—"}</div>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600">{r.return_type}</span>
                    </td>
                    <td>
                      <span className="text-xs text-gray-600">
                        {r.return_date || r.requested_return_date || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${CONDITION_COLORS[r.assessment?.physical_condition] || "text-gray-500"}`}>
                        {r.assessment?.physical_condition || "—"}
                      </span>
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/portal/${subdomain}/assets/returns/${r.id}`)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{total} total</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-gray-500">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AssetLayout>
  );
}
