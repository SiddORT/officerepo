import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetTransferApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:        "bg-slate-100 text-slate-700",
  Submitted:    "bg-blue-100 text-blue-700",
  Approved:     "bg-emerald-100 text-emerald-700",
  Rejected:     "bg-red-100 text-red-700",
  "In Transit": "bg-amber-100 text-amber-700",
  Completed:    "bg-teal-100 text-teal-700",
  Cancelled:    "bg-gray-100 text-gray-500",
};

const CONDITION_OPTIONS = ["Excellent", "Good", "Fair", "Damaged"];

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TransferDetails() {
  const { subdomain, transferId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("overview");
  const [acting, setActing]     = useState(false);

  // Modal states
  const [rejectModal, setRejectModal]       = useState(false);
  const [cancelModal, setCancelModal]       = useState(false);
  const [handoverModal, setHandoverModal]   = useState(false);
  const [completeModal, setCompleteModal]   = useState(false);

  const [rejectReason, setRejectReason]     = useState("");
  const [cancelReason, setCancelReason]     = useState("");
  const [handoverForm, setHandoverForm]     = useState({ handover_date: "", condition_at_handover: "Good", handover_notes: "", handed_over_by_name: "" });
  const [completeForm, setCompleteForm]     = useState({ received_date: "", condition_at_receipt: "Good", receipt_notes: "", received_by_name: "" });

  const load = useCallback(() => {
    setLoading(true);
    portalAssetTransferApi.get(subdomain, token, transferId)
      .then(r => setTransfer(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, transferId]);

  useEffect(() => { load(); }, [load]);

  async function action(fn, successMsg) {
    setActing(true);
    try {
      await fn();
      load();
    } catch (err) {
      alert(err?.response?.data?.detail || successMsg || "Action failed.");
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <AssetLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
      </AssetLayout>
    );
  }

  if (!transfer) {
    return (
      <AssetLayout>
        <div className="p-6 text-gray-500 text-sm">Transfer not found.</div>
      </AssetLayout>
    );
  }

  const t = transfer;
  const statusColor = STATUS_COLORS[t.status] || "bg-gray-100 text-gray-600";
  const ack = t.acknowledgement;

  return (
    <AssetLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to={`/portal/${subdomain}/assets/transfers`}
            className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">{t.transfer_number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{t.status}</span>
              {t.is_temporary && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Temporary</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{t.transfer_type} · Created {t.created_at?.slice(0,10)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {t.status === "Draft" && (
            <>
              <button onClick={() => action(() => portalAssetTransferApi.submit(subdomain, token, t.id), "Submitted")}
                disabled={acting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Submit for Approval
              </button>
              <button onClick={() => setCancelModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                Cancel
              </button>
            </>
          )}
          {t.status === "Submitted" && (
            <>
              <button onClick={() => action(() => portalAssetTransferApi.approve(subdomain, token, t.id), "Approved")}
                disabled={acting}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                Approve
              </button>
              <button onClick={() => setRejectModal(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
                Reject
              </button>
            </>
          )}
          {t.status === "Approved" && (
            <>
              <button onClick={() => setHandoverModal(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
                Record Handover
              </button>
              <button onClick={() => setCompleteModal(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
                Complete Transfer
              </button>
            </>
          )}
          {t.status === "In Transit" && (
            <button onClick={() => setCompleteModal(true)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
              Confirm Receipt & Complete
            </button>
          )}
          {!["Completed","Cancelled","Rejected"].includes(t.status) && t.status !== "Draft" && t.status !== "Submitted" && t.status !== "Approved" && t.status !== "In Transit" && (
            <button onClick={() => setCancelModal(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              Cancel Transfer
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            {[
              { id: "overview",        label: "Overview" },
              { id: "handover",        label: "Handover" },
              { id: "activities",      label: "Activities" },
            ].map(tab_ => (
              <button key={tab_.id}
                onClick={() => setTab(tab_.id)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === tab_.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {tab_.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Asset */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Asset</h3>
              <div>
                <div className="text-base font-semibold text-gray-900">{t.asset_name}</div>
                <div className="text-sm text-gray-500">{t.asset_number} · {t.category_name}</div>
              </div>
            </div>

            {/* Transfer Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Transfer Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-800">{t.transfer_type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Reason</dt>
                  <dd className="font-medium text-gray-800">{t.transfer_reason || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Transfer Date</dt>
                  <dd className="font-medium text-gray-800">{t.transfer_date || "—"}</dd>
                </div>
                {t.is_temporary && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expected Return</dt>
                    <dd className="font-medium text-purple-700">{t.expected_return_date || "—"}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Requested By</dt>
                  <dd className="font-medium text-gray-800">{t.requested_by_name || "—"}</dd>
                </div>
                {t.approved_by_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Approved By</dt>
                    <dd className="font-medium text-gray-800">{t.approved_by_name}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* From (Source) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                From (Source)
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Assignee</dt>
                  <dd className="font-medium text-gray-800">{t.from_assignee_name || t.from_employee_name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-800">{t.from_assignee_type || "—"}</dd>
                </div>
                {t.from_branch_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Branch</dt>
                    <dd className="font-medium text-gray-800">{t.from_branch_name}</dd>
                  </div>
                )}
                {t.from_department_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Department</dt>
                    <dd className="font-medium text-gray-800">{t.from_department_name}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* To (Destination) */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                To (Destination)
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Assignee</dt>
                  <dd className="font-medium text-gray-800">{t.to_assignee_name || t.to_employee_name || "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-800">{t.to_assignee_type || "—"}</dd>
                </div>
                {t.to_branch_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Branch</dt>
                    <dd className="font-medium text-gray-800">{t.to_branch_name}</dd>
                  </div>
                )}
                {t.to_department_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Department</dt>
                    <dd className="font-medium text-gray-800">{t.to_department_name}</dd>
                  </div>
                )}
                {t.to_assignment_id && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">New Assignment</dt>
                    <dd className="text-xs text-teal-700 font-medium">Created ✓</dd>
                  </div>
                )}
              </dl>
            </div>

            {t.rejection_reason && (
              <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <strong>Rejection reason:</strong> {t.rejection_reason}
              </div>
            )}
            {t.cancel_reason && (
              <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
                <strong>Cancellation reason:</strong> {t.cancel_reason}
              </div>
            )}
            {t.remarks && (
              <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700">
                <strong>Remarks:</strong> {t.remarks}
              </div>
            )}
          </div>
        )}

        {/* ── Handover Tab ── */}
        {tab === "handover" && (
          <div className="space-y-4">
            {!ack ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                No handover recorded yet.
                {t.status === "Approved" && (
                  <div className="mt-3">
                    <button onClick={() => setHandoverModal(true)}
                      className="text-blue-600 hover:underline text-sm">Record handover →</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Source Handover */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    Source Handover
                    {ack.handover_confirmed && <span className="text-emerald-600 text-xs">✓ Confirmed</span>}
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd className="font-medium">{ack.handover_date || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Handed Over By</dt><dd className="font-medium">{ack.handed_over_by_name || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-gray-500">Condition</dt><dd className="font-medium">{ack.condition_at_handover || "—"}</dd></div>
                    {ack.handover_notes && <div><dt className="text-gray-500 mb-1">Notes</dt><dd className="text-gray-700">{ack.handover_notes}</dd></div>}
                  </dl>
                </div>

                {/* Destination Receipt */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    Destination Receipt
                    {ack.receipt_confirmed && <span className="text-emerald-600 text-xs">✓ Confirmed</span>}
                  </h3>
                  {!ack.receipt_confirmed ? (
                    <p className="text-sm text-gray-400">Awaiting receipt confirmation.</p>
                  ) : (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-gray-500">Date</dt><dd className="font-medium">{ack.received_date || "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Received By</dt><dd className="font-medium">{ack.received_by_name || "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-gray-500">Condition</dt><dd className="font-medium">{ack.condition_at_receipt || "—"}</dd></div>
                      {ack.receipt_notes && <div><dt className="text-gray-500 mb-1">Notes</dt><dd className="text-gray-700">{ack.receipt_notes}</dd></div>}
                    </dl>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Activities Tab ── */}
        {tab === "activities" && (
          <div className="space-y-3">
            {(!t.activities || t.activities.length === 0) ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
                No activities yet.
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                {t.activities.map(a => (
                  <div key={a.id} className="px-5 py-4 flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800 capitalize">
                          {a.event.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">{a.created_at?.slice(0,16).replace("T"," ")}</span>
                      </div>
                      {a.description && <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>}
                      {a.actor_name && <p className="text-xs text-gray-400 mt-0.5">by {a.actor_name}</p>}
                      {(a.old_value || a.new_value) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.old_value && <span className="line-through mr-1">{a.old_value}</span>}
                          {a.new_value && <span className="text-blue-600">{a.new_value}</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectModal && (
        <Modal title="Reject Transfer" onClose={() => setRejectModal(false)}>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this transfer is being rejected…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!rejectReason.trim()) return alert("Rejection reason is required.");
                action(
                  () => portalAssetTransferApi.reject(subdomain, token, t.id, { reason: rejectReason }),
                  "Rejected"
                );
                setRejectModal(false);
              }}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Confirm Rejection
            </button>
            <button onClick={() => setRejectModal(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <Modal title="Cancel Transfer" onClose={() => setCancelModal(false)}>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Reason for Cancellation</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why is this transfer being cancelled?"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                action(
                  () => portalAssetTransferApi.cancel(subdomain, token, t.id, { reason: cancelReason }),
                  "Cancelled"
                );
                setCancelModal(false);
              }}
              className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Confirm Cancellation
            </button>
            <button onClick={() => setCancelModal(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Go Back
            </button>
          </div>
        </Modal>
      )}

      {/* ── Handover Modal ── */}
      {handoverModal && (
        <Modal title="Record Source Handover" onClose={() => setHandoverModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handover Date</label>
              <input type="date" value={handoverForm.handover_date}
                onChange={e => setHandoverForm(f => ({ ...f, handover_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handed Over By</label>
              <input type="text" value={handoverForm.handed_over_by_name}
                onChange={e => setHandoverForm(f => ({ ...f, handed_over_by_name: e.target.value }))}
                placeholder="Person handing over the asset"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Condition</label>
              <select value={handoverForm.condition_at_handover}
                onChange={e => setHandoverForm(f => ({ ...f, condition_at_handover: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={handoverForm.handover_notes}
                onChange={e => setHandoverForm(f => ({ ...f, handover_notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                action(
                  () => portalAssetTransferApi.recordHandover(subdomain, token, t.id, handoverForm),
                  "Handover recorded"
                );
                setHandoverModal(false);
              }}
              className="flex-1 bg-amber-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              Confirm Handover
            </button>
            <button onClick={() => setHandoverModal(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Complete Modal ── */}
      {completeModal && (
        <Modal title="Complete Transfer" onClose={() => setCompleteModal(false)}>
          <p className="text-sm text-gray-500">Confirming receipt will close the old assignment and create a new one for the destination.</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
              <input type="date" value={completeForm.received_date}
                onChange={e => setCompleteForm(f => ({ ...f, received_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
              <input type="text" value={completeForm.received_by_name}
                onChange={e => setCompleteForm(f => ({ ...f, received_by_name: e.target.value }))}
                placeholder="Person receiving the asset"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asset Condition at Receipt</label>
              <select value={completeForm.condition_at_receipt}
                onChange={e => setCompleteForm(f => ({ ...f, condition_at_receipt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} value={completeForm.receipt_notes}
                onChange={e => setCompleteForm(f => ({ ...f, receipt_notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                action(
                  () => portalAssetTransferApi.complete(subdomain, token, t.id, completeForm),
                  "Transfer completed"
                );
                setCompleteModal(false);
              }}
              className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              Complete Transfer
            </button>
            <button onClick={() => setCompleteModal(false)}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </AssetLayout>
  );
}
