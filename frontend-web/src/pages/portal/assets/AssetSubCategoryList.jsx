import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

// ── Modal ──────────────────────────────────────────────────────────────────────
function SubCategoryModal({ initial, categories, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    sub_category_code: initial?.sub_category_code || "",
    sub_category_name: initial?.sub_category_name || "",
    category_id: initial?.category_id || (categories[0]?.id || ""),
    description: initial?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.sub_category_code.trim() || !form.sub_category_name.trim()) {
      setErr("Code and name are required.");
      return;
    }
    if (!form.category_id) {
      setErr("Please select a parent category.");
      return;
    }
    setSaving(true); setErr("");
    try {
      await onSave(form);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 14,
        width: "100%", maxWidth: 480, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--c-heading)" }}>
            {isEdit ? "Edit Sub-Category" : "Add Sub-Category"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
        </div>

        {err && (
          <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", marginBottom: 5 }}>
              Parent Category <span style={{ color: "#f87171" }}>*</span>
            </label>
            <select
              value={form.category_id} onChange={e => set("category_id", e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }}>
              <option value="">— Select category —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Code <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                value={form.sub_category_code} onChange={e => set("sub_category_code", e.target.value)}
                placeholder="e.g. LAPTOP"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Name <span style={{ color: "#f87171" }}>*</span>
              </label>
              <input
                value={form.sub_category_name} onChange={e => set("sub_category_name", e.target.value)}
                placeholder="Sub-category name"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", marginBottom: 5 }}>
              Description
            </label>
            <textarea
              value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid var(--c-border)",
              background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13, cursor: "pointer",
            }}>Cancel</button>
            <button type="submit" disabled={saving} style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg,#00aeec,#0077cc)", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Sub-Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AssetSubCategoryList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [modal, setModal] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Load categories for the filter dropdown (all active ones)
  useEffect(() => {
    portalAssetApi.listCategories(subdomain, token, { page_size: 200, status: "Active" })
      .then(r => setCategories(r.data?.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await portalAssetApi.listSubCategories(subdomain, token, {
        search: search || undefined,
        category_id: categoryFilter || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      const d = res.data?.data;
      setItems(d?.data || []);
      setTotal(d?.total || 0);
    } catch {
      setError("Failed to load sub-categories.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, search, categoryFilter, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await portalAssetApi.updateSubCategory(subdomain, token, modal.item.id, form);
      showToast("Sub-category updated.");
    } else {
      await portalAssetApi.createSubCategory(subdomain, token, form);
      showToast("Sub-category added.");
    }
    setModal(null);
    setPage(1);
    load();
  };

  const handleToggle = async (item) => {
    setToggling(item.id);
    try {
      if (item.status === "Active") {
        await portalAssetApi.deactivateSubCategory(subdomain, token, item.id);
        showToast(`"${item.sub_category_name}" deactivated.`);
      } else {
        await portalAssetApi.activateSubCategory(subdomain, token, item.id);
        showToast(`"${item.sub_category_name}" activated.`);
      }
      load();
    } catch (ex) {
      showToast(ex?.response?.data?.message || "Action failed.", false);
    } finally {
      setToggling(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <AssetLayout title="Asset Sub-Categories">
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 2000,
          padding: "10px 18px", borderRadius: 9,
          background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
          fontSize: 13, fontWeight: 500, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-heading)" }}>Asset Sub-Categories</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {total} sub-categor{total === 1 ? "y" : "ies"} total
          </p>
        </div>
        <button
          onClick={() => setModal({ mode: "add" })}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
            borderRadius: 9, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
            background: "linear-gradient(135deg,#00aeec,#0077cc)", color: "#fff",
          }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add Sub-Category
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search sub-categories…"
          style={{
            flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8,
            border: "1px solid var(--c-border)", background: "var(--c-surface)",
            color: "var(--c-text)", fontSize: 13,
          }}
        />
        <select
          value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>
          ))}
        </select>
        <select
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
              {["#", "Name", "Code", "Category", "Description", "Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 50, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
                <div style={{ fontSize: 13, color: "var(--c-muted)" }}>No sub-categories found.</div>
                <button onClick={() => setModal({ mode: "add" })} style={{
                  marginTop: 12, padding: "7px 16px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg,#00aeec,#0077cc)", color: "#fff",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>Add First Sub-Category</button>
              </td></tr>
            ) : items.map((item, i) => {
              const cat = catMap[item.category_id];
              return (
                <tr key={item.id} style={{
                  borderBottom: i < items.length - 1 ? "1px solid var(--c-border)" : "none",
                  background: "transparent",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{item.sub_category_name}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      {item.sub_category_code}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 12, color: "var(--c-text)", display: "flex", alignItems: "center", gap: 5 }}>
                      {cat ? (
                        <>{cat.icon && <span>{cat.icon}</span>}<span>{cat.category_name}</span></>
                      ) : (
                        <span style={{ color: "var(--c-muted)", fontSize: 11 }}>{item.category_id}</span>
                      )}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.description || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 5,
                      background: item.status === "Active" ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.12)",
                      color: item.status === "Active" ? "#4ade80" : "var(--c-muted)",
                      border: `1px solid ${item.status === "Active" ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.25)"}`,
                    }}>{item.status}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setModal({ mode: "edit", item })}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: "1px solid var(--c-border)",
                          background: "var(--c-surface2)", color: "var(--c-text)", fontSize: 11,
                          cursor: "pointer", fontWeight: 500,
                        }}>Edit</button>
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={toggling === item.id}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: "1px solid",
                          fontSize: 11, cursor: toggling === item.id ? "not-allowed" : "pointer",
                          fontWeight: 500, opacity: toggling === item.id ? 0.5 : 1,
                          borderColor: item.status === "Active" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)",
                          background: item.status === "Active" ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                          color: item.status === "Active" ? "#f87171" : "#4ade80",
                        }}>
                        {toggling === item.id ? "…" : item.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--c-muted)" }}>
          <span>{total} total · page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {modal && (
        <SubCategoryModal
          initial={modal.mode === "edit" ? modal.item : null}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </AssetLayout>
  );
}
