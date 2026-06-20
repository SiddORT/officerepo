import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import StatCard from "../shared/StatCard";

const TABS = ["Overview", "Employees", "Designations", "Activities"];

function EmptyState({ msg }) {
  return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>{msg}</div>;SectionTable
}

function SectionTable({ cols, rows, renderRow }) {
  if (!rows.length) return <EmptyState msg="No records found." />;
  return (
    <table className="portal-table">
      <thead>
        <tr>
          {cols.map(h => (
            <th key={h} style={{ textAlign: h === "#" ? "center" : "left" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows.map((r, i) => renderRow(r, i))}</tbody>
    </table>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab({ dept }) {
  const head = dept.head_employee;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <StatCard label="Total Employees" value={dept.total_employees ?? 0} />
        <StatCard label="Active Employees" value={dept.active_employees ?? 0} color="var(--c-accent)" />
        <StatCard label="Designations" value={dept.designations_count ?? 0} />
      </div>

      {/* Details card */}
      <div className="portal-form-card">
        <div className="portal-form-title">Department Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {[
            { label: "Code", value: <span style={{ fontFamily: "monospace", fontSize: 12, padding: "2px 7px", borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>{dept.department_code}</span> },
            { label: "Status", value: <Badge status={dept.is_active ? "Active" : "Inactive"} /> },
            { label: "Department Head", value: head ? (
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                👤 {head.full_name}
                {dept.head_effective_from && (
                  <span style={{ fontSize: 11, color: "var(--c-muted)", marginLeft: 6 }}>
                    (from {dept.head_effective_from})
                    {dept.head_effective_to ? ` to ${dept.head_effective_to}` : ""}
                  </span>
                )}
              </span>
            ) : <span className="t-muted" style={{ fontSize: 12 }}>Not assigned</span> },
            { label: "Description", value: dept.description || <span className="t-muted" style={{ fontSize: 12 }}>—</span> },
            { label: "Created", value: dept.created_at ? new Date(dept.created_at).toLocaleDateString() : "—" },
            { label: "Last Updated", value: dept.updated_at ? new Date(dept.updated_at).toLocaleDateString() : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="portal-form-label">{label}</div>
              <div style={{ fontSize: 13, color: "var(--c-text)" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Employees ────────────────────────────────────────────────────────────
function EmployeesTab({ subdomain, token, deptId }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalOrgApi.getDeptEmployees(subdomain, token, deptId, { page: 1, page_size: 100 })
      .then(r => { setRows(r.data.data?.data || []); setTotal(r.data.data?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token, deptId]);

  if (loading) return <EmptyState msg="Loading employees…" />;

  return (
    <div className="portal-table-wrap">
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employees</span>
        <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{total} total</span>
      </div>
      <SectionTable
        cols={["#", "Employee", "Status", "Employment Status"]}
        rows={rows}
        renderRow={(e, i) => (
          <tr key={e.id}>
            <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{i + 1}</td>
            <td>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{e.full_name}</div>
              <div className="t-muted" style={{ fontSize: 11, marginTop: 1, fontFamily: "monospace" }}>{e.employee_code}</div>
            </td>
            <td><Badge status={e.is_active ? "Active" : "Inactive"} /></td>
            <td className="t-muted" style={{ fontSize: 12 }}>{e.employment_status || "—"}</td>
          </tr>
        )}
      />
    </div>
  );
}

// ── Tab: Designations ─────────────────────────────────────────────────────────
function DesignationsTab({ subdomain, token, deptId }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalOrgApi.getDeptDesigs(subdomain, token, deptId, { page: 1, page_size: 100 })
      .then(r => { setRows(r.data.data?.data || []); setTotal(r.data.data?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token, deptId]);

  if (loading) return <EmptyState msg="Loading designations…" />;

  return (
    <div className="portal-table-wrap">
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Designations</span>
        <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{total} total</span>
      </div>
      <SectionTable
        cols={["#", "Code", "Designation", "Level", "Status"]}
        rows={rows}
        renderRow={(d, i) => (
          <tr key={d.id}>
            <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{i + 1}</td>
            <td>
              <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>{d.designation_code}</span>
            </td>
            <td style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{d.designation_name}</td>
            <td>
              {d.level != null
                ? <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-accent)", border: "1px solid var(--c-border)" }}>L{d.level}</span>
                : <span style={{ fontSize: 12, color: "var(--c-muted)", opacity: 0.5 }}>—</span>}
            </td>
            <td><Badge status={d.is_active ? "Active" : "Inactive"} /></td>
          </tr>
        )}
      />
    </div>
  );
}

// ── Tab: Activities ───────────────────────────────────────────────────────────
function ActivitiesTab({ subdomain, token, deptId }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalOrgApi.getDeptActivities(subdomain, token, deptId, { page: 1, page_size: 50 })
      .then(r => { setRows(r.data.data?.data || []); setTotal(r.data.data?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token, deptId]);

  if (loading) return <EmptyState msg="Loading activity log…" />;

  return (
    <div className="portal-table-wrap">
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Activity Log</span>
        <span style={{ fontSize: 11, color: "var(--c-muted)" }}>{total} entries</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState msg="No activity recorded yet." />
      ) : (
        <div style={{ padding: "8px 14px", display: "flex", flexDirection: "column", gap: 0 }}>
          {rows.map((a, i) => (
            <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--c-surface2)", border: "1px solid var(--c-border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-accent)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)" }}>
                  {a.action.replace(/_/g, " ")}
                </div>
                {a.extra && (
                  <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {typeof a.extra === "object"
                      ? Object.entries(a.extra).map(([k, v]) => `${k}: ${v}`).join(" · ")
                      : String(a.extra)}
                  </div>
                )}
                <div className="t-muted" style={{ fontSize: 11, marginTop: 3 }}>
                  {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DepartmentDetails() {
  const { subdomain, deptId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Overview");
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    portalOrgApi.getDept(subdomain, token, deptId)
      .then(r => setDept(r.data.data))
      .catch(() => setError("Failed to load department."))
      .finally(() => setLoading(false));
  }, [subdomain, token, deptId]);

  useEffect(() => { load(); }, [load]);

  return (
    <OrgLayout title="Department Details">
      <div>
        <PageHeader
          title={dept ? dept.department_name : "Department Details"}
          subtitle={dept ? `Department: ${dept.department_code}` : "Loading..."}
          actions={
            <>
              <button onClick={() => navigate(`/portal/${subdomain}/org/departments`)} className="btn-secondary">
                ← Back
              </button>
              {dept && (
                <Link to={`/portal/${subdomain}/org/departments/${deptId}/edit`} className="btn-primary">
                  Edit
                </Link>
              )}
            </>
          }
        />

        {loading && !dept && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        )}
        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}

        {dept && (
          <>
            {/* Tab bar */}
            <div style={{ display: "flex", gap: 4, marginTop: 20, borderBottom: "1px solid var(--c-border)" }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{
                    padding: "8px 16px", borderRadius: "6px 6px 0 0", fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none",
                    background: activeTab === t ? "var(--c-surface)" : "transparent",
                    color: activeTab === t ? "var(--c-accent)" : "var(--c-muted)",
                    borderBottom: activeTab === t ? "2px solid var(--c-accent)" : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {t}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ marginTop: 20 }}>
              {activeTab === "Overview"      && <OverviewTab dept={dept} />}
              {activeTab === "Employees"     && <EmployeesTab subdomain={subdomain} token={token} deptId={deptId} />}
              {activeTab === "Designations"  && <DesignationsTab subdomain={subdomain} token={token} deptId={deptId} />}
              {activeTab === "Activities"    && <ActivitiesTab subdomain={subdomain} token={token} deptId={deptId} />}
            </div>
          </>
        )}
      </div>
    </OrgLayout>
  );
}
