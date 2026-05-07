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
  const [regionFilter, setRegionFilter] = useState("");
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
        region: regionFilter || undefined,
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
  }, [page, pageSize, search, statusFilter, regionFilter]);

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
      key: "tenant_name",
      label: "Tenant Name",
      sortable: true,
      render: (v, row) => (
        <button
          onClick={() => navigate(`/superadmin/tenants/${row.id}`)}
          className="font-medium text-white hover:text-indigo-400 transition-colors text-left"
        >
          {v}
        </button>
      ),
    },
    {
      key: "tenant_code",
      label: "Tenant Code",
      render: (v) => <code className="text-xs text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">{v}</code>,
    },
    {
      key: "subdomain",
      label: "Subdomain",
      render: (v) => v ? <span className="text-gray-300">{v}</span> : <span className="text-gray-600">—</span>,
    },
    {
      key: "plan_name",
      label: "Plan",
      render: (v) => v ? <Badge status="active" label={v} /> : <span className="text-gray-600">—</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <Badge status={v} />,
    },
    {
      key: "created_at",
      label: "Created",
      render: (v) => v ? new Date(v).toLocaleDateString() : "—",
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <ActionBtn
            label="View"
            color="indigo"
            onClick={() => navigate(`/superadmin/tenants/${row.id}`)}
          />
          <ActionBtn
            label="Edit"
            color="gray"
            onClick={() => navigate(`/superadmin/tenants/${row.id}/edit`)}
          />
          {row.status === "suspended" ? (
            <ActionBtn label="Activate" color="emerald" onClick={() => confirmAction("activate", row)} />
          ) : (
            <ActionBtn label="Suspend" color="red" onClick={() => confirmAction("suspend", row)} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all SaaS clients on the platform.</p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg px-4 py-3 text-sm text-red-400">
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
            <button
              onClick={() => setConfirmModal(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
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
        <p className="text-gray-300 text-sm">
          Are you sure you want to{" "}
          <span className="font-semibold text-white">{confirmModal?.type}</span>{" "}
          tenant{" "}
          <span className="font-semibold text-white">{confirmModal?.tenant?.tenant_name}</span>?
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

function ActionBtn({ label, color, onClick }) {
  const colors = {
    indigo: "text-indigo-400 hover:text-indigo-300",
    gray: "text-gray-400 hover:text-gray-300",
    emerald: "text-emerald-400 hover:text-emerald-300",
    red: "text-red-400 hover:text-red-300",
  };
  return (
    <button
      onClick={onClick}
      className={`text-xs font-medium transition-colors ${colors[color] || colors.gray}`}
    >
      {label}
    </button>
  );
}
