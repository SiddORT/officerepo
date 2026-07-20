import React, { useEffect, useState, useCallback } from "react";
import { portalOrgApi, portalEmployeeApi } from "../../../../services/apiClient";

// ── Colour palette for initials avatars (consistent per name) ────────────────
const AVATAR_COLORS = [
  ["#6366f1", "#c7d2fe"],
  ["#0891b2", "#a5f3fc"],
  ["#059669", "#a7f3d0"],
  ["#d97706", "#fde68a"],
  ["#dc2626", "#fca5a5"],
  ["#7c3aed", "#ddd6fe"],
  ["#db2777", "#fbcfe8"],
  ["#0284c7", "#bae6fd"],
];
function avatarColor(name = "") {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
function initials(name = "") {
  return (name || "?")
    .split(/\s+/).filter(Boolean)
    .slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// ── Single employee card ─────────────────────────────────────────────────────
function EmployeeCard({ emp }) {
  const name = emp.full_name || emp.display_name || "—";
  const [bg, fg] = avatarColor(name);
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "16px 12px",
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      borderRadius: 10, gap: 8,
      textAlign: "center",
      minWidth: 0,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: bg, color: fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: `0 0 0 2px var(--c-surface), 0 0 0 3px ${bg}66`,
      }}>
        {initials(name)}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)", lineHeight: 1.3 }}>{name}</div>
        {(emp.designation_name || emp.job_title) && (
          <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
            {emp.designation_name || emp.job_title}
          </div>
        )}
        {emp.employee_number && (
          <div style={{
            marginTop: 4, display: "inline-block",
            fontSize: 10, fontFamily: "monospace",
            padding: "1px 6px", borderRadius: 4,
            background: "var(--c-bg)", color: "var(--c-muted)",
            border: "1px solid var(--c-border)",
          }}>
            {emp.employee_number}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Head employee chip (shown in department header) ──────────────────────────
function HeadChip({ emp }) {
  if (!emp) return null;
  const name = emp.full_name || emp.display_name || "—";
  const [bg, fg] = avatarColor(name);
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: "2px 8px 2px 2px",
      background: `${bg}18`,
      border: `1px solid ${bg}44`,
      borderRadius: 20,
      fontSize: 11, color: "var(--c-text)",
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        background: bg, color: fg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, flexShrink: 0,
      }}>
        {initials(name)}
      </span>
      {name}
    </span>
  );
}

// ── Department accordion node ────────────────────────────────────────────────
function DeptAccordion({ node, subdomain, token, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState(null);
  const [empLoading, setEmpLoading] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const hasEmployees = (node.total_employees || 0) > 0;

  const loadEmployees = useCallback(async () => {
    if (employees !== null || empLoading) return;
    setEmpLoading(true);
    try {
      const res = await portalEmployeeApi.list(subdomain, token, {
        department_id: node.id,
        page_size: 200,
        status: "Active",
      });
      setEmployees(res.data.data?.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setEmpLoading(false);
    }
  }, [employees, empLoading, node.id, subdomain, token]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && employees === null && hasEmployees) {
      loadEmployees();
    }
  };

  const countBadge = node.total_employees != null ? (
    <span style={{
      padding: "2px 8px", borderRadius: 20,
      background: "var(--c-accent-dim)",
      color: "var(--c-accent)",
      fontSize: 11, fontWeight: 600,
      border: "1px solid var(--c-accent)33",
      flexShrink: 0,
    }}>
      {node.active_employees ?? node.total_employees}/{node.total_employees}
    </span>
  ) : null;

  const codeBadge = node.department_code ? (
    <span style={{
      fontFamily: "monospace", fontSize: 10,
      padding: "1px 6px", borderRadius: 4,
      background: "var(--c-bg)", color: "var(--c-muted)",
      border: "1px solid var(--c-border)",
      flexShrink: 0,
    }}>
      {node.department_code}
    </span>
  ) : null;

  const borderAccent = depth === 0 ? "var(--c-accent)44" : "var(--c-border)";

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      {/* Header row */}
      <button
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", marginBottom: 2, borderRadius: 8,
          background: open
            ? depth === 0 ? "var(--c-accent-dim)" : "var(--c-surface2)"
            : "var(--c-surface)",
          border: `1px solid ${open ? borderAccent : "var(--c-border)"}`,
          cursor: "pointer", textAlign: "left",
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {/* Chevron */}
        <svg
          width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{
            color: open ? "var(--c-accent)" : "var(--c-muted)",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.15s", flexShrink: 0,
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>

        {/* Folder icon */}
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"
          style={{ color: open ? "var(--c-accent)" : "var(--c-muted)", flexShrink: 0, opacity: 0.75 }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>

        {/* Department name */}
        <span style={{
          fontSize: 13, fontWeight: open ? 600 : 500,
          color: open ? "var(--c-text)" : "var(--c-text)",
          flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {node.department_name}
        </span>

        {/* Head employee chip */}
        {node.head_employee && <HeadChip emp={node.head_employee} />}

        {/* Right side badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {countBadge}
          {codeBadge}
          {!node.is_active && (
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.3)",
            }}>Inactive</span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{
          marginLeft: 14, paddingLeft: 14,
          borderLeft: "2px solid var(--c-border)",
          marginBottom: 4,
        }}>
          {/* Employee cards */}
          {hasEmployees && (
            <div style={{ padding: "12px 4px" }}>
              {empLoading || employees === null ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{
                      width: 120, height: 100, borderRadius: 10,
                      background: "var(--c-surface2)",
                      border: "1px solid var(--c-border)",
                      opacity: 0.6 + i * 0.1,
                      animation: "pulse 1.5s infinite",
                    }} />
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div style={{ padding: "12px 8px", fontSize: 12, color: "var(--c-muted)", fontStyle: "italic" }}>
                  No active employees found.
                </div>
              ) : (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 8,
                }}>
                  {employees.map(emp => (
                    <EmployeeCard key={emp.id} emp={emp} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-department accordions */}
          {hasChildren && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingBottom: 4 }}>
              {hasEmployees && employees?.length > 0 && (
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "var(--c-muted)",
                  padding: "8px 4px 4px",
                }}>
                  Sub-departments
                </div>
              )}
              {node.children.map(child => (
                <DeptAccordion
                  key={child.id}
                  node={child}
                  subdomain={subdomain}
                  token={token}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}

          {/* Empty department */}
          {!hasEmployees && !hasChildren && (
            <div style={{ padding: "14px 8px", fontSize: 12, color: "var(--c-muted)", fontStyle: "italic" }}>
              No employees or sub-departments.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────
export default function OrgTreePanel({ subdomain, token, companyId }) {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) return;
    setLoading(true); setError("");
    portalOrgApi.hierarchy(subdomain, token, companyId)
      .then(r => setTree(r.data.data?.department_tree || []))
      .catch(e => setError(e?.response?.data?.detail || "Failed to load org tree."))
      .finally(() => setLoading(false));
  }, [subdomain, token, companyId]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            height: 46, borderRadius: 8,
            background: "var(--c-surface2)", border: "1px solid var(--c-border)",
            opacity: 0.5 + i * 0.15,
          }} />
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
        <div style={{ marginTop: 4, opacity: 0.7 }}>Add departments to see the org tree here.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {tree.map(node => (
        <DeptAccordion
          key={node.id}
          node={node}
          subdomain={subdomain}
          token={token}
          depth={0}
        />
      ))}
    </div>
  );
}
