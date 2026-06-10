import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

const STATUS_COLORS = {
  Active:      { bg: "rgba(34,197,94,0.1)",  color: "#4ade80" },
  Inactive:    { bg: "rgba(100,116,139,0.15)", color: "var(--c-muted)" },
  Invited:     { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
  Placeholder: { bg: "rgba(100,116,139,0.1)", color: "var(--c-muted)" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Placeholder;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button type="button" onClick={copy}
      style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--c-border)", background: copied ? "rgba(74,222,128,0.1)" : "var(--c-surface2)", color: copied ? "#4ade80" : "var(--c-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export default function UserList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendResult, setResendResult] = useState(null); // {userId, invite_link}

  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await portalUserMgmtApi.listUsers(subdomain, token, {
        page, page_size: PAGE_SIZE, ...(statusFilter ? { status: statusFilter } : {}),
      });
      setUsers(res.data?.data?.data || []);
      setTotal(res.data?.data?.total || 0);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (userId, action) => {
    try {
      if (action === "activate") await portalUserMgmtApi.activateUser(subdomain, token, userId);
      else await portalUserMgmtApi.deactivateUser(subdomain, token, userId);
      showToast(action === "activate" ? "User activated." : "User deactivated.");
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Action failed.", false);
    }
  };

  const handleResendInvite = async (userId, userName) => {
    setResendingId(userId);
    try {
      const res = await portalUserMgmtApi.resendInvite(subdomain, token, userId);
      const result = res.data?.data || {};
      setResendResult({ userId, invite_link: result.invite_link, name: userName });
      showToast("New invite link generated.");
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to resend invite.", false);
    } finally {
      setResendingId(null);
    }
  };

  const handleRemoveUser = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName}? This cannot be undone.`)) return;
    try {
      await portalUserMgmtApi.removeUser(subdomain, token, userId);
      showToast("User removed.");
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to remove user.", false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <UserManagementLayout title="Users">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Resend result popup */}
      {resendResult && (
        <div style={{ position: "fixed", top: 60, right: 20, zIndex: 9998, width: 340, background: "var(--c-surface)", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 10, padding: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>New invite link for {resendResult.name}</span>
            <button onClick={() => setResendResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 5, padding: "6px 8px" }}>
            <span style={{ flex: 1, fontSize: 11, color: "var(--c-text2)", wordBreak: "break-all", fontFamily: "monospace" }}>{resendResult.invite_link}</span>
            <CopyButton text={resendResult.invite_link} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 10, color: "var(--c-muted)" }}>Expires in 72 hours.</p>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Users</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            Manage workspace members — {total} total
          </p>
        </div>
        <Link to={`/portal/${subdomain}/user-management/users/new`}
          style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
          + Invite User
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["", "Active", "Inactive", "Invited"].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: statusFilter === s ? "var(--c-accent)" : "var(--c-surface)",
              color: statusFilter === s ? "#fff" : "var(--c-muted)",
              border: `1px solid ${statusFilter === s ? "var(--c-accent)" : "var(--c-border)"}`,
            }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No users found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["User", "Email", "Roles", "Status", "Last Login", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const displayName = u.display_name || `${u.first_name} ${u.last_name || ""}`.trim();
                const isInvited = u.status === "Invited";
                const isActive = u.status === "Active";
                const isInactive = u.status === "Inactive";
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={displayName} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{displayName}</div>
                          {u.first_name !== displayName && (
                            <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{u.first_name} {u.last_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: "var(--c-text2)" }}>{u.email || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.roles?.length > 0
                          ? u.roles.slice(0, 2).map(r => (
                            <span key={r.id} style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "rgba(0,174,236,0.1)", color: "var(--c-accent)" }}>{r.name}</span>
                          ))
                          : <span style={{ fontSize: 11, color: "var(--c-muted)" }}>No roles</span>
                        }
                        {u.roles?.length > 2 && <span style={{ fontSize: 11, color: "var(--c-muted)" }}>+{u.roles.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge status={u.status} /></td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <Link to={`/portal/${subdomain}/user-management/users/${u.id}`}
                          style={{ fontSize: 12, color: "var(--c-accent)", textDecoration: "none", fontWeight: 500 }}>
                          View
                        </Link>
                        <Link to={`/portal/${subdomain}/user-management/users/${u.id}/edit`}
                          style={{ fontSize: 12, color: "var(--c-muted)", textDecoration: "none", fontWeight: 500 }}>
                          Edit
                        </Link>
                        {isActive && (
                          <button onClick={() => handleStatusChange(u.id, "deactivate")}
                            style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
                            Deactivate
                          </button>
                        )}
                        {isInactive && (
                          <button onClick={() => handleStatusChange(u.id, "activate")}
                            style={{ fontSize: 12, color: "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
                            Activate
                          </button>
                        )}
                        {isInvited && (
                          <>
                            <button
                              onClick={() => handleResendInvite(u.id, displayName)}
                              disabled={resendingId === u.id}
                              style={{ fontSize: 12, color: "#fbbf24", background: "none", border: "none", cursor: resendingId === u.id ? "not-allowed" : "pointer", fontWeight: 500, padding: 0, opacity: resendingId === u.id ? 0.6 : 1 }}>
                              {resendingId === u.id ? "…" : "Resend"}
                            </button>
                            <button
                              onClick={() => handleRemoveUser(u.id, displayName)}
                              style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: 0 }}>
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-muted)" }}>
          <span>Page {page} of {totalPages} — {total} users</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
              ←
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
              →
            </button>
          </div>
        </div>
      )}
    </UserManagementLayout>
  );
}
