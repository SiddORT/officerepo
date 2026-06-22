import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetReturnApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLORS = {
  Draft:         "bg-slate-100 text-slate-600 border-slate-200",
  Submitted:     "bg-blue-100 text-blue-700 border-blue-200",
  Approved:      "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected:      "bg-red-100 text-red-700 border-red-200",
  "In Progress": "bg-amber-100 text-amber-700 border-amber-200",
  Returned:      "bg-teal-100 text-teal-700 border-teal-200",
  Closed:        "bg-gray-100 text-gray-500 border-gray-200",
};

const CONDITION_COLORS = {
  Excellent: "bg-emerald-100 text-emerald-700",
  Good:      "bg-green-100 text-green-700",
  Fair:      "bg-amber-100 text-amber-700",
  Damaged:   "bg-orange-100 text-orange-700",
  Lost:      "bg-red-100 text-red-700",
};

const ACTIVITY_ICONS = {
  return_requested: "📋",
  return_submitted: "📤",
  return_approved:  "✅",
  return_rejected:  "❌",
  asset_returned:   "📦",
  assessment_saved: "🔍",
  recovery_created: "💰",
  return_closed:    "🔒",
};

const CONDITIONS = ["Excellent", "Good", "Fair", "Damaged", "Lost"];
const RECOVERY_TYPES = ["Full Recovery", "Partial Recovery", "Waived"];

export default function ReturnDetails() {
  const { subdomain, returnId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState("overview");
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Assessment form state
  const [assess, setAssess] = useState({
    physical_condition: "", functional_condition: "",
    accessories_returned: true, inspection_notes: "",
  });

  // Recovery form state
  const [recovery, setRecovery] = useState({
    recovery_type: "Full Recovery", estimated_cost: "",
    approved_recovery_amount: "", currency: "INR", recovery_notes: "",
  });

  // Complete return form state
  const [completeForm, setCompleteForm] = useState({
    physical_condition: "Good", functional_condition: "Good",
    accessories_returned: true, inspection_notes: "",
    return_date: "", received_by_name: "", receiving_location: "",
    return_notes: "", is_acknowledged: false,
  });

  // Reject modal
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Complete modal
  const [showComplete, setShowComplete] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetReturnApi.get(subdomain, token, returnId)
      .then(r => {
        const d = r.data.data;
        setData(d);
        if (d.assessment) {
          setAssess({
            physical_condition: d.assessment.physical_condition || "",
            functional_condition: d.assessment.functional_condition || "",
            accessories_returned: d.assessment.accessories_returned ?? true,
            inspection_notes: d.assessment.inspection_notes || "",
          });
        }
        if (d.recovery) {
          setRecovery({
            recovery_type: d.recovery.recovery_type || "Full Recovery",
            estimated_cost: d.recovery.estimated_cost ?? "",
            approved_recovery_amount: d.recovery.approved_recovery_amount ?? "",
            currency: d.recovery.currency || "INR",
            recovery_notes: d.recovery.recovery_notes || "",
          });
        }
      })
      .catch(() => setError("Failed to load return details."))
      .finally(() => setLoading(false));
  }, [subdomain, token, returnId]);

  useEffect(() => { load(); }, [load]);

  const flash = (msg, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      flash(successMsg);
      load();
    } catch (err) {
      flash(err.response?.data?.message || "Action failed.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit  = () => act(() => portalAssetReturnApi.submit(subdomain, token, returnId), "Return submitted.");
  const handleApprove = () => act(() => portalAssetReturnApi.approve(subdomain, token, returnId), "Return approved.");
  const handleClose   = () => act(() => portalAssetReturnApi.close(subdomain, token, returnId), "Return closed.");

  const handleReject = async () => {
    if (!rejectReason.trim()) { flash("Please enter a rejection reason.", true); return; }
    await act(() => portalAssetReturnApi.reject(subdomain, token, returnId, { reason: rejectReason }), "Return rejected.");
    setShowReject(false);
    setRejectReason("");
  };

  const handleComplete = async () => {
    await act(() => portalAssetReturnApi.complete(subdomain, token, returnId, completeForm), "Asset return completed.");
    setShowComplete(false);
  };

  const handleSaveAssessment = () =>
    act(() => portalAssetReturnApi.saveAssessment(subdomain, token, returnId, assess), "Assessment saved.");

  const handleSaveRecovery = () =>
    act(() => portalAssetReturnApi.saveRecovery(subdomain, token, returnId, recovery), "Recovery record saved.");

  if (loading) {
    return (
      <AssetLayout>
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>
      </AssetLayout>
    );
  }

  if (!data) {
    return (
      <AssetLayout>
        <div className="p-6 text-center text-red-500">Return not found.</div>
      </AssetLayout>
    );
  }

  const canSubmit  = data.status === "Draft";
  const canApprove = ["Draft", "Submitted"].includes(data.status);
  const canReject  = ["Draft", "Submitted", "Approved"].includes(data.status);
  const canComplete= ["Approved", "Submitted", "Draft", "In Progress"].includes(data.status);
  const canClose   = data.status === "Returned";

  const tabs = ["overview", "assessment", "recovery", "activities"];

  return (
    <AssetLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate(`/portal/${subdomain}/assets/returns`)}
              className="mt-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">{data.return_number}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[data.status] || "bg-gray-100 text-gray-500"}`}>
                  {data.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {data.asset_name}
                {data.asset_number && <span className="text-gray-400"> · {data.asset_number}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-end">
            {canSubmit && (
              <button
                disabled={busy}
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit for Approval
              </button>
            )}
            {canApprove && (
              <button
                disabled={busy}
                onClick={handleApprove}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                Approve
              </button>
            )}
            {canComplete && (
              <button
                disabled={busy}
                onClick={() => setShowComplete(true)}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                Complete Return
              </button>
            )}
            {canClose && (
              <button
                disabled={busy}
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                Close
              </button>
            )}
            {canReject && (
              <button
                disabled={busy}
                onClick={() => setShowReject(true)}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 -mb-px">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  tab === t
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
                {t === "assessment" && data.assessment && (
                  <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${CONDITION_COLORS[data.assessment.physical_condition] ? "bg-current" : "bg-blue-400"}`} />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Overview tab ────────────────────────────────── */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Asset & Assignment */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Asset & Assignment</h3>
              <Row label="Asset"       value={`${data.asset_name || "—"} ${data.asset_number ? `(${data.asset_number})` : ""}`} />
              <Row label="Category"    value={data.category_name} />
              <Row label="Assignment"  value={data.assignment_id ? (
                <Link to={`/portal/${subdomain}/assets/assignments/${data.assignment_id}`} className="text-blue-600 hover:underline text-xs">
                  View assignment →
                </Link>
              ) : "—"} />
              <Row label="Employee"    value={data.employee_name || data.assignee_name} />
            </div>

            {/* Return Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Return Info</h3>
              <Row label="Return Type"   value={data.return_type} />
              <Row label="Source"        value={data.return_source} />
              <Row label="Reason"        value={data.return_reason} />
              <Row label="Requested By"  value={data.requested_by_name} />
              <Row label="Requested Date" value={data.requested_return_date} />
            </div>

            {/* Processing */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Processing</h3>
              <Row label="Return Date"       value={data.return_date} />
              <Row label="Received By"       value={data.received_by_name} />
              <Row label="Receiving Location" value={data.receiving_location} />
              <Row label="Return Notes"      value={data.return_notes} />
            </div>

            {/* Approval */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Approval</h3>
              <Row label="Approved By"      value={data.approved_by_name} />
              <Row label="Approved At"      value={data.approved_at ? new Date(data.approved_at).toLocaleString() : null} />
              <Row label="Rejection Reason" value={data.rejection_reason} />
              {data.is_acknowledged && (
                <Row label="Acknowledged"   value={`${data.acknowledged_by_name || ""} at ${data.acknowledged_at ? new Date(data.acknowledged_at).toLocaleString() : ""}`} />
              )}
              {data.closed_at && (
                <Row label="Closed At"      value={new Date(data.closed_at).toLocaleString()} />
              )}
            </div>

            {data.remarks && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-gray-700">
                <span className="font-medium text-gray-500 mr-2">Remarks:</span>{data.remarks}
              </div>
            )}
          </div>
        )}

        {/* ── Assessment tab ───────────────────────────────── */}
        {tab === "assessment" && (
          <div className="max-w-lg space-y-5">
            {data.assessment && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recorded Assessment</h3>
                  {data.assessment.physical_condition && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${CONDITION_COLORS[data.assessment.physical_condition] || "bg-gray-100 text-gray-500"}`}>
                      {data.assessment.physical_condition}
                    </span>
                  )}
                </div>
                <Row label="Physical Condition"    value={data.assessment.physical_condition} />
                <Row label="Functional Condition"  value={data.assessment.functional_condition} />
                <Row label="Accessories Returned"  value={data.assessment.accessories_returned ? "Yes" : "No"} />
                <Row label="Inspection Notes"      value={data.assessment.inspection_notes} />
                <Row label="Assessed By"           value={data.assessment.assessed_by_name} />
                <Row label="Assessed At"           value={data.assessment.assessed_at ? new Date(data.assessment.assessed_at).toLocaleString() : null} />
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {data.assessment ? "Update Assessment" : "Add Assessment"}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Physical Condition</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={assess.physical_condition}
                    onChange={e => setAssess(p => ({ ...p, physical_condition: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Functional Condition</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={assess.functional_condition}
                    onChange={e => setAssess(p => ({ ...p, functional_condition: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assess.accessories_returned}
                  onChange={e => setAssess(p => ({ ...p, accessories_returned: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600"
                />
                All accessories returned
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspection Notes</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe the asset condition…"
                  value={assess.inspection_notes}
                  onChange={e => setAssess(p => ({ ...p, inspection_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end">
                <button
                  disabled={busy}
                  onClick={handleSaveAssessment}
                  className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save Assessment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Recovery tab ──────────────────────────────────── */}
        {tab === "recovery" && (
          <div className="max-w-lg space-y-5">
            {data.recovery && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recorded Recovery</h3>
                <Row label="Recovery Type"         value={data.recovery.recovery_type} />
                <Row label="Estimated Cost"        value={data.recovery.estimated_cost != null ? `${data.recovery.currency} ${Number(data.recovery.estimated_cost).toLocaleString()}` : null} />
                <Row label="Approved Amount"       value={data.recovery.approved_recovery_amount != null ? `${data.recovery.currency} ${Number(data.recovery.approved_recovery_amount).toLocaleString()}` : null} />
                <Row label="Notes"                 value={data.recovery.recovery_notes} />
                <Row label="Approved By"           value={data.recovery.approved_by_name} />
              </div>
            )}

            {/* Only show if damaged or lost */}
            {(data.assessment?.physical_condition === "Damaged" || data.assessment?.physical_condition === "Lost" || data.recovery) ? (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {data.recovery ? "Update Recovery" : "Add Recovery"}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Recovery Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={recovery.recovery_type}
                    onChange={e => setRecovery(p => ({ ...p, recovery_type: e.target.value }))}
                  >
                    {RECOVERY_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      value={recovery.estimated_cost}
                      onChange={e => setRecovery(p => ({ ...p, estimated_cost: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Approved Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      value={recovery.approved_recovery_amount}
                      onChange={e => setRecovery(p => ({ ...p, approved_recovery_amount: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                  <textarea
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Recovery notes…"
                    value={recovery.recovery_notes}
                    onChange={e => setRecovery(p => ({ ...p, recovery_notes: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={busy}
                    onClick={handleSaveRecovery}
                    className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save Recovery"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-700">
                Recovery records apply to damaged or lost assets. Complete the assessment first.
              </div>
            )}
          </div>
        )}

        {/* ── Activities tab ────────────────────────────────── */}
        {tab === "activities" && (
          <div className="max-w-2xl">
            {(!data.activities || data.activities.length === 0) ? (
              <div className="py-12 text-center text-gray-400 text-sm">No activity recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {data.activities.map(a => (
                  <div key={a.id} className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
                      {ACTIVITY_ICONS[a.event] || "📌"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{a.description}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                        </span>
                      </div>
                      {a.actor_name && (
                        <p className="text-xs text-gray-500 mt-0.5">by {a.actor_name}</p>
                      )}
                      {(a.old_value || a.new_value) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {a.old_value && <span className="line-through">{a.old_value}</span>}
                          {a.old_value && a.new_value && " → "}
                          {a.new_value && <span className="font-medium text-gray-600">{a.new_value}</span>}
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

      {/* ── Reject Modal ─────────────────────────────────────── */}
      {showReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Reject Return</h2>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Enter rejection reason…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowReject(false); setRejectReason(""); }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={handleReject}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Rejecting…" : "Reject Return"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Complete Return Modal ─────────────────────────────── */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 my-4">
            <h2 className="text-base font-semibold text-gray-900">Complete Return</h2>
            <p className="text-sm text-gray-500">Record the physical handover and condition assessment.</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Physical Condition <span className="text-red-500">*</span></label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={completeForm.physical_condition}
                  onChange={e => setCompleteForm(p => ({ ...p, physical_condition: e.target.value }))}
                >
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Functional Condition</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={completeForm.functional_condition}
                  onChange={e => setCompleteForm(p => ({ ...p, functional_condition: e.target.value }))}
                >
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={completeForm.return_date}
                  onChange={e => setCompleteForm(p => ({ ...p, return_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Received By</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Name of receiver"
                  value={completeForm.received_by_name}
                  onChange={e => setCompleteForm(p => ({ ...p, received_by_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Receiving Location</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. IT Store Room, HQ"
                value={completeForm.receiving_location}
                onChange={e => setCompleteForm(p => ({ ...p, receiving_location: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspection Notes</label>
              <textarea
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Condition observations…"
                value={completeForm.inspection_notes}
                onChange={e => setCompleteForm(p => ({ ...p, inspection_notes: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Notes</label>
              <textarea
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Handover notes…"
                value={completeForm.return_notes}
                onChange={e => setCompleteForm(p => ({ ...p, return_notes: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={completeForm.accessories_returned}
                onChange={e => setCompleteForm(p => ({ ...p, accessories_returned: e.target.checked }))}
                className="rounded border-gray-300 text-teal-600"
              />
              All accessories returned
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={completeForm.is_acknowledged}
                onChange={e => setCompleteForm(p => ({ ...p, is_acknowledged: e.target.checked }))}
                className="rounded border-gray-300 text-teal-600"
              />
              Acknowledge receipt (confirmation of physical handover)
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowComplete(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={handleComplete}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {busy ? "Completing…" : "Complete Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AssetLayout>
  );
}

function Row({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-400 flex-shrink-0 w-36">{label}</span>
      <span className="text-gray-800 text-right font-medium">{typeof value === "object" ? value : String(value)}</span>
    </div>
  );
}
