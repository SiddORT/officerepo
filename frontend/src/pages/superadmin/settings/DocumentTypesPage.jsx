import React, { useCallback, useEffect, useState } from "react";
import { clientDocTypeApi } from "../../../services/apiClient";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";

const unwrap = (res) => res?.data?.data ?? res?.data;

const CATEGORIES = [
  { value: "compliance", label: "Compliance" },
  { value: "branding", label: "Branding" },
  { value: "general", label: "General" },
];

const CATEGORY_COLORS = {
  compliance: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  branding: { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6" },
  general: { bg: "rgba(100,116,139,0.1)", color: "#64748b" },
};

const EMPTY_FORM = { name: "", category: "general", description: "", is_active: true, sort_order: 0 };

export default function DocumentTypesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteErr, setDeleteErr] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    clientDocTypeApi
      .list()
      .then((res) => setRows(unwrap(res) || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErr("");
    setModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name,
      category: row.category,
      description: row.description || "",
      is_active: row.is_active,
      sort_order: row.sort_order ?? 0,
    });
    setErr("");
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description?.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing) await clientDocTypeApi.update(editing.id, payload);
      else await clientDocTypeApi.create(payload);
      setModal(false);
      load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to save.");
    } finally { setSaving(false); }
  };

  const toggleActive = async (row) => {
    try {
      await clientDocTypeApi.update(row.id, { is_active: !row.is_active });
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update.");
    }
  };

  const confirmDel = (row) => { setConfirmDelete(row); setDeleteErr(""); };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await clientDocTypeApi.delete(confirmDelete.id);
      setConfirmDelete(null);
      load();
    } catch (e) {
      setDeleteErr(e.response?.data?.detail || "Cannot delete this document type.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold t-heading">Document Types</h2>
          <p className="text-sm t-muted mt-0.5">Manage the document type catalogue used across client records.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm px-4 py-2">+ Add Type</button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface)" }}>
        {loading ? (
          <div className="p-6 text-sm t-muted text-center">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm t-muted text-center">No document types found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wide hidden md:table-cell">Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wide">Active</th>
                <th className="text-right px-4 py-3 text-xs font-semibold t-muted uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const cat = CATEGORY_COLORS[row.category] || CATEGORY_COLORS.general;
                return (
                  <tr key={row.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td className="px-4 py-3 t-body font-medium">
                      {row.name}
                      {row.is_system && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,174,236,0.1)", color: "#00aeec" }}>System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: cat.bg, color: cat.color }}>
                        {CATEGORIES.find(c => c.value === row.category)?.label || row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 t-muted hidden md:table-cell" style={{ maxWidth: 280 }}>
                      <span className="truncate block">{row.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Toggle checked={row.is_active} onChange={() => toggleActive(row)} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(row)} className="text-xs t-muted hover:text-[var(--c-accent)]">Edit</button>
                        {!row.is_system && (
                          <button onClick={() => confirmDel(row)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Document Type" : "Add Document Type"}
        size="sm"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
          </>
        }
      >
        {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
        <div className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />
          <div>
            <label className="block text-xs font-medium t-muted mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={500} />
          <Input
            label="Sort Order"
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            min={0}
          />
          <Toggle checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label="Active (available in client document uploads)" />
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Document Type"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={doDelete} className="btn-primary" style={{ background: "#ef4444" }}>Delete</button>
          </>
        }
      >
        {deleteErr && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{deleteErr}</div>}
        <p className="text-sm t-body">
          Delete <strong>{confirmDelete?.name}</strong>? This cannot be undone. The type must not be referenced by any uploaded documents.
        </p>
      </Modal>
    </div>
  );
}
