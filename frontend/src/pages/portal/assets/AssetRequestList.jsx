import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetRequestApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:          "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Submitted:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Under Review": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Approved:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Rejected:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Fulfilled:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Cancelled:      "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};
const PRIORITY_DOT = { Low: "bg-gray-400", Medium: "bg-blue-500", High: "bg-amber-500", Critical: "bg-red-600" };
const STATUSES = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Fulfilled", "Cancelled"];
const REQUEST_TYPES = ["New Asset", "Replacement", "Repair", "Software", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const EMPTY_FORM = {
  request_type: "New Asset",
  category_name: "",
  sub_category_name: "",
  free_text_asset: "",
  quantity: "1",
  justification: "",
  priority: "Medium",
  required_by: "",
  notes: "",
};

export default function AssetRequestList() {
  const { subdomain } = useParams();
  const { token, user } = usePortalAuth();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);

  const [actionModal, setActionModal] = useState(null); // {type, id, label}
  const [actionNote, setActionNote]   = useState("");
  const [acting, setActing]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetRequestApi.list(subdomain, token, {
      page, page_size: 20, search, status: filterStatus, priority: filterPriority,
    })
      .then(r => { setItems(r.data.data?.items || []); setTotal(r.data.data?.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus, filterPriority]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.request_type) return;
    setSaving(true);
    try {
      await portalAssetRequestApi.create(subdomain, token, {
        ...form,
        requested_by_name: user?.name || user?.email || "",
      });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to create request.");
    } finally { setSaving(false); }
  };

  const runAction = async () => {
    setActing(true);
    const { type, id } = actionModal;
    try {
      if (type === "submit")  await portalAssetRequestApi.submit(subdomain, token, id);
      if (type === "review")  await portalAssetRequestApi.review(subdomain, token, id);
      if (type === "approve") await portalAssetRequestApi.approve(subdomain, token, id, { notes: actionNote });
      if (type === "reject")  await portalAssetRequestApi.reject(subdomain, token, id, { reason: actionNote });
      if (type === "cancel")  await portalAssetRequestApi.cancel(subdomain, token, id);
      if (type === "fulfil")  await portalAssetRequestApi.fulfil(subdomain, token, id, { notes: actionNote });
      setActionModal(null); setActionNote(""); load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Action failed.");
    } finally { setActing(false); }
  };

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AssetLayout title="Asset Requests">
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Asset Requests</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Raise and track requests for new or replacement assets
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search requests…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={filterPriority}
          onChange={e => { setFilterPriority(e.target.value); setPage(1); }}
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(search || filterStatus || filterPriority) && (
          <button
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterPriority(""); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : !items.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm font-medium">No asset requests found</p>
            <p className="text-xs mt-1">Click &quot;New Request&quot; to raise one</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Request #</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Asset / Category</th>
                <th className="text-left px-4 py-3">Requested By</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Required By</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      to={`/portal/${subdomain}/assets/requests/${r.id}`}
                      className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {r.request_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{r.request_type}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                    {r.asset_master_name || r.free_text_asset || r.category_name || "—"}
                    {r.sub_category_name && (
                      <span className="text-xs text-gray-400 ml-1">({r.sub_category_name})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.requested_by_name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[r.priority] || "bg-gray-400"}`} />
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{r.required_by || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end items-center">
                      {r.status === "Draft" && (
                        <button onClick={() => setActionModal({ type: "submit", id: r.id, label: "Submit" })}
                          className="text-xs text-amber-600 hover:underline font-medium">Submit</button>
                      )}
                      {r.status === "Submitted" && (
                        <button onClick={() => setActionModal({ type: "review", id: r.id, label: "Mark Under Review" })}
                          className="text-xs text-blue-600 hover:underline font-medium">Review</button>
                      )}
                      {(r.status === "Submitted" || r.status === "Under Review") && (
                        <>
                          <button onClick={() => setActionModal({ type: "approve", id: r.id, label: "Approve", needsNote: true, notePlaceholder: "Approval notes (optional)" })}
                            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #22c55e", color: "#22c55e", background: "transparent", cursor: "pointer", fontWeight: 600 }}>✓ Approve</button>
                          <button onClick={() => setActionModal({ type: "reject", id: r.id, label: "Reject", needsNote: true, notePlaceholder: "Reason for rejection…" })}
                            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #ef4444", color: "#ef4444", background: "transparent", cursor: "pointer", fontWeight: 600 }}>✕ Reject</button>
                        </>
                      )}
                      {r.status === "Approved" && (
                        <button onClick={() => setActionModal({ type: "fulfil", id: r.id, label: "Mark Fulfilled", needsNote: true, notePlaceholder: "Fulfillment notes (optional)" })}
                          className="text-xs text-emerald-600 hover:underline font-medium">Fulfil</button>
                      )}
                      {["Draft", "Submitted", "Under Review"].includes(r.status) && (
                        <button onClick={() => setActionModal({ type: "cancel", id: r.id, label: "Cancel" })}
                          className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Cancel</button>
                      )}
                      <Link to={`/portal/${subdomain}/assets/requests/${r.id}`}
                        className="text-xs text-gray-400 hover:text-blue-600">→</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} total</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
              ‹ Prev
            </button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Asset Request</h2>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Request Type *</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}>
                    {REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                  <input type="number" min="1"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. IT Assets"
                    value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sub-Category</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Laptop"
                    value={form.sub_category_name} onChange={e => setForm(f => ({ ...f, sub_category_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Asset / Item Description</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Dell Latitude 5440 or Microsoft 365 licence"
                  value={form.free_text_asset} onChange={e => setForm(f => ({ ...f, free_text_asset: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Justification</label>
                <textarea rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Why do you need this asset?"
                  value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Priority</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Required By</label>
                  <input type="date"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.required_by} onChange={e => setForm(f => ({ ...f, required_by: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Additional Notes</label>
                <textarea rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any other details…"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button disabled={saving || !form.request_type} onClick={handleCreate}
                className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? "Creating…" : "Create Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">{actionModal.label}</h2>
            </div>
            {actionModal.needsNote && (
              <div className="p-5">
                <textarea rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={actionModal.notePlaceholder || ""}
                  value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </div>
            )}
            {!actionModal.needsNote && (
              <div className="p-5 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to <strong>{actionModal.label.toLowerCase()}</strong> this request?
              </div>
            )}
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setActionModal(null); setActionNote(""); }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button disabled={acting} onClick={runAction}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {acting ? "Processing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AssetLayout>
  );
}
