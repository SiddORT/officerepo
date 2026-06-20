import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Pagination from "../shared/Pagination";

const STATUS_COLOR = {
  Draft:"#6B7280", Processing:"#3B82F6", Processed:"#F59E0B",
  Approved:"#10B981", Locked:"#8B5CF6", Paid:"#22C55E",
};

function NewRunModal({ cycles, onClose, onSave }) {
  const now = new Date();
  const [form, setForm] = useState({
    cycle_id: "",
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setErr("");
    try { await onSave({ ...form, period_month: parseInt(form.period_month), period_year: parseInt(form.period_year) }); }
    catch (ex) { setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Failed to create run."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:440,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>New Payroll Run</h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}
        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div>
            <label className="portal-form-label">Payroll Cycle</label>
            <select value={form.cycle_id} onChange={e => set("cycle_id", e.target.value)} className="input-field">
              <option value="">— No cycle —</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.cycle_name} ({c.frequency})</option>)}
            </select>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Month</label>
              <select value={form.period_month} onChange={e => set("period_month", e.target.value)} className="input-field">
                {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Year</label>
              <input type="number" min="2020" max="2100" value={form.period_year}
                onChange={e => set("period_year", e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={2} className="input-field" style={{ resize:"vertical" }} placeholder="Optional notes" />
          </div>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Creating…" : "Create Run"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayrollRunList() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalPayrollApi.listCycles(subdomain, token, { active_only: true, page_size: 100 })
      .then(r => setCycles(r.data?.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listRuns(subdomain, token, {
        status: statusFilter || undefined,
        year: yearFilter || undefined,
        page, page_size: PAGE_SIZE,
      });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, statusFilter, yearFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    const r = await portalPayrollApi.createRun(subdomain, token, form);
    const newRun = r.data?.data;
    showToast("Payroll run created.");
    setShowModal(false);
    if (newRun?.id) navigate(`/portal/${subdomain}/hrms/payroll/runs/${newRun.id}`);
    else load();
  };

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(y);

  return (
    <>
      {toast && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:2000,padding:"10px 18px",borderRadius:9,
          background:toast.ok?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",
          border:`1px solid ${toast.ok?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,
          color:toast.ok?"#4ade80":"#f87171",fontSize:13,fontWeight:500 }}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Payroll Runs" subtitle={`${total} run${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary" style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Run
          </button>
        }
      />

      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width:"auto",minWidth:160 }}>
          <option value="">All statuses</option>
          {["Draft","Processing","Processed","Approved","Locked","Paid"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={yearFilter} onChange={e => { setYearFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width:"auto",minWidth:120 }}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Run #</th>
              <th>Period</th>
              <th>Cycle</th>
              <th>Employees</th>
              <th>Gross</th>
              <th>Net Pay</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>🏃</div>
                <div className="t-muted" style={{ fontSize:13 }}>No payroll runs found.</div>
                <button onClick={() => setShowModal(true)} className="btn-primary" style={{ marginTop:12 }}>Create First Run</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id} onClick={() => navigate(`/portal/${subdomain}/hrms/payroll/runs/${item.id}`)}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td>
                  <span style={{ fontFamily:"monospace",fontSize:11,fontWeight:700 }} className="t-accent">
                    {item.run_number || "—"}
                  </span>
                </td>
                <td style={{ fontWeight:600 }}>{item.period_label}</td>
                <td style={{ fontSize:12 }} className="t-muted">{item.cycle_name || "—"}</td>
                <td style={{ fontSize:12,textAlign:"center" }}>{item.total_employees}</td>
                <td style={{ fontSize:12 }}>₹{(item.total_gross||0).toLocaleString()}</td>
                <td style={{ fontSize:12,fontWeight:600,color:"var(--c-accent)" }}>₹{(item.total_net||0).toLocaleString()}</td>
                <td>
                  <span style={{ fontSize:11,padding:"2px 8px",borderRadius:12,fontWeight:500,
                    background:(STATUS_COLOR[item.status]||"#6B7280")+"22",
                    color:STATUS_COLOR[item.status]||"#6B7280" }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign:"right" }}>
                  <button onClick={e => { e.stopPropagation(); navigate(`/portal/${subdomain}/hrms/payroll/runs/${item.id}`); }}
                    className="btn-secondary" style={{ padding:"4px 10px",fontSize:11 }}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(total/PAGE_SIZE)||1} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      {showModal && <NewRunModal cycles={cycles} onClose={() => setShowModal(false)} onSave={handleCreate} />}
    </>
  );
}
