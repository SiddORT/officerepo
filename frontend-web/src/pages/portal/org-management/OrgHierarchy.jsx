import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

function DeptNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth > 0 ? 24 : 0 }}>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 mb-1"
        style={{ background: depth % 2 === 0 ? "var(--c-surface)" : "var(--c-surface-alt)", border: "1px solid var(--c-border)" }}
      >
        {hasChildren && (
          <button onClick={() => setOpen(o => !o)}
            style={{ color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={open ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        )}
        {!hasChildren && <div style={{ width: 14 }} />}

        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-primary)", opacity: 0.7 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        <span className="text-sm font-medium flex-1" style={{ color: "var(--c-text)" }}>{node.department_name}</span>
        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--c-bg)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
          {node.department_code}
        </span>
        {!node.is_active && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(107,114,128,0.1)", color: "#6b7280" }}>Inactive</span>
        )}
      </div>

      {hasChildren && open && (
        <div className="ml-1 pl-3" style={{ borderLeft: "2px solid var(--c-border)" }}>
          {node.children.map(child => (
            <DeptNode key={child.id} node={child} depth={depth + 1} />
          ))}
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

  return (
    <OrgLayout title="Org Hierarchy">
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>
              {data?.company?.company_name || "Organization Hierarchy"}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              Department tree and designations
            </p>
          </div>
          <button onClick={() => navigate(-1)} className="text-sm" style={{ color: "var(--c-muted)" }}>← Back</button>
        </div>

        {loading && <div className="py-20 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>}
        {error && <div className="py-8 text-center text-sm" style={{ color: "#ef4444" }}>{error}</div>}

        {data && (
          <>
            {/* Department Tree */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: "var(--c-surface-alt)", borderBottom: "1px solid var(--c-border)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-primary)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                </svg>
                <span className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>Departments</span>
                <span className="text-xs ml-auto" style={{ color: "var(--c-muted)" }}>
                  {data.department_tree?.length ?? 0} top-level
                </span>
              </div>
              <div className="p-4">
                {!data.department_tree || data.department_tree.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: "var(--c-muted)" }}>No departments yet.</p>
                ) : (
                  data.department_tree.map(node => <DeptNode key={node.id} node={node} depth={0} />)
                )}
              </div>
            </div>

            {/* Designations */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ background: "var(--c-surface-alt)", borderBottom: "1px solid var(--c-border)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-primary)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>Designations</span>
                <span className="text-xs ml-auto" style={{ color: "var(--c-muted)" }}>
                  {data.designations?.length ?? 0} total
                </span>
              </div>
              {!data.designations || data.designations.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--c-muted)" }}>No designations yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--c-border)" }}>
                      {["Code", "Designation", "Level", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)", background: "var(--c-surface)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.designations.map((d, i) => (
                      <tr key={d.id} style={{ borderBottom: i < data.designations.length - 1 ? "1px solid var(--c-border)" : "none", background: "var(--c-surface)" }}>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--c-surface-alt)", color: "var(--c-muted)" }}>{d.designation_code}</span>
                        </td>
                        <td className="px-4 py-2.5 font-medium" style={{ color: "var(--c-text)" }}>{d.designation_name}</td>
                        <td className="px-4 py-2.5 text-xs" style={{ color: "var(--c-muted)" }}>
                          {d.level != null ? `L${d.level}` : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: d.is_active ? "rgba(22,163,74,0.12)" : "rgba(107,114,128,0.12)",
                            color: d.is_active ? "#16a34a" : "#6b7280",
                          }}>
                            {d.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </OrgLayout>
  );
}
