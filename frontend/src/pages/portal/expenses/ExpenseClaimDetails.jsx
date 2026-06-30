import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";

const STATUS_BADGE = {
  Draft:              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Submitted:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Under Review":     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Approved:           "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Partially Approved": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Rejected:           "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Reimbursed:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Cancelled:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "Returned For Correction": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const TABS = ["Overview", "Line Items", "Approvals", "Receipts", "Activities"];

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ExpenseClaimDetails() {
  const { subdomain, claimId } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("Overview");
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = () => {
    setLoading(true);
    portalExpenseApi.getClaim(subdomain, claimId)
      .then(r => setClaim(r.data?.data || r.data))
      .catch(() => navigate(`/portal/${subdomain}/hrms/expenses/claims`))
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, claimId]);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const d = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const doAction = async () => {
    setSaving(true); setError("");
    try {
      if (actionModal === "submit")    await portalExpenseApi.submitClaim(subdomain, claimId);
      if (actionModal === "approve")   await portalExpenseApi.approveClaim(subdomain, claimId, actionForm);
      if (actionModal === "reject")    await portalExpenseApi.rejectClaim(subdomain, claimId, { reason: actionForm.reason || "", approver_name: actionForm.approver_name });
      if (actionModal === "cancel")    await portalExpenseApi.cancelClaim(subdomain, claimId, { reason: actionForm.reason });
      if (actionModal === "return")    await portalExpenseApi.returnClaim(subdomain, claimId, { reason: actionForm.reason || "" });
      if (actionModal === "reimburse") await portalExpenseApi.createReimbursement(subdomain, { claim_id: claimId, method: actionForm.method || "Payroll", notes: actionForm.notes });
      setActionModal(null); setActionForm({});
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await portalExpenseApi.deleteClaim(subdomain, claimId);
      navigate(`/portal/${subdomain}/hrms/expenses/claims`);
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;
  if (!claim) return null;

  const canSubmit    = ["Draft", "Returned For Correction"].includes(claim.status);
  const canApprove   = ["Submitted", "Under Review"].includes(claim.status);
  const canReject    = ["Submitted", "Under Review"].includes(claim.status);
  const canReturn    = ["Submitted", "Under Review"].includes(claim.status);
  const canCancel    = !["Reimbursed", "Cancelled", "Rejected"].includes(claim.status);
  const canReimburse = ["Approved", "Partially Approved"].includes(claim.status);
  const canEdit      = ["Draft", "Returned For Correction"].includes(claim.status);
  const canDelete    = ["Draft", "Returned For Correction", "Cancelled"].includes(claim.status);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to={`/portal/${subdomain}/hrms/expenses/claims`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">← Claims</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{claim.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{claim.claim_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[claim.status] || "bg-gray-100 text-gray-600"}`}>{claim.status}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {canEdit      && <EditIconBtn onClick={() => navigate(`/portal/${subdomain}/hrms/expenses/claims/${claimId}/edit`)} title="Edit claim" />}
          {canSubmit    && <button onClick={() => { setActionModal("submit"); setError(""); }} className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">Submit</button>}
          {canApprove   && <button onClick={() => { setActionModal("approve"); setActionForm({}); setError(""); }} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">Approve</button>}
          {canReject    && <button onClick={() => { setActionModal("reject"); setActionForm({}); setError(""); }} className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">Reject</button>}
          {canReturn    && <button onClick={() => { setActionModal("return"); setActionForm({}); setError(""); }} className="px-3 py-1.5 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors font-medium">Return</button>}
          {canReimburse && <button onClick={() => { setActionModal("reimburse"); setActionForm({ method: "Payroll" }); setError(""); }} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">Reimburse</button>}
          {canCancel    && <button onClick={() => { setActionModal("cancel"); setActionForm({}); setError(""); }} className="px-3 py-1.5 text-xs border border-red-300 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Cancel</button>}
          {canDelete    && <DeleteIconBtn onClick={() => setConfirmDelete(true)} title="Delete claim" />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Claim Details</h3>
            {[
              ["Category",    claim.category_name || "—"],
              ["Expense Date", d(claim.expense_date)],
              ["Currency",    claim.currency],
              ["Claimed Amount", `₹${fmt(claim.amount)}`],
              ["Approved Amount", claim.approved_amount != null ? `₹${fmt(claim.approved_amount)}` : "—"],
              ["Project",     claim.project || "—"],
              ["Cost Center", claim.cost_center || "—"],
              ["Client Ref",  claim.client_ref || "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">{k}</span>
                <span className="font-medium text-gray-900 dark:text-white text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {claim.description && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{claim.description}</p>
              </div>
            )}
            {claim.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason</h3>
                <p className="text-sm text-red-600 dark:text-red-400">{claim.rejection_reason}</p>
              </div>
            )}
            {claim.return_reason && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
                <h3 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Return Reason</h3>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">{claim.return_reason}</p>
              </div>
            )}
            {claim.reimbursement && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Reimbursement</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400">Amount</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">₹{fmt(claim.reimbursement.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400">Method</span>
                    <span className="text-emerald-700 dark:text-emerald-300">{claim.reimbursement.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400">Status</span>
                    <span className="text-emerald-700 dark:text-emerald-300">{claim.reimbursement.status}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Line Items */}
      {tab === "Line Items" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {claim.items?.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No line items — this is a single-line claim</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  {["Category", "Date", "Amount", "Tax", "Approved", "Notes"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {claim.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.category_name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{item.expense_date?.slice(0,10) || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{fmt(item.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.tax_amount ? `₹${fmt(item.tax_amount)}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.approved_amount != null ? `₹${fmt(item.approved_amount)}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[200px] truncate">{item.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-600">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Total</td>
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{fmt(claim.items.reduce((s, i) => s + i.amount, 0))}</td>
                  <td className="px-4 py-3 text-gray-500">₹{fmt(claim.items.reduce((s, i) => s + (i.tax_amount || 0), 0))}</td>
                  <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                    {claim.items.some(i => i.approved_amount != null) ? `₹${fmt(claim.items.reduce((s, i) => s + (i.approved_amount || 0), 0))}` : "—"}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Tab: Approvals */}
      {tab === "Approvals" && (
        <div className="space-y-3">
          {!claim.approvals?.length && <div className="text-center py-10 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">No approval records yet</div>}
          {claim.approvals?.map(a => (
            <div key={a.id} className={`bg-white dark:bg-gray-800 rounded-xl border p-4 ${
              a.status === "Approved" ? "border-emerald-200 dark:border-emerald-800" :
              a.status === "Rejected" ? "border-red-200 dark:border-red-800" :
              "border-gray-200 dark:border-gray-700"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Level {a.approval_level} — {a.approval_level === 1 ? "Manager" : "Finance"}
                  </span>
                  {a.approver_name && <span className="text-xs text-gray-500 dark:text-gray-400">by {a.approver_name}</span>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  a.status === "Approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                  a.status === "Rejected" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
                  a.status === "Pending"  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                  "bg-gray-100 text-gray-600"}`}>{a.status}</span>
              </div>
              {a.approved_amount != null && (
                <p className="text-sm text-gray-600 dark:text-gray-400">Approved ₹{fmt(a.approved_amount)}</p>
              )}
              {a.comments && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 italic">"{a.comments}"</p>}
              {a.actioned_at && <p className="text-xs text-gray-400 mt-1">{d(a.actioned_at)}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Tab: Receipts */}
      {tab === "Receipts" && (
        <div>
          {!claim.receipts?.length ? (
            <div className="text-center py-10 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <p>No receipts uploaded</p>
              <p className="text-xs mt-2 opacity-60">Receipt upload will be available in a future release</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {claim.receipts.map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <span className="text-2xl">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.file_name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{r.uploaded_at?.slice(0,10)} · {r.ocr_status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Activities */}
      {tab === "Activities" && (
        <div className="space-y-2">
          {!claim.activities?.length && <div className="text-center py-10 text-gray-400">No activity recorded</div>}
          {claim.activities?.map(a => (
            <div key={a.id} className="flex gap-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <span className="font-medium text-gray-900 dark:text-white capitalize">{a.activity.replace(/_/g," ")}</span>
                {a.description && <span className="text-gray-500 dark:text-gray-400"> — {a.description}</span>}
                <div className="text-xs text-gray-400 mt-0.5">{d(a.created_at)}{a.actor_name && ` · ${a.actor_name}`}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action modals */}
      {actionModal === "submit" && (
        <Modal title="Submit Claim" onClose={() => setActionModal(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Submit <strong>{claim.title}</strong> (₹{fmt(claim.amount)}) for approval?</p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={doAction} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg">
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </Modal>
      )}

      {actionModal === "approve" && (
        <Modal title="Approve Claim" onClose={() => setActionModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Your Name</label>
              <input type="text" value={actionForm.approver_name || ""} onChange={e => setActionForm(p => ({ ...p, approver_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Approved Amount (₹) — leave blank to approve full amount</label>
              <input type="number" value={actionForm.approved_amount || ""} onChange={e => setActionForm(p => ({ ...p, approved_amount: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder={`Max: ${fmt(claim.amount)}`}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Comments</label>
              <textarea value={actionForm.comments || ""} onChange={e => setActionForm(p => ({ ...p, comments: e.target.value }))} rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={doAction} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg">
                {saving ? "Approving…" : "Approve"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {(actionModal === "reject" || actionModal === "return" || actionModal === "cancel") && (
        <Modal title={actionModal === "reject" ? "Reject Claim" : actionModal === "return" ? "Return for Correction" : "Cancel Claim"} onClose={() => setActionModal(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Reason {actionModal !== "cancel" ? "*" : ""}
              </label>
              <textarea value={actionForm.reason || ""} onChange={e => setActionForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder={actionModal === "reject" ? "Reason for rejection…" : actionModal === "return" ? "What needs to be corrected…" : "Reason (optional)"} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Back</button>
              <button onClick={doAction} disabled={saving || (actionModal !== "cancel" && !actionForm.reason)}
                className={`px-4 py-2 text-sm disabled:opacity-50 text-white font-medium rounded-lg ${actionModal === "cancel" ? "bg-gray-600 hover:bg-gray-700" : actionModal === "return" ? "bg-yellow-500 hover:bg-yellow-600" : "bg-red-600 hover:bg-red-700"}`}>
                {saving ? "…" : actionModal === "reject" ? "Reject" : actionModal === "return" ? "Return" : "Cancel Claim"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {actionModal === "reimburse" && (
        <Modal title="Process Reimbursement" onClose={() => setActionModal(null)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Reimburse ₹{fmt(claim.approved_amount || claim.amount)} to employee</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Method</label>
              <select value={actionForm.method || "Payroll"} onChange={e => setActionForm(p => ({ ...p, method: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Payroll">Payroll</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
              <input type="text" value={actionForm.notes || ""} onChange={e => setActionForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={doAction} disabled={saving} className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-lg">
                {saving ? "Processing…" : "Process Reimbursement"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Claim"
        message="Delete this draft claim? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
