import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi, portalEmployeeApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const STATUS_COLOR = { Active:"#10B981", Revised:"#F59E0B", Inactive:"#6B7280" };

function CompensationModal({ initial, structures, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    employee_id: initial?.employee_id || "",
    employee_name: initial?.employee_name || "",
    employee_code: initial?.employee_code || "",
    department_name: initial?.department_name || "",
    designation_name: initial?.designation_name || "",
    structure_id: initial?.structure_id || "",
    structure_name: initial?.structure_name || "",
    ctc_annual: initial?.ctc_annual ?? "",
    gross_monthly: initial?.gross_monthly ?? "",
    currency: initial?.currency || "INR",
    effective_from: initial?.effective_from || "",
    effective_to: initial?.effective_to || "",
    revision_reason: initial?.revision_reason || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleStructureChange = (structId) => {
    const s = structures.find(s => s.id === structId);
    set("structure_id", structId);
    set("structure_name", s?.structure_name || "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employee_id.trim()) { setErr("Employee ID is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({
        ...form,
        ctc_annual: form.ctc_annual !== "" ? parseFloat(form.ctc_annual) : null,
        gross_monthly: form.gross_monthly !== "" ? parseFloat(form.gross_monthly) : null,
      });
    } catch (ex) { setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:560,display:"flex",flexDirection:"column",gap:14,maxHeight:"90vh",overflow:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>
            {isEdit ? "Edit Compensation" : "Assign Compensation"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}
        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Employee ID</label>
              <input value={form.employee_id} onChange={e => set("employee_id", e.target.value)}
                placeholder="Employee UUID" className="input-field" disabled={isEdit} />
            </div>
            <div>
              <label className="portal-form-label">Employee Code</label>
              <input value={form.employee_code} onChange={e => set("employee_code", e.target.value)}
                placeholder="EMP-001" className="input-field" />
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Name</label>
              <input value={form.employee_name} onChange={e => set("employee_name", e.target.value)}
                placeholder="Full name" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Designation</label>
              <input value={form.designation_name} onChange={e => set("designation_name", e.target.value)}
                placeholder="Software Engineer" className="input-field" />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Salary Structure</label>
            <select value={form.structure_id} onChange={e => handleStructureChange(e.target.value)} className="input-field">
              <option value="">— No structure —</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.structure_name}</option>)}
            </select>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">CTC (Annual)</label>
              <input type="number" step="0.01" value={form.ctc_annual}
                onChange={e => set("ctc_annual", e.target.value)}
                placeholder="e.g. 600000" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Gross Monthly</label>
              <input type="number" step="0.01" value={form.gross_monthly}
                onChange={e => set("gross_monthly", e.target.value)}
                placeholder="e.g. 50000" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Currency</label>
              <select value={form.currency} onChange={e => set("currency", e.target.value)} className="input-field">
                <option>INR</option><option>USD</option><option>GBP</option><option>AED</option>
              </select>
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Effective From</label>
              <input type="date" value={form.effective_from} onChange={e => set("effective_from", e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Effective To</label>
              <input type="date" value={form.effective_to} onChange={e => set("effective_to", e.target.value)} className="input-field" />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="portal-form-label">Revision Reason</label>
              <textarea value={form.revision_reason} onChange={e => set("revision_reason", e.target.value)}
                rows={2} className="input-field" placeholder="Reason for revision" style={{ resize:"vertical" }} />
            </div>
          )}
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeeCompensationList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalPayrollApi.listStructures(subdomain, token, { active_only: true, page_size: 100 })
      .then(r => setStructures(r.data?.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listCompensations(subdomain, token, {
        status: statusFilter || undefined, page, page_size: PAGE_SIZE,
      });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalPayrollApi.updateCompensation(subdomain, token, modal.item.id, form);
      showToast("Compensation updated.");
    } else {
      await portalPayrollApi.createCompensation(subdomain, token, form);
      showToast("Compensation assigned.");
    }
    setModal(null); setPage(1); load();
  };

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
      <PageHeader title="Employee Compensation" subtitle={`${total} record${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Assign Compensation
          </button>
        }
      />

      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width:"auto",minWidth:160 }}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Revised</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Employee</th>
              <th>Structure</th>
              <th>CTC (Annual)</th>
              <th>Gross Monthly</th>
              <th>Effective From</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>💼</div>
                <div className="t-muted" style={{ fontSize:13 }}>No compensation records found.</div>
                <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ marginTop:12 }}>Assign First Compensation</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td>
                  <div style={{ fontWeight:600,fontSize:13 }}>{item.employee_name || item.employee_id}</div>
                  {item.employee_code && <div style={{ fontSize:11 }} className="t-muted">{item.employee_code}</div>}
                  {item.designation_name && <div style={{ fontSize:11 }} className="t-muted">{item.designation_name}</div>}
                </td>
                <td style={{ fontSize:12 }}>{item.structure_name || <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }}>
                  {item.ctc_annual != null
                    ? <><span style={{ color:"var(--c-accent)" }}>₹{item.ctc_annual.toLocaleString()}</span><span className="t-muted">/yr</span></>
                    : <span className="t-muted">—</span>}
                </td>
                <td style={{ fontSize:12 }}>
                  {item.gross_monthly != null
                    ? <><span style={{ fontWeight:600 }}>₹{item.gross_monthly.toLocaleString()}</span><span className="t-muted">/mo</span></>
                    : <span className="t-muted">—</span>}
                </td>
                <td style={{ fontSize:12 }} className="t-muted">{item.effective_from || "—"}</td>
                <td>
                  <span style={{ fontSize:11,padding:"2px 8px",borderRadius:12,fontWeight:500,
                    background:(STATUS_COLOR[item.status]||"#6B7280")+"22",
                    color:STATUS_COLOR[item.status]||"#6B7280" }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ textAlign:"right" }}>
                  <button onClick={() => setModal({ mode:"edit",item })}
                    className="btn-secondary" style={{ padding:"5px 10px",fontSize:11 }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(total/PAGE_SIZE)||1} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      {modal && (
        <CompensationModal
          initial={modal.mode==="edit"?modal.item:null}
          structures={structures}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
