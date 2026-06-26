import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

export default function Sessions() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const PAGE_SIZE = 20;

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

      <PageHeader 
        title="User Sessions" 
        subtitle={activeOnly ? `${activeSessions.length} active sessions` : `${total} total sessions`}
        actions={
          <>
            <button onClick={() => { setActiveOnly(a => !a); setPage(1); }}
              className={activeOnly ? "btn-primary" : "btn-secondary"}
              style={{ padding: "7px 14px", fontSize: 12 }}>
              {activeOnly ? "Active Only" : "All Sessions"}
            </button>
            <button onClick={handleLogoutAll}
              className="btn-secondary" style={{ color: "#f87171" }}>
              Logout All Mine
            </button>
          </>
        }
      />

      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            {activeOnly ? "No active sessions." : "No sessions recorded."}
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "User", "Status", "Device", "Browser", "IP", "Login Time", "Last Active", ""].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={s.id} style={{ opacity: s.is_active ? 1 : 0.6 }}>
                  <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td style={{ fontSize: 13, color: "var(--c-text)", whiteSpace: "nowrap" }}>{s.user_name || "—"}</td>
                  <td>
                    <Badge status={s.is_active ? "Active" : "Closed"} />
                  </td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{s.device_info || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{s.browser_info || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{s.ip_address || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(s.login_at).toLocaleString()}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(s.last_activity_at).toLocaleString()}</td>
                  <td>
                    {s.is_active && (
                      <button onClick={() => handleLogout(s.id)}
                        className="t-accent" style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
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

      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </UserManagementLayout>
  );
}
