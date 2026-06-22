import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetRequestApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft:          "bg-slate-100 text-slate-600",
  Submitted:      "bg-amber-100 text-amber-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Approved:       "bg-green-100 text-green-700",
  Rejected:       "bg-red-100 text-red-700",
  Fulfilled:      "bg-emerald-100 text-emerald-700",
  Cancelled:      "bg-gray-100 text-gray-500",
};
const PRIORITY_COLORS = { Low: "text-gray-500", Medium: "text-blue-600", High: "text-amber-600", Critical: "text-red-600 font-semibold" };

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
      <dd className="text-sm text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

export default function AssetRequestDetails() {
  const { subdomain, requestId } = useParams();
  const { token } = usePortalAuth();
  const [req, setReq]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [actionNote, setActionNote]   = useState("");
  const [acting, setActing]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetRequestApi.get(subdomain, token, requestId)
      .then(r => setReq(r.data.data || r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, requestId]);

  useEffect(() => { load(); }, [load]);

  const runAction = async () => {
    setActing(true);
    const { type } = actionModal;
    try {
      if (type === "submit")  await portalAssetRequestApi.submit(subdomain, token, requestId);
      if (type === "review")  await portalAssetRequestApi.review(subdomain, token, requestId);
      if (type === "approve") await portalAssetRequestApi.approve(subdomain, token, requestId, { notes: actionNote });
      if (type === "reject")  await portalAssetRequestApi.reject(subdomain, token, requestId, { reason: actionNote });
      if (type === "cancel")  await portalAssetRequestApi.cancel(subdomain, token, requestId);
      if (type === "fulfil")  await portalAssetRequestApi.fulfil(subdomain, token, requestId, { notes: actionNote });
      setActionModal(null); setActionNote(""); load();
    } catch (e) {
      alert(e?.response?.data?.detail || "Action failed.");
    } finally { setActing(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (!req) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <p className="text-sm">Request not found.</p>
      <Link to={`/portal/${subdomain}/assets/requests`} className="mt-3 text-xs text-blue-600 hover:underline">← Back to Requests</Link>
    </div>
  );

  const statusColor = STATUS_COLORS[req.status] || "bg-gray-100 text-gray-600";
  const isEditable = req.status === "Draft";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to={`/portal/${subdomain}/assets/requests`} className="hover:text-blue-600 transition-colors">
          Asset Requests
        </Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-gray-300 font-mono">{req.request_number}</span>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white font-mono">{req.request_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>{req.status}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{req.request_type}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {req.status === "Draft" && (
            <button onClick={() => setActionModal({ type: "submit", label: "Submit Request" })}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-medium">
              Submit
            </button>
          )}
          {req.status === "Submitted" && (
            <button onClick={() => setActionModal({ type: "review", label: "Mark Under Review" })}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium">
              Mark Under Review
            </button>
          )}
          {(req.status === "Submitted" || req.status === "Under Review") && (
            <>
              <button onClick={() => setActionModal({ type: "approve", label: "Approve Request", needsNote: true, notePlaceholder: "Approval notes (optional)" })}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg font-medium">
                Approve
              </button>
              <button onClick={() => setActionModal({ type: "reject", label: "Reject Request", needsNote: true, notePlaceholder: "Reason for rejection…" })}
                className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg font-medium">
                Reject
              </button>
            </>
          )}
          {req.status === "Approved" && (
            <button onClick={() => setActionModal({ type: "fulfil", label: "Mark as Fulfilled", needsNote: true, notePlaceholder: "Fulfillment notes (optional)" })}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium">
              Mark Fulfilled
            </button>
          )}
          {["Draft", "Submitted", "Under Review"].includes(req.status) && (
            <button onClick={() => setActionModal({ type: "cancel", label: "Cancel Request" })}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm px-4 py-2 rounded-lg font-medium">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left — main details */}
        <div className="md:col-span-2 space-y-5">
          {/* Asset details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Asset Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Category" value={req.category_name} />
              <Field label="Sub-Category" value={req.sub_category_name} />
              <Field label="Asset / Item" value={req.asset_master_name || req.free_text_asset} />
              <Field label="Specific Asset" value={req.specific_asset_name} />
              <Field label="Quantity" value={req.quantity} />
              <Field label="Request Type" value={req.request_type} />
            </dl>
            {req.justification && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Justification</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{req.justification}</dd>
              </div>
            )}
            {req.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Notes</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{req.notes}</dd>
              </div>
            )}
          </div>

          {/* Approval / rejection details (when applicable) */}
          {(req.approved_at || req.rejected_at || req.fulfilled_at) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Workflow History</h2>
              <div className="space-y-4">
                {req.approved_at && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold flex-shrink-0">✓</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Approved by {req.approved_by_name || "—"}</p>
                      <p className="text-xs text-gray-400">{new Date(req.approved_at).toLocaleString()}</p>
                      {req.approval_notes && <p className="text-xs text-gray-500 mt-1">{req.approval_notes}</p>}
                    </div>
                  </div>
                )}
                {req.rejected_at && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">✕</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejected by {req.rejected_by_name || "—"}</p>
                      <p className="text-xs text-gray-400">{new Date(req.rejected_at).toLocaleString()}</p>
                      {req.rejection_reason && <p className="text-xs text-gray-500 mt-1 italic">"{req.rejection_reason}"</p>}
                    </div>
                  </div>
                )}
                {req.fulfilled_at && (
                  <div className="flex gap-3">
                    <span className="mt-0.5 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold flex-shrink-0">✔</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Fulfilled by {req.fulfilled_by_name || "—"}</p>
                      <p className="text-xs text-gray-400">{new Date(req.fulfilled_at).toLocaleString()}</p>
                      {req.fulfillment_notes && <p className="text-xs text-gray-500 mt-1">{req.fulfillment_notes}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — meta */}
        <div className="space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Request Info</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Requested By</dt>
                <dd className="text-sm text-gray-800 dark:text-gray-200 font-medium">{req.requested_by_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Department</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300">{req.department_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Priority</dt>
                <dd className={`text-sm font-medium ${PRIORITY_COLORS[req.priority] || "text-gray-600"}`}>{req.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Required By</dt>
                <dd className="text-sm text-gray-700 dark:text-gray-300">{req.required_by || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Created</dt>
                <dd className="text-xs text-gray-400">{req.created_at ? new Date(req.created_at).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Last Updated</dt>
                <dd className="text-xs text-gray-400">{req.updated_at ? new Date(req.updated_at).toLocaleString() : "—"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">{actionModal.label}</h2>
            </div>
            {actionModal.needsNote ? (
              <div className="p-5">
                <textarea rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={actionModal.notePlaceholder || ""}
                  value={actionNote} onChange={e => setActionNote(e.target.value)} />
              </div>
            ) : (
              <div className="p-5 text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to proceed?
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
  );
}
