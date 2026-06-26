import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const EVENT_STYLES = {
  LOGIN_SUCCESS:    { status: "Active", label: "Login" },
  LOGIN_FAILED:     { status: "Rejected", label: "Failed" },
  LOGOUT:           { status: "Inactive", label: "Logout" },
  FORCED_LOGOUT:    { status: "Pending", label: "Forced Logout" },
  PASSWORD_RESET:   { status: "Shortlisted", label: "Password Reset" },
};

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
      <PageHeader 
        title="Login Logs" 
        subtitle={`Authentication event history — ${total} records`} 
      />

      {/* Event filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["", "All"], ...Object.entries(EVENT_STYLES).map(([k, v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => { setEventFilter(val); setPage(1); }}
            className={eventFilter === val ? "btn-primary" : "btn-secondary"}
            style={{ padding: "4px 10px", fontSize: 11 }}>
            {label}
          </button>
        ))}
      </div>

      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No login events recorded yet.</div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "Event", "User", "Email", "IP Address", "Device", "Browser", "When"].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}>
                  <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td><Badge status={EVENT_STYLES[log.event_type]?.status || "Draft"} /></td>
                  <td style={{ fontSize: 13, color: "var(--c-text2)", whiteSpace: "nowrap" }}>{log.user_name || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{log.email || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", fontFamily: "monospace" }}>{log.ip_address || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{log.device_info || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)" }}>{log.browser_info || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString()}</td>
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
