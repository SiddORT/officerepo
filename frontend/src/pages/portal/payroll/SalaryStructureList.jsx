import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const TYPE_COLOR = { "Earning":"#10B981","Deduction":"#EF4444","Employer Contribution":"#8B5CF6" };

function StructureModal({ initial, allComponents, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    structure_name: initial?.structure_name || "",
    description: initial?.description || "",
    currency: initial?.currency || "INR",
    effective_from: initial?.effective_from || "",
    effective_to: initial?.effective_to || "",
  });
  const [selectedComps, setSelectedComps] = useState(
    initial?.components?.map(sc => ({
      component_id: sc.component_id,
      amount: sc.amount ?? "",
      percentage: sc.percentage ?? "",
      display_order: sc.display_order ?? 0,
    })) || []
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleComp = (compId) => {
    setSelectedComps(prev => {
      if (prev.find(sc => sc.component_id === compId)) {
        return prev.filter(sc => sc.component_id !== compId);
      }
      return [...prev, { component_id: compId, amount: "", percentage: "", display_order: prev.length }];
    });
  };

  const updateComp = (compId, field, value) => {
    setSelectedComps(prev => prev.map(sc =>
      sc.component_id === compId ? { ...sc, [field]: value } : sc
    ));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.structure_name.trim()) { setErr("Structure name is required."); return; }
    setSaving(true); setErr("");
    const components = selectedComps.map(sc => ({
      component_id: sc.component_id,
      amount: sc.amount !== "" ? parseFloat(sc.amount) : null,
      percentage: sc.percentage !== "" ? parseFloat(sc.percentage) : null,
      display_order: sc.display_order,
    }));
    try { await onSave({ ...form, components }); }
    catch (ex) { setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const earningComps = allComponents.filter(c => c.component_type === "Earning");
  const deductionComps = allComponents.filter(c => c.component_type === "Deduction");
  const employerComps = allComponents.filter(c => c.component_type === "Employer Contribution");

  const renderCompGroup = (label, comps, color) => (
    <div key={label}>
      <div className="text-xs font-semibold mb-2" style={{ color }}>{label}</div>
      {comps.map(c => {
        const sel = selectedComps.find(sc => sc.component_id === c.id);
        return (
          <div key={c.id} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8,padding:"6px 10px",
            borderRadius:8,background:sel?"rgba(59,130,246,0.06)":"transparent",
            border:`1px solid ${sel?"rgba(59,130,246,0.25)":"var(--c-border)"}` }}>
            <input type="checkbox" checked={!!sel} onChange={() => toggleComp(c.id)} />
            <span style={{ flex:1,fontSize:12,color:"var(--c-text)" }}>
              <span style={{ fontFamily:"monospace",fontSize:11,color:"var(--c-muted)" }}>{c.component_code}</span>
              {" "}{c.component_name}
            </span>
            {sel && (
              <input type="number" step="0.01"
                value={c.calc_method === "Percentage" ? sel.percentage : sel.amount}
                onChange={e => updateComp(c.id, c.calc_method === "Percentage" ? "percentage" : "amount", e.target.value)}
                placeholder={c.calc_method === "Percentage" ? "%" : "₹"}
                className="input-field" style={{ width:80,fontSize:12 }} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto",padding:20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:640,display:"flex",flexDirection:"column",gap:14,maxHeight:"90vh",overflow:"auto" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>
            {isEdit ? "Edit Structure" : "Add Salary Structure"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>
        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}
        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Structure Name</label>
              <input value={form.structure_name} onChange={e => set("structure_name", e.target.value)}
                placeholder="e.g. Software Engineer Grade A" className="input-field" />
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
          <div>
            <label className="portal-form-label">Description</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)}
              rows={2} className="input-field" style={{ resize:"vertical" }} />
          </div>

          {allComponents.length > 0 && (
            <div style={{ padding:"12px",borderRadius:10,border:"1px solid var(--c-border)",background:"var(--c-surface2)",marginTop:4 }}>
              <div className="text-sm font-semibold mb-3" style={{ color:"var(--c-heading)" }}>Components</div>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {earningComps.length > 0 && renderCompGroup("Earnings", earningComps, "#10B981")}
                {deductionComps.length > 0 && renderCompGroup("Deductions", deductionComps, "#EF4444")}
                {employerComps.length > 0 && renderCompGroup("Employer Contributions", employerComps, "#8B5CF6")}
              </div>
            </div>
          )}

          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SalaryStructureList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [allComponents, setAllComponents] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalPayrollApi.listComponents(subdomain, token, { active_only: true, page_size: 200 })
      .then(r => setAllComponents(r.data?.data?.data || [])).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listStructures(subdomain, token, { search: search || undefined, page, page_size: PAGE_SIZE });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalPayrollApi.updateStructure(subdomain, token, modal.item.id, form);
      showToast("Structure updated.");
    } else {
      await portalPayrollApi.createStructure(subdomain, token, form);
      showToast("Structure added.");
    }
    setModal(null); setPage(1); load();
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.structure_name}"?`)) return;
    try { await portalPayrollApi.deleteStructure(subdomain, token, item.id); showToast("Deleted."); load(); }
    catch (ex) { showToast(ex?.response?.data?.detail || "Delete failed.", false); }
  };

  // Enrich structures with component objects for display
  const compMap = Object.fromEntries(allComponents.map(c => [c.id, c]));

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
      <PageHeader title="Salary Structures" subtitle={`${total} structure${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Structure
          </button>
        }
      />

      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search structures…" className="input-field" style={{ flex:1,minWidth:200 }} />
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Name</th>
              <th>Currency</th>
              <th>Effective Period</th>
              <th>Components</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>🏗️</div>
                <div className="t-muted" style={{ fontSize:13 }}>No salary structures found.</div>
                <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ marginTop:12 }}>Add First Structure</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td style={{ fontWeight:600 }}>{item.structure_name}</td>
                <td style={{ fontSize:12 }}>{item.currency}</td>
                <td style={{ fontSize:12 }} className="t-muted">
                  {item.effective_from && item.effective_to
                    ? `${item.effective_from} → ${item.effective_to}`
                    : item.effective_from || <span style={{ opacity:0.4 }}>—</span>}
                </td>
                <td>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {(item.components || []).slice(0,5).map(sc => {
                      const cd = compMap[sc.component_id];
                      if (!cd) return null;
                      return (
                        <span key={sc.component_id} style={{ fontSize:10,padding:"1px 6px",borderRadius:10,
                          background:(TYPE_COLOR[cd.component_type]||"#6B7280")+"22",
                          color:TYPE_COLOR[cd.component_type]||"#6B7280",fontWeight:500 }}>
                          {cd.component_code}
                        </span>
                      );
                    })}
                    {(item.components || []).length > 5 && (
                      <span style={{ fontSize:10,color:"var(--c-muted)" }}>+{item.components.length-5}</span>
                    )}
                  </div>
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

      {modal && (
        <StructureModal
          initial={modal.mode==="edit"?modal.item:null}
          allComponents={allComponents}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
