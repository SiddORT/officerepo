import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetMaintenanceApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const PRIORITY_COLOR = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_COLOR = {
  Open:                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Assigned:            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Under Inspection":  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Under Repair":      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Waiting For Parts": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Quality Check":     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Completed:           "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Closed:              "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  Cancelled:           "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

export default function MaintenanceList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [meta, setMeta] = useState(null);

  useEffect(() => {
    portalAssetMaintenanceApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || r.data))
      .catch(() => {});
    portalAssetMaintenanceApi.dashboard(subdomain, token)
      .then(r => setDashboard(r.data?.data || r.data))
      .catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    portalAssetMaintenanceApi.list(subdomain, token, {
      page, page_size: PAGE_SIZE,
      search: search || undefined,
      status: filterStatus || undefined,
      priority: filterPriority || undefined,
      maintenance_type: filterType || undefined,
    }).then(r => {
      const d = r.data?.data || r.data;
      setItems(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => setError("Failed to load maintenance requests."))
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus, filterPriority, filterType]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const dashCards = dashboard ? [
    { label: "Open",              value: dashboard.open,            color: "text-blue-600 dark:text-blue-400" },
    { label: "Under Repair",      value: dashboard.under_repair,    color: "text-orange-600 dark:text-orange-400" },
    { label: "Waiting For Parts", value: dashboard.waiting_for_parts, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Critical Open",     value: dashboard.critical_open,   color: "text-red-600 dark:text-red-400" },
    { label: "Quality Check",     value: dashboard.quality_check,   color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Completed Today",   value: dashboard.completed_today, color: "text-green-600 dark:text-green-400" },
  ] : [];

  return (
    <AssetLayout title="Asset Maintenance">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Asset Maintenance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage maintenance requests, repairs and service history</p>
        </div>
        <button
          onClick={() => navigate("new")}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <span className="text-lg leading-none">+</span> New Request
        </button>
      </div>

      {/* Dashboard cards */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {dashCards.map(c => (
            <div key={c.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 text-center">
              <div className={`text-2xl font-bold ${c.color}`}>{c.value ?? 0}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by number, asset, vendor…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="flex-1 min-w-48 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {(meta?.request_statuses || []).map(s => <option key={s}>{s}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Priorities</option>
            {(meta?.priorities || ["Low","Medium","High","Critical"]).map(p => <option key={p}>{p}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {(meta?.maintenance_types || []).map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {error && <div className="p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>}
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-2">🔧</div>
            <p className="text-gray-500 dark:text-gray-400">No maintenance requests found.</p>
            <button onClick={() => navigate("new")} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">
              Create first request →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Request #","Asset","Type","Priority","Reported By","Downtime","Status","Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400 font-medium">{item.request_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{item.asset_name || "—"}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.asset_number}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{item.maintenance_type}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[item.priority] || "bg-gray-100 text-gray-600"}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{item.reported_by_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {item.total_downtime_hours != null ? `${item.total_downtime_hours}h` : item.downtime_start ? "Active" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[item.status] || "bg-gray-100 text-gray-600"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {item.reported_date || item.created_at?.slice(0,10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">←</button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">→</button>
            </div>
          </div>
        )}
      </div>
    </div>
    </AssetLayout>
  );
}
