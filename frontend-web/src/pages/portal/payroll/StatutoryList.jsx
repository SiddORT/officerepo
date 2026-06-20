import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

function StatutoryModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    statutory_type: initial?.statutory_type || "Provident Fund",
    component_name: initial?.component_name || "",
    description: initial?.description || "",
    employee_rate: initial?.employee_rate ?? "",
    employer_rate: initial?.employer_rate ?? "",
    fixed_amount: initial?.fixed_amount ?? "",
    ceiling_amount: initial?.ceiling_amount ?? "",
    is_percentage: initial?.is_percentage ?? true,
    effective_from: initial?.effective_from || "",
    effective_to: initial?.effective_to || "",
    applies_to: initial?.applies_to || "",
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.component_name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr("");
    try {
      await onSave({
        ...form,
        employee_rate: form.employee_rate !== "" ? parseFloat(form.employee_rate) : null,
        employer_rate: form.employer_rate !== "" ? parseFloat(form.employer_rate) : null,
        fixed_amount: form.fixed_amount !== "" ? parseFloat(form.fixed_amount) : null,
        ceiling_amount: form.ceiling_amount !== "" ? parseFloat(form.ceiling_amount) : null,
      });
    } catch (ex) { setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const TYPES = ["Provident Fund","Employee State Insurance","Professional Tax","Tax Deducted at Source","Gratuity","Custom"];

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:500,display:"flex",flexDirection:"column",gap:14,maxHeight:"90vh",overflow:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>
            {isEdit ? "Edit Statutory Component" : "Add Statutory Component"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}
        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Type</label>
              <select value={form.statutory_type} onChange={e => set("statutory_type", e.target.value)} className="input-field">
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Name</label>
              <input value={form.component_name} onChange={e => set("component_name", e.target.value)}
                placeholder="e.g. PF – Employees" className="input-field" />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} className="input-field" style={{ resize:"vertical" }} />
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Employee Rate (%)</label>
              <input type="number" step="0.01" value={form.employee_rate} onChange={e => set("employee_rate", e.target.value)}
                placeholder="e.g. 12" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Employer Rate (%)</label>
              <input type="number" step="0.01" value={form.employer_rate} onChange={e => set("employer_rate", e.target.value)}
                placeholder="e.g. 12" className="input-field" />
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Fixed Amount (₹)</label>
              <input type="number" step="0.01" value={form.fixed_amount} onChange={e => set("fixed_amount", e.target.value)}
                placeholder="e.g. 200" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Ceiling Amount (₹)</label>
              <input type="number" step="0.01" value={form.ceiling_amount} onChange={e => set("ceiling_amount", e.target.value)}
                placeholder="e.g. 15000" className="input-field" />
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
          <div>
            <label className="portal-form-label">Applies To</label>
            <select value={form.applies_to} onChange={e => set("applies_to", e.target.value)} className="input-field">
              <option value="">All</option>
              <option>Permanent</option>
              <option>Contract</option>
              <option>Consultant</option>
            </select>
          </div>
          <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />
            <span style={{ color:"var(--c-text)" }}>Active</span>
          </label>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Component"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StatutoryList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 25;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listStatutory(subdomain, token, { page, page_size: PAGE_SIZE });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalPayrollApi.updateStatutory(subdomain, token, modal.item.id, form);
      showToast("Updated.");
    } else {
      await portalPayrollApi.createStatutory(subdomain, token, form);
      showToast("Added.");
    }
    setModal(null); load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.component_name}"?`)) return;
    try { await portalPayrollApi.deleteStatutory(subdomain, token, item.id); showToast("Deleted."); load(); }
    catch (ex) { showToast(ex?.response?.data?.detail || "Delete failed.", false); }
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

      <PageHeader title="Statutory Compliance" subtitle={`${total} component${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Component
          </button>
        }
      />

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Name</th>
              <th>Type</th>
              <th>Employee Rate</th>
              <th>Employer Rate</th>
              <th>Ceiling</th>
              <th>Effective Period</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>🏛️</div>
                <div className="t-muted" style={{ fontSize:13 }}>No statutory components configured.</div>
                <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ marginTop:12 }}>Add First Component</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td style={{ fontWeight:600 }}>{item.component_name}</td>
                <td style={{ fontSize:12 }} className="t-muted">{item.statutory_type}</td>
                <td style={{ fontSize:12 }}>{item.employee_rate != null ? `${item.employee_rate}%` : <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }}>{item.employer_rate != null ? `${item.employer_rate}%` : <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }}>{item.ceiling_amount != null ? `₹${item.ceiling_amount.toLocaleString()}` : <span className="t-muted">—</span>}</td>
                <td style={{ fontSize:12 }} className="t-muted">
                  {item.effective_from || <span style={{ opacity:0.4 }}>—</span>}
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

      {modal && <StatutoryModal initial={modal.mode==="edit"?modal.item:null} onClose={() => setModal(null)} onSave={handleSave} />}
    </>
  );
}
