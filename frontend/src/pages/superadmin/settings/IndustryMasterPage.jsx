import React, { useEffect, useState } from "react";
import { industryMasterApi } from "../../../services/apiClient";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Modal from "../../../components/ui/Modal";
import Pagination from "../../../components/ui/Pagination";

const PAGE_SIZE = 15;

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
      <p className="text-xs uppercase tracking-widest t-muted">{label}</p>
      <p className="text-2xl font-bold t-heading mt-1">{value}</p>
    </div>
  );
}

function IconBtn({ onClick, title, danger, children }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 30, height: 30, borderRadius: 7, border: "1px solid",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s ease",
        background: danger
          ? hovered ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.06)"
          : hovered ? "rgba(0,174,236,0.13)" : "var(--c-surface2)",
        borderColor: danger
          ? hovered ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.2)"
          : hovered ? "rgba(0,174,236,0.45)" : "var(--c-border)",
        color: danger ? "#f87171" : hovered ? "#00aeec" : "var(--c-muted)",
      }}
    >
      {children}
    </button>
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

export default function IndustryMasterPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);

  const [showAdd, setShowAdd]   = useState(false);
  const [newName, setNewName]   = useState("");
  const [addErr, setAddErr]     = useState("");
  const [saving, setSaving]     = useState(false);

  const [editRow, setEditRow]     = useState(null);
  const [editName, setEditName]   = useState("");
  const [editErr, setEditErr]     = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState("");

  const [toast, setToast] = useState(null);

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

  const totalCount    = rows.length;
  const activeCount   = rows.filter(r => r.is_active).length;
  const inactiveCount = totalCount - activeCount;

  const filtered = rows
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleAdd = async () => {
    if (!newName.trim()) { setAddErr("Name is required."); return; }
    setSaving(true); setAddErr("");
    try {
      await industryMasterApi.create({ name: newName.trim(), sort_order: 0 });
      setNewName(""); setShowAdd(false);
      showToast("Industry added.");
      load(); setPage(1);
    } catch (e) {
      setAddErr(e?.response?.data?.detail || "Failed to add.");
    } finally { setSaving(false); }
  };

  const openEdit = (row) => { setEditRow(row); setEditName(row.name); setEditErr(""); };

  const handleEdit = async () => {
    if (!editName.trim()) { setEditErr("Name is required."); return; }
    setEditSaving(true); setEditErr("");
    try {
      await industryMasterApi.update(editRow.id, { name: editName.trim() });
      setEditRow(null);
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
    setDeleting(true); setDeleteErr("");
    try {
      await industryMasterApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      showToast("Industry deleted.");
      load(); setPage(1);
    } catch (e) {
      setDeleteErr(e?.response?.data?.detail || "Delete failed.");
    } finally { setDeleting(false); }
  };

  const columns = [
    {
      key: "_sr",
      label: "#",
      width: 48,
      render: (_v, _row, i) => (
        <span className="t-muted text-xs">{(safePage - 1) * PAGE_SIZE + i + 1}</span>
      ),
    },
    {
      key: "name",
      label: "Industry Name",
      render: (v) => <span className="font-medium t-body">{v}</span>,
    },
    {
      key: "is_active",
      label: "Status",
      width: 110,
      render: (_v, row) => (
        <button onClick={() => toggleActive(row)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <Badge variant={row.is_active ? "active" : "inactive"} label={row.is_active ? "Active" : "Inactive"} />
        </button>
      ),
    },
    {
      key: "actions",
      label: "",
      width: 90,
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <IconBtn onClick={() => openEdit(row)} title="Edit">
            <EditIcon />
          </IconBtn>
          <IconBtn onClick={() => { setConfirmDelete(row); setDeleteErr(""); }} title="Delete" danger>
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
          <h2 className="text-xl font-bold t-heading">Industry Master</h2>
          <p className="text-sm t-muted mt-1">Platform-wide industry list used in company forms across all workspaces.</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setNewName(""); setAddErr(""); }}
          className="btn-primary flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Add Industry
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total"    value={totalCount}    />
        <StatCard label="Active"   value={activeCount}   />
        <StatCard label="Inactive" value={inactiveCount} />
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

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search industries…"
          className="input-field max-w-xs"
        />
        <span className="text-xs t-muted">{filtered.length} {filtered.length === 1 ? "industry" : "industries"}</span>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={pageRows}
        loading={loading}
        emptyMessage={search ? "No industries match your search." : "No industries yet. Click Add Industry to get started."}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} total={filtered.length} />
      )}

      {/* Add modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Industry"
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Add"}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-semibold t-muted uppercase tracking-wider mb-1.5">
            Industry Name <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            autoFocus
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddErr(""); }}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Technology"
            className="input-field w-full"
            style={{ borderColor: addErr ? "#f87171" : undefined }}
          />
          {addErr && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{addErr}</p>}
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title="Edit Industry"
        size="sm"
        footer={
          <>
            <button onClick={() => setEditRow(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleEdit} disabled={editSaving} className="btn-primary">
              {editSaving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-semibold t-muted uppercase tracking-wider mb-1.5">
            Industry Name <span style={{ color: "#f87171" }}>*</span>
          </label>
          <input
            autoFocus
            value={editName}
            onChange={e => { setEditName(e.target.value); setEditErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setEditRow(null); }}
            className="input-field w-full"
            style={{ borderColor: editErr ? "#f87171" : undefined }}
          />
          {editErr && <p className="text-xs mt-1.5" style={{ color: "#f87171" }}>{editErr}</p>}
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete industry?"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm t-body">
          <strong>{confirmDelete?.name}</strong> will be permanently removed.
          Companies that already use this industry will keep it as text.
        </p>
        {deleteErr && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{deleteErr}</p>}
      </Modal>
    </div>
  );
}
