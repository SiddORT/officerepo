import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { leadsApi } from "../../../services/apiClient";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import Table from "../../../components/ui/Table";
import Pagination from "../../../components/ui/Pagination";
import SearchBar from "../../../components/ui/SearchBar";
import Select from "../../../components/ui/Select";
import CollapsibleFilters, { useCollapsibleFilters } from "../../../components/ui/CollapsibleFilters";
import FilterToggleButton from "../../../components/ui/FilterToggleButton";
import Modal from "../../../components/ui/Modal";
import { StageBadge, StatusBadge } from "./components/StageBadge";
import ScoreBadge from "./components/ScoreBadge";
import { toOptions, formatCurrency, formatDate } from "./constants";

export default function LeadList() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);
  const [options, setOptions] = useState({ stages: [], statuses: [], sources: [], score_labels: [] });

  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [scoreLabel, setScoreLabel] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { open: filtersOpen, toggle: toggleFilters } = useCollapsibleFilters("leads");

  useEffect(() => {
    leadsApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
    refreshStats();
  }, []);

  const refreshStats = useCallback(() => {
    leadsApi.dashboard()
      .then((res) => setStats(res.data?.data ?? res.data))
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await leadsApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        stage: stage || undefined,
        status: status || undefined,
        source: source || undefined,
        score_label: scoreLabel || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      const d = res.data?.data ?? res.data;
      setLeads(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.total_pages ?? 1);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, stage, status, source, scoreLabel, sortBy, sortDir]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

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

  const activeFilterCount = [search, stage, status, source, scoreLabel].filter(Boolean).length;

  const clearFilters = () => {
    setSearch("");
    setStage("");
    setStatus("");
    setSource("");
    setScoreLabel("");
    setPage(1);
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    try {
      await leadsApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      fetchLeads();
      refreshStats();
    } catch (e) {
      alert(e.response?.data?.detail || "Delete failed.");
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
      label: "Company",
      sortable: true,
      render: (v, row) => (
        <button
          onClick={() => navigate(`/superadmin/leads/${row.id}`)}
          className="text-left"
          style={{ color: "var(--c-text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text)")}
        >
          <span className="font-medium block">{v}</span>
          <span className="text-xs t-muted">{row.contact_name}</span>
        </button>
      ),
    },
    {
      key: "lead_number",
      label: "Lead #",
      render: (v) => (
        <code className="text-[11px] px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>
          {v}
        </code>
      ),
    },
    { key: "lead_source", label: "Source", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted">—</span> },
    { key: "current_stage", label: "Stage", sortable: true, render: (v) => <StageBadge stage={v} /> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
    { key: "lead_score", label: "Score", sortable: true, render: (v, row) => <ScoreBadge score={v} label={row.lead_score_label} /> },
    { key: "expected_revenue", label: "Revenue", sortable: true, render: (v) => <span className="t-body text-sm tabular-nums">{formatCurrency(v)}</span> },
    { key: "lead_owner_name", label: "Owner", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted text-xs">—</span> },
    { key: "created_at", label: "Created", sortable: true, render: (v) => <span className="t-muted text-xs">{formatDate(v)}</span> },
    {
      key: "actions",
      label: "",
      width: 80,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <EditIconBtn onClick={() => navigate(`/superadmin/leads/${row.id}/edit`)} title="Edit lead" />
          <DeleteIconBtn onClick={() => setConfirmDelete(row)} title="Delete lead" />
        </div>
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
            <h1 className="text-2xl font-bold t-heading">Lead Management</h1>
          </div>
          <p className="text-sm t-muted ml-3">Track your sales pipeline from first contact to conversion.</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterToggleButton active={filtersOpen} count={activeFilterCount} onClick={toggleFilters} />
          <button onClick={() => navigate("/superadmin/leads/new")} className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Lead
          </button>
        </div>
      </div>

      {/* Dashboard widgets */}
      <Dashboard stats={stats} />

      {/* Filters */}
      <CollapsibleFilters open={filtersOpen} hideHeader activeCount={activeFilterCount} onClear={clearFilters}>
        <SearchBar value={search} onChange={resetPage(setSearch)} placeholder="Search company, contact, lead #..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select value={stage} onChange={(e) => resetPage(setStage)(e.target.value)} options={toOptions(options.stages)} placeholder="All Stages" selectClassName="text-sm" className="w-40" />
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} options={toOptions(options.statuses)} placeholder="All Statuses" selectClassName="text-sm" className="w-36" />
        <Select value={source} onChange={(e) => resetPage(setSource)(e.target.value)} options={toOptions(options.sources)} placeholder="All Sources" selectClassName="text-sm" className="w-40" />
        <Select value={scoreLabel} onChange={(e) => resetPage(setScoreLabel)(e.target.value)} options={toOptions(options.score_labels)} placeholder="All Scores" selectClassName="text-sm" className="w-36" />
      </CollapsibleFilters>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <Table columns={columns} data={leads} loading={loading} emptyMessage="No leads yet. Create your first one." onSort={handleSort} sortKey={sortBy} sortDir={sortDir} />

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Lead"
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={executeDelete} disabled={actionLoading} className="btn-danger">
              {actionLoading ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p className="t-body text-sm">
          Are you sure you want to delete lead{" "}
          <span className="font-semibold t-heading">{confirmDelete?.company_name}</span>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function Dashboard({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: "Total Leads", value: stats.total_leads, color: "#00aeec" },
    { label: "Qualified", value: stats.qualified_leads, color: "#6366f1" },
    { label: "Demo Scheduled", value: stats.demo_scheduled, color: "#8b5cf6" },
    { label: "Won", value: stats.won_leads, color: "#10b981" },
    { label: "Lost", value: stats.lost_leads, color: "#ef4444" },
    { label: "Conversion Rate", value: `${stats.conversion_rate ?? 0}%`, color: "#ff7a1a" },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {(stats.overdue_followups_count > 0 || stats.upcoming_followups_count > 0 || stats.average_conversion_days != null) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniStat label="Avg. Conversion" value={stats.average_conversion_days != null ? `${stats.average_conversion_days} days` : "—"} color="#00aeec" />
          <MiniStat label="Upcoming Follow-ups (today)" value={stats.upcoming_followups_count ?? 0} color="#f59e0b" />
          <MiniStat label="Overdue Follow-ups" value={stats.overdue_followups_count ?? 0} color="#ef4444" />
        </div>
      )}

      <NotificationsPanel notifications={stats.notifications} />
    </div>
  );
}

function NotificationsPanel({ notifications }) {
  const navigate = useNavigate();
  if (!notifications || notifications.length === 0) return null;
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
        <h3 className="text-sm font-semibold t-heading">Needs attention</h3>
        <span className="text-xs t-muted">({notifications.length})</span>
      </div>
      <ul className="space-y-1.5 max-h-64 overflow-y-auto">
        {notifications.map((n, i) => {
          const overdue = n.urgency === "overdue";
          return (
            <li key={`${n.type}-${n.lead_id}-${i}`}>
              <button
                onClick={() => navigate(`/superadmin/leads/${n.lead_id}`)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-all"
                style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm t-body truncate">{n.title}</p>
                  <p className="text-xs t-muted truncate">{n.lead_name}{n.date ? ` · ${formatDate(n.date)}` : ""}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: overdue ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                    color: overdue ? "#ef4444" : "#f59e0b",
                    border: `1px solid ${overdue ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                  }}>
                  {overdue ? "Overdue" : "Due"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <p className="text-xs t-muted">{label}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color }}>{value}</p>
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
    { label: "Edit Lead", color: "var(--c-text2)", onClick: onEdit },
    { divider: true },
    { label: "Delete Lead", color: "#ef4444", onClick: onDelete, danger: true },
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
