import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

const ACTION_META = {
  USER_CREATED:     { label: "User Created",       color: "#4ade80",   icon: "+" },
  USER_UPDATED:     { label: "User Updated",        color: "var(--c-accent)", icon: "✎" },
  USER_ACTIVATED:   { label: "Activated",           color: "#4ade80",   icon: "✓" },
  USER_DEACTIVATED: { label: "Deactivated",         color: "#f87171",   icon: "✕" },
  PASSWORD_RESET:   { label: "Password Reset",      color: "#fbbf24",   icon: "🔑" },
  ROLE_ASSIGNED:    { label: "Role Assigned",       color: "#818cf8",   icon: "→" },
  ROLE_REMOVED:     { label: "Role Removed",        color: "#f87171",   icon: "←" },
  FORCE_LOGOUT:     { label: "Force Logout",        color: "#fbbf24",   icon: "⊘" },
  ROLE_CREATED:     { label: "Role Created",        color: "#4ade80",   icon: "+" },
  ROLE_UPDATED:     { label: "Role Updated",        color: "var(--c-accent)", icon: "✎" },
  ROLE_CLONED:      { label: "Role Cloned",         color: "#818cf8",   icon: "⧉" },
  ROLE_ACTIVATED:   { label: "Role Activated",      color: "#4ade80",   icon: "✓" },
  ROLE_DEACTIVATED: { label: "Role Deactivated",    color: "#f87171",   icon: "✕" },
};

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, color: "var(--c-muted)", icon: "•" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: m.color, flexShrink: 0 }}>
        {m.icon}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
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
  const PAGE_SIZE = 50;

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Activity Logs</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Audit trail of all user management actions — {total} records</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["timeline", "table"].map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "capitalize",
                background: viewMode === m ? "var(--c-accent)" : "var(--c-surface)",
                color: viewMode === m ? "#fff" : "var(--c-muted)",
                border: `1px solid ${viewMode === m ? "var(--c-accent)" : "var(--c-border)"}` }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>No activity recorded yet.</div>
      ) : viewMode === "timeline" ? (
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 17, top: 0, bottom: 0, width: 2, background: "var(--c-border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {logs.map(log => {
              const m = ACTION_META[log.action] || { label: log.action, color: "var(--c-muted)", icon: "•" };
              return (
                <div key={log.id} style={{ display: "flex", gap: 14, paddingBottom: 20, position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-bg)", border: `2px solid ${m.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: m.color, flexShrink: 0, zIndex: 1 }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: m.color }}>{m.label}</span>
                      {log.actor_name && (
                        <span style={{ fontSize: 12, color: "var(--c-text2)" }}>by <strong>{log.actor_name}</strong></span>
                      )}
                      {log.target_user_name && log.target_user_name !== log.actor_name && (
                        <span style={{ fontSize: 12, color: "var(--c-muted)" }}>→ {log.target_user_name}</span>
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
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["Action", "By", "Affected User", "IP", "When"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                  <td style={{ padding: "10px 14px" }}><ActionBadge action={log.action} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-text2)" }}>{log.actor_name || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-text2)" }}>{log.target_user_name || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{log.ip_address || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--c-muted)" }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer", opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer", opacity: page === totalPages ? 0.5 : 1 }}>→</button>
          </div>
        </div>
      )}
    </UserManagementLayout>
  );
}
