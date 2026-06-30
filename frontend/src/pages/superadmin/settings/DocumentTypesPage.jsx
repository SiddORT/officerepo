import React, { useCallback, useEffect, useState } from "react";
import { clientDocTypeApi } from "../../../services/apiClient";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";
import Pagination from "../../../components/ui/Pagination";

const unwrap = (res) => res?.data?.data ?? res?.data;

const PAGE_SIZE = 15;

const CATEGORIES = [
  { value: "compliance", label: "Compliance" },
  { value: "branding",   label: "Branding"   },
  { value: "general",    label: "General"     },
];

const CAT_VARIANT = {
  compliance: "suspended",
  branding:   "pending",
  general:    "inactive",
};

const EMPTY_FORM = { name: "", category: "general", description: "", is_active: true };

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
      <p className="text-xs uppercase tracking-widest t-muted">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: color || "var(--c-text)" }}>{value}</p>
    </div>
  );
}

function IconBtn({ onClick, title, danger, disabled, children }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30, height: 30, borderRadius: 7, border: "1px solid",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s ease",
        opacity: disabled ? 0.35 : 1,
        background: disabled
          ? "var(--c-surface2)"
          : danger
            ? hovered ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)"
            : hovered ? "rgba(0,174,236,0.13)" : "var(--c-surface2)",
        borderColor: disabled
          ? "var(--c-border)"
          : danger
            ? hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"
            : hovered ? "rgba(0,174,236,0.45)" : "var(--c-border)",
        color: disabled ? "var(--c-muted)" : danger ? "#f87171" : hovered ? "#00aeec" : "var(--c-muted)",
      }}
    >{children}</button>
  );
}

const EditIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function DocumentTypesPage() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage]         = useState(1);

  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteErr, setDeleteErr]         = useState("");
  const [deleting, setDeleting]           = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    clientDocTypeApi.list()
      .then((res) => setRows(unwrap(res) || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setErr(""); setModal(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({ name: row.name, category: row.category, description: row.description || "", is_active: row.is_active });
    setErr(""); setModal(true);
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
        sort_order: editing?.sort_order ?? 0,
      };
      if (editing) await clientDocTypeApi.update(editing.id, payload);
      else         await clientDocTypeApi.create(payload);
      setModal(false); load();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to save.");
    } finally { setSaving(false); }
  };

  const toggleActive = async (row) => {
    try {
      await clientDocTypeApi.update(row.id, { is_active: !row.is_active });
      load();
    } catch (e) { alert(e.response?.data?.detail || "Failed to update."); }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true); setDeleteErr("");
    try {
      await clientDocTypeApi.delete(confirmDelete.id);
      setConfirmDelete(null); load(); setPage(1);
    } catch (e) {
      setDeleteErr(e.response?.data?.detail || "Cannot delete this document type.");
    } finally { setDeleting(false); }
  };

  // Counters
  const total      = rows.length;
  const activeCount = rows.filter(r => r.is_active).length;
  const catCounts  = CATEGORIES.map(c => ({ ...c, count: rows.filter(r => r.category === c.value).length }));

  // Filter + search
  const filtered = rows
    .filter(r => !catFilter || r.category === catFilter)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns = [
    {
      key: "_sr", label: "#", width: 48,
      render: (_v, _row, i) => <span className="t-muted text-xs">{(safePage - 1) * PAGE_SIZE + i + 1}</span>,
    },
    {
      key: "name", label: "Name",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium t-body">{v}</span>
          {row.is_system && (
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "rgba(0,174,236,0.1)", color: "#00aeec" }}>System</span>
          )}
        </div>
      ),
    },
    {
      key: "category", label: "Category", width: 130,
      render: (v) => <Badge variant={CAT_VARIANT[v] || "default"} label={CATEGORIES.find(c => c.value === v)?.label || v} />,
    },
    {
      key: "description", label: "Description",
      render: (v) => <span className="t-muted text-xs truncate block max-w-xs">{v || "—"}</span>,
    },
    {
      key: "is_active", label: "Status", width: 110,
      render: (_v, row) => (
        <button onClick={() => toggleActive(row)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Badge variant={row.is_active ? "active" : "inactive"} label={row.is_active ? "Active" : "Inactive"} />
        </button>
      ),
    },
    {
      key: "actions", label: "", width: 90,
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <IconBtn onClick={() => openEdit(row)} title="Edit">
            <EditIcon />
          </IconBtn>
          <IconBtn
            onClick={() => { setConfirmDelete(row); setDeleteErr(""); }}
            title={row.is_system ? "System types cannot be deleted" : "Delete"}
            danger
            disabled={row.is_system}
          >
            <TrashIcon />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold t-heading">Document Types</h2>
          <p className="text-sm t-muted mt-1">Manage the document type catalogue used across client records.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Add Type
        </button>
      </div>

      {/* Stat cards — Total, Active, + one per category */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <StatCard label="Total"   value={total}        />
        <StatCard label="Active"  value={activeCount}  color="rgb(74,222,128)" />
        {catCounts.map(c => (
          <StatCard
            key={c.value}
            label={c.label}
            value={c.count}
            color={c.value === "compliance" ? "#f87171" : c.value === "branding" ? "#a78bfa" : "#94a3b8"}
          />
        ))}
      </div>

      {/* Search + category filter */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search document types…"
          className="input-field max-w-xs"
        />
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setCatFilter(""); setPage(1); }}
            className={catFilter === "" ? "btn-primary" : "btn-secondary"}
            style={{ fontSize: 12, padding: "5px 12px", height: "auto" }}
          >All</button>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => { setCatFilter(c.value); setPage(1); }}
              className={catFilter === c.value ? "btn-primary" : "btn-secondary"}
              style={{ fontSize: 12, padding: "5px 12px", height: "auto" }}
            >{c.label}</button>
          ))}
        </div>
        <span className="text-xs t-muted ml-auto">
          {filtered.length} {filtered.length === 1 ? "type" : "types"}
        </span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={pageRows}
        loading={loading}
        emptyMessage={search || catFilter ? "No document types match your filter." : "No document types yet."}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} total={filtered.length} />
      )}

      {/* Add / Edit modal */}
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
          <Input
            label="Name" required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={100}
          />
          <div>
            <label className="block text-xs font-semibold t-muted uppercase tracking-wider mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            maxLength={500}
          />
          <Toggle
            checked={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
            label="Active (available in client document uploads)"
          />
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Document Type"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={doDelete} disabled={deleting} className="btn-danger">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        {deleteErr && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{deleteErr}</div>}
        <p className="text-sm t-body">
          Delete <strong>{confirmDelete?.name}</strong>? This cannot be undone. The type must not be in use by any uploaded documents.
        </p>
      </Modal>
    </div>
  );
}
