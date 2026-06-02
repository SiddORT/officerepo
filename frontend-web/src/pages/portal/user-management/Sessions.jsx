import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

export default function Sessions() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 50;

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.listSessions(subdomain, token, {
        page, page_size: PAGE_SIZE, active_only: activeOnly,
      });
      setSessions(res.data?.data?.data || []);
      setTotal(res.data?.data?.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [subdomain, token, page, activeOnly]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async (sessionId) => {
    try {
      await portalUserMgmtApi.logoutSession(subdomain, token, sessionId);
      showToast("Session terminated.");
      load();
    } catch (e) { showToast(e.response?.data?.detail || "Failed.", false); }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Terminate all your active sessions?")) return;
    try {
      await portalUserMgmtApi.logoutAllSessions(subdomain, token);
      showToast("All sessions terminated.");
      load();
    } catch (e) { showToast(e.response?.data?.detail || "Failed.", false); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeSessions = sessions.filter(s => s.is_active);

  return (
    <UserManagementLayout title="Sessions">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>User Sessions</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {activeOnly ? `${activeSessions.length} active sessions` : `${total} total sessions`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setActiveOnly(a => !a); setPage(1); }}
            style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: activeOnly ? "var(--c-accent)" : "var(--c-surface)",
              color: activeOnly ? "#fff" : "var(--c-muted)",
              border: `1px solid ${activeOnly ? "var(--c-accent)" : "var(--c-border)"}` }}>
            {activeOnly ? "Active Only" : "All Sessions"}
          </button>
          <button onClick={handleLogoutAll}
            style={{ padding: "7px 14px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
            Logout All Mine
          </button>
        </div>
      </div>

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            {activeOnly ? "No active sessions." : "No sessions recorded."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["User", "Status", "Device", "Browser", "IP", "Login Time", "Last Active", ""].map(h => (
                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < sessions.length - 1 ? "1px solid var(--c-border)" : "none", opacity: s.is_active ? 1 : 0.6 }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-text)", whiteSpace: "nowrap" }}>{s.user_name || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                      background: s.is_active ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.15)",
                      color: s.is_active ? "#4ade80" : "var(--c-muted)" }}>
                      {s.is_active ? "Active" : "Ended"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)" }}>{s.device_info || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)" }}>{s.browser_info || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{s.ip_address || "—"}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(s.login_at).toLocaleString()}</td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(s.last_activity_at).toLocaleString()}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {s.is_active && (
                      <button onClick={() => handleLogout(s.id)}
                        style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        Terminate
                      </button>
                    )}
                  </td>
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
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer", opacity: page === 1 ? 0.5 : 1 }}>←</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer", opacity: page === totalPages ? 0.5 : 1 }}>→</button>
          </div>
        </div>
      )}
    </UserManagementLayout>
  );
}
