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

  const PAGE_SIZE = 20;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <UserManagementLayout title="Users">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
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
          + Add User
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

      {/* Error */}
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
                {["User", "Email", "Roles", "Status", "Last Login", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={u.display_name || `${u.first_name} ${u.last_name}`} size={32} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>
                          {u.display_name || `${u.first_name} ${u.last_name || ""}`.trim()}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-muted)" }}>
                          {u.first_name} {u.last_name}
                        </div>
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
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link to={`/portal/${subdomain}/user-management/users/${u.id}`}
                        style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, textDecoration: "none" }}>
                        View
                      </Link>
                      <Link to={`/portal/${subdomain}/user-management/users/${u.id}/edit`}
                        style={{ fontSize: 12, color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, textDecoration: "none" }}>
                        Edit
                      </Link>
                      {u.status === "Active" ? (
                        <button onClick={() => handleStatusChange(u.id, "deactivate")}
                          style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                          Deactivate
                        </button>
                      ) : u.status === "Inactive" ? (
                        <button onClick={() => handleStatusChange(u.id, "activate")}
                          style={{ fontSize: 12, color: "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                          Activate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
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
