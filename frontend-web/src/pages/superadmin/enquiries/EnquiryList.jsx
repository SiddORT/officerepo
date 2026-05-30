import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { enquiryInboxApi } from "../../../services/apiClient";
import Table from "../../../components/ui/Table";
import Pagination from "../../../components/ui/Pagination";
import SearchBar from "../../../components/ui/SearchBar";
import Select from "../../../components/ui/Select";
import CollapsibleFilters from "../../../components/ui/CollapsibleFilters";
import { STATUS_COLORS, toOptions, formatDate } from "./constants";

function StatusPill({ status }) {
  if (!status) return <span className="t-muted">—</span>;
  const color = STATUS_COLORS[status] || "#64748b";
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}40` }}>
      {status}
    </span>
  );
}

const SPAM_FILTERS = [
  { value: "false", label: "Not Spam" },
  { value: "true", label: "Spam Only" },
];

export default function EnquiryList() {
  const navigate = useNavigate();
  const [enquiries, setEnquiries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);
  const [options, setOptions] = useState({ all_statuses: [] });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [spam, setSpam] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    enquiryInboxApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
    refreshStats();
  }, []);

  const refreshStats = useCallback(() => {
    enquiryInboxApi.dashboard()
      .then((res) => setStats(res.data?.data ?? res.data))
      .catch(() => {});
  }, []);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await enquiryInboxApi.list({
        page,
        page_size: pageSize,
        search: search || undefined,
        status: status || undefined,
        is_spam: spam === "" ? undefined : spam,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      const d = res.data?.data ?? res.data;
      setEnquiries(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.total_pages ?? 1);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, spam, sortBy, sortDir]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

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

  const activeFilterCount = [search, status, spam].filter(Boolean).length;

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
          onClick={() => navigate(`/superadmin/enquiries/${row.id}`)}
          className="text-left"
          style={{ color: "var(--c-text)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text)")}
        >
          <span className="font-medium block">{v || "—"}</span>
          <span className="text-xs t-muted">{row.full_name}</span>
        </button>
      ),
    },
    {
      key: "enquiry_number",
      label: "Enquiry #",
      render: (v) => (
        <code className="text-[11px] px-1.5 py-0.5 rounded font-mono"
          style={{ backgroundColor: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>
          {v}
        </code>
      ),
    },
    { key: "email", label: "Email", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted">—</span> },
    { key: "interested_module", label: "Interest", render: (v) => v ? <span className="t-body text-sm capitalize">{v}</span> : <span className="t-muted">—</span> },
    { key: "source", label: "Source", render: (v) => v ? <span className="t-body text-sm">{v}</span> : <span className="t-muted">—</span> },
    { key: "status", label: "Status", sortable: true, render: (v) => <StatusPill status={v} /> },
    {
      key: "is_spam",
      label: "Flags",
      render: (v, row) => (
        <div className="flex items-center gap-1">
          {v && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
              Spam
            </span>
          )}
          {row.converted_lead_id && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
              Lead
            </span>
          )}
        </div>
      ),
    },
    { key: "created_at", label: "Received", sortable: true, render: (v) => <span className="t-muted text-xs">{formatDate(v)}</span> },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            <h1 className="text-2xl font-bold t-heading">Enquiry Inbox</h1>
          </div>
          <p className="text-sm t-muted ml-3">Every website enquiry lands here. Triage, assign, and convert to leads.</p>
        </div>
      </div>

      {/* Dashboard widgets */}
      <Dashboard stats={stats} />

      {/* Filters */}
      <CollapsibleFilters activeCount={activeFilterCount} storageKey="enquiries">
        <SearchBar value={search} onChange={resetPage(setSearch)} placeholder="Search company, name, enquiry #..." className="flex-1 min-w-[200px] max-w-sm" />
        <Select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} options={toOptions(options.all_statuses)} placeholder="All Statuses" selectClassName="text-sm" className="w-40" />
        <Select value={spam} onChange={(e) => resetPage(setSpam)(e.target.value)} options={SPAM_FILTERS} placeholder="All Enquiries" selectClassName="text-sm" className="w-40" />
      </CollapsibleFilters>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      <Table columns={columns} data={enquiries} loading={loading} emptyMessage="No enquiries yet." onSort={handleSort} sortKey={sortBy} sortDir={sortDir} />

      {!loading && total > 0 && (
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      )}
    </div>
  );
}

function Dashboard({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: "Total", value: stats.total, color: "#00aeec" },
    { label: "New", value: stats.new, color: "#3b82f6" },
    { label: "In Review", value: stats.in_review, color: "#8b5cf6" },
    { label: "Assigned", value: stats.assigned, color: "#f59e0b" },
    { label: "Converted", value: stats.converted, color: "#10b981" },
    { label: "Spam", value: stats.spam, color: "#ef4444" },
  ];
  return (
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
  );
}
