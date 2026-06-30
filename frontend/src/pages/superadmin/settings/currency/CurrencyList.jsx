import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { currencyApi } from "../../../../services/apiClient";
import { useAuth } from "../../../../contexts/AuthContext";
import Table from "../../../../components/ui/Table";
import Badge from "../../../../components/ui/Badge";
import Select from "../../../../components/ui/Select";
import Modal from "../../../../components/ui/Modal";
import Pagination from "../../../../components/ui/Pagination";
import RateModal from "./components/RateModal";
import { CURRENCY_PERMS, STATUS_VARIANT, toOptions, formatRate } from "./constants";
import { EditIconBtn, DeleteIconBtn } from "../../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog";

const unwrap = (res) => res?.data?.data ?? res?.data;
const PAGE_SIZE = 20;

export default function CurrencyList() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortKey, setSortKey] = useState("currency_code");
  const [sortDir, setSortDir] = useState("asc");

  const [meta, setMeta] = useState({ statuses: [], rate_sources: [] });
  const [stats, setStats] = useState(null);

  const [rateFor, setRateFor] = useState(null);
  const [confirmBase, setConfirmBase] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    currencyApi.options().then((res) => setMeta(unwrap(res) || {})).catch(() => {});
  }, []);

  const loadStats = useCallback(() => {
    currencyApi.dashboard().then((res) => setStats(unwrap(res))).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    currencyApi
      .list({
        page,
        page_size: PAGE_SIZE,
        sort_by: sortKey,
        sort_dir: sortDir,
        search: search || undefined,
        status: statusFilter || undefined,
        rate_source: sourceFilter || undefined,
      })
      .then((res) => {
        const d = unwrap(res);
        setRows(d?.items ?? []);
        setTotal(d?.total ?? 0);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [page, sortKey, sortDir, search, statusFilter, sourceFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStats(); }, [loadStats]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const refresh = () => { load(); loadStats(); };

  const [confirmToggle, setConfirmToggle] = useState(null);

  const executeToggle = async () => {
    const row = confirmToggle;
    setConfirmToggle(null);
    setActionLoading(true);
    setActionError("");
    try {
      const next = row.status === "Active" ? "Inactive" : "Active";
      await currencyApi.setStatus(row.id, next);
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to change status.");
    } finally {
      setActionLoading(false);
    }
  };

  const executeBase = async () => {
    if (!confirmBase) return;
    setActionLoading(true);
    setActionError("");
    try {
      await currencyApi.setBase(confirmBase.id, true);
      setConfirmBase(null);
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to set base currency.");
    } finally {
      setActionLoading(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    setActionLoading(true);
    setActionError("");
    try {
      await currencyApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      refresh();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to delete currency.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "_sr",
      label: "#",
      width: 48,
      render: (_v, _row, i) => (
        <span className="t-muted text-xs">{(page - 1) * PAGE_SIZE + i + 1}</span>
      ),
    },
    {
      key: "currency_code",
      label: "Code",
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Link to={`/superadmin/settings/currencies/${row.id}`} className="font-semibold t-body hover:underline">
            {v}
          </Link>
          {row.is_base_currency && <Badge variant="pending" label="Base" />}
        </div>
      ),
    },
    { key: "currency_name", label: "Name", sortable: true },
    { key: "currency_symbol", label: "Symbol", width: 80 },
    { key: "country", label: "Country", sortable: true },
    {
      key: "exchange_rate",
      label: "Rate",
      render: (v, row) => (
        <div className="flex items-center gap-1.5">
          <span className="t-body">{formatRate(v)}</span>
          {row.is_manual_override && <Badge variant="trial" label="Manual" />}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (v, row) => (
        hasPermission(CURRENCY_PERMS.activate) && !row.is_base_currency
          ? <button title={v === "Active" ? "Click to deactivate" : "Click to activate"} onClick={() => setConfirmToggle(row)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}><Badge variant={STATUS_VARIANT[v] || "default"} label={v} /></button>
          : <Badge variant={STATUS_VARIANT[v] || "default"} label={v} />
      ),
    },
    {
      key: "actions",
      label: "",
      width: 200,
      render: (_v, row) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {hasPermission(CURRENCY_PERMS.overrideRate) && (
            <button onClick={() => setRateFor(row)} className="text-xs px-2 py-1 rounded-lg layout-nav-idle">
              Rate
            </button>
          )}
          {hasPermission(CURRENCY_PERMS.edit) && !row.is_base_currency && (
            <button onClick={() => setConfirmBase(row)} className="text-xs px-2 py-1 rounded-lg layout-nav-idle">
              Set base
            </button>
          )}
          {hasPermission(CURRENCY_PERMS.edit) && (
            <EditIconBtn onClick={() => navigate(`/superadmin/settings/currencies/${row.id}/edit`)} title="Edit currency" />
          )}
          {hasPermission(CURRENCY_PERMS.edit) && !row.is_base_currency && (
            <DeleteIconBtn onClick={() => setConfirmDelete(row)} title="Delete currency" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold t-heading">Currency Management</h2>
          <p className="text-sm t-muted mt-1">
            Configure currencies, exchange rates and live-sync settings for the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission(CURRENCY_PERMS.viewHistory) && (
            <Link to="/superadmin/settings/currencies/sync-logs" className="btn-secondary">
              Sync Logs
            </Link>
          )}
          {hasPermission(CURRENCY_PERMS.create) && (
            <Link to="/superadmin/settings/currencies/new" className="btn-primary flex items-center gap-2">
              <span className="text-lg leading-none">+</span> Add Currency
            </Link>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Inactive" value={stats.inactive} />
          <StatCard label="Base" value={stats.base_currency || "—"} />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          value={search}
          onChange={(e) => { setPage(1); setSearch(e.target.value); }}
          placeholder="Search code, name or country…"
          className="input-field max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
          options={toOptions(meta.statuses || [])}
          placeholder="All statuses"
          className="w-40"
        />
        <Select
          value={sourceFilter}
          onChange={(e) => { setPage(1); setSourceFilter(e.target.value); }}
          options={toOptions(meta.rate_sources || [])}
          placeholder="All sources"
          className="w-40"
        />
      </div>

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No currencies yet."
        onSort={handleSort}
        sortKey={sortKey}
        sortDir={sortDir}
      />

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} total={total} />
      )}

      {rateFor && (
        <RateModal
          currency={rateFor}
          rateSources={meta.rate_sources || []}
          onClose={() => setRateFor(null)}
          onSaved={() => { setRateFor(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === "Active" ? "Deactivate Currency" : "Activate Currency"}
        message={`${confirmToggle?.status === "Active" ? "Deactivate" : "Activate"} ${confirmToggle?.currency_code} (${confirmToggle?.currency_name})?`}
        confirmLabel={confirmToggle?.status === "Active" ? "Deactivate" : "Activate"}
        confirmVariant={confirmToggle?.status === "Active" ? "danger" : "primary"}
        onConfirm={executeToggle}
        onCancel={() => setConfirmToggle(null)}
      />

      <Modal
        open={!!confirmBase}
        onClose={() => setConfirmBase(null)}
        title="Set base currency"
        footer={
          <>
            <button onClick={() => setConfirmBase(null)} className="btn-secondary">Cancel</button>
            <button onClick={executeBase} disabled={actionLoading} className="btn-primary">
              {actionLoading ? "Saving…" : "Confirm"}
            </button>
          </>
        }
      >
        <p className="text-sm t-body">
          Make <strong>{confirmBase?.currency_code}</strong> the single platform base currency?
          The current base will be demoted. This change is audited.
        </p>
        {actionError && <p className="text-xs text-red-400 mt-3">{actionError}</p>}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete currency"
        footer={
          <>
            <button onClick={() => setConfirmDelete(null)} className="btn-secondary">Cancel</button>
            <button onClick={executeDelete} disabled={actionLoading} className="btn-danger">
              {actionLoading ? "Deleting…" : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm t-body">
          Delete <strong>{confirmDelete?.currency_code}</strong>? It will be archived (soft delete).
        </p>
        {actionError && <p className="text-xs text-red-400 mt-3">{actionError}</p>}
      </Modal>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
      <p className="text-xs uppercase tracking-widest t-muted">{label}</p>
      <p className="text-2xl font-bold t-heading mt-1">{value}</p>
    </div>
  );
}
