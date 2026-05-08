import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { tenantMgmtApi } from "../../../services/apiClient";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Pagination from "../../../components/ui/Pagination";
import SearchBar from "../../../components/ui/SearchBar";
import Select from "../../../components/ui/Select";
import Modal from "../../../components/ui/Modal";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Inactive" },
];

export default function TenantList() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await tenantMgmtApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      const d = res.data?.data ?? res.data;
      setTenants(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.total_pages ?? 1);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleSearchChange = (v) => { setSearch(v); setPage(1); };
  const handleStatusChange = (e) => { setStatusFilter(e.target.value); setPage(1); };

  const confirmAction = (type, tenant) => setConfirmModal({ type, tenant });

  const executeAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === "suspend") {
        await tenantMgmtApi.suspend(confirmModal.tenant.id);
      } else if (confirmModal.type === "activate") {
        await tenantMgmtApi.activate(confirmModal.tenant.id);
      }
      setConfirmModal(null);
      fetchTenants();
    } catch (e) {
      alert(e.response?.data?.detail || "Action failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: "_sr",
      label: "Sr. No",
      render: (_, _row, index) => (
        <span className="t-muted text-xs tabular-nums">
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      key: "tenant_name",
      label: "Tenant Name",
      sortable: true,
      render: (v, row) => (
        <button
          onClick={() => navigate(`/superadmin/tenants/${row.id}`)}
          className="font-medium t-heading hover:t-accent transition-colors text-left"
          style={{ color: "var(--c-text)" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--c-accent)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--c-text)"}
        >
          {v}
        </button>
      ),
    },
    {
      key: "tenant_code",
      label: "Tenant Code",
      render: (v) => (
        <code
          className="text-xs px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}
        >
          {v}
        </code>
      ),
    },
    {
      key: "subdomain",
      label: "Subdomain",
      render: (v) => v
        ? <span className="t-body">{v}</span>
        : <span className="t-muted">—</span>,
    },
    {
      key: "plan_name",
      label: "Plan",
      render: (v) => v ? <Badge status="active" label={v} /> : <span className="t-muted">—</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge status={v} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (v) => <span className="t-muted text-xs">{v ? new Date(v).toLocaleDateString() : "—"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-3 flex-wrap">
          <ActionBtn label="View"  accent="#00aeec" onClick={() => navigate(`/superadmin/tenants/${row.id}`)} />
          <ActionBtn label="Edit"  accent="var(--c-text2)" onClick={() => navigate(`/superadmin/tenants/${row.id}/edit`)} />
          {row.status === "suspended"
            ? <ActionBtn label="Activate" accent="#10b981" onClick={() => confirmAction("activate", row)} />
            : <ActionBtn label="Suspend"  accent="#ef4444"  onClick={() => confirmAction("suspend", row)} />
          }
        </div>
      ),
    },
  ];

  const activeCount    = tenants.filter((t) => t.status === "active").length;
  const suspendedCount = tenants.filter((t) => t.status === "suspended").length;
  const inactiveCount  = tenants.filter((t) => t.status === "inactive").length;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="inline-block w-1 h-5 rounded-full"
              style={{ background: "linear-gradient(to bottom, #00aeec, #8b5cf6)" }}
            />
            <h1 className="text-2xl font-bold t-heading">Tenant Management</h1>
          </div>
          <p className="text-sm t-muted ml-3">Manage all SaaS clients on the platform.</p>
        </div>
        <button
          onClick={() => navigate("/superadmin/tenants/new")}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Tenant
        </button>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: total,          color: "#00aeec" },
            { label: "Active",    value: activeCount,    color: "#10b981" },
            { label: "Suspended", value: suspendedCount, color: "#ef4444" },
            { label: "Inactive",  value: inactiveCount,  color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.10)",
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-xs t-muted">{label}</p>
                <p className="text-lg font-bold t-heading leading-tight">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters bar */}
      <div
        className="flex flex-wrap gap-3 rounded-xl px-4 py-3"
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <SearchBar
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by name, code, email..."
          className="flex-1 min-w-[200px] max-w-sm"
        />
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
          selectClassName="text-sm"
          className="w-44"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-red-400"
          style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <Table columns={columns} data={tenants} loading={loading} emptyMessage="No tenants yet. Create your first one." />

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}

      {/* Confirm Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={confirmModal?.type === "suspend" ? "Suspend Tenant" : "Activate Tenant"}
        size="sm"
        footer={
          <>
            <button onClick={() => setConfirmModal(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={executeAction}
              disabled={actionLoading}
              className={confirmModal?.type === "suspend" ? "btn-danger" : "btn-primary"}
            >
              {actionLoading ? "Processing..." : confirmModal?.type === "suspend" ? "Suspend" : "Activate"}
            </button>
          </>
        }
      >
        <p className="t-body text-sm">
          Are you sure you want to{" "}
          <span className="font-semibold t-heading">{confirmModal?.type}</span>{" "}
          tenant{" "}
          <span className="font-semibold t-heading">{confirmModal?.tenant?.tenant_name}</span>?
          {confirmModal?.type === "suspend" && (
            <span className="block mt-2 text-red-400">
              Suspended tenants will lose access to all modules.
            </span>
          )}
        </p>
      </Modal>
    </div>
  );
}

function ActionBtn({ label, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium transition-colors"
      style={{ color: accent }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.75"}
      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
    >
      {label}
    </button>
  );
}
