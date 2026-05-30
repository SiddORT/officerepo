import React, { useState, useEffect, useCallback, useRef } from "react";
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
      key: "profile_completion",
      label: "Profile",
      render: (v) => <ProfileCompletion pct={v ?? 0} />,
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
      label: "",
      render: (_, row) => (
        <ActionsDropdown
          row={row}
          onView={() => navigate(`/superadmin/tenants/${row.id}`)}
          onEdit={() => navigate(`/superadmin/tenants/${row.id}/edit`)}
          onSuspend={() => confirmAction("suspend", row)}
          onActivate={() => confirmAction("activate", row)}
        />
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
              style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }}
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

function ActionsDropdown({ row, onView, onEdit, onSuspend, onActivate }) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Position menu relative to trigger using fixed coords (avoids table clip)
  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 160;
      const top = spaceBelow > menuHeight
        ? rect.bottom + 4
        : rect.top - menuHeight - 4;
      const left = Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8);
      setMenuPos({ top, left });
    }
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const handle = () => setOpen(false);
    window.addEventListener("scroll", handle, true);
    return () => window.removeEventListener("scroll", handle, true);
  }, [open]);

  const isSuspended = row.status === "suspended";

  const items = [
    {
      label: "View Details",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: "#00aeec",
      onClick: onView,
    },
    {
      label: "Edit Tenant",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      color: "var(--c-text2)",
      onClick: onEdit,
    },
    { divider: true },
    isSuspended
      ? {
          label: "Activate Tenant",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "#10b981",
          onClick: onActivate,
        }
      : {
          label: "Suspend Tenant",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ),
          color: "#ef4444",
          onClick: onSuspend,
          danger: true,
        },
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger — three-dot button */}
      <button
        ref={triggerRef}
        onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
        className="flex items-center justify-center rounded-lg transition-all"
        style={{
          width: 32, height: 32,
          background: open ? "var(--c-surface2)" : "transparent",
          border: open ? "1px solid var(--c-border)" : "1px solid transparent",
          color: "var(--c-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--c-surface2)";
          e.currentTarget.style.border = "1px solid var(--c-border)";
          e.currentTarget.style.color = "var(--c-text2)";
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.border = "1px solid transparent";
            e.currentTarget.style.color = "var(--c-muted)";
          }
        }}
        title="Actions"
      >
        {/* Vertical three dots */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5"  r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {/* Dropdown portal rendered via fixed position */}
      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPos.top,
            left: menuPos.left,
            width: 176,
            zIndex: 9999,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
            overflow: "hidden",
            animation: "fadeScaleIn 0.12s ease",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient top accent */}
          <div style={{ height: 2, background: "linear-gradient(90deg, #00aeec, #ff7a1a)" }} />

          <div style={{ padding: "4px 0" }}>
            {items.map((item, i) =>
              item.divider ? (
                <div
                  key={`div-${i}`}
                  style={{ height: 1, margin: "4px 10px", background: "var(--c-border)" }}
                />
              ) : (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); item.onClick(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-all text-left"
                  style={{ color: item.color, background: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.danger
                      ? "rgba(239,68,68,0.08)"
                      : "var(--c-surface2)";
                  }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ color: item.color, opacity: 0.85, flexShrink: 0 }}>
                    {item.icon}
                  </span>
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

function ProfileCompletion({ pct }) {
  const pctNum = Number(pct) || 0;
  const isComplete = pctNum === 100;

  const color = isComplete
    ? "#10b981"
    : pctNum >= 60
    ? "#f59e0b"
    : "#ef4444";

  const label = isComplete ? "Complete" : "Incomplete";

  return (
    <div className="flex flex-col gap-1 min-w-[90px]">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color }}
        >
          {label}
        </span>
        <span className="text-[10px] font-mono t-muted tabular-nums">
          {pctNum}%
        </span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "var(--c-surface2)", width: "100%" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pctNum}%`,
            background: isComplete
              ? "#10b981"
              : pctNum >= 60
              ? "linear-gradient(90deg, #f59e0b, #fb923c)"
              : "linear-gradient(90deg, #ef4444, #f97316)",
          }}
        />
      </div>
    </div>
  );
}
