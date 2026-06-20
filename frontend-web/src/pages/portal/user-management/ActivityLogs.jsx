import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const ACTION_META = {
  USER_CREATED:     { status: "Active", label: "User Created",       icon: "+" },
  USER_UPDATED:     { status: "Shortlisted", label: "User Updated",        icon: "✎" },
  USER_ACTIVATED:   { status: "Active", label: "Activated",           icon: "✓" },
  USER_DEACTIVATED: { status: "Rejected", label: "Deactivated",         icon: "✕" },
  PASSWORD_RESET:   { status: "Offered", label: "Password Reset",      icon: "🔑" },
  ROLE_ASSIGNED:    { status: "Sent", label: "Role Assigned",       icon: "→" },
  ROLE_REMOVED:     { status: "Rejected", label: "Role Removed",        icon: "←" },
  FORCE_LOGOUT:     { status: "Pending", label: "Force Logout",        icon: "⊘" },
  ROLE_CREATED:     { status: "Active", label: "Role Created",        icon: "+" },
  ROLE_UPDATED:     { status: "Shortlisted", label: "Role Updated",        icon: "✎" },
  ROLE_CLONED:      { status: "Sent", label: "Role Cloned",         icon: "⧉" },
  ROLE_ACTIVATED:   { status: "Active", label: "Role Activated",      icon: "✓" },
  ROLE_DEACTIVATED: { status: "Rejected", label: "Role Deactivated",    icon: "✕" },
};

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, status: "Draft", icon: "•" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Badge status={m.status} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span>
    </div>
  );
}

export default function ActivityLogs() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("timeline");
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.activityLogs(subdomain, token, { page, page_size: PAGE_SIZE });
      setLogs(res.data?.data?.data || []);
      setTotal(res.data?.data?.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [subdomain, token, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <UserManagementLayout title="Activity Logs">
      <PageHeader 
        title="Activity Logs" 
        subtitle={`Audit trail of all user management actions — ${total} records`}
        actions={
          <div style={{ display: "flex", gap: 6 }}>
            {["timeline", "table"].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={viewMode === m ? "btn-primary" : "btn-secondary"}
                style={{ padding: "6px 12px", fontSize: 12, textTransform: "capitalize" }}>
                {m}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>No activity recorded yet.</div>
      ) : viewMode === "timeline" ? (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 2, background: "var(--c-border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {logs.map(log => {
              const m = ACTION_META[log.action] || { label: log.action, status: "Draft", icon: "•" };
              return (
                <div key={log.id} style={{ display: "flex", gap: 14, paddingBottom: 20, position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-bg)", border: `2px solid var(--c-border)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--c-accent)", flexShrink: 0, zIndex: 1 }}>
                    {m.icon}
                  </div>
                  <div className="card" style={{ flex: 1, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span className="t-accent" style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                      {log.actor_name && (
                        <span className="t-body" style={{ fontSize: 12 }}>by <strong>{log.actor_name}</strong></span>
                      )}
                      {log.target_user_name && log.target_user_name !== log.actor_name && (
                        <span className="t-muted" style={{ fontSize: 12 }}>→ {log.target_user_name}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11, color: "var(--c-muted)", flexWrap: "wrap" }}>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                      {log.ip_address && <span>IP: {log.ip_address}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Action", "By", "Affected User", "IP", "When"].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}>
                  <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td><ActionBadge action={log.action} /></td>
                  <td style={{ fontSize: 13, color: "var(--c-text2)" }}>{log.actor_name || "—"}</td>
                  <td style={{ fontSize: 13, color: "var(--c-text2)" }}>{log.target_user_name || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{log.ip_address || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </UserManagementLayout>
  );
}
