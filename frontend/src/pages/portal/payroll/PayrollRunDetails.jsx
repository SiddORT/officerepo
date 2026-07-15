import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";

const STATUS_COLOR = {
  Draft:"#6B7280", Processing:"#3B82F6", Processed:"#F59E0B",
  Approved:"#10B981", Locked:"#8B5CF6", Paid:"#22C55E",
};

export default function PayrollRunDetails() {
  const { subdomain, runId } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000); };

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await portalPayrollApi.getRunDetail(subdomain, token, runId);
      setRun(r.data?.data || null);
    } catch { setError("Failed to load run."); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [runId]);

  const doAction = async (label, apiFn) => {
    if (!confirm(`${label}?`)) return;
    setActionBusy(true);
    try {
      await apiFn();
      showToast(`${label} successful.`);
      load();
    } catch (ex) {
      showToast(ex?.response?.data?.message || ex?.response?.data?.detail || "Action failed.", false);
    }
    setActionBusy(false);
  };

  if (loading) return <div className="text-center py-16" style={{ color:"var(--c-muted)" }}>Loading…</div>;
  if (error || !run) return (
    <div style={{ padding:"20px 0" }}>
      <div style={{ padding:"12px 16px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#f87171",fontSize:13,marginBottom:16 }}>
        {error || "Run not found."}
      </div>
      <button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>
    </div>
  );

  const statusColor = STATUS_COLOR[run.status] || "#6B7280";
  const employees = run.employees || [];
  const canProcess  = run.status === "Draft";
  const canApprove  = run.status === "Processed";
  const canLock     = run.status === "Approved";
  const canPay      = run.status === "Locked";
  const canGenSlips = ["Processed","Approved","Locked","Paid"].includes(run.status);

  return (
    <div className="space-y-6">
      {toast && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:2000,padding:"10px 18px",borderRadius:9,
          background:toast.ok?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",
          border:`1px solid ${toast.ok?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,
          color:toast.ok?"#4ade80":"#f87171",fontSize:13,fontWeight:500 }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding:"6px 12px",fontSize:12 }}>← Back</button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold" style={{ color:"var(--c-heading)" }}>{run.period_label}</h1>
              <span style={{ fontSize:12,padding:"3px 10px",borderRadius:12,fontWeight:600,
                background:statusColor+"22",color:statusColor }}>
                {run.status}
              </span>
            </div>
            <div style={{ fontSize:12,color:"var(--c-muted)",marginTop:2 }}>
              {run.run_number} {run.cycle_name && `· ${run.cycle_name}`}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          {canProcess && (
            <button disabled={actionBusy} onClick={() => doAction("Process payroll", () => portalPayrollApi.processRun(subdomain, token, run.id, {}))}
              className="btn-primary" style={{ fontSize:12 }}>
              {actionBusy ? "Processing…" : "▶ Process"}
            </button>
          )}
          {canApprove && (
            <button disabled={actionBusy} onClick={() => doAction("Approve payroll run", () => portalPayrollApi.approveRun(subdomain, token, run.id, {}))}
              className="btn-approve">
              {actionBusy ? "Approving…" : "✓ Approve"}
            </button>
          )}
          {canLock && (
            <button disabled={actionBusy} onClick={() => doAction("Lock payroll run", () => portalPayrollApi.lockRun(subdomain, token, run.id))}
              className="btn-primary" style={{ fontSize:12,background:"#8B5CF6" }}>
              {actionBusy ? "Locking…" : "🔒 Lock"}
            </button>
          )}
          {canPay && (
            <button disabled={actionBusy} onClick={() => doAction("Mark as Paid", () => portalPayrollApi.markPaid(subdomain, token, run.id))}
              className="btn-primary" style={{ fontSize:12,background:"#22C55E" }}>
              {actionBusy ? "Marking…" : "💳 Mark Paid"}
            </button>
          )}
          {canGenSlips && (
            <button disabled={actionBusy} onClick={() => doAction("Generate payslips", () => portalPayrollApi.generatePayslips(subdomain, token, run.id))}
              className="btn-secondary" style={{ fontSize:12 }}>
              📄 Generate Payslips
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label:"Employees",    value: run.total_employees,                       color:"#3B82F6" },
          { label:"Total Gross",  value:`₹${(run.total_gross||0).toLocaleString()}`, color:"#F59E0B" },
          { label:"Deductions",   value:`₹${(run.total_deductions||0).toLocaleString()}`, color:"#EF4444" },
          { label:"Net Pay",      value:`₹${(run.total_net||0).toLocaleString()}`,  color:"#10B981" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-4 text-center"
            style={{ background:"var(--c-surface)",border:"1px solid var(--c-border)" }}>
            <div style={{ fontSize:18,fontWeight:700,color:c.color }}>{c.value}</div>
            <div style={{ fontSize:12,color:"var(--c-muted)",marginTop:2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Employee table */}
      <div className="portal-table-wrap">
        <div style={{ padding:"14px 16px 10px",fontWeight:600,fontSize:14,color:"var(--c-heading)" }}>
          Employee Breakdown ({employees.length})
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Employee</th>
              <th>Structure</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Reimb.</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:30,textAlign:"center" }} className="t-muted">
                {canProcess ? "Click Process to compute salaries." : "No employees in this run."}
              </td></tr>
            ) : employees.map((emp, i) => (
              <tr key={emp.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{i+1}</td>
                <td>
                  <div style={{ fontWeight:600,fontSize:13 }}>{emp.employee_name}</div>
                  <div style={{ fontSize:11 }} className="t-muted">{emp.employee_code} {emp.designation_name && `· ${emp.designation_name}`}</div>
                </td>
                <td style={{ fontSize:12 }} className="t-muted">{emp.structure_name || "—"}</td>
                <td style={{ fontSize:12 }}>₹{(emp.gross_salary||0).toLocaleString()}</td>
                <td style={{ fontSize:12,color:"#EF4444" }}>₹{(emp.total_deductions||0).toLocaleString()}</td>
                <td style={{ fontSize:12,color:"#10B981" }}>₹{(emp.reimbursements||0).toLocaleString()}</td>
                <td style={{ fontSize:12,fontWeight:700,color:"var(--c-accent)" }}>₹{(emp.net_salary||0).toLocaleString()}</td>
                <td>
                  <span style={{ fontSize:11,padding:"2px 6px",borderRadius:8,
                    background:"rgba(34,197,94,0.1)",color:"#4ade80",fontWeight:500 }}>
                    {emp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
