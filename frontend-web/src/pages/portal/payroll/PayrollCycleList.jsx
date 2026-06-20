import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

function CycleModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    cycle_name: initial?.cycle_name || "",
    frequency: initial?.frequency || "Monthly",
    processing_day: initial?.processing_day ?? "",
    salary_day: initial?.salary_day ?? "",
    cutoff_day: initial?.cutoff_day ?? "",
    company_name: initial?.company_name || "",
    branch_name: initial?.branch_name || "",
    description: initial?.description || "",
    is_default: initial?.is_default ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.cycle_name.trim()) { setErr("Cycle name is required."); return; }
    setSaving(true); setErr("");
    const data = {
      ...form,
      processing_day: form.processing_day !== "" ? parseInt(form.processing_day) : null,
      salary_day: form.salary_day !== "" ? parseInt(form.salary_day) : null,
      cutoff_day: form.cutoff_day !== "" ? parseInt(form.cutoff_day) : null,
    };
    try { await onSave(data); }
    catch (ex) { setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:480,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>
            {isEdit ? "Edit Cycle" : "Add Payroll Cycle"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}
        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Cycle Name</label>
              <input value={form.cycle_name} onChange={e => set("cycle_name", e.target.value)}
                placeholder="e.g. Monthly – HO" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Frequency</label>
              <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className="input-field">
                <option>Monthly</option>
                <option>Bi-Weekly</option>
                <option>Weekly</option>
              </select>
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Processing Day</label>
              <input type="number" min="1" max="31" value={form.processing_day}
                onChange={e => set("processing_day", e.target.value)} placeholder="e.g. 25" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Salary Day</label>
              <input type="number" min="1" max="31" value={form.salary_day}
                onChange={e => set("salary_day", e.target.value)} placeholder="e.g. 1" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Cut-off Day</label>
              <input type="number" min="1" max="31" value={form.cutoff_day}
                onChange={e => set("cutoff_day", e.target.value)} placeholder="e.g. 26" className="input-field" />
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Company</label>
              <input value={form.company_name} onChange={e => set("company_name", e.target.value)}
                placeholder="Optional" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Branch</label>
              <input value={form.branch_name} onChange={e => set("branch_name", e.target.value)}
                placeholder="Optional" className="input-field" />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} className="input-field" style={{ resize:"vertical" }} />
          </div>
          <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}>
            <input type="checkbox" checked={form.is_default} onChange={e => set("is_default", e.target.checked)} />
            <span style={{ color:"var(--c-text)" }}>Set as default cycle</span>
          </label>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Cycle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PayrollCycleList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listCycles(subdomain, token, { page, page_size: PAGE_SIZE });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalPayrollApi.updateCycle(subdomain, token, modal.item.id, form);
      showToast("Cycle updated.");
    } else {
      await portalPayrollApi.createCycle(subdomain, token, form);
      showToast("Cycle added.");
    }
    setModal(null); setPage(1); load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.cycle_name}"?`)) return;
    try {
      await portalPayrollApi.deleteCycle(subdomain, token, item.id);
      showToast("Cycle deleted."); load();
    } catch (ex) { showToast(ex?.response?.data?.detail || "Delete failed.", false); }
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

      <PageHeader title="Payroll Cycles" subtitle={`${total} cycle${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setModal({ mode:"add" })} className="btn-primary"
            style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Cycle
          </button>
        }
      />

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Name</th>
              <th>Frequency</th>
              <th>Processing Day</th>
              <th>Salary Day</th>
              <th>Cut-off Day</th>
              <th>Scope</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>🔄</div>
                <div className="t-muted" style={{ fontSize:13 }}>No payroll cycles found.</div>
                <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ marginTop:12 }}>Add First Cycle</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td style={{ fontWeight:600 }}>
                  {item.cycle_name}
                  {item.is_default && <span style={{ marginLeft:6,fontSize:10,color:"#3B82F6",background:"rgba(59,130,246,0.12)",padding:"1px 5px",borderRadius:3 }}>default</span>}
                </td>
                <td style={{ fontSize:12 }}>{item.frequency}</td>
                <td style={{ fontSize:12 }}>{item.processing_day ?? <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }}>{item.salary_day ?? <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }}>{item.cutoff_day ?? <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }} className="t-muted">
                  {[item.company_name, item.branch_name].filter(Boolean).join(" · ") || "Global"}
                </td>
                <td><Badge status={item.is_active ? "Active" : "Inactive"} /></td>
                <td style={{ textAlign:"right" }}>
                  <div style={{ display:"flex",gap:6,justifyContent:"flex-end" }}>
                    <button onClick={() => setModal({ mode:"edit",item })}
                      className="btn-secondary" style={{ padding:"5px 10px",fontSize:11 }}>Edit</button>
                    <button onClick={() => handleDelete(item)}
                      className="btn-secondary" style={{ padding:"5px 10px",fontSize:11,color:"#f87171",borderColor:"rgba(239,68,68,0.35)" }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(total/PAGE_SIZE)||1} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      {modal && <CycleModal initial={modal.mode==="edit"?modal.item:null} onClose={() => setModal(null)} onSave={handleSave} />}
    </>
  );
}
