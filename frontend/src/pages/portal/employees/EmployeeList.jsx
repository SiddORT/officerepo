import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi, portalOrgApi } from "../../../services/apiClient";
import EmployeeLayout from "./EmployeeLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

function tenure(dateStr) {
  const start = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  const y = Math.floor(months / 12);
  const m = months % 12;
  const mo = new Date(dateStr).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  const dur = y > 0 ? `${y}y${m > 0 ? ` ${m}m` : ""}` : m > 0 ? `${m}m` : "<1m";
  return `${mo} · ${dur}`;
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
  const PAGE_SIZE = 20;
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
      const params = { page, page_size: PAGE_SIZE };
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

  const totalPages = Math.ceil(total / PAGE_SIZE);
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
      <PageHeader
        title="Employees"
        subtitle={`${total} total record${total !== 1 ? "s" : ""}`}
        actions={
          <Link to={`/portal/${subdomain}/employees/new`}>
            <button className="btn-primary">+ Add Employee</button>
          </Link>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, code, email…" className="input-field" style={{ minWidth: 200, flex: 1 }} />
        <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 150 }}>
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {/* Table */}
      <div className="portal-table-wrap">
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
                <button className="btn-primary">+ Add Employee</button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="portal-table">
              <thead>
                <tr>
                  {["#", "Employee", "Code", "Branch", "Department", "Designation", "Since", "Status", ""].map(h => (
                    <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((emp, i) => (
                  <tr key={emp.id}>
                    <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={emp.full_name} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{emp.full_name}</div>
                          <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{emp.official_email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--c-text2)", fontFamily: "monospace" }}>{emp.employee_code}</td>
                    <td>
                      {emp.branch_name
                        ? <Badge status="Active" /> // Using active badge for branch name if exists, or custom styling if preferred. Migration rule 7 says use Badge for status/inline spans.
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td>{emp.department_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td>{emp.designation_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {emp.joining_date ? tenure(emp.joining_date) : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td>
                      <Badge status={emp.employment_status} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link to={`/portal/${subdomain}/employees/${emp.id}`}
                          className="t-accent" style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>View</Link>
                        <Link to={`/portal/${subdomain}/employees/${emp.id}/edit`}
                          className="t-body" style={{fontSize: 12, fontWeight: 600, textDecoration: "none" }}>Edit</Link>
                        <button
                          onClick={() => handleToggle(emp)}
                          disabled={actionLoading === emp.id}
                          className={emp.is_active ? "btn-secondary" : "btn-primary"}
                          style={{ fontSize: 11, padding: "2px 8px" }}>
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
      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </EmployeeLayout>
  );
}
