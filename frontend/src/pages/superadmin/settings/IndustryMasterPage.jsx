import React, { useEffect, useState } from "react";
import { industryMasterApi } from "../../../services/apiClient";
import SettingsLayout from "./SettingsLayout";

function SortIcon({ dir }) {
  return (
    <svg className="w-3 h-3 inline ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d={dir === "asc" ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
    </svg>
  );
}

export default function IndustryMasterPage() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sortDir, setSortDir]   = useState("asc");

  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [newOrder, setNewOrder] = useState("");
  const [addErr, setAddErr]     = useState("");
  const [saving, setSaving]     = useState(false);

  const [editId, setEditId]     = useState(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editErr, setEditErr]   = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast]       = useState(null);

  const load = () => {
    setLoading(true);
    industryMasterApi.list()
      .then(r => setRows(r.data?.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = rows
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const cmp = a.sort_order - b.sort_order || a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleAdd = async () => {
    if (!newName.trim()) { setAddErr("Name is required."); return; }
    setSaving(true); setAddErr("");
    try {
      await industryMasterApi.create({ name: newName.trim(), sort_order: newOrder ? parseInt(newOrder) : 0 });
      setNewName(""); setNewOrder(""); setShowAdd(false);
      showToast("Industry added.");
      load();
    } catch (e) {
      setAddErr(e?.response?.data?.detail || "Failed to add.");
    } finally { setSaving(false); }
  };

  const startEdit = (row) => {
    setEditId(row.id); setEditName(row.name); setEditOrder(String(row.sort_order)); setEditErr("");
  };

  const handleEdit = async () => {
    if (!editName.trim()) { setEditErr("Name is required."); return; }
    setEditSaving(true); setEditErr("");
    try {
      await industryMasterApi.update(editId, { name: editName.trim(), sort_order: editOrder !== "" ? parseInt(editOrder) : 0 });
      setEditId(null);
      showToast("Industry updated.");
      load();
    } catch (e) {
      setEditErr(e?.response?.data?.detail || "Failed to update.");
    } finally { setEditSaving(false); }
  };

  const toggleActive = async (row) => {
    try {
      await industryMasterApi.update(row.id, { is_active: !row.is_active });
      showToast(row.is_active ? "Industry deactivated." : "Industry activated.");
      load();
    } catch { showToast("Action failed.", "error"); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await industryMasterApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      showToast("Industry deleted.");
      load();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Delete failed.", "error");
      setConfirmDelete(null);
    } finally { setDeleting(false); }
  };

  return (
    <SettingsLayout>
      <div style={{ maxWidth: 760 }}>

        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div>
            <h2 className="text-xl font-semibold t-heading" style={{ marginBottom: 4 }}>Industry Master</h2>
            <p className="text-sm t-muted">Platform-wide industry list used in company forms across all workspaces.</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setNewName(""); setNewOrder(""); setAddErr(""); }}
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Industry
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
            background: toast.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: toast.type === "error" ? "#f87171" : "#4ade80",
          }}>
            {toast.msg}
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 16, padding: "16px 18px" }}>
            <div className="text-sm font-semibold t-body" style={{ marginBottom: 12 }}>New Industry</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px" }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => { setNewName(e.target.value); setAddErr(""); }}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder="Industry name"
                  className="input-field"
                  style={{ borderColor: addErr ? "#f87171" : undefined }}
                />
                {addErr && <p style={{ fontSize: 11, color: "#f87171", marginTop: 3 }}>{addErr}</p>}
              </div>
              <div style={{ width: 100 }}>
                <input
                  type="number"
                  value={newOrder}
                  onChange={e => setNewOrder(e.target.value)}
                  placeholder="Order"
                  className="input-field"
                />
              </div>
              <button onClick={handleAdd} disabled={saving} className="btn-primary" style={{ height: 38 }}>
                {saving ? "Saving…" : "Add"}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ height: 38 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Search + sort */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 t-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search industries…"
              className="input-field"
              style={{ paddingLeft: 34 }}
            />
          </div>
          <button
            onClick={() => setSortDir(d => d === "asc" ? "desc" : "asc")}
            className="btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, padding: "0 12px", height: 38 }}
          >
            Order {sortDir === "asc" ? <SortIcon dir="asc" /> : <SortIcon dir="desc" />}
          </button>
          <span className="text-xs t-muted">{filtered.length} {filtered.length === 1 ? "industry" : "industries"}</span>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
              {search ? "No industries match your search." : "No industries yet. Add one above."}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--c-border)" }}>
                  {["Industry Name", "Order", "Status", ""].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", fontSize: 11, fontWeight: 600, textAlign: "left",
                      color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em",
                      whiteSpace: "nowrap", background: "var(--c-surface)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      {editId === row.id ? (
                        <div>
                          <input
                            autoFocus
                            value={editName}
                            onChange={e => { setEditName(e.target.value); setEditErr(""); }}
                            onKeyDown={e => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditId(null); }}
                            className="input-field"
                            style={{ maxWidth: 280, borderColor: editErr ? "#f87171" : undefined }}
                          />
                          {editErr && <p style={{ fontSize: 11, color: "#f87171", marginTop: 2 }}>{editErr}</p>}
                        </div>
                      ) : (
                        <span className="text-sm t-body font-medium">{row.name}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {editId === row.id ? (
                        <input
                          type="number"
                          value={editOrder}
                          onChange={e => setEditOrder(e.target.value)}
                          className="input-field"
                          style={{ width: 70 }}
                        />
                      ) : (
                        <span className="text-xs t-muted">{row.sort_order}</span>
                      )}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        onClick={() => toggleActive(row)}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                          border: "none", cursor: "pointer",
                          background: row.is_active ? "rgba(34,197,94,0.12)" : "rgba(156,163,175,0.15)",
                          color: row.is_active ? "#4ade80" : "var(--c-muted)",
                        }}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {editId === row.id ? (
                          <>
                            <button onClick={handleEdit} disabled={editSaving} className="btn-primary" style={{ fontSize: 12, padding: "4px 12px", height: "auto" }}>
                              {editSaving ? "…" : "Save"}
                            </button>
                            <button onClick={() => setEditId(null)} className="btn-secondary" style={{ fontSize: 12, padding: "4px 10px", height: "auto" }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(row)}
                              className="btn-secondary"
                              style={{ fontSize: 12, padding: "4px 10px", height: "auto" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete(row)}
                              style={{
                                fontSize: 12, padding: "4px 10px", height: "auto",
                                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                                color: "#f87171", borderRadius: 6, cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Delete confirm modal */}
        {confirmDelete && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
          }}>
            <div className="card" style={{ padding: 24, maxWidth: 380, width: "90%" }}>
              <h3 className="text-base font-semibold t-heading" style={{ marginBottom: 10 }}>Delete industry?</h3>
              <p className="text-sm t-muted" style={{ marginBottom: 18 }}>
                <strong style={{ color: "var(--c-text)" }}>{confirmDelete.name}</strong> will be permanently removed.
                Companies that already use this industry will keep it as text.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleDelete} disabled={deleting}
                  style={{
                    padding: "8px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13,
                    background: "#ef4444", color: "#fff", fontWeight: 600,
                  }}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
