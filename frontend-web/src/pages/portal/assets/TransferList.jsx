import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetTransferApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:       "bg-slate-100 text-slate-600",
  Submitted:   "bg-blue-100 text-blue-700",
  Approved:    "bg-emerald-100 text-emerald-700",
  Rejected:    "bg-red-100 text-red-700",
  "In Transit": "bg-amber-100 text-amber-700",
  Completed:   "bg-teal-100 text-teal-700",
  Cancelled:   "bg-gray-100 text-gray-500",
};

const TYPE_ICONS = {
  "Employee Transfer":   "👤",
  "Department Transfer": "🏢",
  "Branch Transfer":     "🏬",
  "Company Transfer":    "🏭",
  "Temporary Transfer":  "⏱️",
};

export default function TransferList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [items, setItems]               = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType]     = useState("");
  const [tempOnly, setTempOnly]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [dashboard, setDashboard]       = useState(null);

  const PAGE_SIZE = 20;

  const load = useCallback(() => {
    setLoading(true);
    portalAssetTransferApi.list(subdomain, token, {
      page, page_size: PAGE_SIZE,
      search: search || undefined,
      status: filterStatus || undefined,
      transfer_type: filterType || undefined,
      is_temporary: tempOnly || undefined,
    })
      .then(r => {
        setItems(r.data.data?.items || []);
        setTotal(r.data.data?.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus, filterType, tempOnly]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    portalAssetTransferApi.dashboard(subdomain, token)
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
            <h1 className="text-xl font-semibold text-gray-900">Asset Transfers</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage asset reassignments between employees, departments and branches</p>
          </div>
          <Link
            to={`/portal/${subdomain}/assets/transfers/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Transfer
          </Link>
        </div>

        {/* Dashboard Cards */}
        {dashboard && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending", value: dashboard.pending_transfers, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "In Transit", value: dashboard.in_transit, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Temporary Active", value: dashboard.temporary_transfers, color: "text-purple-600", bg: "bg-purple-50" },
              { label: "Completed Today", value: dashboard.completed_today, color: "text-teal-600", bg: "bg-teal-50" },
            ].map(c => (
              <div key={c.label} className={`rounded-xl border border-gray-200 p-4 ${c.bg}`}>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value ?? 0}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search transfer#, asset, assignee…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {["Draft","Submitted","Approved","Rejected","In Transit","Completed","Cancelled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {["Employee Transfer","Department Transfer","Branch Transfer","Company Transfer","Temporary Transfer"].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={tempOnly}
              onChange={e => { setTempOnly(e.target.checked); setPage(1); }}
              className="rounded border-gray-300"
            />
            Temporary only
          </label>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-sm">No transfers found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["Transfer #","Asset","From","To","Type","Date","Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/portal/${subdomain}/assets/transfers/${t.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{t.transfer_number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 truncate max-w-[140px]">{t.asset_name || "—"}</div>
                      <div className="text-xs text-gray-400">{t.asset_number}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">{t.from_assignee_name || t.from_employee_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">{t.to_assignee_name || t.to_employee_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span>{TYPE_ICONS[t.transfer_type] || "🔄"}</span>
                        <span className="text-gray-600">{t.transfer_type?.replace(" Transfer","")}</span>
                      </span>
                      {t.is_temporary && (
                        <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Temp</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{t.transfer_date || t.created_at?.slice(0,10)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600"}`}>
                        {t.status}
                      </span>
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
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                ← Prev
              </button>
              <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AssetLayout>
  );
}
