import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

const EVENT_STYLES = {
  LOGIN_SUCCESS:    { color: "#4ade80", label: "Login" },
  LOGIN_FAILED:     { color: "#f87171", label: "Failed" },
  LOGOUT:           { color: "var(--c-muted)", label: "Logout" },
  FORCED_LOGOUT:    { color: "#fbbf24", label: "Forced Logout" },
  PASSWORD_RESET:   { color: "#818cf8", label: "Password Reset" },
};

function EventBadge({ type }) {
  const s = EVENT_STYLES[type] || { color: "var(--c-muted)", label: type };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: `${s.color}18`, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function LoginLogs() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventFilter, setEventFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.loginLogs(subdomain, token, {
        page, page_size: PAGE_SIZE,
        ...(eventFilter ? { event_type: eventFilter } : {}),
      });
      setLogs(res.data?.data?.data || []);
      setTotal(res.data?.data?.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [subdomain, token, page, eventFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <UserManagementLayout title="Login Logs">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Login Logs</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Authentication event history — {total} records</p>
        </div>
      </div>

      {/* Event filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["", "All"], ...Object.entries(EVENT_STYLES).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => { setEventFilter(val); setPage(1); }}
            style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer",
              background: eventFilter === val ? "var(--c-accent)" : "var(--c-surface)",
              color: eventFilter === val ? "#fff" : "var(--c-muted)",
              border: `1px solid ${eventFilter === val ? "var(--c-accent)" : "var(--c-border)"}` }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No login events recorded yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["#", "Event", "User", "Email", "IP Address", "Device", "Browser", "When"].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                  <td style={{ padding: "10px 14px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ padding: "10px 14px" }}><EventBadge type={log.event_type} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-text2)", whiteSpace: "nowrap" }}>{log.user_name || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)" }}>{log.email || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{log.ip_address || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)" }}>{log.device_info || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)" }}>{log.browser_info || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--c-muted)" }}>
          <span>Page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>→</button>
          </div>
        </div>
      )}
    </UserManagementLayout>
  );
}
