import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

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
      <div className="card" style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 className="t-heading" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {isEdit ? "Edit Sub-Category" : "Add Sub-Category"}
          </h3>
          <button onClick={onClose} className="t-muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
        </div>

        {err && (
          <div style={{ padding: "9px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171" }}>
            {err}
          </div>
        )}

        <form onSubmit={submit} className="portal-form-card" style={{ border: "none", padding: 0, boxShadow: "none" }}>
          <div>
            <label className="portal-form-label portal-form-label-req">Parent Category</label>
            <select
              value={form.category_id} onChange={e => set("category_id", e.target.value)}
              className="input-field">
              <option value="">— Select category —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>
              ))}
            </select>
          </div>

          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Code</label>
              <input
                value={form.sub_category_code} onChange={e => set("sub_category_code", e.target.value)}
                placeholder="e.g. LAPTOP"
                className="input-field"
              />
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Name</label>
              <input
                value={form.sub_category_name} onChange={e => set("sub_category_name", e.target.value)}
                placeholder="Sub-category name"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="portal-form-label">Description</label>
            <textarea
              value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="input-field"
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
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

      <PageHeader
        title="Asset Sub-Categories"
        subtitle={`${total} sub-categor${total === 1 ? "y" : "ies"} total`}
        actions={
          <button
            onClick={() => setModal({ mode: "add" })}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 7 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Sub-Category
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search sub-categories…"
          className="input-field"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select
          value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="input-field"
          style={{ width: "auto", minWidth: 180 }}>
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>
          ))}
        </select>
        <select
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field"
          style={{ width: "auto", minWidth: 140 }}>
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
      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Name</th>
              <th>Code</th>
              <th>Category</th>
              <th>Description</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center" }} className="t-muted">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 50, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🗂️</div>
                <div className="t-muted" style={{ fontSize: 13 }}>No sub-categories found.</div>
                <button onClick={() => setModal({ mode: "add" })} className="btn-primary" style={{ marginTop: 12 }}>Add First Sub-Category</button>
              </td></tr>
            ) : items.map((item, i) => {
              const cat = catMap[item.category_id];
              return (
                <tr key={item.id}>
                  <td style={{ textAlign: "center" }} className="t-muted">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.sub_category_name}</td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      {item.sub_category_code}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                      {cat ? (
                        <>{cat.icon && <span>{cat.icon}</span>}<span>{cat.category_name}</span></>
                      ) : (
                        <span className="t-muted" style={{ fontSize: 11 }}>{item.category_id}</span>
                      )}
                    </span>
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="t-muted">
                    {item.description || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setModal({ mode: "edit", item })}
                        className="btn-secondary"
                        style={{ padding: "5px 10px", fontSize: 11 }}
                      >Edit</button>
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={toggling === item.id}
                        className="btn-secondary"
                        style={{
                          padding: "5px 10px", fontSize: 11,
                          color: item.status === "Active" ? "#f87171" : "#4ade80",
                          borderColor: item.status === "Active" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"
                        }}
                      >
                        {toggling === item.id ? "…" : item.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

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
