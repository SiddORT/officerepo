import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clientsApi } from "../../../services/apiClient";
import Table from "../../../components/ui/Table";
import Pagination from "../../../components/ui/Pagination";
import SearchBar from "../../../components/ui/SearchBar";
import Select from "../../../components/ui/Select";
import CollapsibleFilters, { useCollapsibleFilters } from "../../../components/ui/CollapsibleFilters";
import FilterToggleButton from "../../../components/ui/FilterToggleButton";
import Modal from "../../../components/ui/Modal";
import { StatusBadge, SubscriptionStatusBadge } from "./components/StatusBadge";
import { toOptions, formatDate } from "./constants";

export default function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);
  const [options, setOptions] = useState({ statuses: [] });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { open: filtersOpen, toggle: toggleFilters } = useCollapsibleFilters("clients");

  useEffect(() => {
    clientsApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
    refreshStats();
  }, []);

  const refreshStats = useCallback(() => {
    clientsApi.dashboard()
      .then((res) => setStats(res.data?.data ?? res.data))
      .catch(() => {});
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await clientsApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: status || undefined,
        industry: industry || undefined,
        country: country || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      const d = res.data?.data ?? res.data;
      setClients(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.total_pages ?? 1);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, industry, country, sortBy, sortDir]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const resetPage = (setter) => (value) => { setter(value); setPage(1); };

  const activeFilterCount = [search, status, industry, country].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setIndustry("");
    setCountry("");
    setPage(1);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await clientsApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      fetchClients();
      refreshStats();
    } catch (e) {
      alert(e.response?.data?.detail || "Archive failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "_sr",
      label: "Sr.",
      render: (_, _row, index) => (
        <span className="t-muted text-xs tabular-nums">{(page - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      key: "company_name",
      label: "Client",
      sortable: true,
      render: (v, row) => (
        <button
          onClick={() => navigate(`/superadmin/clients/${row.id}`)}
          className="text-left"
          style={{ color: "var(--c-text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text)")}
        >
          <span className="font-medium block">{v}</span>
          <span className="text-xs t-muted">{row.industry || "—"}</span>
        </button>
      ),
    },
    {
      key: "client_code",
      label: "Client #",
      sortable: true,
      render: (v) => (
        <code className="text-[11px] px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>
          {v}
        </code>
      ),
    },
    { key: "country", label: "Country", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted">—</span> },
    { key: "status", label: "Status", sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: "subscription_plan", label: "Plan", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted">—</span> },
    { key: "subscription_status", label: "Subscription", render: (v) => <SubscriptionStatusBadge status={v} /> },
    {
      key: "converted_from_lead",
      label: "Source",
      render: (v) => v
        ? <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>From Lead</span>
        : <span className="t-muted text-xs">Direct</span>,
    },
    { key: "created_at", label: "Created", sortable: true, render: (v) => <span className="t-muted text-xs">{formatDate(v)}</span> },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <ActionsDropdown
          row={row}
          onView={() => navigate(`/superadmin/clients/${row.id}`)}
          onEdit={() => navigate(`/superadmin/clients/${row.id}/edit`)}
          onDelete={() => setConfirmDelete(row)}
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            <h1 className="text-2xl font-bold t-heading">Client Management</h1>
          </div>
          <p className="text-sm t-muted ml-3">Manage your tenant clients — each client is one organization with its own database, users and subscription.</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterToggleButton active={filtersOpen} count={activeFilterCount} onClick={toggleFilters} />
          <button onClick={() => navigate("/superadmin/clients/new")} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Client
          </button>
        </div>
      </div>

      {/* Dashboard widgets */}
      <Dashboard stats={stats} />

      {/* Filters */}
      <CollapsibleFilters open={filtersOpen} hideHeader activeCount={activeFilterCount} onClear={clearFilters}>
        <SearchBar value={search} onChange={resetPage(setSearch)} placeholder="Search company, client #..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} options={toOptions(options.statuses)} placeholder="All Statuses" selectClassName="text-sm" className="w-40" />
        <input
          value={industry}
          onChange={(e) => resetPage(setIndustry)(e.target.value)}
          placeholder="Industry"
          className="input-field text-sm w-40"
        />
        <input
          value={country}
          onChange={(e) => resetPage(setCountry)(e.target.value)}
          placeholder="Country"
          className="input-field text-sm w-40"
        />
      </CollapsibleFilters>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <Table columns={columns} data={clients} loading={loading} emptyMessage="No clients yet. Create your first one or convert a Won lead." onSort={handleSort} sortKey={sortBy} sortDir={sortDir} />

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Archive Client"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={executeDelete} disabled={actionLoading} className="btn-danger">
              {actionLoading ? "Archiving..." : "Archive"}
            </button>
          </>
        }
      >
        <p className="t-body text-sm">
          Are you sure you want to archive client{" "}
          <span className="font-semibold t-heading">{confirmDelete?.company_name}</span>? It will be hidden from the active list.
        </p>
      </Modal>
    </div>
  );
}

function Dashboard({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Clients", value: stats.total_clients, color: "#00aeec" },
    { label: "Active", value: stats.active, color: "#10b981" },
    { label: "Trial", value: stats.trial, color: "#8b5cf6" },
    { label: "Prospective", value: stats.prospective, color: "#64748b" },
    { label: "Suspended", value: stats.suspended, color: "#f59e0b" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="rounded-xl px-4 py-3"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "0 2px 12px rgba(0,0,0,0.10)" }}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <p className="text-xs t-muted">{label}</p>
          </div>
          <p className="text-xl font-bold t-heading leading-tight mt-1">{value ?? 0}</p>
        </div>
      ))}
    </div>
  );
}

function ActionsDropdown({ row, onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 140;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4;
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      setMenuPos({ top, left });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = () => setOpen(false);
    window.addEventListener("scroll", handle, true);
    return () => window.removeEventListener("scroll", handle, true);
  }, [open]);

  const items = [
    { label: "View Details", color: "#00aeec", onClick: onView },
    { label: "Edit Client", color: "var(--c-text2)", onClick: onEdit },
    { divider: true },
    { label: "Archive Client", color: "#ef4444", onClick: onDelete, danger: true },
  ];

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
        className="flex items-center justify-center rounded-lg transition-all"
        style={{ width: 32, height: 32, background: open ? "var(--c-surface2)" : "transparent", border: open ? "1px solid var(--c-border)" : "1px solid transparent", color: "var(--c-muted)" }}
        title="Actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div ref={menuRef}
          style={{ position: "fixed", top: menuPos.top, left: menuPos.left, width: 176, zIndex: 9999, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.22)", overflow: "hidden" }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ height: 2, background: "linear-gradient(90deg, #00aeec, #ff7a1a)" }} />
          <div style={{ padding: "4px 0" }}>
            {items.map((item, i) =>
              item.divider ? (
                <div key={`div-${i}`} style={{ height: 1, margin: "4px 10px", background: "var(--c-border)" }} />
              ) : (
                <button key={item.label} onClick={() => { setOpen(false); item.onClick(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all text-left"
                  style={{ color: item.color, background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? "rgba(239,68,68,0.08)" : "var(--c-surface2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
