import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

function DeptNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", marginBottom: 2, borderRadius: 6,
        background: depth % 2 === 0 ? "var(--c-surface)" : "var(--c-surface2)",
        border: "1px solid var(--c-border)",
      }}>
        <button onClick={() => setOpen(o => !o)}
          style={{ width: 16, flexShrink: 0, background: "none", border: "none", cursor: hasChildren ? "pointer" : "default", color: "var(--c-muted)", padding: 0, lineHeight: 1 }}>
          {hasChildren && (
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={open ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
            </svg>
          )}
        </button>

        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-accent)", flexShrink: 0, opacity: 0.7 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)", flex: 1 }}>{node.department_name}</span>
        {node.head_employee && (
          <span className="t-muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
            👤 <span>{node.head_employee.full_name}</span>
          </span>
        )}
        {node.total_employees != null && (
          <span className="badge-info">
            {node.active_employees ?? node.total_employees}/{node.total_employees}
          </span>
        )}
        <span style={{ fontFamily: "monospace", fontSize: 11, padding: "1px 5px", borderRadius: 3, background: "var(--c-bg)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
          {node.department_code}
        </span>
        {!node.is_active && (
          <Badge status="Inactive" />
        )}
      </div>

      {hasChildren && open && (
        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "2px solid var(--c-border)" }}>
          {node.children.map(child => <DeptNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function OrgHierarchy() {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    portalOrgApi.hierarchy(subdomain, token, companyId)
      .then(r => setData(r.data.data))
      .catch(() => setError("Failed to load hierarchy."))
      .finally(() => setLoading(false));
  }, [subdomain, token, companyId]);

  const sectionHeader = (title, count) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
      <span className="t-muted" style={{ fontSize: 11 }}>{count} total</span>
    </div>
  );

  return (
    <OrgLayout title="Org Hierarchy">
      <div style={{ maxWidth: 800 }}>
        <PageHeader
          title={data?.company?.company_name || "Organization Hierarchy"}
          subtitle="Department tree and designations"
          actions={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              ← Back
            </button>
          }
        />

        {loading && <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>}
        {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Department Tree */}
            <div className="portal-table-wrap">
              {sectionHeader("Departments", data.department_tree?.length ?? 0)}
              <div style={{ padding: 14 }}>
                {!data.department_tree || data.department_tree.length === 0 ? (
                  <div style={{ padding: 30, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No departments yet.</div>
                ) : (
                  data.department_tree.map(node => <DeptNode key={node.id} node={node} depth={0} />)
                )}
              </div>
            </div>

            {/* Designations */}
            <div className="portal-table-wrap">
              {sectionHeader("Designations", data.designations?.length ?? 0)}
              {!data.designations || data.designations.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No designations yet.</div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      {["Code", "Designation", "Level", "Status"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.designations.map((d, i) => (
                      <tr key={d.id}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>{d.designation_code}</span>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{d.designation_name}</td>
                        <td>
                          {d.level != null
                            ? <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-accent)", border: "1px solid var(--c-border)" }}>L{d.level}</span>
                            : <span className="t-muted" style={{ fontSize: 12, opacity: 0.5 }}>—</span>}
                        </td>
                        <td>
                          <Badge status={d.is_active ? "Active" : "Inactive"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </OrgLayout>
  );
}
