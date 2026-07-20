import React, { useEffect, useState } from "react";
import { portalOrgApi } from "../../../../services/apiClient";
import Badge from "../../shared/Badge";

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
        <button
          onClick={() => setOpen(o => !o)}
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
        {!node.is_active && <Badge status="Inactive" />}
      </div>

      {hasChildren && open && (
        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "2px solid var(--c-border)" }}>
          {node.children.map(child => <DeptNode key={child.id} node={child} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function OrgTreePanel({ subdomain, token, companyId }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    setError("");
    portalOrgApi.hierarchy(subdomain, token, companyId)
      .then(r => setTree(r.data.data?.department_tree || []))
      .catch(e => setError(e?.response?.data?.detail || "Failed to load org tree."))
      .finally(() => setLoading(false));
  }, [subdomain, token, companyId]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 40, borderRadius: 6, background: "var(--c-surface2)", border: "1px solid var(--c-border)", opacity: 0.6 + i * 0.1 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
        {error}
      </div>
    );
  }

  if (!tree || tree.length === 0) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
        <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>🌳</div>
        <div style={{ fontWeight: 500 }}>No departments yet</div>
        <div style={{ marginTop: 4, opacity: 0.7 }}>Add departments from the Departments list to see the tree here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {tree.map(node => <DeptNode key={node.id} node={node} depth={0} />)}
    </div>
  );
}
