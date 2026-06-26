import React, { useEffect, useState, useCallback } from "react";
import { assetMgmtApi } from "../../../services/apiClient";

const PAGE_SIZE = 30;

function StatusBadge({ active }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
      background: active ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
      color: active ? "#4ade80" : "#9ca3af",
      border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(156,163,175,0.2)"}` }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const inp = { padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</label>;

function SubCategoryModal({ editSC, categories, onClose, onSaved }) {
  const [form, setForm] = useState(editSC
    ? { sub_category_code: editSC.sub_category_code, sub_category_name: editSC.sub_category_name, category_id: editSC.category_id, description: editSC.description || "" }
    : { sub_category_code: "", sub_category_name: "", category_id: categories[0]?.id || "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.sub_category_code.trim() || !form.sub_category_name.trim() || !form.category_id) { setError("Code, Name and Category are required."); return; }
    setSaving(true); setError("");
    try {
      if (editSC) await assetMgmtApi.updateSubCategory(editSC.id, form);
      else await assetMgmtApi.createSubCategory(form);
      onSaved();
    } catch (e) { setError(e.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--c-border)" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>{editSC ? "Edit Sub-Category" : "New Sub-Category"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--c-muted)", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, fontSize: 13, color: "#f87171" }}>{error}</div>}
          <div><Label>Category *</Label>
            <select value={form.category_id} onChange={set("category_id")} style={inp}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Code *</Label><input value={form.sub_category_code} onChange={set("sub_category_code")} style={inp} placeholder="IT-LAP" /></div>
            <div><Label>Name *</Label><input value={form.sub_category_name} onChange={set("sub_category_name")} style={inp} placeholder="Laptop" /></div>
          </div>
          <div><Label>Description</Label><textarea value={form.description} onChange={set("description")} rows={2} style={{ ...inp, resize: "vertical" }} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--c-border)" }}>
          <button onClick={submit} disabled={saving} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving…" : "Save"}</button>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetSubCategoryList() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    assetMgmtApi.metaOptions().then(r => setCategories(r.data.data.categories || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await assetMgmtApi.listSubCategories({ category_id: catFilter || undefined, search, status: statusFilter, page, page_size: PAGE_SIZE });
      setRows(res.data.data.data || []);
      setTotal(res.data.data.total || 0);
    } catch { setError("Failed to load sub-categories."); }
    finally { setLoading(false); }
  }, [catFilter, search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (sc) => {
    try {
      if (sc.is_active) await assetMgmtApi.deactivateSubCategory(sc.id);
      else await assetMgmtApi.activateSubCategory(sc.id);
      showToast(`Sub-category ${sc.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (e) { setError(e.response?.data?.detail || "Action failed."); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1000, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}
      {modal && (
        <SubCategoryModal
          editSC={modal === "new" ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); showToast(modal === "new" ? "Sub-category created." : "Sub-category updated."); }}
        />
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Asset Sub-Categories</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Classify assets within categories — {total} total</p>
        </div>
        <button onClick={() => setModal("new")} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>+ Add Sub-Category</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search sub-categories…"
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", minWidth: 200 }} />
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
        </select>
        {["", "Active", "Inactive"].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: statusFilter === s ? "var(--c-accent)" : "var(--c-surface)",
              color: statusFilter === s ? "#fff" : "var(--c-muted)",
              border: `1px solid ${statusFilter === s ? "var(--c-accent)" : "var(--c-border)"}` }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗂️</div>
            <div style={{ fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>No sub-categories found</div>
            <div style={{ fontSize: 12, marginBottom: 14 }}>{search || statusFilter || catFilter ? "Try adjusting your filters." : "Add your first sub-category."}</div>
            {!search && !statusFilter && !catFilter && <button onClick={() => setModal("new")} style={{ padding: "8px 16px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Add Sub-Category</button>}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                {["#", "Sub-Category", "Code", "Category", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((sc, i) => (
                <tr key={sc.id} style={{ borderBottom: "1px solid var(--c-border)", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, color: "var(--c-muted)", width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{sc.sub_category_name}</div>
                    {sc.description && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{sc.description}</div>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{sc.sub_category_code}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>{sc.category_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td style={{ padding: "12px 16px" }}><StatusBadge active={sc.is_active} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setModal(sc)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text2)", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => toggleStatus(sc)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: `1px solid ${sc.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, background: "transparent", color: sc.is_active ? "#f87171" : "#4ade80", cursor: "pointer" }}>{sc.is_active ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
          <span>{total} total</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
            <span style={{ padding: "5px 12px", fontSize: 12 }}>{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
