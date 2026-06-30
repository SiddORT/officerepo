import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const TYPE_COLOR = {
  "Earning": "#10B981",
  "Deduction": "#EF4444",
  "Employer Contribution": "#8B5CF6",
};

function ComponentModal({ initial, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    component_code: initial?.component_code || "",
    component_name: initial?.component_name || "",
    component_type: initial?.component_type || "Earning",
    calc_method: initial?.calc_method || "Fixed",
    default_value: initial?.default_value ?? "",
    description: initial?.description || "",
    is_taxable: initial?.is_taxable ?? true,
    is_pro_rata: initial?.is_pro_rata ?? true,
    is_active: initial?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.component_code.trim() || !form.component_name.trim()) {
      setErr("Code and name are required.");
      return;
    }
    setSaving(true); setErr("");
    try {
      await onSave({ ...form, default_value: form.default_value !== "" ? parseFloat(form.default_value) : null });
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed.");
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width:"100%",maxWidth:500,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
          <h3 className="t-heading" style={{ margin:0,fontSize:16,fontWeight:700 }}>
            {isEdit ? "Edit Component" : "Add Salary Component"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,lineHeight:1,padding:2 }}>×</button>
        </div>

        {err && <div style={{ padding:"9px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:7,fontSize:13,color:"#f87171" }}>{err}</div>}

        <form onSubmit={submit} className="portal-form-card" style={{ border:"none",padding:0,boxShadow:"none" }}>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Code</label>
              <input value={form.component_code} onChange={e => set("component_code", e.target.value.toUpperCase())}
                placeholder="e.g. BASIC" className="input-field" disabled={isEdit} />
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Name</label>
              <input value={form.component_name} onChange={e => set("component_name", e.target.value)}
                placeholder="Component name" className="input-field" />
            </div>
          </div>

          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Type</label>
              <select value={form.component_type} onChange={e => set("component_type", e.target.value)} className="input-field">
                <option>Earning</option>
                <option>Deduction</option>
                <option>Employer Contribution</option>
              </select>
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Calculation</label>
              <select value={form.calc_method} onChange={e => set("calc_method", e.target.value)} className="input-field">
                <option>Fixed</option>
                <option>Percentage</option>
                <option>Formula</option>
              </select>
            </div>
          </div>

          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Default Value {form.calc_method === "Percentage" ? "(%)" : "(₹)"}</label>
              <input type="number" step="0.01" value={form.default_value}
                onChange={e => set("default_value", e.target.value)}
                placeholder={form.calc_method === "Percentage" ? "e.g. 40" : "e.g. 1600"}
                className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Description</label>
              <input value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Optional" className="input-field" />
            </div>
          </div>

          <div style={{ display:"flex",gap:24,marginTop:4 }}>
            <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_taxable} onChange={e => set("is_taxable", e.target.checked)} />
              <span style={{ color:"var(--c-text)" }}>Taxable</span>
            </label>
            <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_pro_rata} onChange={e => set("is_pro_rata", e.target.checked)} />
              <span style={{ color:"var(--c-text)" }}>Pro-Rata</span>
            </label>
            <label style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer" }}>
              <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />
              <span style={{ color:"var(--c-text)" }}>Active</span>
            </label>
          </div>

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

export default function SalaryComponentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 25;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await portalPayrollApi.listComponents(subdomain, token, {
        search: search || undefined, comp_type: typeFilter || undefined, page, page_size: PAGE_SIZE,
      });
      const d = r.data?.data;
      setItems(d?.data || []); setTotal(d?.total || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [subdomain, token, search, typeFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalPayrollApi.updateComponent(subdomain, token, modal.item.id, form);
      showToast("Component updated.");
    } else {
      await portalPayrollApi.createComponent(subdomain, token, form);
      showToast("Component added.");
    }
    setModal(null); setPage(1); load();
  };

  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const item = confirmDelete;
    setConfirmDelete(null);
    try {
      await portalPayrollApi.deleteComponent(subdomain, token, item.id);
      showToast("Component deleted.");
      load();
    } catch (ex) {
      showToast(ex?.response?.data?.detail || "Delete failed.", false);
    }
  };

  return (
    <>
      {toast && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:2000,padding:"10px 18px",borderRadius:9,
          background:toast.ok?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",
          border:`1px solid ${toast.ok?"rgba(34,197,94,0.4)":"rgba(239,68,68,0.4)"}`,
          color:toast.ok?"#4ade80":"#f87171",fontSize:13,fontWeight:500,boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
          {toast.msg}
        </div>
      )}

      <PageHeader title="Salary Components" subtitle={`${total} component${total !== 1 ? "s" : ""}`}
        actions={
          <button onClick={() => setModal({ mode: "add" })} className="btn-primary"
            style={{ display:"flex",alignItems:"center",gap:7 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Component
          </button>
        }
      />

      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search components…" className="input-field" style={{ flex:1,minWidth:180 }} />
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="input-field" style={{ width:"auto",minWidth:180 }}>
          <option value="">All types</option>
          <option>Earning</option>
          <option>Deduction</option>
          <option>Employer Contribution</option>
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width:40 }}>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Calculation</th>
              <th>Default Value</th>
              <th>Taxable</th>
              <th>Status</th>
              <th style={{ textAlign:"right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:40,textAlign:"center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:50,textAlign:"center" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>🧩</div>
                <div className="t-muted" style={{ fontSize:13 }}>No salary components found.</div>
                <button onClick={() => setModal({ mode:"add" })} className="btn-primary" style={{ marginTop:12 }}>Add First Component</button>
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.id}>
                <td style={{ textAlign:"center" }} className="t-muted">{(page-1)*PAGE_SIZE+i+1}</td>
                <td>
                  <span style={{ fontFamily:"monospace",fontSize:11,padding:"2px 6px",borderRadius:4,
                    background:"var(--c-surface2)",color:"var(--c-muted)",border:"1px solid var(--c-border)" }}>
                    {item.component_code}
                  </span>
                </td>
                <td style={{ fontWeight:600 }}>
                  {item.component_name}
                  {item.is_system && <span style={{ marginLeft:6,fontSize:10,color:"#6B7280",background:"rgba(107,114,128,0.12)",padding:"1px 5px",borderRadius:3 }}>system</span>}
                </td>
                <td>
                  <span style={{ fontSize:11,padding:"2px 8px",borderRadius:12,fontWeight:500,
                    background:(TYPE_COLOR[item.component_type]||"#6B7280")+"22",
                    color:TYPE_COLOR[item.component_type]||"#6B7280" }}>
                    {item.component_type}
                  </span>
                </td>
                <td style={{ fontSize:12 }}>{item.calc_method}</td>
                <td style={{ fontSize:12 }}>
                  {item.default_value != null
                    ? item.calc_method === "Percentage" ? `${item.default_value}%` : `₹${item.default_value?.toLocaleString()}`
                    : <span className="t-muted">—</span>}
                </td>
                <td style={{ fontSize:12 }}>{item.is_taxable ? "Yes" : "No"}</td>
                <td><Badge status={item.is_active ? "Active" : "Inactive"} /></td>
                <td style={{ textAlign:"right" }}>
                  <div style={{ display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center" }}>
                    <EditIconBtn onClick={() => setModal({ mode:"edit",item })} title="Edit component" />
                    {!item.is_system && (
                      <DeleteIconBtn onClick={() => setConfirmDelete(item)} title="Delete component" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(total/PAGE_SIZE)||1} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      {modal && (
        <ComponentModal
          initial={modal.mode === "edit" ? modal.item : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Component"
        message={`Delete "${confirmDelete?.component_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
