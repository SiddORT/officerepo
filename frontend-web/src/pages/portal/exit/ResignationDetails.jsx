import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft:         "bg-slate-100 text-slate-600",
  Submitted:     "bg-amber-100 text-amber-700",
  "Under Review":"bg-purple-100 text-purple-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Withdrawn:     "bg-gray-100 text-gray-600",
};

const CLR_COLORS = { Pending: "text-amber-500", "In Progress": "text-blue-500", Completed: "text-green-600", Waived: "text-gray-400" };

const TABS = ["Overview","Notice Period","Clearances","Assets","Settlement","Documents","Interview","Activities"];

export default function ResignationDetails() {
  const { subdomain, resignationId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Overview");
  const [r, setR] = useState(null);
  const [notice, setNotice] = useState(null);
  const [clearances, setClearances] = useState([]);
  const [assets, setAssets] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [interview, setInterview] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({});
  const [working, setWorking] = useState(false);

  const loadMain = useCallback(() =>
    portalExitApi.getResignation(subdomain, resignationId).then(res => setR(res.data)), [subdomain, resignationId]);

  useEffect(() => {
    Promise.all([loadMain()])
      .finally(() => setLoading(false));
  }, [loadMain]);

  useEffect(() => {
    if (!r) return;
    if (tab === "Notice Period") portalExitApi.getNotice(subdomain, r.id).then(res => setNotice(res.data)).catch(() => {});
    if (tab === "Clearances")  portalExitApi.getClearances(subdomain, r.id).then(res => setClearances(res.data)).catch(() => {});
    if (tab === "Assets")      portalExitApi.listAssets(subdomain, r.id).then(res => setAssets(res.data)).catch(() => {});
    if (tab === "Settlement")  portalExitApi.getSettlement(subdomain, r.id).then(res => setSettlement(res.data)).catch(() => {});
    if (tab === "Documents")   portalExitApi.listDocuments(subdomain, r.id).then(res => setDocuments(res.data)).catch(() => {});
    if (tab === "Interview")   portalExitApi.getInterview(subdomain, r.id).then(res => setInterview(res.data)).catch(() => {});
    if (tab === "Activities")  portalExitApi.listActivities(subdomain, r.id).then(res => setActivities(res.data)).catch(() => {});
  }, [tab, r, subdomain]);

  const doAction = async (type, payload) => {
    setWorking(true);
    try {
      if (type === "submit")   await portalExitApi.submitResignation(subdomain, r.id);
      if (type === "approve")  await portalExitApi.approveResignation(subdomain, r.id, payload);
      if (type === "reject")   await portalExitApi.rejectResignation(subdomain, r.id, payload);
      if (type === "withdraw") await portalExitApi.withdrawResignation(subdomain, r.id);
      if (type === "generate_doc") await portalExitApi.generateDocument(subdomain, r.id, payload);
      await loadMain();
      setActionModal(null);
    } catch (e) { alert(e?.response?.data?.detail || "Action failed"); }
    finally { setWorking(false); }
  };

  const completeTask = async (taskId, status) => {
    await portalExitApi.updateClearanceTask(subdomain, r.id, taskId, { status });
    portalExitApi.getClearances(subdomain, r.id).then(res => setClearances(res.data));
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!r) return <div className="p-8 text-center text-gray-400">Resignation not found.</div>;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link to={`/portal/${subdomain}/hrms/exit/resignations`} className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{r.resignation_number}</h1>
          <p className="text-sm text-gray-500">{r.separation_type} · Employee: {r.employee_id}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] || "bg-gray-100"}`}>{r.status}</span>
          {r.status === "Draft"        && <button onClick={() => setActionModal("submit")} className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-lg">Submit</button>}
          {r.status === "Submitted"    && <button onClick={() => setActionModal("approve")} className="bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg">Approve</button>}
          {r.status === "Submitted"    && <button onClick={() => setActionModal("reject")} className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-lg">Reject</button>}
          {!["Rejected","Withdrawn","Approved"].includes(r.status) &&
            <button onClick={() => setActionModal("withdraw")} className="border border-gray-300 text-sm px-3 py-1.5 rounded-lg text-gray-600">Withdraw</button>}
          {r.status === "Draft" &&
            <Link to={`/portal/${subdomain}/hrms/exit/resignations/${r.id}/edit`}
              className="border border-gray-300 text-sm px-3 py-1.5 rounded-lg text-gray-600">Edit</Link>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm whitespace-nowrap font-medium border-b-2 transition ${
              tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">

        {tab === "Overview" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              ["Resignation Number", r.resignation_number],
              ["Employee ID", r.employee_id],
              ["Separation Type", r.separation_type],
              ["Resignation Date", r.resignation_date],
              ["Requested Last Working Day", r.requested_last_working_day],
              ["Approved Last Working Day", r.approved_last_working_day || "—"],
              ["Reason Category", r.reason_category || "—"],
              ["Status", r.status],
              ["Submitted At", r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"],
              ["Approved At", r.approved_at ? new Date(r.approved_at).toLocaleDateString() : "—"],
            ].map(([k,v]) => (
              <div key={k}>
                <p className="text-xs text-gray-400">{k}</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{v}</p>
              </div>
            ))}
            {r.reason_description && (
              <div className="col-span-full">
                <p className="text-xs text-gray-400">Reason Description</p>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{r.reason_description}</p>
              </div>
            )}
          </div>
        )}

        {tab === "Notice Period" && (
          <div>
            {!notice ? <p className="text-gray-400">Notice period not started yet.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  ["Required Days", notice.required_notice_days],
                  ["Start Date", notice.notice_start_date],
                  ["Expected End", notice.notice_end_date],
                  ["Actual End", notice.actual_end_date || "—"],
                  ["Served Days", notice.served_notice_days],
                  ["Status", notice.status],
                  ["Buyout Days", notice.buyout_days],
                  ["Buyout Amount", notice.buyout_amount ? `₹${notice.buyout_amount.toLocaleString()}` : "—"],
                  ["Waiver Days", notice.waiver_days],
                  ["Waiver Amount", notice.waiver_amount ? `₹${notice.waiver_amount.toLocaleString()}` : "—"],
                ].map(([k,v]) => (
                  <div key={k}>
                    <p className="text-xs text-gray-400">{k}</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "Clearances" && (
          <div className="space-y-5">
            {!clearances.length ? <p className="text-gray-400">Clearance workflow not started yet.</p> : clearances.map(c => (
              <div key={c.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800 dark:text-white">{c.department}</h3>
                  <span className={`text-xs font-medium ${CLR_COLORS[c.status] || "text-gray-500"}`}>{c.status}</span>
                </div>
                <div className="space-y-2">
                  {(c.tasks || []).map(task => (
                    <div key={task.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          task.status === "Completed" ? "bg-green-500 border-green-500" :
                          task.status === "Waived"    ? "bg-gray-300 border-gray-300" :
                          "border-gray-300"}`} />
                        <span className={task.status === "Completed" ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}>
                          {task.task_name} {task.is_mandatory && <span className="text-red-400">*</span>}
                        </span>
                      </div>
                      {task.status === "Pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => completeTask(task.id, "Completed")} className="text-xs text-green-600 hover:underline">Complete</button>
                          <button onClick={() => completeTask(task.id, "Waived")} className="text-xs text-gray-400 hover:underline">Waive</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Assets" && (
          <div className="space-y-3">
            {!assets.length ? <p className="text-gray-400">No asset recovery records yet.</p> : assets.map(a => (
              <div key={a.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{a.asset_name}</p>
                  <p className="text-xs text-gray-500">{a.asset_code && `${a.asset_code} · `}{a.action} · {a.condition || "—"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className={`font-medium ${a.action === "Returned" ? "text-green-600" : "text-red-500"}`}>{a.action}</p>
                  {a.recovery_amount > 0 && <p className="text-xs text-red-400">Recovery: ₹{a.recovery_amount.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Settlement" && (
          <div>
            {!settlement ? <p className="text-gray-400">Settlement not created yet.</p> : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Final Settlement</h3>
                  <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
                    settlement.status === "Paid" ? "bg-emerald-100 text-emerald-700" :
                    settlement.status === "Approved" ? "bg-blue-100 text-blue-700" :
                    settlement.status === "Calculated" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"}`}>{settlement.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-green-700 dark:text-green-400">Earnings</p>
                    {[["Pending Salary", settlement.pending_salary],["Leave Encashment", settlement.leave_encashment],
                      ["Reimbursements", settlement.approved_reimbursements],["Other", settlement.other_earnings]].map(([k,v]) => (
                      <div key={k} className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>{k}</span><span>₹{v.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-green-700 border-t pt-1">
                      <span>Total</span><span>₹{settlement.total_earnings.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-red-600 dark:text-red-400">Deductions</p>
                    {[["Loan Outstanding", settlement.loan_outstanding],["Notice Buyout", settlement.notice_buyout],
                      ["Asset Recovery", settlement.asset_recovery],["Advance Recovery", settlement.advance_recovery],["Other", settlement.other_deductions]].map(([k,v]) => (
                      <div key={k} className="flex justify-between text-gray-600 dark:text-gray-300">
                        <span>{k}</span><span>₹{v.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold text-red-600 border-t pt-1">
                      <span>Total</span><span>₹{settlement.total_deductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-800 dark:text-white">Net Amount</span>
                  <span className={`text-xl font-bold ${settlement.net_amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    ₹{settlement.net_amount.toLocaleString()}
                  </span>
                </div>
                {settlement.status === "Draft" &&
                  <button onClick={() => setActionModal("calc_settlement")} className="bg-amber-500 text-white text-sm px-4 py-2 rounded-lg">Calculate Settlement</button>}
                {settlement.status === "Calculated" &&
                  <button onClick={() => doAction("approve_settlement", {})} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">Approve Settlement</button>}
                {settlement.status === "Approved" &&
                  <button onClick={() => doAction("pay_settlement", {})} className="bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg">Mark Paid</button>}
              </div>
            )}
          </div>
        )}

        {tab === "Documents" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setActionModal("generate_doc")} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">Generate Document</button>
            </div>
            {!documents.length ? <p className="text-gray-400">No documents generated yet.</p> : documents.map(d => (
              <div key={d.id} className="flex items-center justify-between border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{d.document_type}</p>
                  <p className="text-xs text-gray-500">v{d.version} · {d.generated_at ? new Date(d.generated_at).toLocaleDateString() : "—"}</p>
                </div>
                <span className="text-xs text-gray-400">{d.file_name}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "Interview" && (
          <div>
            {!interview ? <p className="text-gray-400">Exit interview not scheduled yet.</p> : (
              <div className="space-y-3 text-sm">
                {[["Mode", interview.mode],["Status", interview.status],
                  ["Anonymous", interview.is_anonymous ? "Yes" : "No"],
                  ["Scheduled", interview.scheduled_at ? new Date(interview.scheduled_at).toLocaleDateString() : "—"],
                  ["Completed", interview.completed_at ? new Date(interview.completed_at).toLocaleDateString() : "—"],
                ].map(([k,v]) => (
                  <div key={k} className="flex gap-4">
                    <span className="text-gray-400 w-28">{k}</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{v}</span>
                  </div>
                ))}
                {interview.status === "Pending" &&
                  <Link to={`/portal/${subdomain}/hrms/exit/resignations/${r.id}/interview`}
                    className="inline-block mt-3 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
                    Complete Interview
                  </Link>}
              </div>
            )}
          </div>
        )}

        {tab === "Activities" && (
          <div className="space-y-3">
            {!activities.length ? <p className="text-gray-400">No activities yet.</p> : activities.map(a => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{a.title}</p>
                  {a.description && <p className="text-gray-500">{a.description}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{a.created_at ? new Date(a.created_at).toLocaleString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white capitalize">
                {actionModal.replace("_", " ")}
              </h2>
              <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {actionModal === "approve" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Approved Last Working Day</label>
                    <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      value={actionForm.approved_last_working_day || ""} onChange={e => setActionForm(f => ({...f, approved_last_working_day: e.target.value}))} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Comments</label>
                    <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                      value={actionForm.comments || ""} onChange={e => setActionForm(f => ({...f, comments: e.target.value}))} />
                  </div>
                </>
              )}
              {actionModal === "reject" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rejection Reason *</label>
                  <textarea rows={3} required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={actionForm.rejection_reason || ""} onChange={e => setActionForm(f => ({...f, rejection_reason: e.target.value}))} />
                </div>
              )}
              {actionModal === "submit"   && <p className="text-gray-600">Submit this resignation for review?</p>}
              {actionModal === "withdraw" && <p className="text-gray-600">Withdraw this resignation request?</p>}
              {actionModal === "generate_doc" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Document Type *</label>
                  <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                    value={actionForm.document_type || ""} onChange={e => setActionForm(f => ({...f, document_type: e.target.value}))}>
                    <option value="">Select type</option>
                    {["Experience Letter","Relieving Letter","Full & Final Settlement Letter","Exit Clearance Letter","No Objection Certificate"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setActionModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
              <button disabled={working} onClick={() => doAction(actionModal, actionForm)}
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
