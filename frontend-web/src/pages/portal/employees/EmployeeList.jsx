import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi, portalOrgApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";

const inp = {
  padding: "7px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", outline: "none",
};

function StatusBadge({ status, isActive }) {
  const colors = {
    Active:        { bg: "rgba(34,197,94,0.12)",  color: "#4ade80" },
    Draft:         { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" },
    "On Leave":    { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24" },
    Probation:     { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
    "Notice Period":{ bg: "rgba(251,146,60,0.12)", color: "#fb923c" },
    Resigned:      { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    Terminated:    { bg: "rgba(248,113,113,0.12)", color: "#f87171" },
    Retired:       { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" },
    Inactive:      { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" },
  };
  const s = colors[status] || { bg: "rgba(148,163,184,0.12)", color: "var(--c-muted)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, var(--c-accent), #a855f7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>{initials}</div>
  );
}

export default function EmployeeList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterType, setFilterType] = useState("");
  const [companies, setCompanies] = useState([]);
  const [options, setOptions] = useState({});

  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => setCompanies(r.data.data?.data || []))
      .catch(() => {});
    portalEmployeeApi.options(subdomain, token)
      .then(r => setOptions(r.data.data || {}))
      .catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (filterStatus) params.employment_status = filterStatus;
      if (filterCompany) params.company_id = filterCompany;
      if (filterType) params.employment_type = filterType;
      const r = await portalEmployeeApi.list(subdomain, token, params);
      const d = r.data.data || {};
      setRows(d.data || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load employees.");
    } finally { setLoading(false); }
  }, [subdomain, token, page, search, filterStatus, filterCompany, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (emp) => {
    setActionLoading(emp.id);
    try {
      if (emp.is_active) {
        await portalEmployeeApi.deactivate(subdomain, token, emp.id);
        showToast("Employee deactivated.");
      } else {
        await portalEmployeeApi.activate(subdomain, token, emp.id);
        showToast("Employee activated.");
      }
      load();
    } catch (e) {
      showToast(e?.response?.data?.detail || "Action failed.", false);
    } finally { setActionLoading(null); }
  };

  const totalPages = Math.ceil(total / pageSize);
  const statuses = options.employment_statuses || [];
  const types = options.employment_types || [];

  return (
    <EmployeeLayout title="Employees">
      {toast && (
        <div style={{
          position: "fixed", top: 16, right: 16, zIndex: 9999, padding: "10px 18px",
          borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          color: toast.ok ? "#4ade80" : "#f87171",
          border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-heading)" }}>Employees</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>{total} total record{total !== 1 ? "s" : ""}</p>
        </div>
        <Link to={`/portal/${subdomain}/employees/new`}>
          <button style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600,
          }}>+ Add Employee</button>
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, code, email…" style={{ ...inp, minWidth: 200, flex: 1 }} />
        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 150 }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ ...inp, minWidth: 140 }}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>No employees found</div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 16 }}>
              {search || filterStatus || filterCompany || filterType ? "Try adjusting your filters." : "Add your first employee to get started."}
            </div>
            {!search && !filterStatus && !filterCompany && !filterType && (
              <Link to={`/portal/${subdomain}/employees/new`}>
                <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600 }}>+ Add Employee</button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                  {["Employee", "Code", "Department", "Type", "Joining Date", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(emp => (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--c-border)", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={emp.full_name} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{emp.full_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{emp.official_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)", fontFamily: "monospace" }}>{emp.employee_code}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>{emp.employment_type || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>{emp.employee_category || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>
                      {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={emp.employment_status} isActive={emp.is_active} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link to={`/portal/${subdomain}/employees/${emp.id}`}
                          style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, textDecoration: "none" }}>View</Link>
                        <Link to={`/portal/${subdomain}/employees/${emp.id}/edit`}
                          style={{ fontSize: 12, color: "var(--c-text2)", fontWeight: 500, textDecoration: "none" }}>Edit</Link>
                        <button
                          onClick={() => handleToggle(emp)}
                          disabled={actionLoading === emp.id}
                          style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 6, border: "1px solid var(--c-border)",
                            cursor: "pointer", background: "transparent",
                            color: emp.is_active ? "#f87171" : "#4ade80",
                          }}>
                          {actionLoading === emp.id ? "…" : emp.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 12 }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--c-border)", cursor: "pointer", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 12 }}>Next →</button>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
}
