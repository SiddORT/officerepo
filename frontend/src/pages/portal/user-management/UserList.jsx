import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [resendResult, setResendResult] = useState(null); // {userId, invite_link}
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const navigate = useNavigate();

  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await portalUserMgmtApi.listUsers(subdomain, token, {
        page, page_size: PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      setUsers(res.data?.data?.data || []);
      setTotal(res.data?.data?.total || 0);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, page, statusFilter, search]);

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

  const handleRemoveUser = async () => {
    if (!confirmRemove) return;
    const { userId, userName } = confirmRemove;
    setConfirmRemove(null);
    try {
      await portalUserMgmtApi.removeUser(subdomain, token, userId);
      showToast("User removed.");
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to remove user.", false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    const { userId, action } = confirmToggle;
    setConfirmToggle(null);
    await handleStatusChange(userId, action);
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
      <PageHeader 
        title="Users" 
        subtitle={`Manage workspace members — ${total} total`} 
        actions={
          <Link to={`/portal/${subdomain}/user-management/users/new`} className="btn-primary" style={{ textDecoration: "none" }}>
            + Invite User
          </Link>
        } 
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          className="input-field"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search users…"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select className="input-field" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: "auto" }}>
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Invited">Invited</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No users found.</div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                {["#", "User", "Email", "Roles", "Status", "Last Login", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
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
                  <tr key={u.id}>
                    <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
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
                    <td style={{ fontSize: 13, color: "var(--c-text2)" }}>{u.email || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {u.roles?.length > 0
                          ? u.roles.slice(0, 2).map(r => (
                            <span key={r.id} className="badge-info" style={{ fontSize: 10 }}>{r.name}</span>
                          ))
                          : <span style={{ fontSize: 11, color: "var(--c-muted)" }}>No roles</span>
                        }
                        {u.roles?.length > 2 && <span style={{ fontSize: 11, color: "var(--c-muted)" }}>+{u.roles.length - 2}</span>}
                      </div>
                    </td>
                    <td>
                      {(isActive || isInactive) ? (
                        <button
                          title={isActive ? "Click to deactivate" : "Click to activate"}
                          onClick={() => setConfirmToggle({ userId: u.id, action: isActive ? "deactivate" : "activate", userName: displayName })}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                          <Badge status={u.status} />
                        </button>
                      ) : (
                        <Badge status={u.status} />
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--c-muted)" }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end" }}>
                        <Link to={`/portal/${subdomain}/user-management/users/${u.id}`}
                          className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                          View
                        </Link>
                        <EditIconBtn onClick={() => navigate(`/portal/${subdomain}/user-management/users/${u.id}/edit`)} title="Edit user" />
                        {isInvited && (
                          <>
                            <button
                              onClick={() => handleResendInvite(u.id, displayName)}
                              disabled={resendingId === u.id}
                              className="t-accent" style={{ color: "#fbbf24", background: "none", border: "none", cursor: resendingId === u.id ? "not-allowed" : "pointer", fontWeight: 600, padding: 0, opacity: resendingId === u.id ? 0.6 : 1, fontSize: 12 }}>
                              {resendingId === u.id ? "…" : "Resend"}
                            </button>
                            <DeleteIconBtn onClick={() => setConfirmRemove({ userId: u.id, userName: displayName })} title="Remove pending invite" />
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

      <ConfirmDialog
        open={!!confirmRemove}
        title="Remove User"
        message={`Remove pending invite for ${confirmRemove?.userName}? This cannot be undone.`}
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleRemoveUser}
        onCancel={() => setConfirmRemove(null)}
      />
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.action === "deactivate" ? "Deactivate User" : "Activate User"}
        message={`${confirmToggle?.action === "deactivate" ? "Deactivate" : "Activate"} ${confirmToggle?.userName}?`}
        confirmLabel={confirmToggle?.action === "deactivate" ? "Deactivate" : "Activate"}
        confirmVariant={confirmToggle?.action === "deactivate" ? "danger" : "primary"}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </UserManagementLayout>
  );
}
