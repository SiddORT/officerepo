// @refresh reset
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Draft: "#94a3b8", Submitted: "#f59e0b", "Under Review": "#8b5cf6",
  Approved: "#3b82f6", Rejected: "#ef4444", Cancelled: "#6b7280",
  Disbursed: "#10b981", Closed: "#64748b",
};

const INST_COLORS = {
  Pending: "#f59e0b", Deducted: "#3b82f6", Paid: "#10b981",
  Skipped: "#94a3b8", Waived: "#8b5cf6",
};

const fmt = (n) => n != null ? Number(n).toLocaleString("en-IN") : "—";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-2" style={{ borderBottom: "1px solid var(--c-border)" }}>
      <span className="text-xs" style={{ color: "var(--c-muted)" }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: "var(--c-heading)" }}>{value || "—"}</span>
    </div>
  );
}

export default function LoanApplicationDetails() {
  const { subdomain, appId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [actionModal, setActionModal] = useState(null);
  const [actionData, setActionData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const load = () => {
    setLoading(true);
    portalLoanApi.getApplication(subdomain, token, appId)
      .then(r => setData(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, token, appId]);

  if (loading) return <PortalLayout title="Loan Details"><div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div></PortalLayout>;
  if (!data)   return <PortalLayout title="Loan Details"><div className="p-8 text-center text-sm text-red-400">Application not found.</div></PortalLayout>;

  const status = data.status;

  const performAction = async () => {
    setErr(""); setSubmitting(true);
    try {
      if (actionModal === "submit")   await portalLoanApi.submitApplication(subdomain, token, appId);
      if (actionModal === "approve")  await portalLoanApi.approveApplication(subdomain, token, appId, actionData);
      if (actionModal === "reject")   await portalLoanApi.rejectApplication(subdomain, token, appId, actionData);
      if (actionModal === "cancel")   await portalLoanApi.cancelApplication(subdomain, token, appId, actionData);
      if (actionModal === "disburse") await portalLoanApi.disburseApplication(subdomain, token, appId, actionData);
      if (actionModal === "close")    await portalLoanApi.closeApplication(subdomain, token, appId, actionData);
      setActionModal(null);
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Action failed.");
    } finally { setSubmitting(false); }
  };

  const openAction = (type) => {
    const defaults = {
      approve:  { approved_amount: data.requested_amount, approved_tenure: data.requested_tenure, interest_type: "Interest Free", interest_rate: 0, repayment_method: "EMI", comments: "" },
      reject:   { rejection_reason: "" },
      cancel:   { reason: "" },
      disburse: { disbursed_amount: data.approved_amount || data.requested_amount, disbursement_date: new Date().toISOString().slice(0,10), payment_method: "Bank Transfer", transaction_reference: "" },
      close:    { closure_type: "Regular", closure_date: new Date().toISOString().slice(0,10), outstanding_at_closure: data.principal_outstanding || 0, amount_recovered: data.principal_outstanding || 0, closure_notes: "" },
    };
    setActionData(defaults[type] || {});
    setActionModal(type);
    setErr("");
  };

  const TABS = ["overview","schedule","approvals","deductions","activities"];

  return (
    <PortalLayout title="Loan Details">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications`)} className="text-xs mb-2 inline-block" style={{ color: "#00aeec" }}>← Applications</button>
            <h1 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>{data.employee_name || "Loan Application"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono" style={{ color: "var(--c-muted)" }}>{data.application_number}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: `${STATUS_COLORS[status] || "#94a3b8"}22`, color: STATUS_COLORS[status] || "#94a3b8" }}>
                {status}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {status === "Draft"      && <ActionBtn label="Submit"   onClick={() => setActionModal("submit")} />}
            {status === "Submitted"  && <ActionBtn label="Approve"  onClick={() => openAction("approve")} color="#3b82f6" />}
            {status === "Submitted"  && <ActionBtn label="Reject"   onClick={() => openAction("reject")}  color="#ef4444" />}
            {["Draft","Submitted","Under Review","Approved"].includes(status) && <ActionBtn label="Cancel" onClick={() => openAction("cancel")} color="#6b7280" />}
            {status === "Approved"   && <ActionBtn label="Disburse" onClick={() => openAction("disburse")} color="#10b981" />}
            {status === "Disbursed"  && <ActionBtn label="Close Loan" onClick={() => openAction("close")} color="#8b5cf6" />}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ borderBottom: "1px solid var(--c-border)" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 text-sm font-medium capitalize whitespace-nowrap transition-colors"
              style={{ color: tab === t ? "#00aeec" : "var(--c-muted)", borderBottom: tab === t ? "2px solid #00aeec" : "2px solid transparent" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl p-4 space-y-0" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-heading)" }}>Application Details</h3>
              <InfoRow label="Employee"       value={data.employee_name} />
              <InfoRow label="Employee Code"  value={data.employee_code} />
              <InfoRow label="Department"     value={data.department_name} />
              <InfoRow label="Loan Type"      value={data.loan_type_name} />
              <InfoRow label="Requested Amount" value={`₹${fmt(data.requested_amount)}`} />
              <InfoRow label="Requested Tenure" value={`${data.requested_tenure} months`} />
              <InfoRow label="Purpose"        value={data.purpose} />
              <InfoRow label="EMI Start Date" value={data.emi_start_date} />
            </div>
            <div className="rounded-xl p-4 space-y-0" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--c-heading)" }}>Loan Summary</h3>
              <InfoRow label="Approved Amount"    value={data.approved_amount ? `₹${fmt(data.approved_amount)}` : "—"} />
              <InfoRow label="Approved Tenure"    value={data.approved_tenure ? `${data.approved_tenure} months` : "—"} />
              <InfoRow label="Interest Type"      value={data.interest_type || "—"} />
              <InfoRow label="Interest Rate"      value={data.interest_rate ? `${data.interest_rate}% p.a.` : "—"} />
              <InfoRow label="EMI Amount"         value={data.emi_amount ? `₹${fmt(data.emi_amount)}` : "—"} />
              <InfoRow label="Total Interest"     value={data.total_interest ? `₹${fmt(data.total_interest)}` : "—"} />
              <InfoRow label="Outstanding"        value={`₹${fmt(data.principal_outstanding)}`} />
              <InfoRow label="Total Paid"         value={`₹${fmt(data.total_paid)}`} />
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <div>
            {!data.schedule?.length ? (
              <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>Repayment schedule will be generated after disbursement.</div>
            ) : (
              <div className="rounded-xl overflow-auto" style={{ border: "1px solid var(--c-border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                      {["#","Due Date","Principal","Interest","EMI","Outstanding","Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.schedule.map((s, i) => (
                      <tr key={s.id} style={{ background: i % 2 === 0 ? "var(--c-surface)" : "transparent", borderBottom: "1px solid var(--c-border)" }}>
                        <td className="px-4 py-2 text-xs" style={{ color: "var(--c-muted)" }}>{s.installment_number}</td>
                        <td className="px-4 py-2 text-xs">{s.due_date}</td>
                        <td className="px-4 py-2 text-xs">₹{fmt(s.principal_amount)}</td>
                        <td className="px-4 py-2 text-xs">₹{fmt(s.interest_amount)}</td>
                        <td className="px-4 py-2 font-medium text-xs">₹{fmt(s.emi_amount)}</td>
                        <td className="px-4 py-2 text-xs">₹{fmt(s.outstanding_balance)}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${INST_COLORS[s.status] || "#94a3b8"}22`, color: INST_COLORS[s.status] || "#94a3b8" }}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "approvals" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
            {!data.approvals?.length ? (
              <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No approval records yet.</div>
            ) : data.approvals.map((a) => (
              <div key={a.id} className="px-5 py-4" style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium" style={{ color: "var(--c-heading)" }}>Step {a.step_number} — {a.approver_role}</span>
                    {a.approver_name && <span className="text-xs ml-2" style={{ color: "var(--c-muted)" }}>by {a.approver_name}</span>}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ background: a.status === "Approved" ? "#10b98122" : a.status === "Rejected" ? "#ef444422" : "#f59e0b22",
                             color: a.status === "Approved" ? "#10b981" : a.status === "Rejected" ? "#ef4444" : "#f59e0b" }}>
                    {a.status}
                  </span>
                </div>
                {a.comments && <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>{a.comments}</p>}
                {a.actioned_at && <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>{new Date(a.actioned_at).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "deductions" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
            {!data.deductions?.length ? (
              <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No payroll deductions recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                    {["Period","Amount","Deducted At","Run ID","Reversed"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-xs" style={{ color: "var(--c-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.deductions.map((d, i) => (
                    <tr key={d.id} style={{ background: i % 2 === 0 ? "var(--c-surface)" : "transparent", borderBottom: "1px solid var(--c-border)" }}>
                      <td className="px-4 py-2 text-xs">{d.period_month}/{d.period_year}</td>
                      <td className="px-4 py-2 font-medium text-xs">₹{fmt(d.deduction_amount)}</td>
                      <td className="px-4 py-2 text-xs">{d.deducted_at ? new Date(d.deducted_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2 text-xs font-mono" style={{ color: "var(--c-muted)" }}>{d.payroll_run_id || "—"}</td>
                      <td className="px-4 py-2 text-xs">{d.is_reversed ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "activities" && (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
            {!data.activities?.length ? (
              <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No activity recorded yet.</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
                {data.activities.map((a) => (
                  <div key={a.id} className="px-5 py-3" style={{ background: "var(--c-surface)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--c-heading)" }}>{a.action}</span>
                      <span className="text-xs" style={{ color: "var(--c-muted)" }}>{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    {a.actor && <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>By {a.actor}</p>}
                    {a.notes && <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{a.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h2 className="text-base font-bold capitalize" style={{ color: "var(--c-heading)" }}>
              {actionModal === "submit" ? "Submit Application" : actionModal.charAt(0).toUpperCase() + actionModal.slice(1) + " Loan"}
            </h2>
            {err && <div className="p-3 rounded-lg text-sm text-red-400" style={{ background: "#ef444422" }}>{err}</div>}

            {actionModal === "submit" && <p className="text-sm" style={{ color: "var(--c-muted)" }}>Submit this application for approval?</p>}

            {actionModal === "approve" && (
              <div className="space-y-3">
                {[
                  { k: "approved_amount",  label: "Approved Amount (₹)", type: "number" },
                  { k: "approved_tenure",  label: "Approved Tenure (months)", type: "number" },
                  { k: "interest_rate",    label: "Interest Rate (% p.a.)", type: "number" },
                  { k: "processing_fee",   label: "Processing Fee (₹)", type: "number" },
                  { k: "comments",         label: "Comments" },
                ].map(({ k, label, type = "text" }) => (
                  <div key={k}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
                    <input type={type} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      value={actionData[k] ?? ""}
                      onChange={e => setActionData(d => ({ ...d, [k]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Interest Type</label>
                  <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={actionData.interest_type || "Interest Free"}
                    onChange={e => setActionData(d => ({ ...d, interest_type: e.target.value }))}>
                    {["Interest Free","Flat","Reducing Balance"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Repayment Method</label>
                  <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={actionData.repayment_method || "EMI"}
                    onChange={e => setActionData(d => ({ ...d, repayment_method: e.target.value }))}>
                    {["EMI","Fixed Principal","Bullet"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}

            {actionModal === "reject" && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Rejection Reason *</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  value={actionData.rejection_reason || ""}
                  onChange={e => setActionData(d => ({ ...d, rejection_reason: e.target.value }))} />
              </div>
            )}

            {actionModal === "cancel" && (
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Reason (optional)</label>
                <textarea rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  value={actionData.reason || ""}
                  onChange={e => setActionData(d => ({ ...d, reason: e.target.value }))} />
              </div>
            )}

            {actionModal === "disburse" && (
              <div className="space-y-3">
                {[
                  { k: "disbursed_amount",       label: "Disbursed Amount (₹)", type: "number" },
                  { k: "disbursement_date",       label: "Disbursement Date", type: "date" },
                  { k: "transaction_reference",   label: "Transaction Reference" },
                  { k: "bank_account",            label: "Bank Account" },
                  { k: "remarks",                 label: "Remarks" },
                ].map(({ k, label, type = "text" }) => (
                  <div key={k}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
                    <input type={type} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      value={actionData[k] ?? ""}
                      onChange={e => setActionData(d => ({ ...d, [k]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Payment Method</label>
                  <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={actionData.payment_method || "Bank Transfer"}
                    onChange={e => setActionData(d => ({ ...d, payment_method: e.target.value }))}>
                    {["Bank Transfer","Cash","Cheque"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            )}

            {actionModal === "close" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>Closure Type</label>
                  <select className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    value={actionData.closure_type || "Regular"}
                    onChange={e => setActionData(d => ({ ...d, closure_type: e.target.value }))}>
                    {["Regular","Early","Settlement","Write-Off"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                {[
                  { k: "closure_date",           label: "Closure Date", type: "date" },
                  { k: "outstanding_at_closure",  label: "Outstanding at Closure (₹)", type: "number" },
                  { k: "amount_recovered",         label: "Amount Recovered (₹)", type: "number" },
                  { k: "closure_notes",            label: "Notes" },
                ].map(({ k, label, type = "text" }) => (
                  <div key={k}>
                    <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-muted)" }}>{label}</label>
                    <input type={type} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: "var(--c-input,#1e2533)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      value={actionData[k] ?? ""}
                      onChange={e => setActionData(d => ({ ...d, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setActionModal(null)} className="flex-1 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--c-border)", color: "var(--c-text)" }}>Cancel</button>
              <button onClick={performAction} disabled={submitting} className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}>{submitting ? "Processing…" : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}

function ActionBtn({ label, onClick, color = "#00aeec" }) {
  return (
    <button onClick={onClick} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
      style={{ background: color }}>{label}</button>
  );
}
