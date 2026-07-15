import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:      "bg-slate-100 text-slate-600",
  Submitted:  "bg-amber-100 text-amber-700",
  Approved:   "bg-green-100 text-green-700",
  Rejected:   "bg-red-100 text-red-700",
  Fulfilled:  "bg-emerald-100 text-emerald-700",
};
const PRIORITY_COLORS = { Low:"text-gray-500", Medium:"text-blue-500", High:"text-amber-500", Critical:"text-red-600" };

export default function AssignmentRequestList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asset_category_name: "", justification: "", priority: "Medium", required_by: "" });
  const [saving, setSaving] = useState(false);
  const [actionModal, setActionModal] = useState(null); // {type, id}
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    portalAssetApi.listAssignmentRequests(subdomain, token, { page, page_size: 20, search, status: filterStatus })
      .then(r => { setItems(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, search, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await portalAssetApi.createAssignmentRequest(subdomain, token, form);
      setShowModal(false);
      setForm({ asset_category_name: "", justification: "", priority: "Medium", required_by: "" });
      load();
    } catch (e) { alert(e?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  };

  const doAction = async (type, id) => {
    try {
      if (type === "submit")  await portalAssetApi.submitAssignmentRequest(subdomain, token, id);
      if (type === "approve") await portalAssetApi.approveAssignmentRequest(subdomain, token, id);
      if (type === "reject")  await portalAssetApi.rejectAssignmentRequest(subdomain, token, id, { reason: rejectReason });
      setActionModal(null); setRejectReason(""); load();
    } catch (e) { alert(e?.response?.data?.detail || "Action failed"); }
  };

  return (
    <AssetLayout title="Assignment Requests">
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assignment Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Employee requests for asset allocation</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white w-64"
          placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {["Draft","Submitted","Approved","Rejected","Fulfilled"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Request #</th>
              <th className="text-left px-4 py-3">Requested By</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Priority</th>
              <th className="text-left px-4 py-3">Required By</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No requests found.</td></tr>
            ) : items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.request_number}</td>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{r.requested_by_name || "—"}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{r.asset_category_name || r.asset_name || "—"}</td>
                <td className="px-4 py-3"><span className={`font-medium text-xs ${PRIORITY_COLORS[r.priority]}`}>{r.priority}</span></td>
                <td className="px-4 py-3 text-gray-500">{r.required_by || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    {r.status === "Draft" && <button onClick={() => doAction("submit", r.id)} className="text-xs text-amber-600 hover:underline">Submit</button>}
                    {r.status === "Submitted" && <>
                      <button onClick={() => doAction("approve", r.id)} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #22c55e", color: "#22c55e", background: "transparent", cursor: "pointer", fontWeight: 600 }}>✓ Approve</button>
                      <button onClick={() => setActionModal({type:"reject", id:r.id})} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid #ef4444", color: "#ef4444", background: "transparent", cursor: "pointer", fontWeight: 600 }}>✕ Reject</button>
                    </>}
                    {r.status === "Approved" && (
                      <Link to={`/portal/${subdomain}/assets/assignments/new?request_id=${r.id}`} className="text-xs text-blue-600 hover:underline">Fulfill</Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">New Asset Request</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Asset Category</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  value={form.asset_category_name} onChange={e => setForm(f => ({...f, asset_category_name: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Justification</label>
                <textarea rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  value={form.justification} onChange={e => setForm(f => ({...f, justification: e.target.value}))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Priority</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
                    {["Low","Medium","High","Critical"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Required By</label>
                  <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.required_by} onChange={e => setForm(f => ({...f, required_by: e.target.value}))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
              <button disabled={saving} onClick={save} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {saving ? "Saving…" : "Create Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {actionModal?.type === "reject" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Reject Request</h2>
            </div>
            <div className="p-5">
              <textarea rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                placeholder="Reason for rejection…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Cancel</button>
              <button onClick={() => doAction("reject", actionModal.id)} className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AssetLayout>
  );
}
