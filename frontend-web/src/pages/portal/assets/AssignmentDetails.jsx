import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Active:"bg-blue-100 text-blue-700", Returned:"bg-emerald-100 text-emerald-700",
  Transferred:"bg-purple-100 text-purple-700", Lost:"bg-red-100 text-red-700", Damaged:"bg-amber-100 text-amber-700",
};
const TABS = ["Overview","Acknowledgement","History"];

export default function AssignmentDetails() {
  const { subdomain, assignmentId } = useParams();
  const { token } = usePortalAuth();
  const [tab, setTab] = useState("Overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [working, setWorking] = useState(false);

  const load = useCallback(() =>
    portalAssetApi.getAssignment(subdomain, token, assignmentId)
      .then(r => setData(r.data)).catch(console.error)
      .finally(() => setLoading(false)),
  [subdomain, token, assignmentId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (type) => {
    setWorking(true);
    try {
      if (type === "return")   await portalAssetApi.returnAssignment(subdomain, token, assignmentId, form);
      if (type === "transfer") await portalAssetApi.transferAssignment(subdomain, token, assignmentId, form);
      if (type === "damage")   await portalAssetApi.reportDamage(subdomain, token, assignmentId, form);
      if (type === "lost")     await portalAssetApi.markLost(subdomain, token, assignmentId, form);
      if (type === "ack")      await portalAssetApi.acknowledgeAssignment(subdomain, token, assignmentId, form);
      await load();
      setModal(null); setForm({});
    } catch (e) { alert(e?.response?.data?.detail || "Action failed"); }
    finally { setWorking(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!data) return <div className="p-8 text-center text-gray-400">Assignment not found.</div>;

  const a = data;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = a.status === "Active" && a.expected_return_date && a.expected_return_date < today;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to={`/portal/${subdomain}/assets/assignments`} className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{a.assignment_number || "Assignment"}</h1>
          <p className="text-sm text-gray-500">{a.assignee_type} · {a.assignee_name || a.employee_name} · {a.assignment_type}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[a.status] || "bg-gray-100"}`}>{a.status}</span>
          {isOverdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">⚠️ Overdue</span>}
          {a.status === "Active" && !a.is_acknowledged &&
            <button onClick={() => setModal("ack")} className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg">Acknowledge</button>}
          {a.status === "Active" &&
            <button onClick={() => setModal("return")} className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg">Return</button>}
          {a.status === "Active" &&
            <button onClick={() => setModal("transfer")} className="bg-purple-600 text-white text-sm px-3 py-1.5 rounded-lg">Transfer</button>}
          {a.status === "Active" &&
            <button onClick={() => setModal("damage")} className="border border-amber-400 text-amber-600 text-sm px-3 py-1.5 rounded-lg">Report Damage</button>}
          {a.status === "Active" &&
            <button onClick={() => setModal("lost")} className="border border-red-400 text-red-600 text-sm px-3 py-1.5 rounded-lg">Mark Lost</button>}
        </div>
      </div>

      {/* Asset card */}
      {a.asset && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 p-4 flex items-center gap-4">
          <span className="text-3xl">📦</span>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{a.asset.asset_name}</p>
            <p className="text-sm text-gray-500">{a.asset.asset_number} · {a.asset.category_name} · {a.asset.brand} {a.asset.model_number}</p>
            {a.asset.serial_number && <p className="text-xs text-gray-400">S/N: {a.asset.serial_number}</p>}
          </div>
          <div className="ml-auto">
            <Link to={`/portal/${subdomain}/assets/inventory/${a.asset_id}`} className="text-sm text-blue-600 hover:underline">View Asset →</Link>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">

        {tab === "Overview" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              ["Assignment Number", a.assignment_number || "—"],
              ["Assignee", `${a.assignee_name || a.employee_name || "—"} (${a.assignee_type || "—"})`],
              ["Assignment Type", a.assignment_type || "—"],
              ["Source", a.assignment_source || "—"],
              ["Assigned Date", a.assigned_date || "—"],
              ["Expected Return", a.expected_return_date || "Permanent"],
              ["Actual Return", a.actual_return_date || "—"],
              ["Condition on Assign", a.condition_on_assign || "—"],
              ["Condition on Return", a.condition_on_return || "—"],
              ["Assigned By", a.assigned_by || "—"],
              ["Returned By", a.returned_by || "—"],
              ["Acknowledged", a.is_acknowledged ? `Yes (${a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleDateString() : ""})` : "No"],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-400">{k}</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{v}</p>
              </div>
            ))}
            {a.assignment_notes && (
              <div className="col-span-full">
                <p className="text-xs text-gray-400">Notes</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{a.assignment_notes}</p>
              </div>
            )}
            {a.return_notes && (
              <div className="col-span-full">
                <p className="text-xs text-gray-400">Return Notes</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{a.return_notes}</p>
              </div>
            )}
          </div>
        )}

        {tab === "Acknowledgement" && (
          <div>
            {!a.acknowledgement ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">This assignment has not been acknowledged yet.</p>
                {a.status === "Active" && (
                  <button onClick={() => setModal("ack")} className="bg-emerald-600 text-white text-sm px-5 py-2 rounded-lg">
                    Acknowledge Receipt
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm max-w-md">
                <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">Acknowledged</p>
                    <p className="text-gray-500 text-xs">by {a.acknowledgement.acknowledged_by_name}</p>
                  </div>
                </div>
                {[
                  ["Acknowledged By", a.acknowledgement.acknowledged_by_name],
                  ["Acknowledged At", a.acknowledgement.acknowledged_at ? new Date(a.acknowledgement.acknowledged_at).toLocaleString() : "—"],
                  ["Notes", a.acknowledgement.notes || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="text-gray-400 w-36">{k}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "History" && (
          <div className="space-y-3">
            {!(a.history || []).length ? <p className="text-gray-400">No history yet.</p> :
              (a.history || []).map(h => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{h.event}</p>
                    {h.description && <p className="text-gray-500">{h.description}</p>}
                    {(h.old_value || h.new_value) && (
                      <p className="text-xs text-gray-400 mt-0.5">{h.old_value} → {h.new_value}</p>
                    )}
                    <p className="text-xs text-gray-400">{h.actor_name} · {h.created_at ? new Date(h.created_at).toLocaleString() : ""}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Action Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white capitalize">
                {modal === "ack" ? "Acknowledge Receipt" : modal === "return" ? "Return Asset" :
                 modal === "transfer" ? "Transfer Asset" : modal === "damage" ? "Report Damage" : "Mark as Lost"}
              </h2>
              <button onClick={() => { setModal(null); setForm({}); }} className="text-gray-400">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {modal === "return" && <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Return Date</label>
                  <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.return_date || ""} onChange={e => setForm(f => ({...f, return_date: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Condition</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.condition_on_return || "Good"} onChange={e => setForm(f => ({...f, condition_on_return: e.target.value}))}>
                    {["Good","Damaged","Lost"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.return_notes || ""} onChange={e => setForm(f => ({...f, return_notes: e.target.value}))} />
                </div>
              </>}
              {modal === "transfer" && <>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Transfer To (Name) *</label>
                  <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.assignee_name || ""} onChange={e => setForm(f => ({...f, assignee_name: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assignee Type</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.assignee_type || "Employee"} onChange={e => setForm(f => ({...f, assignee_type: e.target.value}))}>
                    {["Employee","Department","Branch","Company"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reason</label>
                  <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.transfer_reason || ""} onChange={e => setForm(f => ({...f, transfer_reason: e.target.value}))} />
                </div>
              </>}
              {(modal === "damage" || modal === "lost") && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Notes</label>
                  <textarea rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={form.notes || ""} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
                </div>
              )}
              {modal === "ack" && (
                <>
                  <p className="text-sm text-gray-600">By confirming, you acknowledge receipt of this asset in the stated condition.</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
                    <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      value={form.notes || ""} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setModal(null); setForm({}); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Cancel</button>
              <button disabled={working} onClick={() => doAction(modal)}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                {working ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
